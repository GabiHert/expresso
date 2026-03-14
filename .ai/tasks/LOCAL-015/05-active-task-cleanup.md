---
type: work-item
id: "05"
parent: LOCAL-015
title: Handle active task and panel cleanup
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-015]]


# Handle Active Task and Panel Cleanup

## Objective

Handle edge cases when deleting the active task (clear active-task.json) and close any open DiffReviewPanels for the deleted task.

## Implementation Steps

### Step 1: Add active task cleanup to CockpitCleanupService

**File**: `vscode-extension/src/services/CockpitCleanupService.ts`

**Instructions**:
Add a method to clear active-task.json if it matches the deleted task:

```typescript
/**
 * Clear active-task.json if it references the deleted task
 */
async clearActiveTask(taskId: string): Promise<boolean> {
  const activeTaskPath = path.join(this.workspaceRoot, '.ai/cockpit/active-task.json');

  if (!fs.existsSync(activeTaskPath)) {
    return false; // No active task file
  }

  try {
    const content = await fs.promises.readFile(activeTaskPath, 'utf8');
    const activeTask = JSON.parse(content);

    if (activeTask.taskId === taskId) {
      await fs.promises.unlink(activeTaskPath);
      return true; // Active task was cleared
    }

    return false; // Different task is active
  } catch (error) {
    console.error('Failed to read/clear active-task.json:', error);
    return false;
  }
}
```

Update the `cleanupTask` method to also call `clearActiveTask`:

```typescript
async cleanupTask(taskId: string): Promise<{ success: boolean; errors: string[]; wasActive: boolean }> {
  const errors: string[] = [];
  let wasActive = false;

  // ... existing cleanup code ...

  // 4. Clear active task if it matches
  try {
    wasActive = await this.clearActiveTask(taskId);
  } catch (error) {
    errors.push(`Active task cleanup failed: ${error}`);
  }

  return {
    success: errors.length === 0,
    errors,
    wasActive
  };
}
```

### Step 2: Add method to close DiffReviewPanels for a task

**File**: `vscode-extension/src/panels/DiffReviewPanel.ts`

**Instructions**:
Add a static method to close all panels for a specific task:

```typescript
/**
 * Close all DiffReviewPanels for a specific task
 */
public static closeAllForTask(taskId: string): number {
  let closedCount = 0;

  for (const [key, panel] of DiffReviewPanel.panels.entries()) {
    // Key format is "{taskId}:{filePath}"
    if (key.startsWith(`${taskId}:`)) {
      panel.dispose();
      closedCount++;
    }
  }

  return closedCount;
}
```

### Step 3: Update deleteTask command to handle active task and panels

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
Update the deleteTask command to:
1. Import DiffReviewPanel if not already imported
2. Close any open panels for the task
3. Show additional message if task was active

```typescript
// Add import at top
import { DiffReviewPanel } from './panels/DiffReviewPanel';

// In the deleteTask command, before cleanup:
// Close any open DiffReviewPanels for this task
const closedPanels = DiffReviewPanel.closeAllForTask(taskId);

// After cleanup:
const cleanupResult = await cockpitCleanupService.cleanupTask(taskId);

// Update success message:
let successMsg = `Task "${taskId}" deleted`;
if (cleanupResult.wasActive) {
  successMsg += ' (was active task)';
}
if (closedPanels > 0) {
  successMsg += ` - closed ${closedPanels} diff panel(s)`;
}
vscode.window.showInformationMessage(successMsg);
```

## Acceptance Criteria

- [ ] active-task.json is cleared if deleted task is the active task
- [ ] DiffReviewPanels for deleted task are automatically closed
- [ ] User is informed if the deleted task was active
- [ ] User is informed how many panels were closed

## Testing

1. Start a task with `/task-start`
2. Make edits to generate shadows
3. Open diff review panel for a file
4. Delete the task
5. Verify:
   - active-task.json is removed
   - Diff panel is closed
   - Appropriate message is shown

## Notes

The panel cleanup prevents orphaned webviews that would fail when trying to access deleted task data.
