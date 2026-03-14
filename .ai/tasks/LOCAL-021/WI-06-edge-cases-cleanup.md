---
type: work-item
id: WI-06
parent: LOCAL-021
title: Add edge case handling and cleanup
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-021]]


# Add Edge Case Handling and Cleanup

## Objective

Handle edge cases and implement cleanup logic to ensure the session synchronization system is robust and doesn't accumulate cruft over time.

## Pre-Implementation

Read these files first:
- All previous work items (WI-01 through WI-05)
- Task README Risks & Considerations section
- Understand failure modes

## Implementation Steps

### Edge Case 1: Terminal Closed During Task Switch

**Problem**: User runs `/task-start`, then immediately closes terminal before signal is processed.

**Solution**: Check terminal still exists before updating session.

**File**: `vscode-extension/src/extension.ts`

**Location**: In `onTaskSwitched` handler (from WI-04)

**Modify the update loop**:
```typescript
for (const session of sessionsToUpdate) {
  // Check if terminal still exists
  const terminal = terminalManager?.getTerminal(session.terminalId);
  if (!terminal) {
    console.log(
      `AI Cockpit: Skipping session ${session.id.substring(0, 8)}... ` +
      `(terminal closed)`
    );
    continue;
  }

  const updated = await sessionManager.updateSessionTaskId(
    session.id,
    signal.newTaskId
  );
  if (updated) {
    updateCount++;
  }
}
```

**Add helper method to TerminalManager** (if not exists):
```typescript
// In TerminalManager.ts
getTerminal(terminalId?: string): vscode.Terminal | null {
  if (!terminalId) return null;
  const entry = this.terminals.get(terminalId);
  return entry?.terminal ?? null;
}
```

### Edge Case 2: Multiple Rapid Task Switches

**Problem**: User runs `/task-start A`, then `/task-start B`, then `/task-start C` rapidly.

**Solution**: Queue signal processing (already handled by file watcher debouncing, but add logging).

**File**: `vscode-extension/src/watchers/FileWatcher.ts`

**Location**: In `handleTaskSwitch()` method

**Add queue detection**:
```typescript
private async handleTaskSwitch(): Promise<void> {
  // Debounce: If multiple signals arrive rapidly, only process the last one
  const signal = await this.readTaskSwitchSignal();
  if (!signal) {
    return;
  }

  console.log(
    `AI Cockpit: Processing task switch: ${signal.previousTaskId} → ${signal.newTaskId}`
  );

  // Small delay to allow rapid switches to accumulate
  await new Promise(resolve => setTimeout(resolve, 100));

  // Re-read signal file (might have changed)
  const latestSignal = await this.readTaskSwitchSignal();
  if (!latestSignal) {
    console.log('AI Cockpit: Signal file disappeared, skipping');
    return;
  }

  if (latestSignal.newTaskId !== signal.newTaskId) {
    console.log(
      `AI Cockpit: Signal updated during processing, using latest: ${latestSignal.newTaskId}`
    );
  }

  this._onTaskSwitched.fire(latestSignal);
  await this.deleteSignalFile();
}
```

### Edge Case 3: Corrupt Signal File

**Problem**: Signal file is malformed or partially written.

**Solution**: Validate JSON and required fields (already done in WI-02, but add schema validation).

**File**: `vscode-extension/src/watchers/FileWatcher.ts`

**Location**: In `readTaskSwitchSignal()` method

