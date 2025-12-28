<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK (EPIC)                                               ║
║ LOCATION: .ai/tasks/todo/EPIC-001/                               ║
╠══════════════════════════════════════════════════════════════════╣
║ THIS IS AN EPIC: Contains multiple phase tasks                   ║
║                                                                  ║
║ WORKFLOW:                                                        ║
║ 1. Work phases in order (dependencies exist)                     ║
║ 2. Each phase is a separate task in .ai/tasks/                   ║
║ 3. Use /task-start LOCAL-XXX to begin a phase                    ║
║ 4. Complete all phases to close this EPIC                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

# EPIC-001: AI Cockpit MVP v2 Implementation

Implement the AI Cockpit VSCode extension with task ID propagation, diff tracking, and real-time monitoring.

## Problem Statement

Developers using Claude Code lack visibility into:
- What tasks the AI is working on
- What changes are being made (diffs)
- Progress through subtasks
- History of modifications

The AI Cockpit solves this by providing a VSCode extension that monitors Claude Code via hooks and displays real-time task/diff information.

## Acceptance Criteria

- [ ] `/task-start` writes `.ai/cockpit/active-task.json`
- [ ] `/task-done` clears active task file
- [ ] Hooks capture Edit/Write/TodoWrite events
- [ ] Events are stored in `.ai/cockpit/events/{taskId}/`
- [ ] Task ID resolution works (active-file → git-branch → session fallback)
- [ ] VSCode extension displays active task
- [ ] VSCode extension shows diff history per task
- [ ] File watcher updates UI in real-time

## Phase Tasks

This EPIC is divided into 3 sequential phases:

| Phase | Task ID | Name | Status | Dependencies |
|-------|---------|------|--------|--------------|
| 1 | LOCAL-001 | Framework Integration | todo | - |
| 2 | LOCAL-002 | Hook System | todo | LOCAL-001 |
| 3 | LOCAL-003 | VSCode Extension | todo | LOCAL-002 |

### Phase 1: Framework Integration (LOCAL-001)

**Objective**: Set up cockpit directory structure and integrate with `/task-start` and `/task-done` commands.

**Deliverables**:
- `.ai/cockpit/` directory structure
- `active-task.json` file format
- Updated `/task-start` command
- Updated `/task-done` command

**Repo**: ai-framework

### Phase 2: Hook System (LOCAL-002)

**Objective**: Create Claude Code hooks that capture Edit/Write/TodoWrite events and associate them with the active task.

**Deliverables**:
- `cockpit-capture.js` hook script
- Hook configuration in `.claude/settings.json`
- Task ID resolution (3 strategies)
- Event file storage

**Repo**: ai-framework

### Phase 3: VSCode Extension (LOCAL-003)

**Objective**: Build the VSCode extension UI with task panel, diff viewer, and real-time updates.

**Deliverables**:
- Extension scaffold (package.json, activation)
- File watcher for `.ai/cockpit/`
- Status bar showing active task
- Task panel (sidebar)
- Diff viewer integration

**Repo**: vscode-extension

## Architecture

See detailed specs:
- [MVP v1 Specification](../../docs/_architecture/ai-cockpit-mvp-v1.md)
- [MVP v2 Specification](../../docs/_architecture/ai-cockpit-mvp-v2.md)
- [Claude Code Hooks Reference](../../docs/_shared/claude-code-hooks.md)

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /task-start LOCAL-XXX                                          │
│       │                                                         │
│       └──► .ai/cockpit/active-task.json                         │
│                                                                 │
│  Claude Code (Edit tool)                                        │
│       │                                                         │
│       └──► PostToolUse Hook                                     │
│                 │                                               │
│                 ├──► Read active-task.json                      │
│                 │                                               │
│                 └──► Write .ai/cockpit/events/LOCAL-XXX/*.json  │
│                                                                 │
│  VSCode Extension                                               │
│       │                                                         │
│       └──► File watcher on .ai/cockpit/                         │
│                 │                                               │
│                 └──► Update UI (task panel, diff viewer)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Branches

| Repo | Branch |
|------|--------|
| ai-framework | `feature/cockpit-framework` |
| vscode-extension | `feature/cockpit-extension` |

## Risks & Considerations

1. **Hook Performance**: Hooks run on every tool call - must be fast (<100ms)
2. **File System Race**: Multiple rapid edits could cause file conflicts
3. **VSCode API Learning**: Extension development has a learning curve
4. **Cross-Platform**: Paths and file watchers must work on macOS/Linux/Windows

## Testing Strategy

- **Phase 1**: Manual testing of /task-start and /task-done
- **Phase 2**: Unit tests for task ID resolution, integration tests for hook flow
- **Phase 3**: Manual testing in VSCode, potential E2E with Playwright

## References

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Claude Code Hooks Docs](https://docs.anthropic.com/en/docs/claude-code)

---

_Created: 2025-12-28_
_Last Updated: 2025-12-28_
