<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-task-create-integration.md                         ║
║ TASK: LOCAL-013                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: ai-framework
---

# Task-Create Integration

## Objective

Update the `/task-create` command to include the `feedback/` folder in newly created tasks, with the feedback template file ready for use.

## Implementation Steps

### Step 1: Update task-create command

**File**: `.ai/_framework/commands/task-create.md`

In Step 7 (Create Task Structure), add:

**7b. Create sub-directories:** (update existing)
```
- `todo/`
- `in_progress/`
- `done/`
- `feedback/`    ← ADD THIS
```

Add new step:

**7f. Create feedback file:**
```markdown
Copy `.ai/_framework/templates/feedback-template.md` to
`.ai/tasks/todo/{ticket-id}/feedback/diff-review.md`
```

### Step 2: Update README template

**File**: `.ai/_framework/commands/task-create.md`

In the README.md template section, add reference to feedback:

```markdown
## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.
```

### Step 3: Verify directory creation

Ensure the mkdir commands create the feedback folder:

```bash
mkdir -p .ai/tasks/todo/{ticket-id}/{todo,in_progress,done,feedback}
```

## Acceptance Criteria

- [ ] `/task-create` creates `feedback/` folder
- [ ] Feedback template copied to new tasks
- [ ] README mentions feedback system
- [ ] New tasks ready for feedback out of the box

## Testing

1. Run `/task-create LOCAL-TEST "Test task"`
2. Verify `feedback/` folder exists
3. Verify `feedback/diff-review.md` exists with template content
4. Verify README mentions feedback

## Notes

- Template should be copied, not linked
- If template doesn't exist, create minimal feedback file
- Keep backward compatible - existing tasks still work
