---
type: command
name: task-done
layer: framework
tags:
  - command
---



> Parent: [[commands-index]]
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

Mark a task as done, log it to history, and update its status in the vault. This preserves the task for future reference.

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ ⛔ DO NOT EDIT APPLICATION CODE                                 │
│                                                                 │
│ ALLOWED:  Read any file. Write ONLY inside .ai/ directory.      │
│ FORBIDDEN: Create, edit, or delete files outside .ai/           │
│ TEMP FILES: Scratch/temporary output goes in .ai/tmp/           │
│                                                                 │
│ This command archives tasks and updates documentation.           │
│ It must NEVER modify application source code, tests, or config. │
│ If you find yourself editing code files, STOP — you are off     │
│ track. Only .ai/tasks/, .ai/docs/, and .ai/context.md may be   │
│ written to.                                                     │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/task-done JIRA-123
/task-done              # Complete current in_progress task
```

## Workflow

```
1. IDENTIFY TASK
   • Find task with status: in_progress via frontmatter
   • Verify all work items are complete

2. VERIFY COMPLETION
   • Check all work items' frontmatter status fields
   • If any have status: todo or status: in_progress, warn user

3. LOG TO HISTORY
   • Append to .ai/docs/_completed_tasks.md
   • Include: date, JIRA, summary, repos affected

4. MARK AS DONE
   • Update task note frontmatter: status → done
   • Update tags to include done

5. UPDATE DOCUMENTATION
   • If significant patterns learned, offer to document
   • Update docs-index if new docs created

6. SEND NOTIFICATION
   • If notifications enabled, send Discord/Slack message
```

## Implementation

### Step 0: Orientation

1. Use `get_frontmatter("_project/manifest.md")` to read the manifest and understand:
   - Notification settings
   - Available MCPs (for notifications)

2. **Extension Support**: This command supports compiled extensions
   via `/command-extend task-done --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

3. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ COMPLETING TASK                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 1: Find Task

**If task ID provided:**
- Use `get_frontmatter("tasks/{task-id}/{task-id}.md")` to read the task note.
- If `status` field is `done`, say: "Task {task-id} is already marked as done."
- If not found, say: "Task {task-id} not found."

**If no task ID provided:**
- Use `search_notes("type: task status: in_progress")` to find in-progress tasks.
- If no tasks found, say: "No tasks in progress to complete."
- If multiple tasks found, list them and ask:
  ```
  Multiple tasks in progress:
    1. {task-id-1}: {title}
    2. {task-id-2}: {title}

  Which task to complete? (Enter number or task ID)
  ```

### Step 2: Verify Completion

1. Scan the task folder `tasks/{task-id}/` using `Glob` for all `.md` files excluding the task note itself (i.e., all work item files).

2. For each work item file, use `get_frontmatter("tasks/{task-id}/{filename}")` to read its `status` field.

3. Display verification:
```
VERIFICATION
══════════════════════════════════════════════════════════════════

Task: {task-id} - {title}

Work Items:
  ✓ Done: {done_count}
  □ Todo: {todo_count}
  ▶ In Progress: {in_progress_count}
```

4. If any items have status `todo` or `in_progress`:
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
| {YYYY-MM-DD} | [[{task-id}]] | {summary} |
```

If the file has the placeholder row `| _No tasks completed yet_ | | |`, remove it first.

### Step 5: Mark Task as Done

1. Update the task note's frontmatter using `update_frontmatter("tasks/{task-id}/{task-id}.md", { status: "done", tags: ["task", "done"] })`.

2. Update the task note's header block using `patch_note` to reflect the completed status.

### Step 6: Update Context

Update `.ai/context.md` using `patch_note`:
- Remove task from "In Progress" in Current State section
- Add to "Recently Done" count

### Step 7: Invoke Documenter Agent (Automatic)

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️  MANDATORY: INVOKE DOCUMENTER AGENT                          │
│                                                                 │
│ You MUST invoke the documenter agent to capture learnings.      │
│ Do NOT skip this step or write documentation yourself.          │
│ The documenter agent ensures consistent knowledge capture.      │
│                                                                 │
│ If you find yourself skipping documentation or completing the   │
│ task without invoking the documenter agent, STOP.               │
└─────────────────────────────────────────────────────────────────┘

**Invoke the documenter agent** to capture learnings from this task.

First, gather the diff:
```bash
# Get full task diff (if tracking start commit)
git diff {task_start_commit}..HEAD > /tmp/task-changes.diff 2>/dev/null || git diff HEAD~10..HEAD > /tmp/task-changes.diff
```

Provide the following context to the agent:

```
## Completed Task
{task note content}

## Work Items Completed
{all work item files content}

## Feedback Received
{all feedback files content}

## Changes Made (Full Diff)
{contents of task-changes.diff}

## Existing Documentation
{list and content of relevant .ai/docs/ files}

## Your Mission
Analyze this completed task and propose documentation updates:
1. Task summary for _completed_tasks.md
2. New patterns discovered → .ai/docs/
3. Updates to existing docs if needed
4. Architecture decisions made

Return proposals for user approval.
```

**Present proposals to user:**
```
╔══════════════════════════════════════════════════════════════════╗
║ DOCUMENTATION PROPOSALS                                          ║
╠══════════════════════════════════════════════════════════════════╣

  1. [NEW] .ai/docs/{path}/new-doc.md
     {brief description}

  2. [UPDATE] .ai/docs/_architecture/README.md
     {section and change description}

  3. [APPEND] .ai/docs/_completed_tasks.md
     {task log entry preview}

╠══════════════════════════════════════════════════════════════════╣
║ [A]pply All  [R]eview Each  [S]kip                               ║
╚══════════════════════════════════════════════════════════════════╝
```

- If **Apply All**: Apply all proposed documentation changes
- If **Review Each**: Show each proposal and ask for approval
- If **Skip**: Skip documentation updates

### Step 8: Send Notification

If `notifications.on_task_done` is true in manifest and notification MCP is available:

```
Sending notification...
```

Send notification with:
- Title: "Task Completed: {task-id}"
- Summary: {user's summary}
- Type: success

### Step 9: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ TASK COMPLETE                                                    ║
╚══════════════════════════════════════════════════════════════════╝

Task: {task-id} - {title}

Summary: {summary}

Work Items: {done_count} completed

Status: [[{task-id}]] marked as done

History: Added to .ai/docs/_completed_tasks.md

{if notification sent}
Notification: Sent to Discord
{/if}

Next Steps:
  • /task-create         Start a new task
  • /task-status         View all tasks
  • /help                Show commands
```

### Step 10: Invoke Sync Agent (if enabled)

Check `auto_sync.enabled` in the manifest frontmatter read in Step 0.

**If auto_sync is enabled:**

```bash
# Get .ai/ folder status
git status .ai/ --porcelain
```

**Invoke the sync agent** with the following context:

```
## .ai/ Folder Status
{git status output}

## Task Context
Task ID: {task-id}
Trigger: task-done

## Your Mission
Commit changes to .ai/ folder using batched commits:
- docs: Documentation changes
- tasks: Task state changes
- config: Configuration changes

Execute git operations and report results.
```

The Sync agent will:
- Batch changes by type
- Create appropriate commit messages
- Report sync results

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further.
