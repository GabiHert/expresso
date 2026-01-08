<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-context-menu.md                                    ║
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

# Add Context Menu for Delete Action

## Objective

Add context menu items so users can right-click on tasks to delete them. The delete option should appear for tasks in todo, done, and in_progress states.

## Implementation Steps

### Step 1: Add context menu items for task deletion

**File**: `vscode-extension/package.json`

**Instructions**:
Add context menu entries in the `contributes.menus.view/item/context` section. Add these after the existing session delete menus (around line 264):

```json
{
  "command": "aiCockpit.deleteTask",
  "when": "view == aiCockpit.tasks && viewItem == task-todo",
  "group": "3_delete"
},
{
  "command": "aiCockpit.deleteTask",
  "when": "view == aiCockpit.tasks && viewItem == task-done",
  "group": "3_delete"
},
{
  "command": "aiCockpit.deleteTask",
  "when": "view == aiCockpit.tasks && viewItem == task-in_progress",
  "group": "3_delete"
}
```

**Note**: Using group `3_delete` puts it at the bottom of the context menu, separated from other actions.

## Acceptance Criteria

- [ ] Delete option appears when right-clicking on todo tasks
- [ ] Delete option appears when right-clicking on done tasks
- [ ] Delete option appears when right-clicking on in_progress tasks
- [ ] Delete option is visually separated (in its own group)

## Testing

1. Run the extension in debug mode (F5)
2. Right-click on tasks in each state (todo, done, in_progress)
3. Verify "Delete Task" appears in the context menu

## Notes

The `viewItem` values (`task-todo`, `task-done`, `task-in_progress`) are set by TaskTreeProvider.ts in the TaskItem class.
