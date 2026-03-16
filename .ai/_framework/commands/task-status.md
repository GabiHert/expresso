---
type: command
name: task-status
layer: framework
tags:
  - command
---



> Parent: [[commands-index]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /task-status                                            ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: View task dashboard                                     ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /task-status - View Task Dashboard

## Description

Display current status of all tasks and work items in a dashboard format.

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ ⛔ READ-ONLY COMMAND — DO NOT MODIFY ANY FILES                  │
│                                                                 │
│ ALLOWED:  Read any file, display output to user                 │
│ FORBIDDEN: Edit, Write, create, or delete ANY files             │
│ TEMP FILES: If you must create scratch files, use .ai/tmp/      │
│                                                                 │
│ This command displays information only. If you find yourself    │
│ about to edit or create a file, STOP — you are off track.       │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/task-status              # Show all tasks
/task-status JIRA-123     # Show specific task details
```

## Workflow

```
1. SEARCH TASKS BY STATUS TAG
   • Use search_notes to find tasks by status: todo, in_progress, done
   • Get task names and JIRA IDs from frontmatter

2. FOR EACH ACTIVE TASK
   • Count work items by status (scan task folder, read frontmatter of each .md)
   • Identify current focus

3. FORMAT OUTPUT
   • Show dashboard view
   • Highlight blocked items
   • Show recent completions
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.md` using `get_frontmatter("_project/manifest.md")` to understand project context.

2. **Extension Support**: This command supports compiled extensions
   via `/command-extend task-status --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

### Step 1: Parse Arguments

**If task ID provided:**
- Go to Step 4 (Detailed Task View)

**If no task ID provided:**
- Go to Step 2 (Dashboard View)

### Step 2: Find Tasks by Status

Use `search_notes` to find tasks by their status frontmatter tag:
- `search_notes("type: task status: in_progress")` — tasks in progress
- `search_notes("type: task status: todo")` — todo tasks
- `search_notes("type: task status: done")` — completed tasks

For each task note found, use `get_frontmatter` on `tasks/TASK-ID/TASK-ID.md` to get:
- Task ID
- Title
- `summary` field with `{total, todo, in_progress, done}` counts

### Step 3: Format Dashboard

Output the dashboard:

```
╔══════════════════════════════════════════════════════════════════╗
║ TASK DASHBOARD                                                   ║
╠══════════════════════════════════════════════════════════════════╣
{if in_progress tasks exist}
║ IN PROGRESS ({count})                                            ║
{for each task with status: in_progress}
║ └─ {task-id}: {title}                                            ║
║    {progress bar: ████░░░░░░ 4/10}                               ║
{for each repo with items}
║    ├─ {repo}: {done}/{total} items                               ║
{/for}
{/for}
║                                                                   ║
{/if}
{if todo tasks exist}
║ TODO ({count})                                                   ║
{for each task with status: todo}
║ ├─ {task-id}: {title}                                            ║
{/for}
║                                                                   ║
{/if}
{if done tasks exist (show last 5)}
║ RECENTLY DONE                                                    ║
{for each task with status: done (most recent 5)}
║ ├─ {task-id}: {title}                                            ║
{/for}
║                                                                   ║
{/if}
{if no tasks at all}
║ No tasks found.                                                  ║
║                                                                   ║
║ Create a task with: /task-create JIRA-123 "Description"          ║
{/if}
╠══════════════════════════════════════════════════════════════════╣
║ Quick Commands:                                                  ║
║   /task-create     Create new task                               ║
║   /task-start      Start a todo task                             ║
║   /task-work       Work on current task                          ║
╚══════════════════════════════════════════════════════════════════╝
```

Then stop. Do not proceed further.

### Step 4: Detailed Task View

When a specific task ID is provided, show detailed view.

1. Search for the task using `search_notes("type: task {task-id}")` or read `tasks/TASK-ID/TASK-ID.md` directly if the path is known.

2. If not found:
   ```
   Task '{task-id}' not found.

   Available tasks:
     In Progress: {list}
     Todo: {list}
   ```

3. If found, read the task note at `tasks/TASK-ID/TASK-ID.md` using `get_frontmatter` to retrieve status, title, created date, updated date, branches, and acceptance criteria. Scan the task folder for work-item `.md` files (e.g., `TASK-ID-01.md`, `TASK-ID-02.md`) and read their frontmatter to determine each item's `status` field.

4. Output detailed view:

```
╔══════════════════════════════════════════════════════════════════╗
║ TASK: {task-id}                                                  ║
║ {title}                                                          ║
╠══════════════════════════════════════════════════════════════════╣
║ Status: {todo/in_progress/done}                                  ║
║ Created: {date}                                                  ║
║ Updated: {date}                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ PROBLEM                                                          ║
║ {problem statement summary}                                      ║
╠══════════════════════════════════════════════════════════════════╣
║ PROGRESS                                                         ║
║                                                                   ║
║ {progress bar: ████████░░ 8/10}                                  ║
║                                                                   ║
║ Done ({count}):                                                  ║
{for each work item with status: done}
║   ✓ {id}. {name} ({repo})                                        ║
{/for}
║                                                                   ║
{if in_progress items}
║ In Progress ({count}):                                           ║
{for each work item with status: in_progress}
║   ▶ {id}. {name} ({repo})                                        ║
{/for}
║                                                                   ║
{/if}
{if todo items}
║ Todo ({count}):                                                  ║
{for each work item with status: todo}
║   □ {id}. {name} ({repo})                                        ║
{/for}
{/if}
╠══════════════════════════════════════════════════════════════════╣
║ BRANCHES                                                         ║
{for each repo}
║   {repo}: {branch-name}                                          ║
{/for}
╠══════════════════════════════════════════════════════════════════╣
║ ACCEPTANCE CRITERIA                                              ║
{for each criterion}
║   {✓/□} {criterion}                                              ║
{/for}
╚══════════════════════════════════════════════════════════════════╝

Location: .ai/tasks/{task-id}/

Quick Commands:
{if status is todo}
  • /task-start {task-id}     Begin this task
{/if}
{if status is in_progress}
  • /task-work                Work on next item
  • /task-done {task-id}      Complete this task
{/if}
```

Then stop. Do not proceed further.
