---
type: work-item
id: "02"
parent: LOCAL-009
title: Add WorkItemNode click handler
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-009]]


# Add WorkItemNode click handler

## Objective

Add a click handler to the WorkItemNode class so that clicking a work item in the sidebar opens its markdown file in the editor.

## Pre-Implementation

Currently WorkItemNode (lines 356-375) has NO command property - clicking does nothing. We need to add a command that opens the work item file.

Work item files are located at:
`.ai/tasks/{status}/{taskId}/{workItemStatus}/{workItemFile}.md`

The work item object has:
- `id`: Work item ID (e.g., "01")
- `name`: Work item name
- `status`: Work item status (todo/in_progress/done)
- `file`: Relative file path (e.g., "todo/01-taskitem-click.md")

## Implementation Steps

### Step 1: Update WorkItemNode constructor to include task context

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

**Location**: Lines 356-375 (WorkItemNode class)

The WorkItemNode needs to know the parent task's ID and status to construct the full file path.

**Current constructor signature** (approximately):
```typescript
constructor(workItem: WorkItem) {
  // ...
}
```

**Update to include task context**:
```typescript
constructor(workItem: WorkItem, taskId: string, taskStatus: string) {
  // ...
}
```

### Step 2: Add command property to WorkItemNode

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

**Location**: Inside WorkItemNode constructor

**Add after existing property assignments**:
```typescript
this.command = {
  command: 'aiCockpit.openWorkItem',
  title: 'View Work Item',
  arguments: [{
    taskId: taskId,
    taskStatus: taskStatus,
    workItem: workItem
  }]
};
```

### Step 3: Update WorkItemNode instantiation

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

**Location**: Where WorkItemNode is created (in getTaskChildren or similar)

Find where `new WorkItemNode(workItem)` is called and update to:
```typescript
new WorkItemNode(workItem, task.taskId, task.status)
```

## Acceptance Criteria

- [ ] WorkItemNode class accepts taskId and taskStatus in constructor
- [ ] WorkItemNode has command property pointing to 'aiCockpit.openWorkItem'
- [ ] Command arguments include all necessary info to construct file path

## Testing

1. Verify WorkItemNode instances are created with correct task context
2. Verify clicking a work item triggers the openWorkItem command
3. Test with work items in different statuses (todo, in_progress, done)

## Notes

- This work item depends on work item 03 (register openWorkItem command) for full functionality
- The command will do nothing until the handler is registered
