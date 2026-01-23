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
   • Search in .ai/tasks/todo/
   • Validate task exists

1.5. CREATE WORKTREE (if --worktree provided)
   • Run scripts/create-worktree.sh (MANDATORY)
   • Create isolated workspace at .worktrees/{task-id}/
   • Never run git worktree add manually

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

5. ACTIVATE TRACKING
   • Update cockpit active-task.json
   • Enable edit tracking
   • Include worktree info if created
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

5. **Update active-task.json** to include worktree info:
   ```json
   {
     "taskId": "{task-id}",
     "worktrees": [
       {
         "repo": "{repo-path}",
         "path": "{repo-path}/.worktrees/{task-id}",
         "branch": "task/{task-id}"
       }
     ]
   }
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

### Step 3.5: Run Explorer Agent (Automatic)

**Invoke the Explorer agent** to gather codebase context for this task:

```
Task(
  subagent_type: "explorer",
  model: "sonnet",
  prompt: "
    ## Task Context
    {task README content}

    ## Existing Documentation
    {list of .ai/docs/ files}

    ## Your Mission
    Explore the codebase to understand what needs to change for this task.
    Focus on: affected files, existing patterns, dependencies, and risks.

    Save your findings to: .ai/tasks/in_progress/{task-id}/exploration.md
  "
)
```

The Explorer agent will:
- Search for relevant files and patterns
- Identify dependencies and risks
- Document findings in `exploration.md`

Announce when complete:
```
✓ Exploration complete: .ai/tasks/in_progress/{task-id}/exploration.md
```

### Step 3.6: Run Planner Agent (If No Work Items)

**If status.yaml shows 0 work items**, invoke the Planner agent:

```
Task(
  subagent_type: "planner",
  model: "sonnet",
  prompt: "
    ## Task Context
    {task README content}

    ## Exploration Findings
    {exploration.md content}

    ## Project Repos
    {repos from manifest.yaml}

    ## Your Mission
    Break this task into concrete work items.
    CRITICAL: Each work item must affect only ONE repository.

    Return proposed work items for user approval.
  "
)
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
- Create work item files in `todo/` folder
- Update status.yaml with new items

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

Check `.ai/_project/manifest.yaml` for `auto_sync.enabled`.

**If auto_sync is enabled:**

```bash
# Get .ai/ folder status
git status .ai/ --porcelain
```

```
Task(
  subagent_type: "sync",
  model: "haiku",
  prompt: "
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
  "
)
```

This ensures task status changes are tracked in version control automatically.

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further unless the user asks to start work.
