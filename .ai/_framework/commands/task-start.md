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
   - **Protected repos (`protected: true`) - NEVER create branches in these**
   - Branch naming conventions
   - Commit conventions
   - Worktree conventions (if `--worktree` flag used)

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

**First, identify protected repos from manifest:**

Read `manifest.yaml` and separate repos into:
- **Protected repos**: `protected: true` - NEVER modify git state
- **Work repos**: `protected: false` or not specified - can create branches

**Show protection status:**
```
REPOSITORY PROTECTION STATUS

Protected (git operations blocked):
{for each repo where protected == true}
  ⛔ {repo.name} (locked to: {repo.locked_branch})
{/for}

Available for branch creation:
{for each repo where protected != true}
  ✓ {repo.name}
{/for}
```

**If ALL affected repos are protected:**
```
ALL REPOS PROTECTED

All affected repositories are marked as protected.
No task branches will be created.

Work will be done on existing branches:
{for each repo}
  ⛔ {repo.name}: stays on {locked_branch}
{/for}

Proceeding without branch creation.
```
Skip to Step 6.

**Otherwise, for non-protected repos only**, offer to create the branch:
```
BRANCHES

The following branches will be created (protected repos excluded):

{for each repo where protected != true}
  {repo}: cd {absolute_path} && git checkout -b {branch-name}
{/for}

⛔ Skipped (protected):
{for each repo where protected == true}
  {repo}: stays on {locked_branch}
{/for}

Would you like me to create these branches now? (y/n)
```

**If yes**, for each **non-protected** repo:
1. **Resolve absolute path** from manifest:
   - If `path` starts with `./`: resolve against `project.root`
   - If `path` is absolute: use as-is
   - Store as `absolutePath`
2. Navigate to the repo using absolute path
3. **Verify git root** matches expected:
   ```bash
   cd {absolutePath}
   ACTUAL_ROOT=$(git rev-parse --show-toplevel)
   EXPECTED_ROOT="{repo.git_root or absolutePath}"

   if [ "$ACTUAL_ROOT" != "$EXPECTED_ROOT" ]; then
     echo "⛔ GIT ROOT MISMATCH"
     echo "Expected: $EXPECTED_ROOT"
     echo "Actual: $ACTUAL_ROOT"
     echo "Aborting - you may be in a nested repo."
     exit 1
   fi
   ```
4. Ensure on main/master branch and up to date
5. Create the feature branch:
   ```bash
   git checkout main && git pull
   git checkout -b {conventions.branches.pattern}
   ```
6. **Capture branch info** for storing in active-task.json:
   - Branch name created
   - Remote URL: `git remote get-url origin`
   - Absolute path verified

**If user attempts to force branch in protected repo:**
```
⛔ PROTECTED REPO - OPERATION BLOCKED

Cannot create branch in '{repo.name}':
  • This repo is marked as protected: true
  • It is locked to branch: {locked_branch}
  • Task branches must be created in work repos only

This protection prevents accidental commits to the framework repo
when working on nested repositories.
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

5. Capture previous task ID for signal file:
   ```bash
   # Capture previous task ID for signal file
   previous_task_id=""
   if [ -f .ai/cockpit/active-task.json ]; then
     previous_task_id=$(jq -r '.taskId // empty' .ai/cockpit/active-task.json 2>/dev/null)
   fi
   ```

6. Write `active-task.json` atomically with enhanced schema:
   ```bash
   # Build the affectedRepos array from branch creation step
   # Include all non-protected repos with their absolute paths

   cat > .ai/cockpit/active-task.json.tmp << 'EOF'
   {
     "taskId": "{task-id}",
     "title": "{task-title}",
     "branch": "{current-git-branch}",
     "frameworkPath": ".ai/tasks/in_progress/{task-id}",
     "startedAt": "{ISO-timestamp}",
     "sessionId": "{generated-session-id}",
     "affectedRepos": [
       {for each non-protected repo where branch was created}
       {
         "name": "{repo-name}",
         "absolutePath": "{resolved-absolute-path}",
         "gitRoot": "{git-root-path}",
         "branch": "{created-branch-name}",
         "remote": "origin",
         "remoteUrl": "{git-remote-url}",
         "protected": false
       }
       {/for}
     ],
     "currentWorkRepo": "{first-non-protected-repo-name}"
   }
   EOF

   # Atomic rename
   mv .ai/cockpit/active-task.json.tmp .ai/cockpit/active-task.json
   ```

   **Schema Notes:**
   - `affectedRepos` array contains only non-protected repos with branches created
   - `absolutePath` is the resolved full path to the repo working directory (where you cd to work)
   - `gitRoot` is the path from `git rev-parse --show-toplevel` - usually same as absolutePath,
     but differs in worktree scenarios or git submodules. Use gitRoot for verification.
   - When comparing paths, always use `pwd -P` to resolve symlinks
   - `branch` field at root is kept for backward compatibility
   - `currentWorkRepo` is set to the first work repo (can be updated during work)

7. Write task-switch-signal to trigger VSCode sync:
   ```bash
   # Write task-switch-signal to trigger VSCode sync
   if [ -n "$previous_task_id" ] && [ "$previous_task_id" != "$task_id" ]; then
     cat > .ai/cockpit/task-switch-signal.json.tmp << EOF
   {
     "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
     "previousTaskId": "$previous_task_id",
     "newTaskId": "$task_id",
     "type": "task-switch"
   }
   EOF

     # Atomic rename to trigger FileWatcher
     mv .ai/cockpit/task-switch-signal.json.tmp .ai/cockpit/task-switch-signal.json
   fi
   ```

8. Announce activation:
   ```
   Cockpit: Task {task-id} is now active
   All edits will be tracked under this task.

   {if previous_task_id exists and differs from task_id}
   ✓ Active task switched: {previous_task_id} → {task_id}
     VSCode extension will be notified automatically
   {/if}
   ```

### Step 9: Output Summary

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

### Step 10: Auto-Sync (if enabled)

Check `.ai/_project/manifest.yaml` for `auto_sync.enabled`.

**If auto_sync is enabled:**

Use the ai-sync agent (lightweight/Haiku) to commit and push changes:
```
Use the ai-sync agent to sync the .ai folder changes
```

This ensures task status changes are tracked in version control automatically.

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further unless the user asks to start work.
