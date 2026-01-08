<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/in_progress/LOCAL-024/                       ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)           ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                  ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-024: Add session import by UUID in creation flow

## Problem Statement

Currently, when users click the "+" button to create a new session, they can only create brand new sessions that get captured from Claude history. There's no way to import an existing Claude session by its UUID.

Users may have sessions from previous work (e.g., from another machine, restored from backup, or sessions they want to continue tracking) that they want to add to the cockpit without starting fresh.

## Acceptance Criteria

- [ ] When user clicks "+" and pastes a valid UUID, the session is imported instead of creating a new one
- [ ] When user clicks "+" and types a regular label, existing behavior is preserved (new session created)
- [ ] Imported sessions start with status `closed` (can be resumed later)
- [ ] Imported sessions appear in the tree view immediately
- [ ] InputBox placeholder text is updated to indicate UUID support
- [ ] Works for both task-bound sessions (`newSession`) and unassigned sessions (`startSession`)

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Add importSession method to SessionManager | vscode-extension | todo |
| 02 | Add UUID detection to newSession command | vscode-extension | todo |
| 03 | Add UUID detection to startSession command | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `LOCAL-024-session-import-uuid` |

## Technical Context

### Key Files

- `vscode-extension/src/services/SessionManager.ts:69-80` - `registerSession()` already supports adding sessions with any ID (upsert pattern)
- `vscode-extension/src/extension.ts:895-898` - InputBox for task session label
- `vscode-extension/src/extension.ts:973-976` - InputBox for unassigned session label
- `vscode-extension/src/types/index.ts:60-69` - `CockpitSession` interface

### Existing Infrastructure

The `registerSession()` method already accepts a fully-formed `CockpitSession` object and performs an upsert (create or update). This means:
- No database schema changes needed
- No new persistence logic needed
- Just need a convenience method and UUID detection in the UI

### UUID Format

Standard UUID v4 format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

Regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

## Implementation Approach

1. **SessionManager.importSession()**: Add a simple method that creates a `CockpitSession` object with the provided UUID and calls `registerSession()`

2. **UUID Detection**: In both `newSession` and `startSession` command handlers, after the InputBox returns:
   - Check if input matches UUID regex
   - If yes: call `importSession()` and return (skip terminal creation)
   - If no: treat as label and continue with existing flow

3. **UX Polish**: Update InputBox placeholder to: `"e.g., Bug fix, or paste a session UUID to import"`

## Risks & Considerations

- **No validation**: We don't verify the UUID exists in Claude history. This is intentional - users might want to import sessions from other sources.
- **Status**: Imported sessions start as `closed` since there's no associated terminal yet. Users can resume them with the existing resume flow.

## Testing Strategy

1. Manual test: Click "+", paste a valid UUID, verify session appears in tree
2. Manual test: Click "+", type a label, verify new session is created (existing behavior)
3. Manual test: Import a session, then resume it, verify it works
4. Verify tree view refreshes after import

## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.

## References

- Previous exploration in this conversation identified all relevant code locations
- `registerSession()` uses upsert pattern - no risk of duplicates
