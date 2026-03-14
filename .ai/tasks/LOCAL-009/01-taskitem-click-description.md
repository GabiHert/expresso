---
type: work-item
id: "01"
parent: LOCAL-009
title: Change TaskItem click to open description
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-009]]


# Change TaskItem click to open description

## Objective

Modify the TaskItem class so that clicking a task in the sidebar opens its README.md file in the editor instead of opening a Claude terminal.

## Pre-Implementation

The `openTask` command already exists in extension.ts (lines 115-135) - it opens README files. We just need to wire TaskItem clicks to use this command instead of `openTaskTerminal`.

## Implementation Steps

### Step 1: Modify TaskItem command property

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

**Location**: Lines 347-352 (inside TaskItem constructor)

**Current code**:
```typescript
this.command = {
  command: 'aiCockpit.openTaskTerminal',
  title: 'Open Task Terminal',
  arguments: [{ taskId: task.taskId, title: task.title }]
};
```

**Change to**:
```typescript
this.command = {
  command: 'aiCockpit.openTask',
  title: 'View Task',
  arguments: [{ taskId: task.taskId, status: task.status, title: task.title }]
};
```

### Step 2: Verify openTask handler accepts the arguments

**File**: `vscode-extension/src/extension.ts`

**Location**: Lines 115-135

Verify the `openTask` command handler can work with the arguments structure:
- It needs `taskId` and `status` to construct the README path
- Current implementation should already handle this

## Acceptance Criteria

- [ ] Clicking a task item opens its README.md in the editor
- [ ] The correct README is opened based on task status (todo/in_progress/done)
- [ ] No terminal is opened on task click

## Testing

1. Click a task in "In Progress" section → Should open `.ai/tasks/in_progress/{taskId}/README.md`
2. Click a task in "Todo" section → Should open `.ai/tasks/todo/{taskId}/README.md`
3. Click a task in "Done" section → Should open `.ai/tasks/done/{taskId}/README.md`

## Notes

- The `openTaskTerminal` command should still be available via context menu if users want terminal access
- Consider adding "Open Terminal" to task context menu if not already present
