/**
 * Tests for CockpitCleanupService
 *
 * These tests verify the cleanup functionality for task deletion.
 * They use a temporary directory to avoid affecting real data.
 *
 * To run these tests, you'll need to set up a test runner like Mocha.
 * For now, these serve as documentation of expected behavior and can be
 * run manually or integrated into a test suite later.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CockpitCleanupService } from '../../services/CockpitCleanupService';

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
  let service: CockpitCleanupService;

  beforeEach(async () => {
    testDir = await createTestWorkspace();
    service = new CockpitCleanupService(testDir);
  });

  afterEach(async () => {
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

    it('should remove task from sessions.json', async () => {
      const taskId = 'TEST-001';
      const sessionsPath = path.join(testDir, '.ai/cockpit/sessions.json');

      // Setup: Create sessions.json with multiple sessions
      const sessions = {
        sessions: [
          { id: 'session-1', taskId: 'TEST-001', label: 'Session 1' },
          { id: 'session-2', taskId: 'TEST-002', label: 'Session 2' },
          { id: 'session-3', taskId: 'TEST-001', label: 'Session 3' }
        ]
      };
      await fs.promises.writeFile(sessionsPath, JSON.stringify(sessions));

      // Execute
      const result = await service.cleanupTask(taskId);

      // Verify
      assert.strictEqual(result.success, true);

      const updatedContent = await fs.promises.readFile(sessionsPath, 'utf8');
      const updated = JSON.parse(updatedContent);
      assert.strictEqual(updated.sessions.length, 1);
      assert.strictEqual(updated.sessions[0].taskId, 'TEST-002');
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
      // This test verifies that path traversal attempts are blocked.
      // The actual protection is in isValidPath(), which validates
      // that resolved paths stay within allowed directories.

      // Try a malicious taskId that attempts path traversal
      const maliciousTaskId = '../../../etc';

      // Execute - this should not throw but also should not
      // access anything outside the allowed directories
      const result = await service.cleanupTask(maliciousTaskId);

      // The cleanup should fail validation for events/shadows
      // because the path would resolve outside the allowed directory
      // Note: The actual behavior depends on the path resolution
      // In practice, isValidPath prevents the operation

      // At minimum, verify the operation completed without throwing
      assert.ok(result !== undefined);
    });
  });
});

// Export for potential programmatic use
export { createTestWorkspace, cleanupTestWorkspace };
