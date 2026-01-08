import * as fs from 'fs';
import * as path from 'path';
import { CockpitSession, UNASSIGNED_TASK_ID } from '../types';
import { SessionDatabase } from './SessionDatabase';

export class SessionManager {
  private db: SessionDatabase;
  private writeQueue: Promise<void> = Promise.resolve();
  private initialized: boolean = false;

  constructor(private workspaceRoot: string) {
    const dbPath = path.join(workspaceRoot, '.ai/cockpit/sessions.db');
    this.db = new SessionDatabase(dbPath);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.db.initialize();
    this.initialized = true;
  }

  async close(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    await this.db.close();
    this.initialized = false;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SessionManager not initialized. Call initialize() first.');
    }
  }

  async getSessions(): Promise<CockpitSession[]> {
    return this.withLock(async () => {
      this.ensureInitialized();
      return this.db.getAllSessions();
    });
  }

  async getSessionsForTask(taskId: string): Promise<CockpitSession[]> {
    return this.withLock(async () => {
      this.ensureInitialized();
      if (taskId === UNASSIGNED_TASK_ID) {
        return [];
      }
      return this.db.getSessionsByTaskId(taskId);
    });
  }

  async getUnassignedSessions(): Promise<CockpitSession[]> {
    return this.withLock(async () => {
      this.ensureInitialized();
      return this.db.getSessionsByTaskId(UNASSIGNED_TASK_ID);
    });
  }

  async getSession(sessionId: string): Promise<CockpitSession | null> {
    return this.withLock(async () => {
      this.ensureInitialized();
      return this.db.getSessionById(sessionId);
    });
  }

  async registerSession(session: CockpitSession): Promise<void> {
    return this.withLock(async () => {
      this.ensureInitialized();
      const existing = this.db.getSessionById(session.id);
      if (existing) {
        this.db.updateSession(session.id, session);
      } else {
        this.db.insertSession(session);
      }
    });
  }

  /**
   * Import an existing session by ID.
   * Creates a closed session that can be resumed later.
   */
  async importSession(
    sessionId: string,
    taskId: string,
    label?: string
  ): Promise<CockpitSession> {
    const session: CockpitSession = {
      id: sessionId,
      taskId,
      label: label || `Imported: ${sessionId.substring(0, 8)}...`,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      status: 'closed',
      terminalName: `Cockpit: ${taskId}`,
      terminalId: undefined
    };
    await this.registerSession(session);
    return session;
  }

  async updateSession(
    sessionId: string,
    updates: Partial<CockpitSession>
  ): Promise<boolean> {
    return this.withLock(async () => {
      this.ensureInitialized();
      return this.db.updateSession(sessionId, updates);
    });
  }

  async closeSession(sessionId: string): Promise<boolean> {
    return this.updateSession(sessionId, {
      status: 'closed',
      lastActive: new Date().toISOString()
    });
  }

  async renameSession(sessionId: string, newLabel: string): Promise<boolean> {
    return this.updateSession(sessionId, { label: newLabel });
  }

  async linkSessionToTask(sessionId: string, newTaskId: string): Promise<boolean> {
    return this.updateSession(sessionId, { taskId: newTaskId });
  }

  async updateSessionTaskId(
    sessionId: string,
    newTaskId: string
  ): Promise<boolean> {
    return this.withLock(async () => {
      this.ensureInitialized();
      const session = this.db.getSessionById(sessionId);

      if (!session) {
        console.warn(`[AI Cockpit] Session ${sessionId} not found for task sync`);
        return false;
      }

      const oldTaskId = session.taskId;

      if (oldTaskId === newTaskId) {
        return true;
      }

      const updated = this.db.updateSession(sessionId, {
        taskId: newTaskId,
        lastActive: new Date().toISOString()
      });

      if (updated) {
        console.log(
          `[AI Cockpit] Session ${sessionId.substring(0, 8)}... task updated: ` +
          `${oldTaskId} → ${newTaskId}`
        );
      }

      return updated;
    });
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.withLock(async () => {
      this.ensureInitialized();
      return this.db.deleteSession(sessionId);
    });
  }

  async deleteByTaskId(taskId: string): Promise<number> {
    return this.withLock(async () => {
      this.ensureInitialized();
      return this.db.deleteByTaskId(taskId);
    });
  }

  async closeSessionByTerminal(terminalName: string): Promise<void> {
    return this.withLock(async () => {
      this.ensureInitialized();
      const sessions = this.db.getAllSessions();
      const session = sessions.find(
        s => s.terminalName === terminalName && s.status === 'active'
      );

      if (session) {
        this.db.updateSession(session.id, {
          status: 'closed',
          lastActive: new Date().toISOString()
        });
      }
    });
  }

  async closeSessionByTerminalId(terminalId: string): Promise<boolean> {
    return this.withLock(async () => {
      this.ensureInitialized();
      const session = this.db.getSessionByTerminalId(terminalId);

      if (session) {
        this.db.updateSession(session.id, {
          status: 'closed',
          lastActive: new Date().toISOString()
        });
        return true;
      }
      return false;
    });
  }

  async getActiveSessionByTerminalId(terminalId: string): Promise<CockpitSession | null> {
    return this.withLock(async () => {
      this.ensureInitialized();
      return this.db.getSessionByTerminalId(terminalId);
    });
  }

  async cleanupOldSessions(retentionDays: number): Promise<number> {
    return this.withLock(async () => {
      this.ensureInitialized();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      return this.db.deleteOlderThan(cutoffDate);
    });
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.writeQueue.then(() => operation());
    this.writeQueue = result.then(
      () => {},
      () => {}
    );
    return result;
  }

  startContinuousVerification(intervalMs: number = 3000): { dispose: () => void } {
    const verificationInterval = setInterval(async () => {
      try {
        await this.verifyAndRepairSessions();
        await this.cleanupOldSignalFiles();
      } catch (error) {
        // Silent fail
      }
    }, intervalMs);

    console.log(
      `[AI Cockpit] Started session verification (interval: ${intervalMs}ms)`
    );

    return {
      dispose: () => {
        clearInterval(verificationInterval);
        console.log('[AI Cockpit] Stopped session verification');
      }
    };
  }

  private async verifyAndRepairSessions(): Promise<void> {
    // This method is intentionally empty - sessions should only be assigned
    // to tasks at creation time, not via background auto-assignment.
    // Keeping the method for potential future validation/cleanup logic.
  }

  private async cleanupOldSignalFiles(): Promise<void> {
    const signalPath = path.join(
      this.workspaceRoot,
      '.ai/cockpit/task-switch-signal.json'
    );

    try {
      const stats = await fs.promises.stat(signalPath);
      const ageMs = Date.now() - stats.mtimeMs;

      if (ageMs > 60000) {
        await fs.promises.unlink(signalPath);
        console.log('[AI Cockpit] Cleaned up old signal file');
      }
    } catch {
      // File doesn't exist or error reading, ignore
    }
  }
}
