---
type: work-item
id: WI-05
parent: LOCAL-021
title: Add continuous verification fallback
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Add Continuous Verification Fallback

## Objective

Implement a background verification process that periodically checks if active sessions match `active-task.json` and repairs mismatches. This acts as a safety net if signal files are missed.

## Pre-Implementation

Read these files first:
- `vscode-extension/src/services/SessionManager.ts` (existing methods)
- Task README Risk section (understand what failures we're protecting against)
- Understand polling vs event-driven patterns

## Implementation Steps

### Step 1: Add verification method to SessionManager

**File**: `vscode-extension/src/services/SessionManager.ts`

**Location**: After `updateSessionTaskId()` method (end of class)

```typescript
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
    } catch (error) {
      // Silent fail - don't spam logs on every poll
      // Only log if actual repair happened
    }
  }, intervalMs);

  console.log(
    `AI Cockpit: Started session verification (interval: ${intervalMs}ms)`
  );

  return {
    dispose: () => {
      clearInterval(verificationInterval);
      console.log('AI Cockpit: Stopped session verification');
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
        `AI Cockpit: Session mismatch detected (verification). ` +
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
          `AI Cockpit: Repaired session ${session.id.substring(0, 8)}... ` +
          `via verification fallback`
        );
      }
    }
  }
}
```

### Step 2: Add import statements

**At top of SessionManager.ts**, ensure these imports exist:
```typescript
import * as fs from 'fs';
import * as path from 'path';
```

### Step 3: Start verification in extension activate()

**File**: `vscode-extension/src/extension.ts`

**Location**: In `activate()` function, after SessionManager initialization (around line 60)

```typescript
// Start continuous verification (safety net for missed signals)
let verificationDisposable: { dispose: () => void } | null = null;
if (sessionManager) {
  verificationDisposable = sessionManager.startContinuousVerification(3000);
  context.subscriptions.push(verificationDisposable);
}
```

### Step 4: Add configuration option (optional)

**File**: `package.json` (extension manifest)

**Add to configuration section**:
```json
"aiCockpit.sessionVerification.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Enable continuous verification of session-task mappings"
},
"aiCockpit.sessionVerification.intervalMs": {
  "type": "number",
  "default": 3000,
  "minimum": 1000,
  "maximum": 60000,
  "description": "Verification polling interval in milliseconds"
}
```

**Then read config in extension.ts**:
```typescript
const config = vscode.workspace.getConfiguration('aiCockpit');
const verificationEnabled = config.get<boolean>('sessionVerification.enabled', true);
const verificationInterval = config.get<number>('sessionVerification.intervalMs', 3000);

if (sessionManager && verificationEnabled) {
  verificationDisposable = sessionManager.startContinuousVerification(verificationInterval);
  context.subscriptions.push(verificationDisposable);
}
```

**Note**: Configuration is optional. Skip for initial implementation.

### Step 5: Add refresh trigger for UI updates

**Modify verifyAndRepairSessions()** to trigger UI refresh after repair:

```typescript
// After successful repair, trigger UI refresh
if (updated) {
  console.log(
    `AI Cockpit: Repaired session ${session.id.substring(0, 8)}... ` +
    `via verification fallback`
  );

  // Notify extension to refresh tree view
  // (Will implement callback mechanism in Step 6)
}
```

### Step 6: Add callback for UI refresh (optional)

**In SessionManager.ts**, add callback property:
```typescript
private onVerificationRepairCallback?: () => void;

setVerificationRepairCallback(callback: () => void): void {
  this.onVerificationRepairCallback = callback;
}
```

**Then call it after repair**:
```typescript
if (updated) {
  this.onVerificationRepairCallback?.();
}
```

**In extension.ts**:
```typescript
sessionManager.setVerificationRepairCallback(() => {
  taskTreeProvider?.refresh();
});
```

**Note**: This is optional. Skip if tree refresh isn't critical for fallback.

## Post-Implementation

After completing:
1. Run `npm run compile` to check TypeScript errors
2. Test: Manually corrupt sessions.json, verify repair
3. Monitor CPU usage (should be < 0.1%)

## Acceptance Criteria

- [ ] startContinuousVerification() method added to SessionManager
- [ ] Verification runs every 3 seconds (configurable)
- [ ] Only checks active sessions (not closed)
- [ ] Only repairs if active-task.json exists
- [ ] Repairs mismatches automatically
- [ ] Logs warnings for detected mismatches
- [ ] Logs successful repairs
- [ ] Silent fail on file I/O errors (no spam)
- [ ] Disposable returned to stop verification
- [ ] Verification started in extension activate()
- [ ] Verification stopped on extension deactivate()
- [ ] CPU usage < 0.1% on average

## Testing

### Unit Test
```typescript
describe('SessionManager.verifyAndRepairSessions', () => {
  it('should repair mismatched sessions', async () => {
    const manager = new SessionManager(testDir);

    // Setup: Create session for TASK-A
    await manager.registerSession({
      id: 'test-session',
      taskId: 'LOCAL-019',
      status: 'active',
      ...
    });

    // Setup: Write active-task.json for TASK-B
    const activeTaskPath = path.join(testDir, '.ai/cockpit/active-task.json');
    await fs.promises.writeFile(activeTaskPath, JSON.stringify({
      taskId: 'LOCAL-018'
    }));

    // Act: Run verification
    await (manager as any).verifyAndRepairSessions();

    // Assert: Session should be updated to TASK-B
    const session = await manager.getSession('test-session');
    assert.strictEqual(session?.taskId, 'LOCAL-018');
  });

  it('should not repair closed sessions', async () => {
    const manager = new SessionManager(testDir);

    await manager.registerSession({
      id: 'closed-session',
      taskId: 'LOCAL-019',
      status: 'closed', // Closed session
      ...
    });

    const activeTaskPath = path.join(testDir, '.ai/cockpit/active-task.json');
    await fs.promises.writeFile(activeTaskPath, JSON.stringify({
      taskId: 'LOCAL-018'
    }));

    await (manager as any).verifyAndRepairSessions();

    // Assert: Closed session should NOT be updated
    const session = await manager.getSession('closed-session');
    assert.strictEqual(session?.taskId, 'LOCAL-019');
  });
});
```

### Manual Test
```bash
# Test 1: Verify automatic repair
1. Open VSCode with extension
2. Create session for LOCAL-019
3. Manually edit sessions.json to show taskId: LOCAL-018 (wrong)
4. Run /task-start LOCAL-019 in Claude
5. Wait 3 seconds
6. Check logs: Should see "Session mismatch detected"
7. Check logs: Should see "Repaired session..."
8. Check sessions.json: Should be corrected to LOCAL-019

# Test 2: Verify performance
1. Open Task Manager / Activity Monitor
2. Find VSCode process
3. Monitor CPU usage
4. Should be < 0.1% on average (tiny spikes every 3s)
```

### Performance Benchmark
```typescript
// Add temporary telemetry to verifyAndRepairSessions()
const startTime = Date.now();
await this.verifyAndRepairSessions();
const duration = Date.now() - startTime;
console.log(`Verification cycle took ${duration}ms`);

// Expected: < 10ms per cycle (file I/O + JSON parse + array filter)
```

## Notes

- This is a defense-in-depth measure, not the primary sync mechanism
- Should catch: missed signal files, corrupt signal files, VSCode restart during switch
- Polling is acceptable (3s interval, minimal overhead)
- Alternative: Use file watcher on active-task.json with debouncing
- Consider increasing interval to 5-10s if performance is concern
- Future: Add metrics to track how often fallback is triggered (indicates signal reliability)

## Troubleshooting

**Issue**: Verification using too much CPU
- Increase interval from 3000ms to 5000ms or 10000ms
- Check: Are there hundreds of sessions? (consider optimization)

**Issue**: Verification not repairing
- Check: Is active-task.json present?
- Check: Are sessions marked as 'active'?
- Check: Is verification actually running? (check logs)

**Issue**: Verification conflicts with signal handler
- This is expected and safe (both use withLock() for atomicity)
- Last update wins (verification or signal, whichever runs last)
