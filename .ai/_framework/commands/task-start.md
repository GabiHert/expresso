---
type: command
name: task-start
layer: framework
tags:
  - command
---



> Parent: [[commands-index]]
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

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ ⛔ DO NOT EDIT APPLICATION CODE                                 │
│                                                                 │
│ ALLOWED:  Read any file. Write ONLY inside .ai/ directory.      │
│ FORBIDDEN: Create, edit, or delete files outside .ai/           │
│ TEMP FILES: Scratch/temporary output goes in .ai/tmp/           │
│                                                                 │
│ This command manages task state and creates exploration notes.   │
│ It must NEVER modify application source code, tests, or config. │
│ If you find yourself editing code files, STOP — you are off     │
│ track. Only .ai/tasks/, .ai/docs/, and .ai/context.md may be   │
│ written to.                                                     │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/task-start JIRA-123
/task-start LOCAL-001
/task-start                       # Lists available tasks to choose from
/task-start JIRA-123 --worktree <repo-path> [base-branch]
```

## Options

| Option | Description |
|--------|-------------|
| `--worktree <repo-path>` | Create a git worktree for task isolation. Requires repo path. |
| `[base-branch]` | Base branch for worktree (default: main). Only used with `--worktree`. |

### Examples with --worktree

```bash
# Create worktree from main branch
/task-start JIRA-123 --worktree ~/Projects/backend

# Create worktree from develop branch
/task-start JIRA-123 --worktree ~/Projects/backend develop

# Multiple repos (run separately)
/task-start JIRA-123 --worktree ~/Projects/backend main
/task-start JIRA-123 --worktree ~/Projects/frontend main
```

## Workflow

```
1. FIND TASK
   • Search vault for tasks with status: todo
   • Validate task exists

1.5. CREATE WORKTREE (if --worktree provided)
   • Run scripts/create-worktree.sh (MANDATORY)
   • Create isolated workspace at .worktrees/{task-id}/
   • Never run git worktree add manually

2. MOVE TO IN_PROGRESS
   • Update task note frontmatter: status → in_progress
   • Update tags to reflect new status

3. READ AND ORIENT
   • Read task note thoroughly
   • Announce understanding of:
     - Problem statement
     - Acceptance criteria
     - Affected repos
     - Implementation approach

4. CHECK WORK ITEMS
   • List all work items by repo
   • Identify which have status: todo vs status: done
   • Recommend starting point
```

## Implementation

### Step 0: Orientation

1. Use `get_frontmatter("_project/manifest.md")` to read project manifest and understand:
   - Available repositories
   - Commit conventions

2. **Extension Support**: This command supports compiled extensions
   via `/command-extend task-start --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

3. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ STARTING TASK                                                    ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 1: Parse Arguments

**If task ID provided:**
- Use `search_notes("type: task status: todo")` and filter for the given task ID, or read `tasks/{task-id}/{task-id}.md` directly and check its frontmatter
- If frontmatter shows `status: todo`, proceed
- If frontmatter shows `status: in_progress`, say: "Task {task-id} is already in progress. Use /[[task-resume]] to continue."
- If not found anywhere, say: "Task {task-id} not found. Use /[[task-status]] to see available tasks."

**If no task ID provided:**
- Use `search_notes("type: task status: todo")` to list available tasks:
```
Available tasks in todo:

  1. {task-id-1}: {title}
  2. {task-id-2}: {title}
  ...

Which task would you like to start? (Enter number or task ID)
```

### Step 1.5: Create Worktree (if --worktree provided)

**MANDATORY: Use the `create-worktree.sh` script. Never run `git worktree add` manually.**

If `--worktree` flag is provided:

1. **Validate the script exists:**
   ```bash
   if [ ! -f "scripts/create-worktree.sh" ]; then
     error "Worktree script not found at scripts/create-worktree.sh"
   fi
   ```

2. **Execute the worktree script:**
   ```bash
   scripts/create-worktree.sh <repo-path> <task-id> [base-branch]
   ```

   Example:
   ```bash
   scripts/create-worktree.sh ~/Projects/backend JIRA-123 main
   ```

3. **Announce worktree creation:**
   ```
   ╔══════════════════════════════════════════════════════════════════╗
   ║ WORKTREE CREATED                                                 ║
   ╠══════════════════════════════════════════════════════════════════╣

   Repository: {repo-path}
   Worktree:   {repo-path}/.worktrees/{task-id}/
   Branch:     task/{task-id}
   Base:       {base-branch}

   To enter worktree:
     cd {repo-path}/.worktrees/{task-id}

   To open in VS Code:
     code {repo-path}/.worktrees/{task-id}
   ╚══════════════════════════════════════════════════════════════════╝
   ```

4. **If script fails**, stop and report the error. Do not proceed with task-start.

### Step 2: Move Task to In Progress

