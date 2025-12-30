<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/done/LOCAL-008/                              ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)           ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                  ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-008: Fix Session Terminal Reuse and Multi-Session Status

## Problem Statement

The AI Cockpit session management has two critical issues:

1. **Clicking a session always opens a new terminal** - Even if the session's terminal is already open, clicking it creates a new terminal. For active sessions, it shows a warning but doesn't focus the existing terminal.

2. **Only one session per task shows "active"** - When multiple terminals are open for the same task, only the most recently clicked session stays marked as "active". Others are automatically marked "closed" even though their terminals are still open.

## Root Causes (from exploration)

1. **No terminal reuse logic**: `terminalIdMap` is local to `extension.ts` and inaccessible from `SessionItem`. There's no way to lookup and focus an existing terminal.

2. **Auto-close side effect**: Lines 376-386 in `extension.ts` close all OTHER active sessions when resuming any session for a task.

3. **SessionItem always calls resumeSession**: The click handler doesn't differentiate between active (focus existing) vs closed (create new).

## Acceptance Criteria

- [ ] Clicking an active session focuses its existing terminal (no new terminal)
- [ ] Clicking a closed session creates a new terminal and resumes
- [ ] Multiple sessions for the same task can all be "active" simultaneously
- [ ] Terminal close correctly marks only that session as closed
- [ ] Session status accurately reflects terminal state

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Export terminalIdMap for terminal lookup | vscode-extension | todo |
| 02 | Add focusSession command for active sessions | vscode-extension | todo |
| 03 | Fix SessionItem click handler branching | vscode-extension | todo |
| 04 | Remove auto-close of other active sessions | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `LOCAL-008-session-terminal-reuse` |

## Technical Context

**Key Files:**
- `src/extension.ts:27-28` - terminalIdMap (module-local, needs export/access)
- `src/extension.ts:359-420` - resumeSession command (creates new terminal always)
- `src/extension.ts:376-386` - Auto-close logic (the bug causing single active)
- `src/providers/TaskTreeProvider.ts:499-502` - SessionItem command binding

**Current Flow:**
```
Click SessionItem → resumeSession command →
  IF active: show warning, return (can't focus terminal)
  IF closed: close OTHER active sessions, create NEW terminal
```

**Target Flow:**
```
Click SessionItem →
  IF active: focusSession command → lookup terminal → focus it
  IF closed: resumeSession command → create terminal (don't close others)
```

## Implementation Approach

1. Create a TerminalManager service that exposes terminal lookup
2. Add focusSession command that uses TerminalManager to find and show terminal
3. Update SessionItem to use focusSession for active, resumeSession for closed
4. Remove the auto-close logic from resumeSession (lines 376-386)

## Risks & Considerations

- **Terminal lifecycle**: VSCode doesn't notify when terminals are externally closed. Sessions might show "active" for closed terminals.
- **Terminal name uniqueness**: Multiple sessions per task means multiple terminals with similar names. Consider adding session ID to terminal name.

## Testing Strategy

1. Open a task terminal → session shows active
2. Click the active session → terminal focuses (no new terminal)
3. Open second session for same task → both show active
4. Close one terminal → only that session shows closed
5. Click closed session → resumes in new terminal, other stays active

## References

- Exploration from /task-explore (2025-12-29)
- Related: LOCAL-007 (session tracking fixes)
