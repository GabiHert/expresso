<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/in_progress/LOCAL-002/                       ║
╠══════════════════════════════════════════════════════════════════╣
║ EPIC: EPIC-001 (AI Cockpit MVP v2)                               ║
║ PHASE: 2 of 3                                                    ║
║ DEPENDS ON: LOCAL-001 (Framework Integration)                    ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Ensure LOCAL-001 is COMPLETE                                  ║
║ 2. Read .ai/docs/_shared/claude-code-hooks.md                    ║
║ 3. Read MVP v2 spec: .ai/docs/_architecture/ai-cockpit-mvp-v2.md ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-002: Hook System (Phase 2)

Create Claude Code hooks that capture Edit/Write/TodoWrite events and associate them with the active task.

## Problem Statement

Claude Code makes edits to files, but we have no visibility into what changes are made. This phase creates hooks that:
1. Capture every Edit/Write/TodoWrite tool call
2. Associate each event with the active task (from Phase 1)
3. Store events for later display in the VSCode extension

## Acceptance Criteria

- [ ] `cockpit-capture.js` hook script exists and is executable
- [ ] Hook configuration added to `.claude/settings.json`
- [ ] Task ID resolution works (active-file → git-branch → session fallback)
- [ ] Events are stored in `.ai/cockpit/events/{taskId}/`
- [ ] Event files contain correct structure (id, taskId, tool, input, response)
- [ ] Hook execution is fast (<100ms)

## Work Items

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Create cockpit-capture.js hook | ai-framework | todo |
| 02 | Add hook configuration | ai-framework | todo |
| 03 | Implement task ID resolution | ai-framework | todo |
| 04 | Test hook integration | ai-framework | todo |

## Branches

| Repo | Branch |
|------|--------|
| ai-framework | `feature/cockpit-hooks` |

## Technical Context

### Hook Event Flow

```
Claude Code                     Hook Script                    Storage
    │                               │                            │
    │ Edit tool call                │                            │
    ├──────────────────────────────►│                            │
    │                               │ Read stdin (JSON)          │
    │                               │                            │
    │                               │ Resolve task ID            │
    │                               │ ├─ active-task.json?       │
    │                               │ ├─ git branch?             │
    │                               │ └─ session fallback        │
    │                               │                            │
    │                               │ Build event object         │
    │                               │                            │
    │                               │ Save to file               │
    │                               ├───────────────────────────►│
    │                               │                            │
    │ Continue                      │                            │
    │◄──────────────────────────────┤                            │
```

### Hook Input (from Claude Code)

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/conversation.jsonl",
  "cwd": "/project/root",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "src/auth.ts",
    "old_string": "function login() {",
    "new_string": "async function login(user: User) {"
  },
  "tool_response": "File edited successfully",
  "tool_use_id": "toolu_123"
}
```

### Event Output (stored)

```json
{
  "id": "evt-1703692800000-a1b2c3d4e",
  "taskId": "LOCAL-001",
  "taskIdSource": "active-task-file",
  "tool": "Edit",
  "input": {
    "file_path": "src/auth.ts",
    "old_string": "function login() {",
    "new_string": "async function login(user: User) {"
  },
  "response": "File edited successfully",
  "sessionId": "abc123",
  "timestamp": "2025-12-28T10:00:00.000Z"
}
```

### Files to Create

1. `.claude/hooks/cockpit-capture.js` - Main hook script
2. Update `.claude/settings.json` - Hook configuration

## Implementation Approach

1. **Work Item 01**: Create the hook script with full logic
2. **Work Item 02**: Add hook to settings.json with correct matcher
3. **Work Item 03**: Implement and test task ID resolution strategies
4. **Work Item 04**: End-to-end testing with real Claude Code edits

## Risks & Considerations

- **Performance**: Hook runs on every Edit/Write - must be fast
- **Error Handling**: Hook errors should not block Claude Code
- **File Permissions**: Hook script must be executable
- **Path Handling**: Use CLAUDE_PROJECT_DIR for correct paths

## Testing Strategy

1. **Unit Test**: Task ID resolution function
2. **Integration Test**: Run hook manually with sample input
3. **E2E Test**: Make actual edits with Claude Code, verify events captured

## Dependencies

- LOCAL-001 must be complete (provides active-task.json)

## References

- [Claude Code Hooks Reference](../../docs/_shared/claude-code-hooks.md)
- [MVP v2 Specification](../../docs/_architecture/ai-cockpit-mvp-v2.md)

---

_Created: 2025-12-28_
_Last Updated: 2025-12-28_
_EPIC: EPIC-001_
