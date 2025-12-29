<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/in_progress/LOCAL-001/                       ║
╠══════════════════════════════════════════════════════════════════╣
║ EPIC: EPIC-001 (AI Cockpit MVP v2)                               ║
║ PHASE: 1 of 3                                                    ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)           ║
║ 2. Read MVP v2 spec: .ai/docs/_architecture/ai-cockpit-mvp-v2.md ║
║ 3. Check which work items are in todo/ vs done/                  ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-001: Framework Integration (Phase 1)

Set up the cockpit directory structure and integrate task tracking with `/task-start` and `/task-done` commands.

## Problem Statement

The AI Cockpit needs a way to know which task is currently active. This phase establishes:
1. The `.ai/cockpit/` directory structure
2. The `active-task.json` file that tracks the current task
3. Integration with existing framework commands

## Acceptance Criteria

- [ ] `.ai/cockpit/` directory is created when first task starts
- [ ] `/task-start` writes `active-task.json` with task metadata
- [ ] `/task-done` removes `active-task.json`
- [ ] `active-task.json` format matches MVP v2 spec
- [ ] Events directory structure is prepared (empty until Phase 2)

## Work Items

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Create cockpit directory structure | ai-framework | todo |
| 02 | Update /task-start command | ai-framework | todo |
| 03 | Update /task-done command | ai-framework | todo |
| 04 | Test task lifecycle | ai-framework | todo |

## Branches

| Repo | Branch |
|------|--------|
| ai-framework | `feature/cockpit-framework` |

## Technical Context

### Active Task File Format

```json
{
  "taskId": "LOCAL-001",
  "title": "Framework Integration",
  "branch": "feature/cockpit-framework",
  "frameworkPath": ".ai/tasks/in_progress/LOCAL-001",
  "startedAt": "2025-12-28T10:00:00.000Z",
  "sessionId": "abc123"
}
```

### Directory Structure

```
.ai/
├── cockpit/
│   ├── active-task.json       # Written by /task-start
│   ├── config.json            # Optional configuration
│   └── events/                # Prepared for Phase 2
│       └── .gitkeep
└── tasks/
    └── ...
```

### Files to Modify

1. `.ai/_framework/commands/task-start.md` - Add cockpit integration step
2. `.ai/_framework/commands/task-done.md` - Add cockpit cleanup step

## Implementation Approach

1. **Work Item 01**: Create the cockpit directory structure manually or via init
2. **Work Item 02**: Add step to `/task-start` that writes `active-task.json`
3. **Work Item 03**: Add step to `/task-done` that deletes `active-task.json`
4. **Work Item 04**: Manual verification of the full lifecycle

## Risks & Considerations

- Ensure `active-task.json` is written atomically (write to temp, rename)
- Handle case where cockpit directory doesn't exist
- Consider what happens if user runs `/task-start` twice without `/task-done`

## Testing Strategy

Manual testing:
1. Run `/task-start LOCAL-TEST`
2. Verify `.ai/cockpit/active-task.json` exists with correct content
3. Run `/task-done`
4. Verify `active-task.json` is deleted

## Dependencies

- None (this is Phase 1)

## References

- [MVP v2 Specification](../../docs/_architecture/ai-cockpit-mvp-v2.md)
- [/task-start Command](../../_framework/commands/task-start.md)
- [/task-done Command](../../_framework/commands/task-done.md)

---

_Created: 2025-12-28_
_Last Updated: 2025-12-28_
_EPIC: EPIC-001_
