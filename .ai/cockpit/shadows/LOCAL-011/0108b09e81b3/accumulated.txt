<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/done/LOCAL-010/                              ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)           ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                  ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-010: Rename and Delete Claude Sessions

## Problem Statement

Users cannot rename session labels or delete individual sessions from the AI Cockpit. Currently, labels are fixed at creation time and the only removal mechanism is automatic cleanup of closed sessions older than the retention period (default 7 days). Users need the ability to:

1. **Rename sessions** - Change the display label to something more meaningful
2. **Delete sessions** - Remove unwanted sessions immediately without waiting for auto-cleanup

## Acceptance Criteria

- [ ] Users can right-click any session (active or closed) and select "Rename Session"
- [ ] Users can right-click any session (active or closed) and select "Delete Session"
- [ ] Rename shows an input box pre-filled with the current label
- [ ] Empty labels are rejected with a warning message
- [ ] Delete shows a confirmation dialog before removing
- [ ] Deleting an active session warns the user and cleans up terminal tracking
- [ ] Tree view refreshes immediately after rename/delete operations
- [ ] Changes persist after extension reload

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Add renameSession method | vscode-extension | todo |
| 02 | Add deleteSession method | vscode-extension | todo |
| 03 | Register rename command | vscode-extension | todo |
| 04 | Register delete command | vscode-extension | todo |
| 05 | Add package.json contributions | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `LOCAL-010-session-rename-delete` |

## Technical Context

### Key Files

| File | Purpose |
|------|---------|
| `src/services/SessionManager.ts` | Core session CRUD operations, uses `withLock` pattern |
| `src/extension.ts` | Command registration, lines 389-575 handle session commands |
| `src/providers/TaskTreeProvider.ts` | Tree UI, `SessionItem` class (lines 498-536) |
| `src/types/index.ts` | `CockpitSession` interface (lines 28-37) |
| `package.json` | Command and menu contributions |

### Existing Patterns

1. **Write Lock Pattern** - SessionManager uses `withLock()` for serialized registry writes
2. **Input Dialogs** - Use `vscode.window.showInputBox` with prompt, value, placeholder
3. **Confirmation Dialogs** - Use `vscode.window.showWarningMessage` with modal option
4. **Tree Refresh** - Call `taskTreeProvider.refresh()` after data changes
5. **Context Values** - Sessions already have `session-active` and `session-closed` context values

### Session Data Model

```typescript
interface CockpitSession {
  id: string;           // Claude history ID (immutable)
  taskId: string;       // Associated task
  label: string;        // Display label (editable)
  createdAt: string;    // ISO timestamp
  lastActive: string;   // ISO timestamp
  status: 'active' | 'closed';
  terminalName: string;
  terminalId?: string;
}
```

## Implementation Approach

1. Add `renameSession()` and `deleteSession()` methods to SessionManager
2. Register commands in extension.ts with proper input/confirmation UX
3. Declare commands and context menus in package.json
4. Use existing patterns (withLock, tree refresh, context values)

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Deleting active session orphans terminal | Clean up terminalManager mapping; terminal stays open but untracked |
| Race conditions | Already mitigated by `withLock` pattern |
| Accidental deletion | Modal confirmation dialog with session label shown |

## Testing Strategy

### Manual Testing

**Rename:**
1. Right-click session > "Rename Session" appears
2. Input box shows current label
3. New label updates tree immediately
4. Empty label shows warning, no change
5. Changes persist after reload

**Delete:**
1. Right-click session > "Delete Session" appears
2. Confirmation dialog appears
3. Confirmed delete removes from tree
4. Cancelled delete keeps session
5. Delete active session warns user, cleans terminal tracking

## References

- Exploration findings from `/task-explore` session
- SessionManager source: `vscode-extension/src/services/SessionManager.ts`
- VSCode API: [TreeView](https://code.visualstudio.com/api/extension-guides/tree-view)
