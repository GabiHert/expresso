---
type: task
id: LOCAL-017
title: Fix Session ID Race Condition on Task Switch
status: done
created: 2025-12-30
updated: 2025-12-30
tags:
  - task
  - done
  - vscode-extension
summary:
  total: 4
  todo: 0
  in_progress: 0
  done: 4
repos:
  - vscode-extension
---

> Parent: [[task-index]]


# LOCAL-017: Fix Session ID Race Condition on Task Switch

## Problem Statement

When switching between tasks with multiple Claude sessions active, the session capture function can grab the wrong session ID due to a race condition. The `captureLatestSessionId()` function:

1. Takes a `knownSessionIds` snapshot at terminal creation time (T0)
2. Polls for up to 15 seconds looking for new sessions (T0-T15)
3. Has no mechanism to verify the captured session belongs to the current task

When two terminals start Claude simultaneously:
- Both have stale `knownSessionIds` snapshots
- Both scan the same `~/.claude/history.jsonl` file
- The second task's capture can grab the first task's session ID
- Session gets registered with the wrong taskId

## Acceptance Criteria

- [ ] Sessions from one task never get assigned to another task
- [ ] Multiple rapid task switches complete without session corruption
- [ ] Each capture waits for previous capture to complete (sequential queue)
- [ ] `knownSessionIds` is refreshed before each capture poll cycle
- [ ] No performance regression for single session creation

## Work Items


| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Add capture queue to extension.ts | vscode-extension | todo |
| 02 | Refresh knownSessionIds at capture time | vscode-extension | todo |
| 03 | Add task context to TerminalManager | vscode-extension | todo |
| 04 | Add tests for session capture | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `LOCAL-017-fix-session-race` |

## Technical Context

### Root Cause Analysis

The race condition occurs in `vscode-extension/src/extension.ts:246-302`:

```typescript
// PROBLEM: knownSessionIds captured at T0, used until T15
const knownSessionIds = new Set(allSessions.map(s => s.id));  // Line 335
// ... terminal created, Claude started ...
sessionId = await captureLatestSessionId(knownSessionIds);    // Lines 354-360
```

Key issues:
1. **Stale snapshot**: `knownSessionIds` captured once, becomes outdated
2. **No task context**: Capture function doesn't know which task it's capturing for
3. **Concurrent execution**: Multiple captures can run in parallel
4. **Shared data source**: All captures read same `history.jsonl`

### Affected Files

- `vscode-extension/src/extension.ts:246-302` - captureLatestSessionId()
- `vscode-extension/src/extension.ts:320-392` - openTaskTerminal
- `vscode-extension/src/extension.ts:690-786` - newSession
- `vscode-extension/src/extension.ts:789-864` - startSession
- `vscode-extension/src/services/TerminalManager.ts` - terminal tracking

### Claude History File

Claude's `~/.claude/history.jsonl` contains:
```json
{"project": "/path/to/workspace", "sessionId": "uuid", "timestamp": 1234567890}
```

Note: The history file does NOT include `COCKPIT_TASK` environment variable, so we cannot use it to correlate sessions with tasks directly.

## Implementation Approach

### Solution: Sequential Capture Queue

Implement a capture queue that:
1. Serializes all capture operations (one at a time)
2. Refreshes `knownSessionIds` at capture time (not terminal creation)
3. Eliminates race window by preventing concurrent captures

```typescript
// New pattern
let captureQueue: Promise<string | null> = Promise.resolve(null);

const captureLatestSessionIdQueued = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    captureQueue = captureQueue.then(async () => {
      // Get FRESH known sessions at capture time
      const allSessions = await sessionManager?.getSessions() ?? [];
      const knownSessionIds = new Set(allSessions.map(s => s.id));
      const result = await captureLatestSessionIdImpl(knownSessionIds);
      resolve(result);
      return result;
    });
  });
};
```

### Why This Works

1. **No concurrent captures**: Queue ensures one capture completes before next starts
2. **Fresh data**: Each capture gets current `knownSessionIds` snapshot
3. **First-come-first-served**: Sessions captured in terminal creation order
4. **Minimal changes**: Wrapper pattern, existing logic unchanged

## Risks & Considerations

- **Performance**: Sequential captures may slow multiple rapid task starts
  - Mitigation: 15s timeout per capture, most complete in <5s
- **Deadlock risk**: If capture hangs, queue blocks
  - Mitigation: Existing timeout handles this
- **Memory**: Queue promise chain grows with pending captures
  - Mitigation: Captures are short-lived, chain cleaned up

## Testing Strategy

1. **Unit tests**: Mock sessionManager, verify queue serialization
2. **Manual testing**:
   - Start 3 tasks rapidly, verify correct session assignment
   - Check sessions.json shows correct taskId for each session
3. **Edge cases**:
   - Terminal closed during capture
   - Claude startup failure
   - Multiple workspace folders

## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.

## References

- Exploration session: Session ID overwrite during task switching
- Claude history file: `~/.claude/history.jsonl`
- Session registry: `.ai/cockpit/sessions.json`


## Linked Work Items

- [[01-capture-queue]] — Add capture queue to extension.ts (done)
- [[02-refresh-known-sessions]] — Refresh knownSessionIds at capture time (done)
- [[03-terminal-task-context]] — Add task context to TerminalManager (done)
- [[04-capture-tests]] — Add tests for session capture (done)