Update the task note's frontmatter using `update_frontmatter("tasks/{task-id}/{task-id}.md", {status: "in_progress"})`.

Also update the tags in the frontmatter to include `in_progress` and remove `todo`.

### Step 3: Read and Orient

1. Read the task note `tasks/{task-id}/{task-id}.md` completely.

2. Use `get_frontmatter("tasks/{task-id}/{task-id}.md")` to read the `summary` field for work item overview (fields: total, todo, in_progress, done).

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

### Step 3.5: Run Explorer Agent (Automatic)

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️  MANDATORY: INVOKE EXPLORER AGENT                            │
│                                                                 │
│ You MUST invoke the explorer agent to gather context.           │
│ Do NOT skip this step or explore the codebase yourself.         │
│ The explorer agent ensures thorough, structured exploration.    │
│                                                                 │
│ If you find yourself using Glob/Grep/Read directly instead of   │
│ invoking the explorer agent, STOP — you are off track.          │
└─────────────────────────────────────────────────────────────────┘

**Invoke the explorer agent** with the following context:

```
## Task Context
{task note content}

## Existing Documentation
{list of notes under docs/ from search_notes("type: doc")}

## Your Mission
Explore the codebase to understand what needs to change for this task.
Focus on: affected files, existing patterns, dependencies, and risks.

Save your findings to: tasks/{task-id}/exploration.md
```

The Explorer agent will:
- Search for relevant files and patterns
- Identify dependencies and risks
- Document findings in `exploration.md` (vault note at `tasks/{task-id}/exploration.md`)

Announce when complete:
```
✓ Exploration complete: tasks/{task-id}/exploration.md
```

### Step 3.6: Run Planner Agent (If No Work Items)

**If the task's `summary` frontmatter shows 0 total work items (scan `tasks/{task-id}/` for work item `.md` files to confirm):**

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️  MANDATORY: INVOKE PLANNER AGENT                             │
│                                                                 │
│ You MUST invoke the planner agent to create work items.         │
│ Do NOT skip this step or create work items yourself.            │
│ The planner agent ensures consistent work item structure.       │
│                                                                 │
│ If you find yourself writing work item files without invoking   │
│ the planner agent, STOP — you are off track.                    │
└─────────────────────────────────────────────────────────────────┘

**Invoke the planner agent** with the following context:

```
## Task Context
{task note content}

## Exploration Findings
{exploration.md content}

## Project Repos
{repos from manifest.md frontmatter}

## Your Mission
Break this task into concrete work items.
CRITICAL: Each work item must affect only ONE repository.

Return proposed work items for user approval.
```

Present proposals to user:
```
╔══════════════════════════════════════════════════════════════════╗
║ PROPOSED WORK ITEMS                                              ║
╠══════════════════════════════════════════════════════════════════╣

  1. [{repo}] {item name}
     {description}

  2. [{repo}] {item name}
     {description}

  ...

╠══════════════════════════════════════════════════════════════════╣
║ [A]pprove All  [E]dit  [R]e-plan                                ║
╚══════════════════════════════════════════════════════════════════╝
```

On approval:
- Create work item notes in `tasks/{task-id}/` using `write_note` with frontmatter `status: todo`
- Update the task note's `summary` frontmatter via `update_frontmatter` with updated counts
- Add `[[work-item-note]]` wikilinks to the task note's body via `patch_note`

### Step 4: Check Work Items

Scan `tasks/{task-id}/` for work item `.md` files (files matching `{task-id}-*.md`). For each, use `get_frontmatter` to read its `status` field. List work items grouped by status:

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

Update `.ai/context.md` via `patch_note`:
- Move task from "Todo" to "In Progress" in Current State section

### Step 6: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ READY TO WORK                                                    ║
╚══════════════════════════════════════════════════════════════════╝

Task: {task-id} - {title}
Location: tasks/{task-id}/

{if worktree was created}
Worktree: {repo-path}/.worktrees/{task-id}/
Branch:   task/{task-id}
{/if}

Work Items: {total} total, {todo} remaining

Start With:
  □ 01. {first work item name} ({repo})

Quick Commands:
  • /task-work 01              Work on item 01
  • /task-status               View all tasks
  • /task-review               Run code review
{if worktree was created}
  • cd {worktree-path}         Enter worktree
  • code {worktree-path}       Open in VS Code
{/if}
```

### Step 7: Invoke Sync Agent (if enabled)

Use `get_frontmatter("_project/manifest.md")` to check the `auto_sync` field for `enabled`.

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
Trigger: task-start

## Your Mission
Commit changes to .ai/ folder using batched commits:
- tasks: Task moved to in_progress
- docs: Exploration notes (if created)

Execute git operations and report results.
```

This ensures task status changes are tracked in version control automatically.

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further unless the user asks to start work.
