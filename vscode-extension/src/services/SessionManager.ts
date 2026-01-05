import * as fs from 'fs';
import * as path from 'path';
import { CockpitSession, SessionRegistry, UNASSIGNED_TASK_ID } from '../types';
import { safeJsonParse } from '../utils/jsonUtils';

export class SessionManager {
  private sessionsPath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private workspaceRoot: string) {
    this.sessionsPath = path.join(workspaceRoot, '.ai/cockpit/sessions.json');
  }

  async getSessions(): Promise<CockpitSession[]> {
    // Use lock to ensure we read AFTER any pending writes complete
    // This prevents race conditions where concurrent captures read stale data
    return this.withLock(async () => {
      const registry = await this.loadRegistryAsync();
      return registry.sessions;
    });
  }

  async getSessionsForTask(taskId: string): Promise<CockpitSession[]> {
    const sessions = await this.getSessions();
    // Exclude unassigned sessions from task-specific queries
    return sessions.filter(s => s.taskId === taskId && taskId !== UNASSIGNED_TASK_ID);
  }

  async getUnassignedSessions(): Promise<CockpitSession[]> {
    const sessions = await this.getSessions();
    return sessions.filter(s => s.taskId === UNASSIGNED_TASK_ID);
  }

  async getSession(sessionId: string): Promise<CockpitSession | null> {
    const sessions = await this.getSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  async registerSession(session: CockpitSession): Promise<void> {
    return this.withLock(async () => {
      const registry = await this.loadRegistryAsync();

      const existingIndex = registry.sessions.findIndex(s => s.id === session.id);
      if (existingIndex >= 0) {
        registry.sessions[existingIndex] = session;
      } else {
        registry.sessions.push(session);
      }

      await this.saveRegistryAsync(registry);
    });
  }

  async updateSession(
    sessionId: string,
    updates: Partial<CockpitSession>
  ): Promise<boolean> {
    return this.withLock(async () => {
      const registry = await this.loadRegistryAsync();
      const session = registry.sessions.find(s => s.id === sessionId);

      if (!session) {
        return false;
      }

      Object.assign(session, updates);
      await this.saveRegistryAsync(registry);
      return true;
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

  /**
   * Update a session's taskId when it switches to a different task via /task-start.
   *
   * This method is called by the signal handler when FileWatcher detects a
   * task-switch-signal.json file. It atomically updates the session registry
   * to keep it in sync with Claude's active task.
   *
   * Atomicity: Uses withLock() to prevent race conditions with other registry
   * operations (session creation, closure, etc.)
   *
   * Idempotency: Safe to call multiple times with same taskId (no-op if already set)
   *
   * Error handling: Returns false if session not found, allowing caller to
   * handle gracefully without throwing.
   *
   * @param sessionId - The session UUID to update
   * @param newTaskId - The new task ID (e.g., LOCAL-018)
   * @returns Promise<boolean> - true if update succeeded, false if session not found
   */
  async updateSessionTaskId(
    sessionId: string,
    newTaskId: string
  ): Promise<boolean> {
    return this.withLock(async () => {
      const registry = await this.loadRegistryAsync();
      const session = registry.sessions.find(s => s.id === sessionId);

      if (!session) {
        console.warn(`[AI Cockpit] Session ${sessionId} not found for task sync`);
        return false;
      }

      const oldTaskId = session.taskId;

      // Only update if taskId actually changed
      if (oldTaskId === newTaskId) {
        return true; // Already correct, no update needed
      }

      session.taskId = newTaskId;
      session.lastActive = new Date().toISOString();
      await this.saveRegistryAsync(registry);

      console.log(
        `[AI Cockpit] Session ${sessionId.substring(0, 8)}... task updated: ` +
        `${oldTaskId} → ${newTaskId}`
      );

      return true;
    });
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.withLock(async () => {
      const registry = await this.loadRegistryAsync();
      const originalLength = registry.sessions.length;
      registry.sessions = registry.sessions.filter(s => s.id !== sessionId);

      if (registry.sessions.length < originalLength) {
        await this.saveRegistryAsync(registry);
        return true;
      }
      return false;
    });
  }

  async closeSessionByTerminal(terminalName: string): Promise<void> {
    return this.withLock(async () => {
      const registry = await this.loadRegistryAsync();
      const session = registry.sessions.find(
        s => s.terminalName === terminalName && s.status === 'active'
      );

      if (session) {
        session.status = 'closed';
        session.lastActive = new Date().toISOString();
        await this.saveRegistryAsync(registry);
      }
    });
  }

  async closeSessionByTerminalId(terminalId: string): Promise<boolean> {
    return this.withLock(async () => {
      const registry = await this.loadRegistryAsync();
      const session = registry.sessions.find(
        s => s.terminalId === terminalId && s.status === 'active'
      );

      if (session) {
        session.status = 'closed';
        session.lastActive = new Date().toISOString();
        await this.saveRegistryAsync(registry);
        return true;
      }
      return false;
    });
  }

  async getActiveSessionByTerminalId(terminalId: string): Promise<CockpitSession | null> {
    const sessions = await this.getSessions();
    return sessions.find(
      s => s.terminalId === terminalId && s.status === 'active'
    ) || null;
  }

  async cleanupOldSessions(retentionDays: number): Promise<number> {
    return this.withLock(async () => {
      const registry = await this.loadRegistryAsync();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const originalCount = registry.sessions.length;
      registry.sessions = registry.sessions.filter(session => {
        // Never delete active sessions
        if (session.status === 'active') return true;

        // Keep sessions newer than cutoff
        const lastActive = new Date(session.lastActive);
        return lastActive > cutoffDate;
      });

      const deletedCount = originalCount - registry.sessions.length;
      if (deletedCount > 0) {
        await this.saveRegistryAsync(registry);
      }

      return deletedCount;
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

  private async loadRegistryAsync(): Promise<SessionRegistry> {
    try {
      await fs.promises.access(this.sessionsPath);
      const content = await fs.promises.readFile(this.sessionsPath, 'utf8');
      const registry = safeJsonParse<SessionRegistry>(
        content,
        { sessions: [] },
        'sessions.json'
      );

      // Validate sessions array
      if (!Array.isArray(registry.sessions)) {
        console.warn('AI Cockpit: Invalid sessions format, resetting');
        return { sessions: [] };
      }

      // Filter out invalid session objects
      registry.sessions = registry.sessions.filter(this.isValidSession);

      return registry;
    } catch {
      return { sessions: [] };
    }
  }

  private isValidSession(session: unknown): session is CockpitSession {
    if (!session || typeof session !== 'object') return false;
    const s = session as Record<string, unknown>;
    return (
      typeof s.id === 'string' &&
      typeof s.taskId === 'string' &&
      typeof s.label === 'string' &&
      typeof s.createdAt === 'string' &&
      typeof s.lastActive === 'string' &&
      typeof s.terminalName === 'string' &&
      (s.status === 'active' || s.status === 'closed') &&
      !isNaN(new Date(s.lastActive as string).getTime())
    );
  }

  async repairRegistry(): Promise<boolean> {
    return this.withLock(async () => {
      try {
        const content = await fs.promises.readFile(this.sessionsPath, 'utf8');
        JSON.parse(content); // Test parse
        return false; // No repair needed
      } catch {
        // Backup corrupted file
        const backupPath = `${this.sessionsPath}.backup.${Date.now()}`;
        try {
          await fs.promises.rename(this.sessionsPath, backupPath);
          console.log(`AI Cockpit: Backed up corrupted sessions to ${backupPath}`);
        } catch {
          // File might not exist
        }

        // Create fresh registry
        await this.saveRegistryAsync({ sessions: [] });
        return true; // Repair performed
      }
    });
  }

  private async saveRegistryAsync(registry: SessionRegistry): Promise<void> {
    const dir = path.dirname(this.sessionsPath);
    try {
      await fs.promises.access(dir);
    } catch {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(
      this.sessionsPath,
      JSON.stringify(registry, null, 2),
      'utf8'
    );
  }

  /**
   * Continuously verify that active sessions match active-task.json.
   * This is a safety net in case signal files are missed.
   *
   * Checks every `intervalMs` (default 3000ms) and repairs mismatches automatically.
   * Returns a disposable to stop verification.
   *
   * @param intervalMs - Polling interval in milliseconds (default 3000)
   * @returns Disposable to stop verification
   */
  startContinuousVerification(intervalMs: number = 3000): { dispose: () => void } {
    const verificationInterval = setInterval(async () => {
      try {
        await this.verifyAndRepairSessions();
        await this.cleanupOldSignalFiles();
      } catch (error) {
        // Silent fail - don't spam logs on every poll
        // Only log if actual repair happened
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

  /**
   * Verify active sessions match active-task.json and repair mismatches.
   * This is called periodically by startContinuousVerification().
   */
  private async verifyAndRepairSessions(): Promise<void> {
    // Read active-task.json
    const activeTaskPath = path.join(
      path.dirname(this.sessionsPath),
      'active-task.json'
    );

    if (!fs.existsSync(activeTaskPath)) {
      // No active task, nothing to verify
      return;
    }

    let activeTask: { taskId?: string } | null = null;
    try {
      const content = await fs.promises.readFile(activeTaskPath, 'utf8');
      activeTask = JSON.parse(content);
    } catch {
      // File might be corrupted or being written, skip this cycle
      return;
    }

    if (!activeTask?.taskId) {
      return;
    }

    // Get all active sessions
    const sessions = await this.getSessions();
    const activeSessions = sessions.filter(s => s.status === 'active');

    // Check each active session
    for (const session of activeSessions) {
      if (session.taskId !== activeTask.taskId) {
        console.warn(
          `[AI Cockpit] Session mismatch detected (verification). ` +
          `Session ${session.id.substring(0, 8)}... assigned to ${session.taskId} ` +
          `but active task is ${activeTask.taskId}`
        );

        // Repair the mismatch
        const updated = await this.updateSessionTaskId(
          session.id,
          activeTask.taskId
        );

        if (updated) {
          console.log(
            `[AI Cockpit] Repaired session ${session.id.substring(0, 8)}... ` +
            `via verification fallback`
          );
        }
      }
    }
  }

  /**
   * Clean up signal files older than 60 seconds.
   * Called periodically to prevent accumulation.
   */
  private async cleanupOldSignalFiles(): Promise<void> {
    const signalPath = path.join(
      path.dirname(this.sessionsPath),
      'task-switch-signal.json'
    );

    try {
      const stats = await fs.promises.stat(signalPath);
      const ageMs = Date.now() - stats.mtimeMs;

      if (ageMs > 60000) { // 60 seconds
        await fs.promises.unlink(signalPath);
        console.log('[AI Cockpit] Cleaned up old signal file');
      }
    } catch {
      // File doesn't exist or error reading, ignore
    }
  }
}
