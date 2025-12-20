<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /task-start                                             ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Begin working on a task                                 ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /task-start - Begin Working on a Task

## Description

Start a task by moving it from todo to in_progress, reading the task context, and preparing to work on the first work item.

## Usage

```
/task-start JIRA-123
/task-start LOCAL-001
/task-start                    # Lists available tasks to choose from
```

## Workflow

```
1. FIND TASK
   • Search in .ai/tasks/todo/
   • Validate task exists

2. MOVE TO IN_PROGRESS
   • Move folder from todo/ to in_progress/
   • Update any status markers

3. READ AND ORIENT
   • Read task README thoroughly
   • Announce understanding of:
     - Problem statement
     - Acceptance criteria
     - Affected repos
     - Implementation approach

4. CHECK WORK ITEMS
   • List all work items by repo
   • Identify which are in todo/ vs done/
   • Recommend starting point

5. PREPARE BRANCHES
   • Create branch in each affected repo
   • Follow branch naming convention from manifest
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand:
   - Available repositories
   - Branch naming conventions
   - Commit conventions

2. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ STARTING TASK                                                    ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 1: Parse Arguments

**If task ID provided:**
- Look for task in `.ai/tasks/todo/{task-id}/`
- If not found in todo, check `.ai/tasks/in_progress/{task-id}/`
  - If found there, say: "Task {task-id} is already in progress. Use /task-resume to continue."
- If not found anywhere, say: "Task {task-id} not found. Use /task-status to see available tasks."

**If no task ID provided:**
- List available tasks in todo/:
```
Available tasks in todo:

  1. {task-id-1}: {title}
  2. {task-id-2}: {title}
  ...

Which task would you like to start? (Enter number or task ID)
```

### Step 2: Move Task to In Progress

Move the entire task folder:
- From: `.ai/tasks/todo/{task-id}/`
- To: `.ai/tasks/in_progress/{task-id}/`

Update the task's README.md header to reflect new location:
```markdown
║ LOCATION: .ai/tasks/in_progress/{task-id}/                      ║
```

### Step 3: Read and Orient

1. Read the task's README.md completely.

2. Read the task's status.yaml for work item overview.

3. Announce understanding:
```
╔══════════════════════════════════════════════════════════════════╗
║ TASK: {task-id}                                                  ║
║ {title}                                                          ║
╠══════════════════════════════════════════════════════════════════╣

PROBLEM
{summarize problem statement in 2-3 sentences}

ACCEPTANCE CRITERIA
{list acceptance criteria}

AFFECTED REPOS
{list repos with brief description of changes}

APPROACH
{summarize implementation approach}
```

### Step 4: Check Work Items

Read status.yaml and list work items by status:

```
WORK ITEMS
══════════════════════════════════════════════════════════════════

Todo ({count}):
  □ 01. {name} ({repo})
  □ 02. {name} ({repo})

In Progress ({count}):
  ▶ {none currently}

Done ({count}):
  ✓ {none yet}

══════════════════════════════════════════════════════════════════
```

Recommend starting point:
```
RECOMMENDATION
Start with work item 01: {name}
This is the first item and has no dependencies.
```

### Step 5: Prepare Branches

For each affected repo, offer to create the branch:
```
BRANCHES

The following branches should be created:

  {repo}: git checkout -b {branch-name}
  {repo}: git checkout -b {branch-name}

Would you like me to create these branches now? (y/n)
```

**If yes**, for each repo:
1. Navigate to the repo directory
2. Ensure on main/master branch and up to date
3. Create the feature branch:
   ```bash
   cd {repo.path}
   git checkout main && git pull
   git checkout -b {conventions.branches.pattern}
   ```

**If no**, proceed without creating branches.

### Step 6: Update Context

Update `.ai/context.md`:
- Move task from "Todo" to "In Progress" in Current State section

### Step 7: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ READY TO WORK                                                    ║
╚══════════════════════════════════════════════════════════════════╝

Task: {task-id} - {title}
Location: .ai/tasks/in_progress/{task-id}/

Work Items: {total} total, {todo} remaining

Start With:
  □ 01. {first work item name} ({repo})

Quick Commands:
  • /task-work 01              Work on item 01
  • /task-status               View all tasks
  • /task-review               Run code review
```

Then stop. Do not proceed further unless the user asks to start work.
