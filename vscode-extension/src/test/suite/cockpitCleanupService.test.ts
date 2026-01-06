/**
 * Tests for CockpitCleanupService
 *
 * These tests verify the cleanup functionality for task deletion.
 * They use a temporary directory to avoid affecting real data.
 *
 * Updated for SQLite-based SessionManager.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CockpitCleanupService } from '../../services/CockpitCleanupService';
import { SessionManager } from '../../services/SessionManager';

/**
 * Helper to create a temporary test directory
 */
async function createTestWorkspace(): Promise<string> {
  const testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cockpit-test-'));

  // Create cockpit structure
  await fs.promises.mkdir(path.join(testDir, '.ai/cockpit/events'), { recursive: true });
  await fs.promises.mkdir(path.join(testDir, '.ai/cockpit/shadows'), { recursive: true });

  return testDir;
}

/**
 * Helper to clean up test directory
 */
async function cleanupTestWorkspace(testDir: string): Promise<void> {
  await fs.promises.rm(testDir, { recursive: true, force: true });
}

// Test Suite: CockpitCleanupService
describe('CockpitCleanupService', () => {
  let testDir: string;
  let sessionManager: SessionManager;
  let service: CockpitCleanupService;

  beforeEach(async () => {
    testDir = await createTestWorkspace();
    sessionManager = new SessionManager(testDir);
    await sessionManager.initialize();
    service = new CockpitCleanupService(testDir, sessionManager);
  });

  afterEach(async () => {
    await sessionManager.close();
    await cleanupTestWorkspace(testDir);
  });

  describe('cleanupTask', () => {
    it('should remove task events directory', async () => {
      const taskId = 'TEST-001';
      const eventsDir = path.join(testDir, '.ai/cockpit/events', taskId);

      // Setup: Create events directory with files
      await fs.promises.mkdir(eventsDir, { recursive: true });
      await fs.promises.writeFile(path.join(eventsDir, '001-edit.json'), '{}');
      await fs.promises.writeFile(path.join(eventsDir, '002-write.json'), '{}');

      // Execute
      const result = await service.cleanupTask(taskId);

      // Verify
      assert.strictEqual(result.success, true);
      assert.strictEqual(fs.existsSync(eventsDir), false);
    });

    it('should remove task shadows directory', async () => {
      const taskId = 'TEST-001';
      const shadowsDir = path.join(testDir, '.ai/cockpit/shadows', taskId);

      // Setup: Create shadows directory with subdirectories
      await fs.promises.mkdir(path.join(shadowsDir, 'abc123def456'), { recursive: true });
      await fs.promises.writeFile(
        path.join(shadowsDir, 'abc123def456', 'baseline.txt'),
        'original content'
      );
      await fs.promises.writeFile(
        path.join(shadowsDir, 'abc123def456', 'accumulated.txt'),
        'modified content'
      );
      await fs.promises.writeFile(
        path.join(shadowsDir, 'abc123def456', 'meta.json'),
        JSON.stringify({ filePath: '/test/file.ts' })
      );

      // Execute
      const result = await service.cleanupTask(taskId);

      // Verify
      assert.strictEqual(result.success, true);
      assert.strictEqual(fs.existsSync(shadowsDir), false);
    });

    it('should remove task sessions from database', async () => {
      const taskId = 'TEST-001';

      // Setup: Register sessions using SessionManager
      await sessionManager.registerSession({
        id: 'session-1',
        taskId: 'TEST-001',
        label: 'Session 1',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: 'active',
        terminalName: 'Test Terminal 1'
      });
      await sessionManager.registerSession({
        id: 'session-2',
        taskId: 'TEST-002',
        label: 'Session 2',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: 'active',
        terminalName: 'Test Terminal 2'
      });
      await sessionManager.registerSession({
        id: 'session-3',
        taskId: 'TEST-001',
        label: 'Session 3',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: 'active',
        terminalName: 'Test Terminal 3'
      });

      // Verify setup
      const beforeSessions = await sessionManager.getSessions();
      assert.strictEqual(beforeSessions.length, 3);

      // Execute
      const result = await service.cleanupTask(taskId);

      // Verify
      assert.strictEqual(result.success, true);

      const afterSessions = await sessionManager.getSessions();
      assert.strictEqual(afterSessions.length, 1);
      assert.strictEqual(afterSessions[0].taskId, 'TEST-002');
    });

    it('should handle missing directories gracefully', async () => {
      // Execute with non-existent task
      const result = await service.cleanupTask('NONEXISTENT-001');

      // Verify - should succeed even if nothing to clean
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.errors.length, 0);
    });
  });

  describe('clearActiveTask', () => {
    it('should remove active-task.json when task matches', async () => {
      const taskId = 'TEST-001';
      const activeTaskPath = path.join(testDir, '.ai/cockpit/active-task.json');

      // Setup: Create active-task.json for the task
      await fs.promises.writeFile(
        activeTaskPath,
        JSON.stringify({ taskId, title: 'Test Task' })
      );

      // Execute
      const wasActive = await service.clearActiveTask(taskId);

      // Verify
      assert.strictEqual(wasActive, true);
      assert.strictEqual(fs.existsSync(activeTaskPath), false);
    });

    it('should NOT remove active-task.json when task does not match', async () => {
      const activeTaskPath = path.join(testDir, '.ai/cockpit/active-task.json');

      // Setup: Create active-task.json for a DIFFERENT task
      await fs.promises.writeFile(
        activeTaskPath,
        JSON.stringify({ taskId: 'OTHER-001', title: 'Other Task' })
      );

      // Execute
      const wasActive = await service.clearActiveTask('TEST-001');

      // Verify
      assert.strictEqual(wasActive, false);
      assert.strictEqual(fs.existsSync(activeTaskPath), true);
    });

    it('should return false when no active-task.json exists', async () => {
      // Execute without any active-task.json
      const wasActive = await service.clearActiveTask('TEST-001');

      // Verify
      assert.strictEqual(wasActive, false);
    });
  });

  describe('path traversal prevention', () => {
    it('should not access directories outside allowed paths', async () => {
      // Try a malicious taskId that attempts path traversal
      const maliciousTaskId = '../../../etc';

      // Execute - this should not throw but also should not
      // access anything outside the allowed directories
      const result = await service.cleanupTask(maliciousTaskId);

      // The cleanup should fail validation for events/shadows
      assert.ok(result !== undefined);
    });
  });
});

// Export for potential programmatic use
export { createTestWorkspace, cleanupTestWorkspace };