**Enhance validation**:
```typescript
private async readTaskSwitchSignal(): Promise<TaskSwitchSignal | null> {
  const signalPath = path.join(this.cockpitPath, 'task-switch-signal.json');

  try {
    const content = await fs.promises.readFile(signalPath, 'utf-8');
    const signal = JSON.parse(content);

    // Validate all required fields
    if (!signal.previousTaskId || typeof signal.previousTaskId !== 'string') {
      console.warn('AI Cockpit: Invalid signal - missing/invalid previousTaskId');
      await this.deleteSignalFile(); // Clean up bad signal
      return null;
    }

    if (!signal.newTaskId || typeof signal.newTaskId !== 'string') {
      console.warn('AI Cockpit: Invalid signal - missing/invalid newTaskId');
      await this.deleteSignalFile();
      return null;
    }

    if (signal.type !== 'task-switch') {
      console.warn('AI Cockpit: Invalid signal - wrong type:', signal.type);
      await this.deleteSignalFile();
      return null;
    }

    // Validate taskId format (e.g., LOCAL-XXX)
    const taskIdPattern = /^[A-Z]+-\d+$/;
    if (!taskIdPattern.test(signal.newTaskId)) {
      console.warn('AI Cockpit: Invalid signal - malformed taskId:', signal.newTaskId);
      await this.deleteSignalFile();
      return null;
    }

    return signal as TaskSwitchSignal;
  } catch (error) {
    console.error('AI Cockpit: Error reading signal file:', error);
    // Try to delete corrupt file
    await this.deleteSignalFile();
    return null;
  }
}
```

### Edge Case 4: Signal File Accumulation

**Problem**: If extension is not running, signal files accumulate over time.

**Solution**: Clean up old signal files on extension startup.

**File**: `vscode-extension/src/extension.ts`

**Location**: In `activate()` function, before starting FileWatcher

```typescript
// Clean up any stale signal files on startup
if (workspaceRoot) {
  const signalPath = path.join(workspaceRoot, '.ai/cockpit/task-switch-signal.json');
  try {
    await fs.promises.unlink(signalPath);
    console.log('AI Cockpit: Cleaned up stale signal file');
  } catch {
    // File doesn't exist, that's fine
  }
}
```

### Edge Case 5: VSCode Restart During Task Switch

**Problem**: User runs `/task-start`, VSCode crashes/restarts before signal is processed.

**Solution**: Verification fallback (WI-05) will repair on next verification cycle.

**No additional code needed** - document this behavior.

**File**: Task README (add to Risk section)

```markdown
| VSCode restart during switch | Low | Verification repair on next startup (within 3s) |
```

### Edge Case 6: Concurrent Sessions Switching to Different Tasks

**Problem**: User has 2 sessions for TASK-A, runs `/task-start TASK-B` in terminal 1 and `/task-start TASK-C` in terminal 2 simultaneously.

**Solution**: Each signal is processed independently with correct session matching.

**Verify this works** with test:
```typescript
// In test/suite/integration.test.ts
it('should handle concurrent task switches in different terminals', async () => {
  // Create 2 sessions for TASK-A
  const session1 = await sessionManager.registerSession({
    id: 'session-1',
    taskId: 'LOCAL-019',
    status: 'active',
    terminalId: 'terminal-1',
    ...
  });

  const session2 = await sessionManager.registerSession({
    id: 'session-2',
    taskId: 'LOCAL-019',
    status: 'active',
    terminalId: 'terminal-2',
    ...
  });

  // Simulate concurrent switches
  // Terminal 1: TASK-A → TASK-B
  // Terminal 2: TASK-A → TASK-C

  // Process signals
  await handleTaskSwitch({ previousTaskId: 'LOCAL-019', newTaskId: 'LOCAL-018' });
  await handleTaskSwitch({ previousTaskId: 'LOCAL-019', newTaskId: 'LOCAL-020' });

  // Both sessions should update (not just one)
  const updated1 = await sessionManager.getSession('session-1');
  const updated2 = await sessionManager.getSession('session-2');

  // Final taskIds depend on signal processing order
  // Both should be different from original LOCAL-019
  assert.notStrictEqual(updated1?.taskId, 'LOCAL-019');
  assert.notStrictEqual(updated2?.taskId, 'LOCAL-019');
});
```

### Cleanup 1: Memory Leak Prevention

**Problem**: Event listeners not disposed properly.

**Solution**: Ensure all disposables are registered with context.subscriptions.

**File**: `vscode-extension/src/extension.ts`

**Location**: In `activate()` function

**Verify all listeners are added**:
```typescript
// Verify these are all in context.subscriptions:
context.subscriptions.push(
  openTaskTerminal,
  resumeSession,
  // ... other commands ...
  fileWatcher, // Disposes internal listeners
  verificationDisposable, // Stops polling
  terminalCloseHandler,
  // ... etc
);
```

