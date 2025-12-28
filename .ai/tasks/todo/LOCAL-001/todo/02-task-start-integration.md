<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-task-start-integration.md                          ║
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

# Update /task-start Command

## Objective

Modify the `/task-start` command to write `active-task.json` when a task is started, enabling the cockpit to track the current task.

## Pre-Implementation

Read the current `/task-start` command:
- `.ai/_framework/commands/task-start.md`

Review the MVP v2 spec for the active-task.json format:
- `.ai/docs/_architecture/ai-cockpit-mvp-v2.md`

## Implementation Steps

### Step 1: Add New Step to task-start.md

**File**: `.ai/_framework/commands/task-start.md`

Add a new step after the task is moved to `in_progress/`:

```markdown
### Step X: Activate Cockpit Tracking

After moving task to in_progress:

1. Create `.ai/cockpit/` directory if it doesn't exist:
   ```bash
   mkdir -p .ai/cockpit/events
   ```

2. Get current git branch:
   ```bash
   git branch --show-current
   ```

3. Write `active-task.json`:
   ```json
   {
     "taskId": "{task-id}",
     "title": "{task-title}",
     "branch": "{current-git-branch}",
     "frameworkPath": ".ai/tasks/in_progress/{task-id}",
     "startedAt": "{ISO-timestamp}",
     "sessionId": "{generate-uuid-or-timestamp}"
   }
   ```

4. Announce activation:
   ```
   Cockpit: Task {task-id} is now active
   All edits will be tracked under this task.
   ```

**Note**: Write to a temp file first, then rename for atomicity:
```bash
# Write to temp
echo '{...}' > .ai/cockpit/active-task.json.tmp
# Atomic rename
mv .ai/cockpit/active-task.json.tmp .ai/cockpit/active-task.json
```
```

### Step 2: Handle Edge Cases

Add handling for:

1. **Cockpit directory doesn't exist**: Create it
2. **Another task is already active**: Warn user
   ```
   Warning: Task {existing-task} is already active.
   Options:
     1. Switch to {new-task} (replaces active)
     2. Cancel
   ```
3. **No git branch**: Use "unknown" or skip branch field

### Step 3: Update Workflow Diagram

If the command has a workflow diagram, add the cockpit step.

## Acceptance Criteria

- [ ] `/task-start` creates `.ai/cockpit/active-task.json`
- [ ] File contains correct taskId, title, branch, frameworkPath, startedAt
- [ ] Directory is created if missing
- [ ] User is warned if another task is active
- [ ] Announcement is shown after activation

## Testing

```bash
# Start a task
/task-start LOCAL-TEST

# Verify file exists
cat .ai/cockpit/active-task.json | jq .

# Expected output:
{
  "taskId": "LOCAL-TEST",
  "title": "...",
  "branch": "...",
  ...
}
```

## Notes

- The sessionId can be a simple timestamp-based ID for now
- Consider using the hook's session_id if available in environment
- Keep the implementation simple - don't over-engineer
