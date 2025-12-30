<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/done/LOCAL-013/                              ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)           ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                  ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-013: Add diff feedback comments for agent review

## Problem Statement

Users need a way to review full diff file changes from tasks and add comments that can be forwarded to agents. Currently, there's no mechanism to provide feedback on code changes that agents can read and address in subsequent sessions.

The solution should be simple: store feedback as markdown in the task documentation folder, and provide a framework command for agents to read and address the feedback.

## Acceptance Criteria

- [ ] Users can add comments to `.ai/tasks/{taskId}/feedback/diff-review.md`
- [ ] `/address-feedback` command reads and presents comments to agent
- [ ] VSCode shows button to open feedback file for active task
- [ ] New tasks include `feedback/` folder in structure

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Feedback storage format | ai-framework | todo |
| 02 | Create /address-feedback command | ai-framework | todo |
| 03 | VSCode feedback button | vscode-extension | todo |
| 04 | Task-create integration | ai-framework | todo |

## Branches

| Repo | Branch |
|------|--------|
| ai-framework | `LOCAL-013-diff-feedback` |

## Technical Context

### Current State
- Diffs are tracked via shadow copy system in `.ai/cockpit/shadows/{taskId}/`
- Three-way diff viewing available (baseline, accumulated, actual)
- No commenting or feedback mechanism exists

### Target State
- Feedback stored in task folder: `.ai/tasks/{taskId}/feedback/diff-review.md`
- Simple markdown format with file paths and line references
- Agent can read feedback via `/address-feedback` command
- VSCode provides quick access button

### Key Files

**ai-framework:**
- `.ai/_framework/commands/` - Where new command will live
- `.ai/_framework/templates/` - Where feedback template will go
- `.ai/_framework/commands/task-create.md` - Needs update for feedback folder

**vscode-extension:**
- `src/extension.ts` - Command registration
- `src/providers/TaskTreeProvider.ts` - Tree view items

## Implementation Approach

1. Design a simple markdown format for feedback (file path + line + comment)
2. Create framework command that reads feedback and formats for agent
3. Add VSCode button that opens feedback file in editor
4. Update task-create to include feedback folder in new tasks

## Risks & Considerations

- Keep format simple - users will edit manually
- Ensure agent can parse file paths and line numbers from markdown
- Consider how to handle resolved vs unresolved feedback

## Testing Strategy

1. Create a feedback file manually, run `/address-feedback`
2. Verify agent receives and acknowledges feedback
3. Test VSCode button opens correct file
4. Create new task, verify feedback folder exists

## References

- Exploration from /task-explore session on diff commenting
- Shadow copy system docs: `.ai/docs/_architecture/shadow-copy-system.md`