### Cleanup 2: Orphaned Signal Files

**Problem**: If FileWatcher crashes, signal file might not be deleted.

**Solution**: Periodic cleanup of old signal files.

**File**: `vscode-extension/src/services/SessionManager.ts`

**Add cleanup method**:
```typescript
/**
 * Clean up signal files older than 60 seconds.
 * Called periodically to prevent accumulation.
 */
async cleanupOldSignalFiles(): Promise<void> {
  const signalPath = path.join(
    path.dirname(this.sessionsPath),
    'task-switch-signal.json'
  );

  try {
    const stats = await fs.promises.stat(signalPath);
    const ageMs = Date.now() - stats.mtimeMs;

    if (ageMs > 60000) { // 60 seconds
      await fs.promises.unlink(signalPath);
      console.log('AI Cockpit: Cleaned up old signal file');
    }
  } catch {
    // File doesn't exist or error reading, ignore
  }
}
```

**Call from verification loop**:
```typescript
// In startContinuousVerification(), add to interval:
const verificationInterval = setInterval(async () => {
  try {
    await this.verifyAndRepairSessions();
    await this.cleanupOldSignalFiles(); // Clean up every cycle
  } catch (error) {
    // ...
  }
}, intervalMs);
```

### Cleanup 3: Log Rotation

**Problem**: Debug logs can grow large over time.

**Solution**: Use VSCode OutputChannel properly (automatic rotation).

**File**: `vscode-extension/src/extension.ts`

**Ensure OutputChannel is used** (if not already):
```typescript
const outputChannel = vscode.window.createOutputChannel('AI Cockpit');
context.subscriptions.push(outputChannel);

// Replace console.log with outputChannel.appendLine
outputChannel.appendLine('AI Cockpit: Extension activated');
```

**Note**: This is optional if console.log is acceptable.

## Post-Implementation

After completing:
1. Run all edge case tests
2. Monitor memory usage over 1 hour
3. Check for orphaned signal files after heavy use

## Acceptance Criteria

- [ ] Terminal closed during switch handled gracefully
- [ ] Multiple rapid switches processed correctly (last one wins)
- [ ] Corrupt signal files cleaned up automatically
- [ ] Stale signal files cleaned on startup
- [ ] Orphaned signal files cleaned periodically
- [ ] No memory leaks (verify with heap snapshot)
- [ ] Concurrent switches in different terminals work correctly
- [ ] All event listeners disposed on deactivate
- [ ] TaskId format validated before processing

## Testing

### Edge Case Test Suite
```typescript
describe('Edge Cases', () => {
  it('should handle terminal close during switch', async () => {
    // Test implementation
  });

  it('should process last signal from rapid switches', async () => {
    // Test implementation
  });

  it('should ignore corrupt signal files', async () => {
    // Test implementation
  });

  it('should clean up old signal files', async () => {
    // Test implementation
  });
});
```

### Memory Leak Test
```bash
# Manual test:
1. Open VSCode with extension
2. Create 10 sessions
3. Run /task-start 50 times rapidly
4. Take heap snapshot
5. Close all sessions
6. Force GC (--expose-gc flag)
7. Take another heap snapshot
8. Compare: Should not grow unboundedly
```

## Notes

- Defense in depth: Each edge case has fallback (signal + verification)
- Cleanup is important for long-running VSCode instances
- Consider adding telemetry to track edge case frequency
- Future: Add health check command to diagnose issues

## Troubleshooting

**Issue**: Signal files accumulating
- Check: Is FileWatcher disposing properly?
- Check: Is cleanup method being called?
- Manual: Delete .ai/cockpit/task-switch-signal.json

**Issue**: Memory usage growing
- Check: Are event listeners being disposed?
- Check: Is verification interval cleared on deactivate?
- Tool: Use VSCode memory profiler

**Issue**: Sessions updating to wrong task
- Check: Is previousTaskId matching correctly?
- Check: Are multiple signals being processed?
- Debug: Add detailed logging to signal handler
