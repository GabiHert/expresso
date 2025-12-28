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
/task-start JIRA-123 --worktree   # Create git worktrees for isolated work
/task-start                       # Lists available tasks to choose from
```

## Workflow

```
1. FIND TASK
   • Search in .ai/tasks/todo/
   • Validate task exists
   • Parse --worktree flag if present

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

5. PREPARE BRANCHES (or WORKTREES)
   • If --worktree flag AND conventions.worktrees.enabled:
     - Create worktree directories per affected repo
     - Create symlinks for shared config (.ai, .claude, etc.)
   • Otherwise:
     - Create branch in each affected repo
     - Follow branch naming convention from manifest
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand:
   - Available repositories
   - Branch naming conventions
   - Commit conventions
   - Worktree conventions (if `--worktree` flag used)

2. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ STARTING TASK                                                    ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 1: Parse Arguments

**Parse flags:**
- Check for `--worktree` flag in arguments
- Store worktree mode for later use

**If task ID provided:**
- Look for task in `.ai/tasks/todo/{task-id}/`
- If not found in todo, check `.ai/tasks/in_progress/{task-id}/`
  - If found there, say: "Task {task-id} is already in progress. Use /task-resume to continue."
- If not found anywhere, say: "Task {task-id} not found. Use /task-status to see available tasks."

**If `--worktree` flag used:**
- Verify `conventions.worktrees.enabled` is `true` in manifest
- If not enabled, warn:
  ```
  Worktree mode requested but not enabled in manifest.
  Add `conventions.worktrees.enabled: true` to manifest.yaml to use this feature.
  Proceeding with normal branch mode.
  ```

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

### Step 5: Prepare Branches or Worktrees

**If `--worktree` mode AND `conventions.worktrees.enabled`:**

Show worktree plan:
```
WORKTREES

The following worktrees will be created:

  {base_path}/{TICKET}/{repo}/  (branch: {branch-name})
  {base_path}/{TICKET}/{repo}/  (branch: {branch-name})

Symlinks to create in each:
  .ai -> {relative_path_to_project}/.ai
  .claude -> {relative_path_to_project}/.claude

Create worktrees now? (y/n)
```

**If yes**, for each affected repo:
1. Calculate worktree path: `{conventions.worktrees.base_path}/{TICKET}/{repo.name}`
2. Create parent directories if needed:
   ```bash
   mkdir -p {worktree_parent_path}
   ```
3. Create the worktree with new branch:
   ```bash
   git -C {repo.path} worktree add {worktree_path} -b {branch-name} {conventions.worktrees.base_branch}
   ```
4. Create symlinks for each item in `conventions.worktrees.symlinks`:
   ```bash
   cd {worktree_path}
   ln -s {relative_path_to_project_root}/{symlink_target} {symlink_name}
   ```
   Example: `ln -s ../../../.ai .ai`

**Otherwise (normal branch mode):**

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

**If no**, proceed without creating branches/worktrees.

### Step 6: Update Context

Update `.ai/context.md`:
- Move task from "Todo" to "In Progress" in Current State section

### Step 7: Activate Cockpit Tracking

Activate cockpit tracking for the task:

1. Ensure `.ai/cockpit/` directory exists:
   ```bash
   mkdir -p .ai/cockpit/events
   ```

2. Check if another task is already active:
   ```bash
   cat .ai/cockpit/active-task.json 2>/dev/null | jq -r '.taskId'
   ```

   **If another task is active**, warn:
   ```
   Warning: Task {existing-task-id} is already active.
   Options:
     1. Switch to {new-task-id} (replaces active)
     2. Cancel

   Choice? (1/2)
   ```

   If user chooses 1, continue. If 2, abort task-start.

3. Get current git branch:
   ```bash
   git branch --show-current 2>/dev/null || echo "unknown"
   ```

4. Generate sessionId (timestamp-based):
   ```bash
   date +%s%N | md5sum | head -c 12
   ```

5. Write `active-task.json` atomically:
   ```bash
   # Write to temp file first
   cat > .ai/cockpit/active-task.json.tmp << 'EOF'
   {
     "taskId": "{task-id}",
     "title": "{task-title}",
     "branch": "{current-git-branch}",
     "frameworkPath": ".ai/tasks/in_progress/{task-id}",
     "startedAt": "{ISO-timestamp}",
     "sessionId": "{generated-session-id}"
   }
   EOF

   # Atomic rename
   mv .ai/cockpit/active-task.json.tmp .ai/cockpit/active-task.json
   ```

6. Announce activation:
   ```
   Cockpit: Task {task-id} is now active
   All edits will be tracked under this task.
   ```

### Step 8: Output Summary

**If worktree mode:**
```
╔══════════════════════════════════════════════════════════════════╗
║ READY TO WORK (WORKTREE MODE)                                    ║
╚══════════════════════════════════════════════════════════════════╝

Task: {task-id} - {title}
Location: .ai/tasks/in_progress/{task-id}/

Worktrees Created:
  {base_path}/{TICKET}/{repo}/ → branch: {branch-name}
  {base_path}/{TICKET}/{repo}/ → branch: {branch-name}

Symlinks: .ai, .claude, .cursor (linked to project root)

Work Items: {total} total, {todo} remaining

Start With:
  □ 01. {first work item name} ({repo})

To work in worktrees:
  cd {base_path}/{TICKET}/{repo}/

Quick Commands:
  • /task-work 01              Work on item 01
  • /task-status               View all tasks
  • /task-review               Run code review
```

**Otherwise (normal mode):**
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

### Step 9: Auto-Sync (if enabled)

Check `.ai/_project/manifest.yaml` for `auto_sync.enabled`.

**If auto_sync is enabled:**

Use the ai-sync agent (lightweight/Haiku) to commit and push changes:
```
Use the ai-sync agent to sync the .ai folder changes
```

This ensures task status changes are tracked in version control automatically.

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further unless the user asks to start work.
