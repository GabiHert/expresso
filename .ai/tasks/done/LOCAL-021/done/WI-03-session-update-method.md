<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: WI-03-session-update-method.md                       ║
║ TASK: LOCAL-021                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                 ║
║ 2. Update status.yaml with new status                           ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml              ║
║ 5. Update task README with any learnings                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Add Session Task Update Method to SessionManager

## Objective

Implement `updateSessionTaskId()` method in SessionManager that atomically updates a session's taskId using the existing `withLock()` pattern to prevent race conditions.

## Pre-Implementation

Read these files first:
- `vscode-extension/src/services/SessionManager.ts` (current implementation)
- Study existing `updateSession()` method (line 54-70)
- Understand `withLock()` pattern (line 14-20)

## Implementation Steps

### Step 1: Implement updateSessionTaskId method

**File**: `vscode-extension/src/services/SessionManager.ts`

**Location**: After `linkSessionToTask()` method (around line 85)

```typescript
/**
 * Update a session's taskId when it switches to a different task.
 * Uses atomic lock to prevent race conditions.
 *
 * @param sessionId - The session UUID to update
 * @param newTaskId - The new task ID (e.g., LOCAL-018)
 * @returns true if update succeeded, false if session not found
 */
async updateSessionTaskId(
  sessionId: string,
  newTaskId: string
): Promise<boolean> {
  return this.withLock(async () => {
    const registry = await this.loadRegistryAsync();
    const session = registry.sessions.find(s => s.id === sessionId);

    if (!session) {
      console.warn(`AI Cockpit: Session ${sessionId} not found for task sync`);
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
      `AI Cockpit: Session ${sessionId.substring(0, 8)}... task updated: ` +
      `${oldTaskId} → ${newTaskId}`
    );

    return true;
  });
}
```

**Key design decisions**:
- Uses `withLock()` for atomic update (same pattern as other write methods)
- Returns `false` if session not found (caller can handle gracefully)
- Updates `lastActive` timestamp to track when sync occurred
- Logs update for debugging (truncates sessionId to 8 chars for readability)
- No-op if taskId already matches (idempotent)

### Step 2: Add JSDoc comment explaining usage

**Above the method**, add comprehensive documentation:
```typescript
/**
 * Update a session's taskId when it switches to a different task via /task-start.
 *
 * This method is called by the signal handler when FileWatcher detects a
 * task-switch-signal.json file. It atomically updates the session registry
 * to keep it in sync with Claude's active task.
 *
 * **Atomicity**: Uses withLock() to prevent race conditions with other registry
 * operations (session creation, closure, etc.)
 *
 * **Idempotency**: Safe to call multiple times with same taskId (no-op if already set)
 *
 * **Error handling**: Returns false if session not found, allowing caller to
 * handle gracefully without throwing.
 *
 * @example
 * ```typescript
 * const updated = await sessionManager.updateSessionTaskId(
 *   '2ca083d5-a144-4324-94d6-02f1e2e2d8b6',
 *   'LOCAL-018'
 * );
 * if (updated) {
 *   taskTreeProvider?.refresh();
 * }
 * ```
 *
 * @param sessionId - The session UUID to update
 * @param newTaskId - The new task ID (e.g., LOCAL-018)
 * @returns Promise<boolean> - true if update succeeded, false if session not found
 */
```

### Step 3: Add method to public API comment

**File**: `vscode-extension/src/services/SessionManager.ts`

**Update class-level comment** (around line 5):
```typescript
/**
 * Manages the Cockpit session registry (.ai/cockpit/sessions.json).
 *
 * ...existing comment...
 *
 * Methods:
 * - registerSession(): Add new session
 * - updateSession(): Update session fields
 * - updateSessionTaskId(): Sync session taskId with /task-start (NEW)
 * - closeSession(): Mark session as closed
 * - ...
 */
```

### Step 4: Consider adding a batch update method (optional)

**If multiple sessions need updating** (future optimization):
```typescript
async updateMultipleSessionTaskIds(
  sessionIds: string[],
  newTaskId: string
): Promise<number> {
  return this.withLock(async () => {
    const registry = await this.loadRegistryAsync();
    let updated = 0;

    for (const sessionId of sessionIds) {
      const session = registry.sessions.find(s => s.id === sessionId);
      if (session && session.taskId !== newTaskId) {
        session.taskId = newTaskId;
        session.lastActive = new Date().toISOString();
        updated++;
      }
    }

    if (updated > 0) {
      await this.saveRegistryAsync(registry);
      console.log(`AI Cockpit: Updated ${updated} sessions to task ${newTaskId}`);
    }

    return updated;
  });
}
```

