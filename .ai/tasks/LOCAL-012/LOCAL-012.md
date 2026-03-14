---
type: task
id: LOCAL-012
title: Unassigned Sessions & Task Linking
status: done
created: 2025-12-30
updated: 2025-12-30
tags:
  - task
  - done
  - vscode-extension
  - ai-framework
summary:
  total: 7
  todo: 0
  in_progress: 0
  done: 7
repos:
  - vscode-extension
  - ai-framework
---

> Parent: [[manifest]]


# LOCAL-012: Unassigned Sessions & Task Linking

## Problem Statement

Users want to start Claude sessions without selecting a task first - for exploration, research, or before knowing what task they'll work on. Currently, all sessions require a taskId, blocking this workflow.

The solution:
1. **Start Session** - Create sessions with `taskId="_unassigned"`
2. **Root Sessions section** - Display unassigned sessions at tree root
3. **Link to Task** - When ready, link session to new or existing task

## Acceptance Criteria

- [ ] Users can start sessions without selecting a task first
- [ ] Unassigned sessions appear in a root "Sessions" section in the tree
- [ ] "Start Session" button available on the Sessions section
- [ ] Sessions can be linked to tasks via context menu "Link to Task"
- [ ] Quick pick shows available tasks when linking
- [ ] Task sessions filter excludes "_unassigned" sessions
- [ ] /[[task-create]] can link current unassigned session to new task

## Work Items


| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Add UNASSIGNED_TASK_ID constant | vscode-extension | todo |
| 02 | Add SessionManager methods | vscode-extension | todo |
| 03 | Add UnassignedSessionsSection to tree | vscode-extension | todo |
| 04 | Register startSession command | vscode-extension | todo |
| 05 | Register linkSessionToTask command | vscode-extension | todo |
| 06 | Add package.json contributions | vscode-extension | todo |
| 07 | Update [[task-create]].md integration | ai-framework | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `LOCAL-012-unassigned-sessions` |

## Technical Context

### Key Design Decision: `_unassigned` as taskId

Using `taskId = "_unassigned"` instead of making taskId optional:
- Keeps CockpitSession.taskId as required string (no type changes)
- Simple filter: `taskId === UNASSIGNED_TASK_ID`
- Clear semantic meaning
- Easy to link: just update taskId field

### Tree View Structure

```
AI Cockpit
├── Sessions (2)              ← NEW: Root section for unassigned
│   ├── Exploration [active]
│   └── Research [closed]
├── In Progress (1)
│   └── LOCAL-010
│       ├── Sessions (1)      ← Task-scoped sessions (unchanged)
│       └── Files Changed
├── Todo (2)
└── Done (5)
```

### Session Lifecycle

```
Start Session (no task)
    │
    ▼
Session created: taskId = "_unassigned"
    │
    ├─── User works, explores ───┐
    │                            │
    ▼                            ▼
/task-create LOCAL-XXX    OR   Right-click → "Link to Task"
    │                            │
    ▼                            ▼
linkSessionToTask(sessionId, taskId)
    │
    ▼
Session moves to task's Sessions section
```

## Implementation Approach

1. Add constant `UNASSIGNED_TASK_ID = "_unassigned"` in types
2. Add `getUnassignedSessions()` and `linkSessionToTask()` to SessionManager
3. Create `UnassignedSessionsSection` tree item class
4. Register `startSession` command (no COCKPIT_TASK env var)
5. Register `linkSessionToTask` command with quick pick
6. Add commands and menus to package.json
7. Document integration in [[task-create]].md

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Breaking getSessionsForTask() | Explicitly exclude "_unassigned" |
| Confusion between session types | Different icons, clear labels |
| /[[task-create]] integration complexity | UI fallback for manual linking |

## Testing Strategy

1. Start session without task → appears in root Sessions
2. Link via context menu → moves to task's sessions
3. Link via /task-create → automatic linking
4. Resume closed unassigned session → stays unassigned
5. Task sessions don't show "_unassigned" ones


## Linked Work Items

- [[01-unassigned-constant]] — Add UNASSIGNED_TASK_ID constant (done)
- [[02-session-manager-methods]] — Add SessionManager methods (done)
- [[03-unassigned-tree-section]] — Add UnassignedSessionsSection to tree (done)
- [[04-start-session-command]] — Register startSession command (done)
- [[05-link-session-command]] — Register linkSessionToTask command (done)
- [[06-package-json]] — Add package.json contributions (done)
- [[07-task-create-integration]] — Update task-create.md integration (done)
