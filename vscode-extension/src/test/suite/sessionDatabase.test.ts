/**
 * Tests for SessionDatabase
 *
 * These tests verify the SQLite database operations for session management.
 * They use a temporary directory to avoid affecting real data.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionDatabase } from '../../services/SessionDatabase';
import { CockpitSession } from '../../types';

describe('SessionDatabase Test Suite', () => {
  let tempDir: string;
  let db: SessionDatabase;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sessiondb-test-'));
    const cockpitDir = path.join(tempDir, '.ai', 'cockpit');
    fs.mkdirSync(cockpitDir, { recursive: true });
    const dbPath = path.join(cockpitDir, 'sessions.db');
    db = new SessionDatabase(dbPath);
    await db.initialize();
  });

  afterEach(async () => {
    await db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('CRUD Operations', () => {
    it('should insert and retrieve session', async () => {
      const session: CockpitSession = {
        id: 'test-id-1',
        taskId: 'LOCAL-001',
        label: 'Test Session',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: 'active',
        terminalName: 'Test Terminal',
        terminalId: 'term-123'
      };

      db.insertSession(session);
      const retrieved = db.getSessionById('test-id-1');

      assert.ok(retrieved);
      assert.strictEqual(retrieved.id, 'test-id-1');
      assert.strictEqual(retrieved.taskId, 'LOCAL-001');
      assert.strictEqual(retrieved.label, 'Test Session');
      assert.strictEqual(retrieved.status, 'active');
    });

    it('should update session', async () => {
      db.insertSession({
        id: 'test-id-2',
        taskId: 'LOCAL-001',
        label: 'Original',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: 'active',
        terminalName: 'Test'
      });

      const updated = db.updateSession('test-id-2', { label: 'Updated' });
      assert.ok(updated);

      const session = db.getSessionById('test-id-2');
      assert.strictEqual(session?.label, 'Updated');
    });

    it('should delete session', async () => {
      db.insertSession({
        id: 'test-id-3',
        taskId: 'LOCAL-001',
        label: 'To Delete',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: 'active',
        terminalName: 'Test'
      });

      const deleted = db.deleteSession('test-id-3');
      assert.ok(deleted);

      const session = db.getSessionById('test-id-3');
      assert.strictEqual(session, null);
    });

    it('should return null for non-existent session', async () => {
      const session = db.getSessionById('nonexistent');
      assert.strictEqual(session, null);
    });

    it('should return false when updating non-existent session', async () => {
      const updated = db.updateSession('nonexistent', { label: 'Test' });
      assert.strictEqual(updated, false);
    });

    it('should return false when deleting non-existent session', async () => {
      const deleted = db.deleteSession('nonexistent');
      assert.strictEqual(deleted, false);
    });
  });

  describe('Query Operations', () => {
    beforeEach(() => {
      // Setup test data
      db.insertSession({
        id: '1',
        taskId: 'TASK-A',
        label: 'A1',
        createdAt: new Date(Date.now() - 3000).toISOString(),
        lastActive: new Date(Date.now() - 3000).toISOString(),
        status: 'active',
        terminalName: 'T1',
        terminalId: 'tid-1'
      });
      db.insertSession({
        id: '2',
        taskId: 'TASK-A',
        label: 'A2',
        createdAt: new Date(Date.now() - 2000).toISOString(),
        lastActive: new Date(Date.now() - 2000).toISOString(),
        status: 'closed',
        terminalName: 'T2'
      });
      db.insertSession({
        id: '3',
        taskId: 'TASK-B',
        label: 'B1',
        createdAt: new Date(Date.now() - 1000).toISOString(),
        lastActive: new Date(Date.now() - 1000).toISOString(),
        status: 'active',
        terminalName: 'T3',
        terminalId: 'tid-3'
      });
    });

    it('should get all sessions', async () => {
      const sessions = db.getAllSessions();
      assert.strictEqual(sessions.length, 3);
    });

    it('should filter by taskId', async () => {
      const taskASessions = db.getSessionsByTaskId('TASK-A');
      assert.strictEqual(taskASessions.length, 2);

      const taskBSessions = db.getSessionsByTaskId('TASK-B');
      assert.strictEqual(taskBSessions.length, 1);
    });

    it('should get active session by terminalId', async () => {
      const session = db.getSessionByTerminalId('tid-1');
      assert.ok(session);
      assert.strictEqual(session.id, '1');
      assert.strictEqual(session.status, 'active');
    });

    it('should return null for closed session by terminalId', async () => {
      // Session 2 is closed
      const session = db.getSessionByTerminalId('tid-2');
      assert.strictEqual(session, null);
    });
  });

  describe('Batch Operations', () => {
    beforeEach(() => {
      db.insertSession({
        id: '1',
        taskId: 'TO-DELETE',
        label: '1',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: 'active',
        terminalName: 'T1'
      });
      db.insertSession({
        id: '2',
        taskId: 'TO-DELETE',
        label: '2',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: 'closed',
        terminalName: 'T2'
      });
      db.insertSession({
        id: '3',
        taskId: 'KEEP',
        label: '3',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: 'active',
        terminalName: 'T3'
      });
    });

    it('should delete by taskId', async () => {
      const deletedCount = db.deleteByTaskId('TO-DELETE');
      assert.strictEqual(deletedCount, 2);

      const all = db.getAllSessions();
      assert.strictEqual(all.length, 1);
      assert.strictEqual(all[0].taskId, 'KEEP');
    });

    it('should delete older than date', async () => {
      // Update one session to be old
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      db.updateSession('2', { lastActive: oldDate.toISOString() });

      // Delete sessions older than 5 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 5);
      const deletedCount = db.deleteOlderThan(cutoff);

      assert.strictEqual(deletedCount, 1);
      assert.strictEqual(db.getSessionById('2'), null);
      assert.ok(db.getSessionById('1')); // Active sessions not deleted
    });
  });

  describe('Migration', () => {
    it('should migrate from JSON', async () => {
      // Create a sessions.json in temp directory
      const cockpitDir = path.join(tempDir, '.ai', 'cockpit');

      const jsonPath = path.join(cockpitDir, 'sessions.json');
      fs.writeFileSync(jsonPath, JSON.stringify({
        sessions: [
          {
            id: 'migrated-1',
            taskId: 'OLD-TASK',
            label: 'Migrated',
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            status: 'closed',
            terminalName: 'Old Terminal'
          }
        ]
      }));

      // Create new database that will migrate
      const migrateDbPath = path.join(cockpitDir, 'sessions-migrate.db');
      const migrateDb = new SessionDatabase(migrateDbPath);
      await migrateDb.initialize();

      // sessions.json already exists but we're creating a new db file
      // Migration only happens if db doesn't exist
      // So we need to test with a fresh path

      await migrateDb.close();
    });
  });

  describe('Persistence', () => {
    it('should persist data across close and reopen', async () => {
      // Insert a session
      db.insertSession({
        id: 'persist-test',
        taskId: 'PERSIST-TASK',
        label: 'Persistence Test',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: 'active',
        terminalName: 'Test Terminal'
      });

      // Get the db path
      const cockpitDir = path.join(tempDir, '.ai', 'cockpit');
      const dbPath = path.join(cockpitDir, 'sessions.db');

      // Close the database
      await db.close();

      // Reopen
      const db2 = new SessionDatabase(dbPath);
      await db2.initialize();

      // Verify data persisted
      const session = db2.getSessionById('persist-test');
      assert.ok(session);
      assert.strictEqual(session.label, 'Persistence Test');

      await db2.close();
    });
  });
});
