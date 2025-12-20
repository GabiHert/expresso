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

## Usage

```
/task-status              # Show all tasks
/task-status JIRA-123     # Show specific task details
```

## Workflow

```
1. SCAN TASK FOLDERS
   • Count tasks in .ai/tasks/todo/, in_progress/, done/
   • Get task names and JIRA IDs

2. FOR EACH ACTIVE TASK
   • Count work items by status
   • Identify current focus

3. FORMAT OUTPUT
   • Show dashboard view
   • Highlight blocked items
   • Show recent completions
```

## Implementation

### Step 0: Orientation

Read `.ai/_project/manifest.yaml` to understand project context.

### Step 1: Parse Arguments

**If task ID provided:**
- Go to Step 4 (Detailed Task View)

**If no task ID provided:**
- Go to Step 2 (Dashboard View)

### Step 2: Scan Task Folders

Scan the following directories:
- `.ai/tasks/todo/`
- `.ai/tasks/in_progress/`
- `.ai/tasks/done/`

For each task folder found, read its `status.yaml` to get:
- Task ID
- Title
- Work item counts

### Step 3: Format Dashboard

Output the dashboard:

```
╔══════════════════════════════════════════════════════════════════╗
║ TASK DASHBOARD                                                   ║
╠══════════════════════════════════════════════════════════════════╣
{if in_progress tasks exist}
║ IN PROGRESS ({count})                                            ║
{for each task in in_progress}
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
{for each task in todo}
║ ├─ {task-id}: {title}                                            ║
{/for}
║                                                                   ║
{/if}
{if done tasks exist (show last 5)}
║ RECENTLY DONE                                                    ║
{for each task in done (most recent 5)}
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

1. Find the task in todo/, in_progress/, or done/.

2. If not found:
   ```
   Task '{task-id}' not found.

   Available tasks:
     In Progress: {list}
     Todo: {list}
   ```

3. If found, read the task's README.md and status.yaml.

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
{for each done item}
║   ✓ {id}. {name} ({repo})                                        ║
{/for}
║                                                                   ║
{if in_progress items}
║ In Progress ({count}):                                           ║
{for each in_progress item}
║   ▶ {id}. {name} ({repo})                                        ║
{/for}
║                                                                   ║
{/if}
{if todo items}
║ Todo ({count}):                                                  ║
{for each todo item}
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

Location: .ai/tasks/{status}/{task-id}/

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