**Note**: This is optional for future use. Skip for initial implementation.

## Post-Implementation

After completing:
1. Run `npm run compile` to check TypeScript errors
2. Write unit test (see below)
3. Test with actual sessions.json file

## Acceptance Criteria

- [ ] Method signature matches: `updateSessionTaskId(sessionId: string, newTaskId: string): Promise<boolean>`
- [ ] Uses `withLock()` for atomic update
- [ ] Returns `false` if session not found
- [ ] Updates both `taskId` and `lastActive` fields
- [ ] Logs update with old → new taskId
- [ ] Idempotent (safe to call multiple times)
- [ ] No TypeScript compilation errors
- [ ] JSDoc comment explains usage and atomicity

## Testing

### Unit Test (create in test/suite/sessionManager.test.ts)
```typescript
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { SessionManager } from '../../services/SessionManager';

describe('SessionManager.updateSessionTaskId', () => {
  let tempDir: string;
  let manager: SessionManager;

  beforeEach(async () => {
    tempDir = path.join(__dirname, 'test-session-update');
    await fs.promises.mkdir(tempDir, { recursive: true });
    manager = new SessionManager(tempDir);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('should update session taskId atomically', async () => {
    // Setup: register session for TASK-A
    await manager.registerSession({
      id: 'test-session-123',
      taskId: 'LOCAL-019',
      label: 'Test Session',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      status: 'active',
      terminalName: 'Test Terminal'
    });

    // Act: update to TASK-B
    const updated = await manager.updateSessionTaskId('test-session-123', 'LOCAL-018');

    // Assert
    assert.strictEqual(updated, true, 'Update should succeed');

    const session = await manager.getSession('test-session-123');
    assert.strictEqual(session?.taskId, 'LOCAL-018', 'TaskId should be updated');
  });

  it('should return false for non-existent session', async () => {
    const updated = await manager.updateSessionTaskId('non-existent-id', 'LOCAL-018');
    assert.strictEqual(updated, false, 'Should return false for non-existent session');
  });

  it('should be idempotent (no-op if taskId already matches)', async () => {
    await manager.registerSession({
      id: 'test-session-456',
      taskId: 'LOCAL-018',
      label: 'Test',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      status: 'active',
      terminalName: 'Test'
    });

    const updated1 = await manager.updateSessionTaskId('test-session-456', 'LOCAL-018');
    const updated2 = await manager.updateSessionTaskId('test-session-456', 'LOCAL-018');

    assert.strictEqual(updated1, true);
    assert.strictEqual(updated2, true);
  });

  it('should handle concurrent updates safely', async () => {
    await manager.registerSession({
      id: 'test-session-789',
      taskId: 'LOCAL-019',
      label: 'Test',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      status: 'active',
      terminalName: 'Test'
    });

    // Concurrent updates
    const promises = [
      manager.updateSessionTaskId('test-session-789', 'LOCAL-020'),
      manager.updateSessionTaskId('test-session-789', 'LOCAL-021'),
      manager.updateSessionTaskId('test-session-789', 'LOCAL-022')
    ];

    await Promise.all(promises);

    // Should succeed without corruption
    const session = await manager.getSession('test-session-789');
    assert.ok(session, 'Session should exist');
    assert.ok(['LOCAL-020', 'LOCAL-021', 'LOCAL-022'].includes(session!.taskId));
  });
});
```

### Manual Test
```typescript
// In a Claude session:
const manager = new SessionManager('/path/to/workspace');

// Register test session
await manager.registerSession({
  id: 'manual-test-session',
  taskId: 'LOCAL-019',
  label: 'Manual Test',
  createdAt: new Date().toISOString(),
  lastActive: new Date().toISOString(),
  status: 'active',
  terminalName: 'Test Terminal'
});

// Update taskId
const updated = await manager.updateSessionTaskId('manual-test-session', 'LOCAL-018');
console.log('Updated:', updated); // Should print: true

// Verify
const session = await manager.getSession('manual-test-session');
console.log('New taskId:', session?.taskId); // Should print: LOCAL-018
```

## Notes

- This method is the core synchronization point between Claude's task context and VSCode's registry
- The `withLock()` pattern prevents race conditions with other registry operations
- Method is designed to be called from the signal handler in WI-04
- Future enhancement: Add metrics/telemetry to track sync frequency
