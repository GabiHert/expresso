---
type: task
id: LOCAL-015
title: Delete Task Functionality
status: done
created: 2025-12-30
updated: 2025-12-30
tags:
  - task
  - done
  - vscode-extension
summary:
  total: 6
  todo: 0
  in_progress: 0
  done: 6
repos:
  - vscode-extension
---

# LOCAL-015: Delete Task Functionality

## Problem Statement

Users need the ability to delete tasks from the AI Cockpit. Currently, tasks can only be created and completed - there is no way to remove them. When a task is deleted, all associated data should be cleaned up including:
- Task folder (`.ai/tasks/{status}/{taskId}/`)
- Event history (`.ai/cockpit/events/{taskId}/`)
- Shadow copies (`.ai/cockpit/shadows/{taskId}/`)
- Session references in `sessions.json`
- Git worktrees (if enabled and exist)
- Active task state (if the deleted task is active)

## Acceptance Criteria

- [ ] Tasks can be deleted from the VSCode extension sidebar via context menu
- [ ] Confirmation dialog shown before deletion (with warning for active/in-progress tasks)
- [ ] Task folder is completely removed from `.ai/tasks/{status}/{taskId}/`
- [ ] Event history is removed from `.ai/cockpit/events/{taskId}/`
- [ ] Shadow copies are removed from `.ai/cockpit/shadows/{taskId}/`
- [ ] Session references are cleaned from `sessions.json`
- [ ] If deleted task is active, `active-task.json` is cleared
- [ ] Open DiffReviewPanels for deleted task are closed
- [ ] Tree view refreshes after deletion
- [ ] Path traversal attacks are prevented

## Work Items


| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Add deleteTask command definition | vscode-extension | todo |
| 02 | Add context menu for delete action | vscode-extension | todo |
| 03 | Implement deleteTask command | vscode-extension | todo |
| 04 | Add cockpit cleanup service | vscode-extension | todo |
| 05 | Handle active task and panel cleanup | vscode-extension | todo |
| 06 | Add comprehensive tests | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `LOCAL-015-delete-task` |

## Technical Context

### Existing Patterns to Follow

The `deleteSession` command (extension.ts:540-577) provides the perfect pattern:
1. Extract entity from context menu item
2. Show confirmation dialog (with warning for active state)
3. Perform cleanup operations
4. Refresh tree view
5. Show success message

### Key Files

- `extension.ts:540-577` - deleteSession implementation (template)
- `package.json:246-264` - Session context menu definitions
- `SessionManager.ts:83-95` - Registry file manipulation
- `TaskTreeProvider.ts:382-428` - TaskItem class with contextValue

### Storage Locations

```
.ai/tasks/{status}/{taskId}/     # Task folder (README, status.yaml, work items)
.ai/cockpit/events/{taskId}/     # Event JSON files (can be thousands)
.ai/cockpit/shadows/{taskId}/    # Shadow directories with baseline/accumulated
.ai/cockpit/sessions.json        # Session registry (filter by taskId)
.ai/cockpit/active-task.json     # Active task reference (delete if matches)
../worktrees/{taskId}/           # Git worktrees (if enabled)
```

## Implementation Approach

1. **Command Definition**: Add `aiCockpit.deleteTask` command in package.json
2. **Context Menu**: Add menu items for `task-todo` and `task-done` contexts (optionally `task-in_progress` with extra warning)
3. **Command Implementation**: Follow deleteSession pattern with multi-location cleanup
4. **Cleanup Service**: Create dedicated service for cockpit data cleanup (events, shadows, sessions)
5. **Edge Cases**: Handle active task, open panels, concurrent access

## Risks & Considerations

- **Data Loss**: Deletion is permanent - confirmation dialog is critical
- **Active Task**: Must handle case where user deletes the currently active task
- **Open Panels**: DiffReviewPanels may be open for files in the deleted task
- **Path Traversal**: Must validate paths stay within allowed directories
- **Concurrent Access**: Hook may fire during deletion - use atomic operations
- **Worktree Cleanup**: Requires git commands per repo, may fail if dirty

## Testing Strategy

1. Unit tests for cleanup service
2. Integration tests for command execution
3. Manual testing scenarios:
   - Delete todo task
   - Delete done task
   - Delete in-progress task (with warning)
   - Delete active task (clears active-task.json)
   - Delete task with open DiffReviewPanel
   - Delete task with worktrees

## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.

## References

- Exploration findings from /[[task-explore]] session
- deleteSession pattern: extension.ts:540-577
- Session context menus: package.json:246-264


## Linked Work Items

- [[01-command-definition]] — Add deleteTask command definition (done)
- [[02-context-menu]] — Add context menu for delete action (done)
- [[03-implement-command]] — Implement deleteTask command (done)
- [[04-cleanup-service]] — Add cockpit cleanup service (done)
- [[05-active-task-cleanup]] — Handle active task and panel cleanup (done)
- [[06-tests]] — Add comprehensive tests (done)
