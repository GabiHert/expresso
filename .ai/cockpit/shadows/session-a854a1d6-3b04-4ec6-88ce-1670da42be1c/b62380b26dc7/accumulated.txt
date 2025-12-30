<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-implement-command.md                               ║
║ TASK: LOCAL-015                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Implement deleteTask Command

## Objective

Implement the core deleteTask command handler that shows a confirmation dialog and deletes the task folder.

## Pre-Implementation

Review the deleteSession implementation at extension.ts:540-577 for the pattern to follow.

## Implementation Steps

### Step 1: Add deleteTask command registration

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
Add the command registration after the deleteSession command (around line 577). Follow the same pattern:

```typescript
const deleteTask = vscode.commands.registerCommand(
  'aiCockpit.deleteTask',
  async (item: { taskId?: string; task?: { taskId: string; status: string; title: string } }) => {
    const taskId = item?.taskId || item?.task?.taskId;
    const status = item?.task?.status;
    const title = item?.task?.title || taskId;

    if (!taskId || !status) {
      vscode.window.showWarningMessage('No task selected');
      return;
    }

    // Validate status
    const VALID_STATUSES = ['todo', 'in_progress', 'done'];
    if (!VALID_STATUSES.includes(status)) {
      vscode.window.showErrorMessage('Invalid task status');
      return;
    }

    // Build warning message based on task state
    let warningMessage = `Delete task "${title}"?`;
    let detail = 'This will permanently remove the task and all associated data (events, shadows, sessions).';

    if (status === 'in_progress') {
      warningMessage = `Delete in-progress task "${title}"?`;
      detail = 'WARNING: This task is currently in progress. ' + detail;
    }

    // Confirmation dialog
    const result = await vscode.window.showWarningMessage(
      warningMessage,
      { modal: true, detail },
      'Delete'
    );

    if (result !== 'Delete') {
      return;
    }

    // Construct task path
    const taskPath = path.join(workspaceRoot, '.ai/tasks', status, taskId);

    // Security: Validate path stays within allowed directory
    const resolvedTaskPath = path.resolve(taskPath);
    const allowedBase = path.resolve(workspaceRoot, '.ai/tasks');
    if (!resolvedTaskPath.startsWith(allowedBase + path.sep)) {
      vscode.window.showErrorMessage('Invalid task path');
      return;
    }

    try {
      // Delete task folder
      await fs.promises.rm(taskPath, { recursive: true, force: true });

      // Refresh tree view
      taskTreeProvider?.refresh();

      vscode.window.showInformationMessage(`Task "${taskId}" deleted`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete task: ${error}`);
    }
  }
);

context.subscriptions.push(deleteTask);
```

### Step 2: Add fs import if not present

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
Ensure `fs` is imported at the top of the file:
```typescript
import * as fs from 'fs';
```

## Acceptance Criteria

- [ ] deleteTask command is registered in extension.ts
- [ ] Confirmation dialog is shown before deletion
- [ ] Extra warning is shown for in-progress tasks
- [ ] Task folder is deleted on confirmation
- [ ] Tree view is refreshed after deletion
- [ ] Success message is shown
- [ ] Path traversal attack is prevented

## Testing

1. Run extension in debug mode
2. Create a test task or use an existing one
3. Right-click and select "Delete Task"
4. Verify confirmation dialog appears
5. Confirm deletion and verify:
   - Task folder is removed
   - Tree view updates
   - Success message appears

## Notes

This is the basic implementation. Work item 04 will add the cockpit data cleanup (events, shadows, sessions).
