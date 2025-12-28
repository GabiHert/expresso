<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /task-done                                              ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Complete and log a task                                 ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /task-done - Complete and Log a Task

## Description

Mark a task as done, log it to history, and move it to the done folder. This preserves the task for future reference.

## Usage

```
/task-done JIRA-123
/task-done              # Complete current in_progress task
```

## Workflow

```
1. IDENTIFY TASK
   • Find task in in_progress/
   • Verify all work items are complete

2. VERIFY COMPLETION
   • Check all work items in done/
   • If any in todo/ or in_progress/, warn user

3. LOG TO HISTORY
   • Append to .ai/docs/_completed_tasks.md
   • Include: date, JIRA, summary, repos affected

4. MOVE TO DONE
   • Move task folder to .ai/tasks/done/
   • Preserve all work items and README

5. UPDATE DOCUMENTATION
   • If significant patterns learned, offer to document
   • Update INDEX.md if new docs created

6. SEND NOTIFICATION
   • If notifications enabled, send Discord/Slack message
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand:
   - Notification settings
   - Available MCPs (for notifications)

2. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ COMPLETING TASK                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 1: Find Task

**If task ID provided:**
- Look for task in `.ai/tasks/in_progress/{task-id}/`
- If not found, check `.ai/tasks/done/{task-id}/`
  - If found there, say: "Task {task-id} is already marked as done."
- If not found anywhere, say: "Task {task-id} not found."

**If no task ID provided:**
- Look in `.ai/tasks/in_progress/`
- If no tasks found, say: "No tasks in progress to complete."
- If multiple tasks found, list them and ask:
  ```
  Multiple tasks in progress:
    1. {task-id-1}: {title}
    2. {task-id-2}: {title}

  Which task to complete? (Enter number or task ID)
  ```

### Step 2: Verify Completion

1. Read the task's status.yaml.

2. Check work item statuses:
```
VERIFICATION
══════════════════════════════════════════════════════════════════

Task: {task-id} - {title}

Work Items:
  ✓ Done: {done_count}
  □ Todo: {todo_count}
  ▶ In Progress: {in_progress_count}
```

3. If any items NOT in done/:
```
WARNING: Not all work items are complete.

Incomplete items:
  □ {id}. {name} ({status})
  □ {id}. {name} ({status})

Options:
  1. Complete remaining items first (/task-work)
  2. Mark task as done anyway (items will be preserved)
  3. Cancel

Choice? (1/2/3)
```

### Step 3: Gather Summary

Ask the user for a completion summary:
```
SUMMARY

Please provide a brief summary of what was accomplished:
- What was the main change?
- Any important notes for future reference?
```

### Step 4: Log to History

Append to `.ai/docs/_completed_tasks.md`:

```markdown
| {YYYY-MM-DD} | [{task-id}](.ai/tasks/done/{task-id}/) | {summary} |
```

If the file has the placeholder row `| _No tasks completed yet_ | | |`, remove it first.

### Step 5: Move Task to Done

1. Move the entire task folder:
   - From: `.ai/tasks/in_progress/{task-id}/`
   - To: `.ai/tasks/done/{task-id}/`

2. Update the task's README.md header:
```markdown
║ LOCATION: .ai/tasks/done/{task-id}/                             ║
```

### Step 6: Deactivate Cockpit Tracking

Deactivate cockpit tracking for the completed task:

1. Check if `.ai/cockpit/active-task.json` exists:
   ```bash
   test -f .ai/cockpit/active-task.json
   ```

2. **If file exists**, read the taskId:
   ```bash
   cat .ai/cockpit/active-task.json | jq -r '.taskId'
   ```

3. **If taskId matches current task**:
   - Delete the file:
     ```bash
     rm .ai/cockpit/active-task.json
     ```
   - Announce:
     ```
     Cockpit: Task {task-id} tracking stopped
     ```

4. **If taskId does NOT match current task**:
   - Warn:
     ```
     Warning: Active task is {other-task-id}, not {current-task-id}.
     The active task file will not be modified.
     ```
   - Continue without deleting (different task is active)

5. **If file doesn't exist**:
   - Continue silently (task wasn't being tracked via cockpit)

**Note**: Events in `.ai/cockpit/events/{task-id}/` are preserved for historical reference.

### Step 7: Update Context

Update `.ai/context.md`:
- Remove task from "In Progress" in Current State section
- Add to "Recently Done" count

### Step 8: Offer Documentation

If significant patterns were discovered:
```
DOCUMENTATION

Would you like to document any patterns or learnings from this task?

Common options:
  1. Add to shared patterns (.ai/docs/_shared/)
  2. Add to repo-specific docs (.ai/docs/{repo}/)
  3. Add to architecture docs (.ai/docs/_architecture/)
  4. Skip documentation

Choice? (1/2/3/4)
```

If user chooses to document:
- Create appropriate documentation file
- Update INDEX.md with new entry

### Step 9: Send Notification

If `notifications.on_task_done` is true in manifest and notification MCP is available:

```
Sending notification...
```

Send notification with:
- Title: "Task Completed: {task-id}"
- Summary: {user's summary}
- Type: success

### Step 10: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ TASK COMPLETE                                                    ║
╚══════════════════════════════════════════════════════════════════╝

Task: {task-id} - {title}

Summary: {summary}

Work Items: {done_count} completed

Archived: .ai/tasks/done/{task-id}/

History: Added to .ai/docs/_completed_tasks.md

{if notification sent}
Notification: Sent to Discord
{/if}

Next Steps:
  • /task-create         Start a new task
  • /task-status         View all tasks
  • /help                Show commands
```

### Step 11: Auto-Sync (if enabled)

Check `.ai/_project/manifest.yaml` for `auto_sync.enabled`.

**If auto_sync is enabled:**

Use the ai-sync agent (lightweight/Haiku) to commit and push changes:
```
Use the ai-sync agent to sync the .ai folder changes
```

This ensures task completion is tracked in version control automatically.

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further.
