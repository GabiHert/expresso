import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { CockpitSession } from '../types';

export class SessionDatabase {
  private db: Database | null = null;
  private dbPath: string;
  private initialized: boolean = false;
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly SAVE_DEBOUNCE_MS = 100;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const SQL = await initSqlJs();
    const dbDir = path.dirname(this.dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
      this.createSchema();

      const jsonPath = path.join(path.dirname(this.dbPath), 'sessions.json');
      if (fs.existsSync(jsonPath)) {
        await this.migrateFromJson(jsonPath);
      }

      this.saveToFile();
    }

    this.initialized = true;
    console.log('AI Cockpit: SessionDatabase initialized');
  }

  async close(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    if (this.db) {
      this.saveToFile();
      this.db.close();
      this.db = null;
    }

    this.initialized = false;
    console.log('AI Cockpit: SessionDatabase closed');
  }

  private createSchema(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        label TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        lastActive TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active', 'closed')),
        terminalName TEXT NOT NULL,
        terminalId TEXT
      )
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_sessions_taskId ON sessions(taskId)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_sessions_terminalId ON sessions(terminalId)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_sessions_lastActive ON sessions(lastActive)');
  }

  private async migrateFromJson(jsonPath: string): Promise<void> {
    console.log('AI Cockpit: Migrating sessions from JSON...');

    try {
      const content = fs.readFileSync(jsonPath, 'utf8');
      const registry = JSON.parse(content);

      if (!registry.sessions || !Array.isArray(registry.sessions)) {
        console.warn('AI Cockpit: Invalid sessions.json format, skipping migration');
        return;
      }

      let migratedCount = 0;
      for (const session of registry.sessions) {
        if (this.isValidSession(session)) {
          // Use internal insert (no initialization check) during migration
          this.insertSessionInternal(session);
          migratedCount++;
        } else {
          console.warn(`AI Cockpit: Skipping invalid session: ${JSON.stringify(session)}`);
        }
      }

      const timestamp = Date.now();
      const backupPath = `${jsonPath}.backup.${timestamp}`;
      fs.renameSync(jsonPath, backupPath);

      console.log(`AI Cockpit: Migrated ${migratedCount} sessions, backup at ${backupPath}`);
    } catch (error) {
      console.error('AI Cockpit: Migration failed:', error);
      throw new Error(`Migration failed: ${error}`);
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
      (s.status === 'active' || s.status === 'closed')
    );
  }

  private saveToFile(): void {
    if (!this.db) return;

    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveToFile();
      this.saveTimeout = null;
    }, this.SAVE_DEBOUNCE_MS);
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error('SessionDatabase not initialized. Call initialize() first.');
    }
  }

  getAllSessions(): CockpitSession[] {
    this.ensureInitialized();

    const stmt = this.db!.prepare('SELECT * FROM sessions ORDER BY lastActive DESC');
    const sessions: CockpitSession[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      sessions.push(this.rowToSession(row));
    }

    stmt.free();
    return sessions;
  }

  getSessionsByTaskId(taskId: string): CockpitSession[] {
    this.ensureInitialized();

    const stmt = this.db!.prepare('SELECT * FROM sessions WHERE taskId = ? ORDER BY lastActive DESC');
    stmt.bind([taskId]);

    const sessions: CockpitSession[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      sessions.push(this.rowToSession(row));
    }

    stmt.free();
    return sessions;
  }

  getSessionById(id: string): CockpitSession | null {
    this.ensureInitialized();

    const stmt = this.db!.prepare('SELECT * FROM sessions WHERE id = ?');
    stmt.bind([id]);

    let session: CockpitSession | null = null;
    if (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      session = this.rowToSession(row);
    }

    stmt.free();
    return session;
  }

  getSessionByTerminalId(terminalId: string): CockpitSession | null {
    this.ensureInitialized();

    const stmt = this.db!.prepare(
      'SELECT * FROM sessions WHERE terminalId = ? AND status = ? ORDER BY lastActive DESC LIMIT 1'
    );
    stmt.bind([terminalId, 'active']);

    let session: CockpitSession | null = null;
    if (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      session = this.rowToSession(row);
    }

    stmt.free();
    return session;
  }

  /**
   * Internal insert without initialization check - used during migration
   */
  private insertSessionInternal(session: CockpitSession): void {
    if (!this.db) return;

    this.db.run(
      `INSERT INTO sessions (id, taskId, label, createdAt, lastActive, status, terminalName, terminalId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.taskId,
        session.label,
        session.createdAt,
        session.lastActive,
        session.status,
        session.terminalName,
        session.terminalId || null
      ]
    );
  }

  insertSession(session: CockpitSession): void {
    this.ensureInitialized();
    this.insertSessionInternal(session);
    this.debouncedSave();
  }

  updateSession(id: string, updates: Partial<CockpitSession>): boolean {
    this.ensureInitialized();

    const existing = this.getSessionById(id);
    if (!existing) {
      return false;
    }

    const fields: string[] = [];
    const values: (string | null)[] = [];

    if (updates.taskId !== undefined) {
      fields.push('taskId = ?');
      values.push(updates.taskId);
    }
    if (updates.label !== undefined) {
      fields.push('label = ?');
      values.push(updates.label);
    }
    if (updates.lastActive !== undefined) {
      fields.push('lastActive = ?');
      values.push(updates.lastActive);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.terminalName !== undefined) {
      fields.push('terminalName = ?');
      values.push(updates.terminalName);
    }
    if (updates.terminalId !== undefined) {
      fields.push('terminalId = ?');
      values.push(updates.terminalId || null);
    }

    if (fields.length === 0) {
      return true;
    }

    values.push(id);
    this.db!.run(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`, values);

    this.debouncedSave();
    return true;
  }

  deleteSession(id: string): boolean {
    this.ensureInitialized();

    const existing = this.getSessionById(id);
    if (!existing) {
      return false;
    }

    this.db!.run('DELETE FROM sessions WHERE id = ?', [id]);
    this.debouncedSave();
    return true;
  }

  deleteByTaskId(taskId: string): number {
    this.ensureInitialized();

    const sessions = this.getSessionsByTaskId(taskId);
    if (sessions.length === 0) {
      return 0;
    }

    this.db!.run('DELETE FROM sessions WHERE taskId = ?', [taskId]);
    this.debouncedSave();
    return sessions.length;
  }

  deleteOlderThan(cutoffDate: Date): number {
    this.ensureInitialized();

    const cutoffIso = cutoffDate.toISOString();

    const countStmt = this.db!.prepare(
      'SELECT COUNT(*) as count FROM sessions WHERE status = ? AND lastActive < ?'
    );
    countStmt.bind(['closed', cutoffIso]);
    countStmt.step();
    const count = (countStmt.getAsObject() as { count: number }).count;
    countStmt.free();

    if (count > 0) {
      this.db!.run(
        'DELETE FROM sessions WHERE status = ? AND lastActive < ?',
        ['closed', cutoffIso]
      );
      this.debouncedSave();
    }

    return count;
  }

  private rowToSession(row: Record<string, unknown>): CockpitSession {
    return {
      id: row.id as string,
      taskId: row.taskId as string,
      label: row.label as string,
      createdAt: row.createdAt as string,
      lastActive: row.lastActive as string,
      status: row.status as 'active' | 'closed',
      terminalName: row.terminalName as string,
      terminalId: row.terminalId as string | undefined
    };
  }
}
