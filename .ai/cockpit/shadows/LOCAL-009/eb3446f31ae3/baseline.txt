<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/todo/LOCAL-009/                              ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)           ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                  ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-009: Sidebar click behavior - show descriptions

## Problem Statement

When clicking items in the VSCode AI Cockpit sidebar:
- **Task clicks** currently open a Claude terminal (creates new session) - should show task description instead
- **Work item clicks** do nothing - should show work item description
- **Sessions** should remain in their own section for creating/resuming Claude sessions

The user experience should be:
1. Click task → View task README.md in editor
2. Click work item → View work item .md file in editor
3. Use Sessions section → Create/resume Claude sessions

## Acceptance Criteria

- [ ] Clicking a task item opens its README.md in the editor
- [ ] Clicking a work item opens its .md file in the editor
- [ ] Sessions section still allows creating/resuming Claude sessions
- [ ] Context menus remain functional for all item types

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Change TaskItem click to open description | vscode-extension | todo |
| 02 | Add WorkItemNode click handler | vscode-extension | todo |
| 03 | Register openWorkItem command | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `feature/sidebar-click-descriptions` |

## Technical Context

### Current Implementation

**TaskTreeProvider.ts** defines tree item classes:
- `TaskItem` (lines 308-354): Has click command → `aiCockpit.openTaskTerminal`
- `WorkItemNode` (lines 356-375): NO command property (clicking does nothing)
- `SessionItem` (lines 482-512): Has click command → `aiCockpit.resumeSession`

**extension.ts** has existing handlers:
- `openTask` (lines 115-135): Opens README files - EXISTS but not wired to TaskItem clicks
- `openTaskTerminal` (lines 230-312): Currently triggered by TaskItem clicks

### Key Files

| File | Lines | Purpose |
|------|-------|---------|
| TaskTreeProvider.ts | 308-354 | TaskItem class with command property |
| TaskTreeProvider.ts | 356-375 | WorkItemNode class (needs command) |
| extension.ts | 115-135 | openTask handler (exists, needs wiring) |
| package.json | 70-111 | Command definitions |

## Implementation Approach

1. **TaskItem**: Change `command` from `openTaskTerminal` to `openTask`
2. **WorkItemNode**: Add `command` property pointing to new `openWorkItem` command
3. **extension.ts**: Add `openWorkItem` command handler that opens work item file
4. **package.json**: Register the new command

## Risks & Considerations

- Users may expect task click to still open terminal - consider adding context menu option
- Work item files must exist at expected paths for click to work
- Need to handle case where work item file doesn't exist gracefully

## Testing Strategy

1. Manual testing in VSCode:
   - Click task → Verify README opens
   - Click work item → Verify work item file opens
   - Click session → Verify session resumes (unchanged)
   - Right-click items → Verify context menus still work
2. Test with tasks in different states (todo, in_progress, done)
3. Test error cases (missing files)

## References

- VSCode TreeView API: https://code.visualstudio.com/api/extension-guides/tree-view
- Exploration findings from conversation on 2025-12-29
