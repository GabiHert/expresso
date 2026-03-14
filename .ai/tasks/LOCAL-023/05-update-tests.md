---
type: work-item
id: "05"
parent: LOCAL-023
title: Update tests for database
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-023]]


# Update Tests for Database

## Objective

Update existing tests to work with the new SQLite-based SessionManager, and optionally add new tests for SessionDatabase.

## Pre-Implementation

1. Ensure Work Items 01-04 are complete
2. Review existing test files
3. Run tests to see current state

## Implementation Steps

### Step 1: Update cockpitCleanupService.test.ts

**File**: `vscode-extension/src/test/suite/cockpitCleanupService.test.ts`

The current test creates `sessions.json` directly. Update to use SessionManager:

```typescript
// BEFORE: Direct JSON file creation
const sessionsPath = path.join(tempDir, '.ai/cockpit/sessions.json');
await fs.promises.writeFile(sessionsPath, JSON.stringify({
  sessions: [{ id: 'test-session', taskId: 'TEST-001', ... }]
}));

// AFTER: Use SessionManager
const sessionManager = new SessionManager(tempDir);
await sessionManager.initialize();
await sessionManager.registerSession({
  id: 'test-session',
  taskId: 'TEST-001',
  label: 'Test Session',
  createdAt: new Date().toISOString(),
  lastActive: new Date().toISOString(),
  status: 'active',
  terminalName: 'Test Terminal'
});

// Pass sessionManager to CockpitCleanupService
const cleanupService = new CockpitCleanupService(tempDir, sessionManager);
```

**Update teardown**:
```typescript
// Close database in teardown
afterEach(async () => {
  await sessionManager?.close();
  // ... cleanup temp files ...
});
```

### Step 2: Update captureQueue.test.ts (if needed)

**File**: `vscode-extension/src/test/suite/captureQueue.test.ts`

This test uses a `MockSessionManager`. Check if it needs updates:

```typescript
// Current mock:
class MockSessionManager {
  async getSessions(): Promise<{ id: string }[]> { ... }
  addSession(id: string): void { ... }
}
```

If the mock interface matches the new SessionManager interface, no changes needed.

If new methods are required (initialize, close, deleteByTaskId), add them to the mock:

```typescript
class MockSessionManager {
  async initialize(): Promise<void> {}
  async close(): Promise<void> {}
  async getSessions(): Promise<{ id: string }[]> { ... }
  async deleteByTaskId(taskId: string): Promise<number> { return 0; }
  addSession(id: string): void { ... }
}
```

### Step 3: Add SessionDatabase Tests (Optional but Recommended)

**Create new file**: `vscode-extension/src/test/suite/sessionDatabase.test.ts`

```typescript
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { SessionDatabase } from '../../services/SessionDatabase';
import { CockpitSession } from '../../types';

suite('SessionDatabase Test Suite', () => {
  let tempDir: string;
  let db: SessionDatabase;

  setup(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sessiondb-test-'));
    const dbPath = path.join(tempDir, 'sessions.db');
    db = new SessionDatabase(dbPath);
    await db.initialize();
  });

  teardown(async () => {
    await db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should insert and retrieve session', async () => {
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
  });

  test('should update session', async () => {
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

  test('should delete session', async () => {
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

  test('should filter by taskId', async () => {
    db.insertSession({ id: '1', taskId: 'TASK-A', label: 'A1', createdAt: '', lastActive: '', status: 'active', terminalName: '' });
    db.insertSession({ id: '2', taskId: 'TASK-A', label: 'A2', createdAt: '', lastActive: '', status: 'active', terminalName: '' });
    db.insertSession({ id: '3', taskId: 'TASK-B', label: 'B1', createdAt: '', lastActive: '', status: 'active', terminalName: '' });

    const taskASessions = db.getSessionsByTaskId('TASK-A');
    assert.strictEqual(taskASessions.length, 2);

    const taskBSessions = db.getSessionsByTaskId('TASK-B');
    assert.strictEqual(taskBSessions.length, 1);
  });

  test('should delete by taskId', async () => {
    db.insertSession({ id: '1', taskId: 'TO-DELETE', label: '1', createdAt: '', lastActive: '', status: 'active', terminalName: '' });
    db.insertSession({ id: '2', taskId: 'TO-DELETE', label: '2', createdAt: '', lastActive: '', status: 'active', terminalName: '' });
    db.insertSession({ id: '3', taskId: 'KEEP', label: '3', createdAt: '', lastActive: '', status: 'active', terminalName: '' });

    const deletedCount = db.deleteByTaskId('TO-DELETE');
    assert.strictEqual(deletedCount, 2);

    const all = db.getAllSessions();
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].taskId, 'KEEP');
  });

  test('should migrate from JSON', async () => {
    // Create a sessions.json in temp directory
    const cockpitDir = path.join(tempDir, '.ai', 'cockpit');
    fs.mkdirSync(cockpitDir, { recursive: true });

    const jsonPath = path.join(cockpitDir, 'sessions.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      sessions: [
        { id: 'migrated-1', taskId: 'OLD-TASK', label: 'Migrated', createdAt: '', lastActive: '', status: 'closed', terminalName: '' }
      ]
    }));

    // Create new database that will migrate
    const migrateDbPath = path.join(cockpitDir, 'sessions.db');
    const migrateDb = new SessionDatabase(migrateDbPath);
    await migrateDb.initialize();

    const sessions = migrateDb.getAllSessions();
    assert.strictEqual(sessions.length, 1);
    assert.strictEqual(sessions[0].id, 'migrated-1');

    // Verify backup was created
    const backupFiles = fs.readdirSync(cockpitDir).filter(f => f.startsWith('sessions.json.backup'));
    assert.ok(backupFiles.length > 0, 'Backup file should exist');

    await migrateDb.close();
  });
});
```

### Step 4: Run All Tests

```bash
cd vscode-extension
npm test
```

Verify:
- All existing tests pass
- No regressions in capture queue behavior
- Cleanup service tests work with new SessionManager

## Acceptance Criteria

- [ ] cockpitCleanupService.test.ts updated for new constructor
- [ ] captureQueue.test.ts works (mock updated if needed)
- [ ] All existing tests pass
- [ ] SessionDatabase.test.ts added with core operation tests
- [ ] Migration test verifies JSON → SQLite works

## Testing

Run the test suite:
```bash
npm test
```

Expected output: All tests pass

## Notes

- Tests should clean up temp directories after each test
- Use in-memory database for faster tests if sql.js supports it
- Consider adding tests for edge cases:
  - Empty database
  - Invalid session data
  - Concurrent operations
  - Database file corruption recovery
