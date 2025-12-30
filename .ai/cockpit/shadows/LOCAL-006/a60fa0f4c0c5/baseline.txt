<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/todo/LOCAL-007/                              ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)           ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                  ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-007: Fix Session Tracking Issues

## Problem Statement

Code review of LOCAL-006 (Session Tracking & Resume) identified several issues ranging from race conditions to file system concurrency problems. These need to be addressed to make session tracking robust and production-ready.

## Acceptance Criteria

- [ ] Session capture reliably identifies the correct session even with rapid terminal opens
- [ ] File I/O operations are async and don't block the extension
- [ ] Terminal name collisions are handled gracefully
- [ ] JSON parsing errors are caught and handled
- [ ] Old sessions can be cleaned up automatically
- [ ] No hardcoded paths - use configuration where possible

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Improve session capture with unique terminal markers | vscode-extension | todo |
| 02 | Convert SessionManager to async I/O | vscode-extension | todo |
| 03 | Add session cleanup mechanism | vscode-extension | todo |
| 04 | Handle JSON parsing errors gracefully | vscode-extension | todo |
| 05 | Make Claude history path configurable | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `feature/session-tracking-fixes` |

## Technical Context

From LOCAL-006 code review findings:

### Race Condition (BLOCKING)
The polling mechanism in `captureLatestSessionId` compares against `knownSessionIds`, but if two terminals are opened rapidly, the second terminal could capture the first's sessionId before it's added to known set.

### File System Concurrency (BLOCKING)
`SessionManager.loadRegistry()` and `saveRegistry()` use synchronous file I/O which:
- Blocks the VS Code extension host
- Can cause file corruption if multiple operations overlap

### Error Handling (IMPORTANT)
- `JSON.parse()` on history.jsonl entries can throw
- Session capture failures are logged but user isn't notified
- No retry logic for transient failures

### Hardcoded Paths (IMPORTANT)
- `~/.claude/history.jsonl` is hardcoded
- Different Claude installations may use different paths

## Implementation Approach

1. **Session Capture** - Use unique terminal environment variables to correlate terminals with sessions
2. **Async I/O** - Convert all file operations to use `fs.promises`
3. **Cleanup** - Add TTL-based cleanup for old closed sessions
4. **Error Handling** - Wrap JSON.parse in try-catch, add user notifications for failures
5. **Configuration** - Add VS Code settings for Claude history path

## Risks & Considerations

- Changing session capture logic may break existing sessions
- Need to handle migration of existing sessions.json format
- Async conversion needs careful testing for race conditions

## Testing Strategy

- Manual testing with rapid terminal opens
- Test with corrupted sessions.json file
- Test with missing/different Claude history locations
- Test cleanup doesn't remove active sessions

## References

- LOCAL-006 implementation files
- VS Code Extension API: Terminal.creationOptions
