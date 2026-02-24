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
/task-start                       # Lists available tasks to choose from
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
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand:
   - Available repositories
   - Commit conventions

2. **EXTENSION CHECK (MANDATORY)**:
   ```
   ┌─────────────────────────────────────────────────────────────────┐
   │ CHECK FOR PROJECT EXTENSION                                     │
   │                                                                 │
   │ Look for: .ai/_project/commands/task-start.extend.md           │
   │                                                                 │
   │ If file EXISTS:                                                 │
   │   1. Read the extension file completely                         │
   │   2. Parse and extract these sections:                          │
   │      • Context     → Add to orientation announcements           │
   │      • Pre-Hooks   → Execute BEFORE Step 1                      │
   │      • Step Overrides → Replace matching steps                  │
   │      • Agents      → Use specified agents for phases            │
   │      • Post-Hooks  → Execute AFTER final step                   │
   │   3. Announce: "✓ Project Extension Active"                     │
   │   4. FOLLOW ALL EXTENSION INSTRUCTIONS - they override defaults │
   │                                                                 │
   │ This check is NON-NEGOTIABLE. Extensions customize behavior.    │
   └─────────────────────────────────────────────────────────────────┘
   ```

3. Announce:
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

### Step 5: Update Context

Update `.ai/context.md`:
- Move task from "Todo" to "In Progress" in Current State section

### Step 6: Output Summary

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

### Step 7: Auto-Sync (if enabled)

Check `.ai/_project/manifest.yaml` for `auto_sync.enabled`.

**If auto_sync is enabled:**

Use the ai-sync agent (lightweight/Haiku) to commit and push changes:
```
Use the ai-sync agent to sync the .ai folder changes
```

This ensures task status changes are tracked in version control automatically.

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further unless the user asks to start work.
