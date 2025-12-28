<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-task-done-integration.md                           ║
║ TASK: LOCAL-001                                                  ║
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

# Update /task-done Command

## Objective

Modify the `/task-done` command to clear `active-task.json` when a task is completed, stopping cockpit tracking for that task.

## Pre-Implementation

Read the current `/task-done` command:
- `.ai/_framework/commands/task-done.md`

## Implementation Steps

### Step 1: Add New Step to task-done.md

**File**: `.ai/_framework/commands/task-done.md`

Add a new step before moving the task to `done/`:

```markdown
### Step X: Deactivate Cockpit Tracking

Before moving task to done:

1. Check if `.ai/cockpit/active-task.json` exists

2. If it exists, read and verify:
   ```bash
   cat .ai/cockpit/active-task.json | jq -r '.taskId'
   ```

3. If taskId matches current task:
   - Delete the file:
     ```bash
     rm .ai/cockpit/active-task.json
     ```
   - Announce:
     ```
     Cockpit: Task {task-id} tracking stopped
     ```

4. If taskId doesn't match:
   - Warn user:
     ```
     Warning: Active task is {other-task}, not {current-task}.
     The active task file will not be modified.
     ```

5. If file doesn't exist:
   - No action needed (task wasn't being tracked)
```

### Step 2: Handle Edge Cases

Add handling for:

1. **No active-task.json**: Silently continue (task wasn't tracked)
2. **Different task is active**: Warn but don't delete
3. **Malformed JSON**: Log warning, delete anyway

### Step 3: Optional - Archive Events

Consider whether to archive the events for the completed task:

```markdown
### Optional: Archive Events

After deactivating tracking:

1. If `.ai/cockpit/events/{task-id}/` exists:
   - Events are preserved for history
   - No action needed (or optionally move to archive)
```

## Acceptance Criteria

- [ ] `/task-done` removes `.ai/cockpit/active-task.json`
- [ ] Only removes if taskId matches current task
- [ ] Warns if different task is active
- [ ] Works gracefully if no active-task.json exists
- [ ] Announcement is shown after deactivation

## Testing

```bash
# Start a task
/task-start LOCAL-TEST

# Verify active
cat .ai/cockpit/active-task.json

# Complete the task
/task-done

# Verify removed
ls .ai/cockpit/active-task.json  # Should not exist
```

## Notes

- Keep events in `.ai/cockpit/events/{task-id}/` even after task is done
- Events serve as historical record of what Claude Code did
- Consider adding a separate cleanup command if needed
