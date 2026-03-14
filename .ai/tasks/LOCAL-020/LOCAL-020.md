---
type: task
id: LOCAL-020
title: Allow Session Assignment to TODO Tasks
status: done
created: 2025-01-05
updated: 2025-01-05
tags:
  - task
  - done
  - vscode-extension
summary:
  total: 1
  todo: 0
  in_progress: 0
  done: 1
repos:
  - vscode-extension
---

> Parent: [[manifest]]


# LOCAL-020: Allow Session Assignment to TODO Tasks

## Problem Statement

Currently, when a user tries to assign an unassigned session to a task via the "Link to Task" context menu, only in-progress tasks are shown. This limitation prevents users from assigning sessions to TODO tasks, which is a valid use case when starting work on a task or preparing context before officially starting.

The root cause is in `extension.ts:906-914` which reads only from `.ai/tasks/in_progress/` directory when building the task list for the quick pick dialog.

## Acceptance Criteria

- [ ] Users can assign sessions to TODO tasks (not just in-progress)
- [ ] Quick pick shows task status as description (e.g., "LOCAL-001 (todo)")
- [ ] Warning message updated to say "No tasks available" instead of "No in-progress tasks"
- [ ] Existing in-progress task assignment continues to work

## Work Items


| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Update linkSessionToTask command | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `LOCAL-020-session-todo-assignment` |

## Technical Context

**Root Cause Location:** `vscode-extension/src/extension.ts:906-914`

```typescript
// Current implementation - THE LIMITATION
const inProgressPath = path.join(workspaceRoot, '.ai/tasks/in_progress');
let taskIds: string[] = [];
try {
  const entries = await fs.promises.readdir(inProgressPath, { withFileTypes: true });
  taskIds = entries.filter(e => e.isDirectory()).map(e => e.name);
} catch {
  // No in_progress directory
}
```

**Key Files:**
- `src/extension.ts:906-914` - Directory reading (THE FIX POINT)
- `src/extension.ts:917` - Error message to update
- `src/extension.ts:921-924` - Quick pick display
- `src/services/SessionManager.ts:83-85` - Session linking (no changes needed)

**Important Finding:** The `SessionManager.linkSessionToTask()` method accepts ANY taskId without validation. The limitation is purely in the UI layer - what tasks are offered to the user.

## Implementation Approach

1. Modify the directory reading code to read from both `in_progress/` and `todo/` directories
2. Track which status each task belongs to
3. Update the quick pick to show task status as description
4. Update the warning message when no tasks are found

## Risks & Considerations

- Low risk change - only affects UI layer
- No database or state changes required
- Backward compatible - in-progress assignment works as before

## Testing Strategy

1. Create a TODO task
2. Start a new unassigned session
3. Right-click session and select "Link to Task"
4. Verify TODO task appears in the list with "(todo)" status
5. Select the TODO task and verify session is linked
6. Verify in-progress tasks still appear and can be selected

## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.

## References

- Exploration findings from [[task-explore]] command
- Related: Session management in SessionManager.ts


## Linked Work Items

- [[01-update-link-session-command]] — Update linkSessionToTask command (done)
