import * as fs from 'fs';
import * as path from 'path';
import { CockpitSession, SessionRegistry } from '../types';

export class SessionManager {
  private sessionsPath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private workspaceRoot: string) {
    this.sessionsPath = path.join(workspaceRoot, '.ai/cockpit/sessions.json');
  }

  getSessions(): CockpitSession[] {
    const registry = this.loadRegistry();
    return registry.sessions;
  }

  getSessionsForTask(taskId: string): CockpitSession[] {
    return this.getSessions().filter(s => s.taskId === taskId);
  }

  getSession(sessionId: string): CockpitSession | null {
    return this.getSessions().find(s => s.id === sessionId) || null;
  }

  async registerSession(session: CockpitSession): Promise<void> {
    return this.withLock(() => {
      const registry = this.loadRegistry();

      const existingIndex = registry.sessions.findIndex(s => s.id === session.id);
      if (existingIndex >= 0) {
        registry.sessions[existingIndex] = session;
      } else {
        registry.sessions.push(session);
      }

      this.saveRegistry(registry);
    });
  }

  async updateSession(
    sessionId: string,
    updates: Partial<CockpitSession>
  ): Promise<boolean> {
    return this.withLock(() => {
      const registry = this.loadRegistry();
      const session = registry.sessions.find(s => s.id === sessionId);

      if (!session) {
        return false;
      }

      Object.assign(session, updates);
      this.saveRegistry(registry);
      return true;
    });
  }

  async closeSession(sessionId: string): Promise<boolean> {
    return this.updateSession(sessionId, {
      status: 'closed',
      lastActive: new Date().toISOString()
    });
  }

  async closeSessionByTerminal(terminalName: string): Promise<void> {
    return this.withLock(() => {
      const registry = this.loadRegistry();
      const session = registry.sessions.find(
        s => s.terminalName === terminalName && s.status === 'active'
      );

      if (session) {
        session.status = 'closed';
        session.lastActive = new Date().toISOString();
        this.saveRegistry(registry);
      }
    });
  }

  private withLock<T>(operation: () => T): Promise<T> {
    const result = this.writeQueue.then(() => operation());
    this.writeQueue = result.then(
      () => {},
      () => {}
    );
    return result;
  }

  private loadRegistry(): SessionRegistry {
    try {
      if (fs.existsSync(this.sessionsPath)) {
        const content = fs.readFileSync(this.sessionsPath, 'utf8');
        return JSON.parse(content) as SessionRegistry;
      }
    } catch {
      // Return empty registry on error
    }
    return { sessions: [] };
  }

  private saveRegistry(registry: SessionRegistry): void {
    const dir = path.dirname(this.sessionsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      this.sessionsPath,
      JSON.stringify(registry, null, 2),
      'utf8'
    );
  }
}
