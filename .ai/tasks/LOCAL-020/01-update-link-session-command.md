---
type: work-item
id: "01"
parent: LOCAL-020
title: Update linkSessionToTask command
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-020]]


# Update linkSessionToTask Command

## Objective

Modify the `linkSessionToTask` command in extension.ts to read tasks from both `in_progress/` and `todo/` directories, allowing users to assign sessions to TODO tasks.

## Pre-Implementation

The exploration has already been done. Key findings:
- Limitation is at `extension.ts:906-914`
- SessionManager accepts any taskId (no changes needed there)
- Only UI layer needs modification

## Implementation Steps

### Step 1: Update Directory Reading Logic

**File**: `vscode-extension/src/extension.ts`
**Lines**: 906-924

**Current Code** (lines 906-914):
```typescript
// Get list of in-progress tasks
const inProgressPath = path.join(workspaceRoot, '.ai/tasks/in_progress');
let taskIds: string[] = [];
try {
  const entries = await fs.promises.readdir(inProgressPath, { withFileTypes: true });
  taskIds = entries.filter(e => e.isDirectory()).map(e => e.name);
} catch {
  // No in_progress directory
}
```

**Replace with:**
```typescript
// Get list of tasks from in_progress and todo directories
const tasksPath = path.join(workspaceRoot, '.ai/tasks');
const tasksByStatus: { taskId: string; status: string }[] = [];

for (const status of ['in_progress', 'todo']) {
  const statusPath = path.join(tasksPath, status);
  try {
    const entries = await fs.promises.readdir(statusPath, { withFileTypes: true });
    const tasks = entries.filter(e => e.isDirectory()).map(e => e.name);
    tasks.forEach(taskId => tasksByStatus.push({ taskId, status }));
  } catch {
    // Status directory might not exist
  }
}
```

### Step 2: Update Error Message

**File**: `vscode-extension/src/extension.ts`
**Line**: ~917

**Current Code:**
```typescript
if (taskIds.length === 0) {
  vscode.window.showWarningMessage('No in-progress tasks to link to');
  return;
}
```

**Replace with:**
```typescript
if (tasksByStatus.length === 0) {
  vscode.window.showWarningMessage('No tasks available to link to');
  return;
}
```

### Step 3: Update Quick Pick Display

**File**: `vscode-extension/src/extension.ts`
**Lines**: ~921-924

**Current Code:**
```typescript
const selectedTask = await vscode.window.showQuickPick(taskIds, {
  placeHolder: 'Select a task to link this session to'
});
```

**Replace with:**
```typescript
const quickPickItems = tasksByStatus.map(({ taskId, status }) => ({
  label: taskId,
  description: status.replace('_', ' ')  // "in_progress" -> "in progress"
}));

const selectedTask = await vscode.window.showQuickPick(quickPickItems, {
  placeHolder: 'Select a task to link this session to'
});
```

### Step 4: Update Selected Task Usage

**File**: `vscode-extension/src/extension.ts`
**Line**: ~930

**Current Code:**
```typescript
const linked = await sessionManager.linkSessionToTask(session.id, selectedTask);
```

**Replace with:**
```typescript
const linked = await sessionManager.linkSessionToTask(session.id, selectedTask.label);
```

## Post-Implementation

Run a code review agent to check for issues.

## Acceptance Criteria

- [ ] TODO tasks appear in the quick pick list
- [ ] Task status is shown as description (e.g., "in progress", "todo")
- [ ] Selecting a TODO task successfully links the session
- [ ] In-progress tasks still work as before
- [ ] Warning message says "No tasks available" when no tasks exist

## Testing

1. Create a new TODO task: `/task-create LOCAL-TEST "Test task"`
2. Start an unassigned session in Cockpit
3. Right-click the session → "Link to Task"
4. Verify LOCAL-TEST appears with "(todo)" description
5. Select it and verify session moves under the task
6. Repeat with an in-progress task to verify backward compatibility

## Notes

- The `SessionManager.linkSessionToTask()` method doesn't validate task status, so no changes needed there
- Consider in future: adding "done" tasks to the list (currently excluded intentionally)
