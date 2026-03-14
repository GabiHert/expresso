---
type: work-item
id: WI-04
parent: LOCAL-021
title: Wire signal handler in extension
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-021]]


# Wire Signal Handler in Extension

## Objective

Connect the FileWatcher's `onTaskSwitched` event to SessionManager's `updateSessionTaskId()` method in the extension's `activate()` function, completing the synchronization flow.

## Pre-Implementation

Read these files first:
- `vscode-extension/src/extension.ts` (lines 1-100 for context)
- WI-02 and WI-03 work items (dependencies)
- Understand the extension activation flow

## Implementation Steps

### Step 1: Locate the event listener setup area

**File**: `vscode-extension/src/extension.ts`

**Location**: In `activate()` function, after FileWatcher initialization (around line 79)

Look for existing event listeners:
```typescript
fileWatcher.onActiveTaskChanged(() => { ... });
fileWatcher.onEventAdded(() => { ... });
```

The new listener should go **after** these.

### Step 2: Add task switch event listener

**Add after existing FileWatcher listeners**:
```typescript
// Listen for task switches from /task-start command
fileWatcher.onTaskSwitched(async (signal) => {
  if (!sessionManager) {
    return;
  }

  console.log(
    `AI Cockpit: Task switch detected: ${signal.previousTaskId} → ${signal.newTaskId}`
  );

  try {
    // Find active sessions that belong to the previous task
    const sessions = await sessionManager.getSessions();
    const sessionsToUpdate = sessions.filter(
      s => s.taskId === signal.previousTaskId && s.status === 'active'
    );

    if (sessionsToUpdate.length === 0) {
      console.log(
        `AI Cockpit: No active sessions found for ${signal.previousTaskId}, skipping sync`
      );
      return;
    }

    // Update each matching session
    let updateCount = 0;
    for (const session of sessionsToUpdate) {
      const updated = await sessionManager.updateSessionTaskId(
        session.id,
        signal.newTaskId
      );
      if (updated) {
        updateCount++;
      }
    }

    console.log(
      `AI Cockpit: Synced ${updateCount} session(s) from ${signal.previousTaskId} ` +
      `to ${signal.newTaskId}`
    );

    // Refresh tree view to show updated task assignments
    if (updateCount > 0 && taskTreeProvider) {
      taskTreeProvider.refresh();
    }
  } catch (error) {
    console.error('AI Cockpit: Error handling task switch:', error);
    // Don't crash the extension - log and continue
  }
});
```

**Key design decisions**:
- Only update **active** sessions (closed sessions shouldn't be modified)
- Only update sessions that **match the previous taskId** (don't update unrelated sessions)
- Handle **multiple sessions** (user might have multiple sessions for same task)
- **Graceful error handling** (don't crash extension if update fails)
- **Refresh UI** after successful update

### Step 3: Add explanatory comment above listener

**Add comment block**:
```typescript
/**
 * Session Task Synchronization
 *
 * When a user runs /task-start within a Claude session, the task-start command
 * writes a signal file that triggers this listener. We then update the session
 * registry to match the new task, ensuring:
 * - Resume operations open the correct session
 * - Events are attributed to the correct task
 * - UI shows sessions under the correct task tree
 *
 * This solves the session-task desync issue where sessions created for TASK-A
 * never update when the user switches to TASK-B via /task-start.
 */
```

### Step 4: Consider adding telemetry (optional)

**If project uses telemetry**, add tracking:
```typescript
// After successful updates
telemetry?.trackEvent('session.task.synced', {
  previousTaskId: signal.previousTaskId,
  newTaskId: signal.newTaskId,
  sessionCount: updateCount
});
```

**Note**: Skip if telemetry not implemented yet.

### Step 5: Add error notification for user (optional)

**If updates fail**, consider notifying user:
```typescript
if (updateCount === 0 && sessionsToUpdate.length > 0) {
  vscode.window.showWarningMessage(
    `AI Cockpit: Failed to sync session to ${signal.newTaskId}. ` +
    `Try restarting the session.`
  );
}
```

**Note**: Only show if all updates fail (not for zero sessions found).

## Post-Implementation

After completing:
1. Run `npm run compile` to check TypeScript errors
2. Test with real task switch (see below)
3. Verify tree view refreshes correctly

## Acceptance Criteria

- [ ] Event listener added in activate() function
- [ ] Only updates sessions matching previousTaskId
- [ ] Only updates active sessions (not closed)
- [ ] Handles multiple sessions for same task
- [ ] Refreshes tree view after successful update
- [ ] Error handling prevents extension crash
- [ ] Logs all operations for debugging
- [ ] No TypeScript compilation errors

## Testing

### Manual E2E Test
```bash
# Prerequisites:
# - VSCode with AI Cockpit extension loaded
# - Extension development host running (F5)

# Step 1: Create session for LOCAL-019
1. Open Cockpit sidebar
2. Click "New Session" on LOCAL-019 task
3. Verify session appears under LOCAL-019 in tree

# Step 2: Switch task in Claude
4. In Claude terminal: /task-start LOCAL-018
5. Wait 1 second

# Step 3: Verify sync
6. Check Cockpit sidebar
   → Session should now appear under LOCAL-018 (not LOCAL-019)
7. Check Output panel (AI Cockpit)
   → Should see: "Task switch detected: LOCAL-019 → LOCAL-018"
   → Should see: "Synced 1 session(s) from LOCAL-019 to LOCAL-018"

# Step 4: Verify resume works
8. Close Claude terminal
9. Click "Resume" on LOCAL-018 session
   → Should resume correct session (not wrong task)
```

### Edge Case Test: Multiple Sessions
```bash
# Step 1: Create 2 sessions for LOCAL-019
1. Create session 1 for LOCAL-019
2. Create session 2 for LOCAL-019
3. Verify both appear under LOCAL-019

# Step 2: Switch task in one terminal
4. In terminal 1: /task-start LOCAL-018
5. Wait 1 second

# Step 3: Verify both sessions updated
6. Check Cockpit sidebar
   → Both sessions should now be under LOCAL-018
7. Check logs
   → Should see: "Synced 2 session(s)..."
```

### Error Handling Test
```bash
# Test: Signal file with invalid format
1. Create session for LOCAL-019
2. Manually write bad signal file:
   echo '{"invalid": true}' > .ai/cockpit/task-switch-signal.json
3. Verify: Extension doesn't crash
4. Check logs: Should see warning about invalid format
```

## Notes

- This is the final integration point connecting CLI and VSCode
- The listener is fire-and-forget (doesn't block other operations)
- Multiple rapid task switches are handled sequentially
- If session was manually linked to a different task, this will override it
- Consider adding a setting to disable auto-sync in future (user preference)

## Troubleshooting

**Issue**: Sessions not updating after task switch
- Check: Is FileWatcher started? (should start in activate())
- Check: Does signal file exist? (should be deleted after processing)
- Check: Are sessions marked as 'active'? (closed sessions not updated)
- Check: Output panel logs for errors

**Issue**: Tree view not refreshing
- Check: Is taskTreeProvider initialized?
- Check: Is refresh() being called after update?
- Try: Manual refresh (right-click → Refresh in sidebar)

**Issue**: Wrong sessions being updated
- Check: previousTaskId in signal matches session's taskId
- Check: Only active sessions are being filtered
- Verify: Signal file has correct previousTaskId
