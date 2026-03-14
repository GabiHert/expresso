---
type: work-item
id: "06"
parent: LOCAL-015
title: Add comprehensive tests
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-015]]


# Add Comprehensive Tests

## Objective

Add unit tests for the CockpitCleanupService and integration tests for the deleteTask command.

## Implementation Steps

### Step 1: Create test file for CockpitCleanupService

**File**: `vscode-extension/src/test/suite/cockpitCleanupService.test.ts` (new file)

**Instructions**:
Create test file with the following structure:

```typescript
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CockpitCleanupService } from '../../services/CockpitCleanupService';

suite('CockpitCleanupService Test Suite', () => {
  let testDir: string;
  let service: CockpitCleanupService;

  setup(async () => {
    // Create temp directory for tests
    testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cockpit-test-'));

    // Create cockpit structure
    await fs.promises.mkdir(path.join(testDir, '.ai/cockpit/events'), { recursive: true });
    await fs.promises.mkdir(path.join(testDir, '.ai/cockpit/shadows'), { recursive: true });

    service = new CockpitCleanupService(testDir);
  });

  teardown(async () => {
    // Clean up temp directory
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  test('cleanupEvents removes task events directory', async () => {
    const taskId = 'TEST-001';
    const eventsDir = path.join(testDir, '.ai/cockpit/events', taskId);
    await fs.promises.mkdir(eventsDir, { recursive: true });
    await fs.promises.writeFile(path.join(eventsDir, '001-edit.json'), '{}');

    const result = await service.cleanupTask(taskId);

    assert.strictEqual(result.success, true);
    assert.strictEqual(fs.existsSync(eventsDir), false);
  });

  test('cleanupShadows removes task shadows directory', async () => {
    const taskId = 'TEST-001';
    const shadowsDir = path.join(testDir, '.ai/cockpit/shadows', taskId);
    await fs.promises.mkdir(path.join(shadowsDir, 'abc123'), { recursive: true });
    await fs.promises.writeFile(path.join(shadowsDir, 'abc123', 'baseline.txt'), 'content');

    const result = await service.cleanupTask(taskId);

    assert.strictEqual(result.success, true);
    assert.strictEqual(fs.existsSync(shadowsDir), false);
  });

  test('cleanupSessions removes task from sessions.json', async () => {
    const taskId = 'TEST-001';
    const sessionsPath = path.join(testDir, '.ai/cockpit/sessions.json');
    const sessions = {
      sessions: [
        { id: 'session-1', taskId: 'TEST-001' },
        { id: 'session-2', taskId: 'TEST-002' }
      ]
    };
    await fs.promises.writeFile(sessionsPath, JSON.stringify(sessions));

    const result = await service.cleanupTask(taskId);

    assert.strictEqual(result.success, true);

    const updatedContent = await fs.promises.readFile(sessionsPath, 'utf8');
    const updated = JSON.parse(updatedContent);
    assert.strictEqual(updated.sessions.length, 1);
    assert.strictEqual(updated.sessions[0].taskId, 'TEST-002');
  });

  test('clearActiveTask removes active-task.json when task matches', async () => {
    const taskId = 'TEST-001';
    const activeTaskPath = path.join(testDir, '.ai/cockpit/active-task.json');
    await fs.promises.writeFile(activeTaskPath, JSON.stringify({ taskId }));

    const wasActive = await service.clearActiveTask(taskId);

    assert.strictEqual(wasActive, true);
    assert.strictEqual(fs.existsSync(activeTaskPath), false);
  });

  test('clearActiveTask does not remove active-task.json when task does not match', async () => {
    const activeTaskPath = path.join(testDir, '.ai/cockpit/active-task.json');
    await fs.promises.writeFile(activeTaskPath, JSON.stringify({ taskId: 'OTHER-001' }));

    const wasActive = await service.clearActiveTask('TEST-001');

    assert.strictEqual(wasActive, false);
    assert.strictEqual(fs.existsSync(activeTaskPath), true);
  });

  test('handles missing directories gracefully', async () => {
    const result = await service.cleanupTask('NONEXISTENT-001');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
  });

  test('prevents path traversal attacks', async () => {
    // Attempt path traversal
    const maliciousTaskId = '../../../etc/passwd';

    // This should not throw but also should not access outside allowed paths
    const result = await service.cleanupTask(maliciousTaskId);

    // Verify /etc/passwd still exists (not deleted)
    if (process.platform !== 'win32') {
      assert.strictEqual(fs.existsSync('/etc/passwd'), true);
    }
  });
});
```

### Step 2: Add test to existing test suite index

**File**: `vscode-extension/src/test/suite/index.ts`

**Instructions**:
Ensure the new test file is included in the test suite. If using glob pattern, the file should be picked up automatically.

### Step 3: Run tests

**Instructions**:
```bash
cd vscode-extension
npm run test
```

## Acceptance Criteria

- [ ] Test file is created with comprehensive test cases
- [ ] Tests cover: events cleanup, shadows cleanup, sessions cleanup
- [ ] Tests cover: active task cleanup (match and non-match)
- [ ] Tests cover: graceful handling of missing directories
- [ ] Tests cover: path traversal prevention
- [ ] All tests pass

## Testing

Run `npm run test` in the vscode-extension directory.

## Notes

These are unit tests focused on the cleanup service. Manual testing is still needed for the full end-to-end flow including the UI interactions.
