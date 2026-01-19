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
│ GIT SAFETY CHECKLIST (LOCAL-026)                                │
│                                                                 │
│ Before ANY git operation (add, commit, push, checkout):         │
│                                                                 │
│ 1. Read active-task.json for repo paths                         │
│ 2. cd to {absolutePath} from affectedRepos                      │
│ 3. Verify: git rev-parse --show-toplevel                        │
│ 4. Verify: git remote -v (correct remote?)                      │
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

2. **EXTENSION CHECK (MANDATORY)**:
   ```
   ┌─────────────────────────────────────────────────────────────────┐
   │ CHECK FOR PROJECT EXTENSION                                     │
   │                                                                 │
   │ Look for: .ai/_project/commands/task-work.extend.md            │
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

3. Find the current task:
   - Look in `.ai/tasks/in_progress/`
   - If no task found, say: "No task in progress. Use /task-start to begin a task."
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
  - If no items in todo, say: "All work items complete! Use /task-done to finish the task."

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

### Step 5: Implement

Follow each implementation step from the work item:

```
IMPLEMENTING STEP 1: {step name}
══════════════════════════════════════════════════════════════════

File: {file path}

{Follow the instructions from the work item}
```

After each step:
- Show what was changed
- Ask if ready to proceed to next step

```
Step 1 complete.

Changes made:
  • {file}: {brief description of change}

Continue to Step 2? (y/n)
```

### Step 6: Post-Implementation

After all steps complete:
```
IMPLEMENTATION COMPLETE

Running code review...
```

Launch a code review agent on the changed files:
```
Review the following changes for:
- Bugs or logic errors
- Security vulnerabilities
- Code quality issues
- Missing tests

Changed files: {list of files modified}
```

If issues found:
```
REVIEW FINDINGS

The review found {count} issues:

  1. {issue description}
     Suggestion: {fix}

  2. {issue description}
     Suggestion: {fix}

Would you like me to address these? (y/n)
```

Address issues if requested.

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

**1. Read active-task.json:**
```bash
cat .ai/cockpit/active-task.json
```

**2. Identify target repo from current work item:**
- Get `repo` from work item YAML frontmatter
- Find matching entry in `affectedRepos` array
- Get `absolutePath` and `gitRoot`

**If repo not found in affectedRepos:**
```
⛔ REPO NOT FOUND IN TASK CONTEXT

Repo '{repo}' is not in active-task.json affectedRepos.

Possible causes:
  • This repo is protected (no git operations allowed)
  • This repo was not included when task was started
  • active-task.json is outdated

Resolution:
  • For protected repos: commit manually after careful review
  • Otherwise: re-run /task-start to refresh context
```
STOP and do not proceed with git operations.

**3. Navigate and verify:**
```bash
# Navigate to the ABSOLUTE path
cd {absolutePath}

# Verify git root matches (resolve symlinks with pwd -P)
ACTUAL_ROOT=$(cd "$(git rev-parse --show-toplevel)" && pwd -P)
EXPECTED_ROOT=$(cd "{gitRoot}" && pwd -P)

if [ "$ACTUAL_ROOT" != "$EXPECTED_ROOT" ]; then
  echo "⛔ GIT ROOT MISMATCH"
  echo "Expected: $EXPECTED_ROOT"
  echo "Actual: $ACTUAL_ROOT"
  echo ""
  echo "You may be in a nested repo. Aborting git operation."
  exit 1
fi

# Verify correct branch
CURRENT_BRANCH=$(git branch --show-current)
EXPECTED_BRANCH="{branch from affectedRepos}"

if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
  echo "⚠️ BRANCH MISMATCH"
  echo "Expected: $EXPECTED_BRANCH"
  echo "Actual: $CURRENT_BRANCH"
  echo ""
  echo "Switch to correct branch before proceeding."
fi

# Verify remote
git remote -v | grep origin
```

**4. Show verification result:**
```
GIT CONTEXT VERIFIED ✓

Repository: {repo}
Path: {absolutePath}
Git Root: ✓ Matches expected
Branch: {branch}
Remote: origin → {remoteUrl}

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

Use the ai-sync agent (lightweight/Haiku) to commit and push changes:
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

Use the ai-sync agent (lightweight/Haiku) to commit and push changes:
```
Use the ai-sync agent to sync the .ai folder changes
```

This ensures all autopilot progress is tracked in version control automatically.

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further.
