---
type: command
name: task-work
layer: framework
tags:
  - command
---



> Parent: [[commands-index]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /task-work                                              ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Implement a specific work item                          ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /task-work - Implement Work Items

## Description

Work on a specific work item from the current task. This command guides you through the implementation steps defined in the work item file.

## TEMPORARY FILES
Any scratch files, exploration notes, or temporary output created during
implementation MUST be placed in `.ai/tmp/`. Do NOT create temporary files
in the project root or source directories.

## Usage

```
/task-work                     # Work on next available item
/task-work 02                  # Work on item 02
/task-work 02-fix-validation   # Work on specific item by full name
/task-work --autopilot         # Implement ALL items without stopping
/task-work {repo} --autopilot  # Autopilot for specific repo only
```

## Execution Modes

### Interactive Mode (Default)
- Asks for confirmation after each work item
- Shows progress and asks what to do next
- Pauses for code review feedback
- Good for: Learning, reviewing as you go, uncertain implementations

### Autopilot Mode (`--autopilot`)
- Implements ALL work items continuously without stopping
- Runs code-explorer before and code-reviewer after each item automatically
- Only stops if a critical blocker is encountered
- Reports progress with `[1/N]` format
- Shows comprehensive completion summary at end
- Good for: When you trust the work item definitions and want hands-off execution

## Workflow

```
1. IDENTIFY CURRENT TASK
   • Check .ai/tasks/in_progress/
   • If multiple, ask which one

2. SELECT WORK ITEM
   • Read status.yaml for quick overview
   • If specified, find that item
   • If not, pick next from todo/
   • Move item to in_progress/
   • Update status.yaml

3. READ WORK ITEM
   • Read full work item file
   • Understand objective and steps

4. PRE-IMPLEMENTATION
   • Run any specified exploration agents
   • Gather additional context if needed

5. IMPLEMENT
   • Follow implementation steps
   • Make changes to specified files
   • Run tests as directed

6. POST-IMPLEMENTATION
   • Run code review agent
   • Address any issues found

7. COMPLETE
   • Move work item to done/
   • Update status.yaml
   • Update task README with learnings
```

## Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│ GIT SAFETY CHECKLIST                                            │
│                                                                 │
│ Before ANY git operation (add, commit, push, checkout):         │
│                                                                 │
│ 1. Read work item to get target repo                            │
│ 2. Read manifest.yaml for repo path                             │
│ 3. cd to the repo path                                          │
│ 4. Verify: git rev-parse --show-toplevel                        │
│ 5. Check: Is repo protected? If yes, STOP.                      │
│                                                                 │
│ NEVER run git commands from the project root when working       │
│ on nested repos - you'll commit to the wrong repo!              │
└─────────────────────────────────────────────────────────────────┘
```

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand:
   - Available repositories
   - **Protected repos (`protected: true`) - NEVER commit to these**
   - Commit conventions
   - Available MCPs

2. **Extension Support**: This command supports compiled extensions
   via `/command-extend task-work --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

3. Find the current task:
   - Look in `.ai/tasks/in_progress/`
   - If no task found, say: "No task in progress. Use /[[task-start]] to begin a task."
   - If multiple tasks found, list them and ask which one to work on:
     ```
     Multiple tasks in progress:
       1. {task-id-1}: {title}
       2. {task-id-2}: {title}

     Which task? (Enter number or task ID)
     ```

3. Read the task's status.yaml for work item overview.

### Step 1: Select Work Item

**If work item ID specified:**
- Look for item matching the ID in status.yaml
- If not found, say: "Work item '{id}' not found. Available items: {list}"

**If no work item specified:**
- Check for any items in in_progress/ first
  - If found, offer to continue: "Work item {id} is in progress. Continue with this? (y/n)"
- If none in progress, pick the first item from todo/
  - If no items in todo, say: "All work items complete! Use /[[task-done]] to finish the task."

### Step 2: Move to In Progress

If item is in todo/:
1. Move the work item file:
   - From: `{task-path}/todo/{id}-{name}.md`
   - To: `{task-path}/in_progress/{id}-{name}.md`

2. Update status.yaml:
   ```yaml
   work_items:
     - id: "{id}"
       status: in_progress  # Changed from todo
       file: "in_progress/{id}-{name}.md"  # Updated path
   ```

3. Update summary counts in status.yaml.

### Step 3: Read Work Item

1. Read the work item file completely.

2. Announce understanding:
```
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: {id} - {name}                                         ║
║ REPO: {repo}                                                     ║
╠══════════════════════════════════════════════════════════════════╣

OBJECTIVE
{summarize the objective}

IMPLEMENTATION STEPS
  1. {step 1 summary}
  2. {step 2 summary}
  ...

ACCEPTANCE CRITERIA
{list criteria}
```

### Step 4: Pre-Implementation

If the work item suggests exploration:
```
PRE-IMPLEMENTATION

The work item suggests exploring first. Would you like me to:
  1. Run an exploration agent for context
  2. Skip and proceed to implementation

Choice? (1/2)
```

If user chooses 1, launch an Explore agent targeting the relevant files and patterns.

### Step 5: Invoke Implementer Agent

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️  MANDATORY: INVOKE IMPLEMENTER AGENT                         │
│                                                                 │
│ You MUST invoke the implementer agent to execute work items.    │
│ Do NOT skip this step or implement the changes yourself.        │
│ The implementer agent works with clean, isolated context.       │
│                                                                 │
│ If you find yourself editing application code directly without  │
│ invoking the implementer agent, STOP — you are off track.       │
└─────────────────────────────────────────────────────────────────┘

**Invoke the implementer agent** to execute this work item with clean context.

Provide the following context to the agent:

```
## Task Context
{task README content}

## Your Work Item
{work item file content}

## Previous Feedback (if re-running)
{feedback file content, if exists}

## Implementation Guidelines
- Implement ONLY what the work item specifies
- No git operations (orchestrator handles git)
- Must satisfy all acceptance criteria
- Follow existing code patterns

Return an implementation summary when complete.
```

The Implementer agent will:
- Execute with fresh, isolated context
- Make code changes as specified
- Run tests if specified
- Return a summary of changes and acceptance criteria status

Capture the implementation summary for the Reviewer.

### Step 6: Invoke Reviewer Agent (Automatic)

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️  MANDATORY: INVOKE REVIEWER AGENT                            │
│                                                                 │
│ You MUST invoke the reviewer agent after implementation.        │
│ Do NOT skip this step or review the code yourself.              │
│ The reviewer agent ensures consistent quality checks.           │
│                                                                 │
│ If you find yourself skipping review or approving your own      │
│ changes without invoking the reviewer agent, STOP.              │
└─────────────────────────────────────────────────────────────────┘

**After Implementer completes, automatically spawn the Reviewer agent:**

```bash
# Get the git diff for review
git diff HEAD > /tmp/changes.diff
```

**Invoke the reviewer agent** with the following context:

```
## Implementer Summary
{summary from implementer}

## Git Diff
{contents of git diff}

## Work Item Acceptance Criteria
{criteria from work item}

## Task Context
{task README content}

## Your Mission
Review this implementation:
1. Check all acceptance criteria are met
2. Check for bugs, security issues, code quality
3. Return verdict: APPROVED or NEEDS CHANGES

Save feedback to: {task-path}/feedback/{work-item-id}-review.md
```

**If verdict is NEEDS CHANGES:**
```
╔══════════════════════════════════════════════════════════════════╗
║ REVIEW: NEEDS CHANGES                                            ║
╠══════════════════════════════════════════════════════════════════╣

{display reviewer feedback summary}

Required Actions:
  1. {action 1}
  2. {action 2}

╠══════════════════════════════════════════════════════════════════╣
║ Options:                                                         ║
║   [F]ix - Re-run implementer with feedback                       ║
║   [O]verride - Mark complete anyway                              ║
║   [S]top - Stop and review manually                              ║
╚══════════════════════════════════════════════════════════════════╝
```

- If **Fix**: Re-run Step 5 with previous feedback included
- If **Override**: Continue to Step 7
- If **Stop**: Exit task-work

**If verdict is APPROVED:**
```
✓ Review passed - proceeding to completion
```

Continue to Step 7.

### Step 7: Complete Work Item

1. Move the work item file:
   - From: `{task-path}/in_progress/{id}-{name}.md`
   - To: `{task-path}/done/{id}-{name}.md`

2. Update status.yaml:
   ```yaml
   work_items:
     - id: "{id}"
       status: done  # Changed from in_progress
       file: "done/{id}-{name}.md"  # Updated path
   ```

3. Update summary counts in status.yaml.

4. Add any learnings to the task README under "Technical Context" or "Notes".

### Step 8: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM COMPLETE                                               ║
╚══════════════════════════════════════════════════════════════════╝

Completed: {id} - {name}

Progress:
  ✓ Done: {done_count}
  □ Todo: {todo_count}
  ▶ In Progress: {in_progress_count}

{if more items in todo}
Next Work Item:
  □ {next-id}. {next-name} ({repo})

Continue with /task-work {next-id}
{else}
All work items complete!
Run /task-done to finish the task.
{/if}
```

### Step 8.5: Pre-Git Verification (MANDATORY)

Before any git operation, you MUST verify you're in the correct repository:

**1. Identify target repo from current work item:**
- Get `repo` from work item YAML frontmatter or content

**2. Read manifest.yaml for repo details:**
```bash
cat .ai/_project/manifest.yaml | grep -A5 "name: {repo}"
```
- Get `path` for the repo
- Check if `protected: true`

**If repo is protected:**
```
⛔ PROTECTED REPO - NO GIT OPERATIONS

Repo '{repo}' is marked as protected in manifest.yaml.
Commit manually after careful review.
```
STOP and do not proceed with git operations.

**If repo not found in manifest:**
```
⛔ REPO NOT FOUND

Repo '{repo}' is not in manifest.yaml.
Add it to the manifest or check the repo name.
```
STOP and do not proceed with git operations.

**3. Navigate and verify:**
```bash
# Navigate to the repo path from manifest
cd {repo_path}

# Verify we're in a git repo
git rev-parse --show-toplevel

# Show current branch
git branch --show-current

# Verify remote
git remote -v | grep origin
```

**4. Show verification result:**
```
GIT CONTEXT VERIFIED ✓

Repository: {repo}
Path: {repo_path}
Branch: {current_branch}

Ready for git operations.
```

**5. If verification fails:**
```
⛔ GIT CONTEXT VERIFICATION FAILED

Cannot proceed with git operations. Issues found:
  • {list issues}

Please manually verify your working directory and try again.
```

STOP and do not proceed with git operations if verification fails.

### Step 9: Offer Commit

**IMPORTANT**: All git commands must be run from the verified repo path.

If changes were made:
```
COMMIT

Repository: {repo}
Path: {absolutePath}
Branch: {branch}

Would you like to commit these changes?

Files changed:
  • {file1}
  • {file2}

Suggested message: {type}({scope}): {description}

Commit now? (y/n)
```

**If yes**, run git commands using absolute path:
```bash
cd {absolutePath}

# Verify one more time
pwd
git rev-parse --show-toplevel

# Stage and commit
git add {files}
git commit -m "{message}"
```

**If the repo is protected** (check `affectedRepos[].protected` or manifest):
```
⛔ COMMIT BLOCKED - PROTECTED REPO

{repo} is marked as protected in manifest.yaml.
Changes cannot be committed to this repo via task workflow.

If you need to make changes here, commit manually after
careful review.
```

### Step 10: Auto-Sync (if enabled)

Check `.ai/_project/manifest.yaml` for `auto_sync.enabled`.

**If auto_sync is enabled:**

Use the [[ai-sync]] agent to commit and push changes:
```
Use the ai-sync agent to sync the .ai folder changes
```

This ensures work item progress is tracked in version control automatically.

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further.

---

## Autopilot Mode Implementation

When `--autopilot` flag is detected, execute ALL work items without user intervention.

### Autopilot Step 1: Show Autopilot Banner

```
╔══════════════════════════════════════════════════════════════════╗
║ AUTOPILOT MODE ACTIVATED                                         ║
╚══════════════════════════════════════════════════════════════════╝

Task: {task-id} - {title}
Mode: Autonomous execution

Execution Plan:
{for each repo with todo items}
  {repo} ({count} work items)
{for each item}
    • {id}-{name}.md
{/for}
{/for}

Behavior:
  • Will implement all items without stopping
  • Code review after each item (auto-continue if passes)
  • Stops ONLY on critical blockers
  • Summary displayed on completion

Starting autopilot execution...
```

### Autopilot Step 2: Execute Loop

For each work item in todo/ (sorted by id prefix):

```
[1/{total}] {repo}: {id}-{name}.md
├── Running code-explorer for context...
├── Implementing work item...
├── Running code-reviewer...
└── [DONE] Moving to done/

[2/{total}] {repo}: {id}-{name}.md
├── Running code-explorer for context...
...
```

**Execution flow per item:**
1. Launch code-explorer agent for context (non-optional in autopilot)
2. Move work item to in_progress/
3. Read and implement all steps from work item file
4. Launch code-reviewer agent
5. **If review finds critical issues**: STOP autopilot, report progress
6. **If review passes**: Move to done/, continue to next item
7. Update status.yaml after each item

### Autopilot Step 3: Handle Blockers

If a critical error or review failure occurs:

```
╔══════════════════════════════════════════════════════════════════╗
║ AUTOPILOT STOPPED                                                ║
╚══════════════════════════════════════════════════════════════════╝

Status: BLOCKED
Stopped at: [{current}/{total}] {id}-{name}.md

Reason:
{description of blocker - critical review issue, error, etc.}

Progress:
{for each completed item}
  ✓ {id}. {name}
{/for}
{for current item}
  ▶ {id}. {name} (BLOCKED)
{/for}
{for remaining items}
  □ {id}. {name}
{/for}

Action Required:
Review the blocked work item and fix the issue manually.
Then run /task-work --autopilot to resume from current item.
```

### Autopilot Step 4: Completion Summary

When all items complete successfully:

```
╔══════════════════════════════════════════════════════════════════╗
║ AUTOPILOT COMPLETE                                               ║
╚══════════════════════════════════════════════════════════════════╝

Task: {task-id} - {title}
Status: ALL WORK ITEMS COMPLETED

Summary:
+-------------+------------+--------+
| Repository  | Work Items | Status |
+-------------+------------+--------+
{for each repo}
| {repo}      | {done}/{total}     | Done   |
{/for}
+-------------+------------+--------+
| TOTAL       | {total}/{total}    | Done   |
+-------------+------------+--------+

Code Review Results:
  • All items passed code review
  • {count} minor suggestions logged (non-blocking)

Files Modified:
{for each repo}
  {repo}:
{for each modified file}
    • {file path}
{/for}
{/for}

Next Steps:
  • Commit changes when ready
  • Run /task-review for final comprehensive review
  • Run /task-done to complete the task
```

### Autopilot Step 5: Auto-Sync (if enabled)

Check `.ai/_project/manifest.yaml` for `auto_sync.enabled`.

**If auto_sync is enabled:**

Use the [[ai-sync]] agent to commit and push changes:
```
Use the ai-sync agent to sync the .ai folder changes
```

This ensures all autopilot progress is tracked in version control automatically.

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further.
