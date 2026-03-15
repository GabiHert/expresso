

> Parent: [[commands-index]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /task-orchestrate                                       ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Orchestrate task execution with background agents       ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /task-orchestrate - Orchestrate Task Work Items

## Description

Orchestrate the execution of all work items in a task by launching isolated background agents for each WI. Each agent runs in a git worktree with fresh context containing only the task README and its specific work item. The orchestrator evaluates semantic coherence across WIs after each completion and re-invokes agents when corrections are needed. The user remains unblocked throughout execution.

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ DO NOT EDIT APPLICATION CODE DIRECTLY                            │
│                                                                  │
│ ALLOWED:  Read any file. Write to .ai/ only. Launch agents.      │
│ FORBIDDEN: Edit application source code from the orchestrator    │
│ TEMP FILES: Scratch/temporary output goes in .ai/tmp/            │
│                                                                  │
│ All application code changes happen inside implementer agents    │
│ running in worktrees. The orchestrator only manages state,       │
│ reviews, and coordination.                                       │
│ If you find yourself editing code files, STOP — you are off      │
│ track.                                                           │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/task-orchestrate                    # Orchestrate current in-progress task
/task-orchestrate TASK-ID            # Orchestrate specific task
/task-orchestrate --sequential       # Force sequential execution (no parallel)
```

## Workflow

```
1. IDENTIFY TASK
   • Find task in .ai/tasks/in_progress/
   • Read README.md and status.yaml
   • Collect all work items

2. ANALYZE DEPENDENCIES
   • Check for explicit depends_on in work items
   • Group into parallel batches and serial chains

3. BUILD EXECUTION PLAN
   • Parallel groups: WIs with no interdependencies
   • Serial chains: WIs with depends_on relationships
   • Present plan to user for approval

4. EXECUTE (background agents in worktrees)
   • For each batch/group:
     - Launch implementer agents (background, worktree-isolated)
     - Each gets: task README + its WI only
   • As agents complete:
     - Merge worktree branch back to main
     - Run semantic coherence review
     - If passes → mark done, proceed
     - If fails → re-invoke with feedback

5. COMPLETION
   • Summary of all WIs
   • Files modified across all WIs
   • Coherence review results
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand:
   - Available repositories
   - Protected repos
   - Commit conventions

2. **Extension Support**: This command supports compiled extensions
   via `/command-extend task-orchestrate --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

3. Find the current task:
   - Look in `.ai/tasks/in_progress/`
   - If task ID provided as argument, find that specific task
   - If no task found, say: "No task in progress. Use /[[task-start]] to begin a task."
   - If multiple tasks found, list them and ask which one:
     ```
     Multiple tasks in progress:
       1. {task-id-1}: {title}
       2. {task-id-2}: {title}

     Which task? (Enter number or task ID)
     ```

4. Read the task README.md and status.yaml fully.

5. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ TASK ORCHESTRATOR                                                ║
╚══════════════════════════════════════════════════════════════════╝

Task: {task-id} - {title}
Mode: Background agents with worktree isolation
```

### Step 1: Collect Work Items

1. Read status.yaml to get all work items.
2. Filter to items with status `todo` or `in_progress`.
3. Read each work item file to understand:
   - Objective and acceptance criteria
   - Target repo/files
   - Any `depends_on` field (explicit dependency on other WI IDs)

If no work items remain:
```
All work items are already complete.
Run /task-done to finish the task.
```

### Step 2: Analyze Dependencies

Build a dependency graph from work items:

**Explicit dependencies:**
Check each work item for a `depends_on` field in its YAML frontmatter or content:
```yaml
depends_on: ["01", "02"]  # This WI depends on WI-01 and WI-02
```

**Inferred dependencies (heuristic):**
If no explicit dependencies, check for file overlap:
- WIs targeting the same files should be serialized
- WIs in different repos or non-overlapping directories can be parallel

**Build execution groups:**
```
Group 1 (parallel): [WI-01, WI-02, WI-03]  # No dependencies
Group 2 (parallel): [WI-04, WI-05]          # Depend on Group 1
Group 3 (serial):   [WI-06]                 # Depends on Group 2
```

If `--sequential` flag is set, flatten all groups into a single serial chain.

### Step 3: Present Execution Plan

```
╔══════════════════════════════════════════════════════════════════╗
║ EXECUTION PLAN                                                   ║
╠══════════════════════════════════════════════════════════════════╣

Group 1 (parallel - 3 agents):
  ├── WI-01: {name} ({repo})
  ├── WI-02: {name} ({repo})
  └── WI-03: {name} ({repo})

Group 2 (parallel - 2 agents, after Group 1):
  ├── WI-04: {name} ({repo})
  └── WI-05: {name} ({repo})

Group 3 (sequential, after Group 2):
  └── WI-06: {name} ({repo})

Total: {n} work items in {g} groups
Isolation: Git worktrees (each agent gets isolated repo copy)
Mode: Background (you can continue chatting)

╚══════════════════════════════════════════════════════════════════╝

Proceed with this plan? (y/n, or describe changes)
```

Wait for user approval before proceeding.

### Step 4: Execute Work Items

For each execution group, in order:

#### 4a. Launch Group

For each work item in the current group, launch a background agent:

```
[Group {g}] Launching {n} background agent(s)...
  ├── Agent for WI-{id}: {name} (worktree)
  ├── Agent for WI-{id}: {name} (worktree)
  └── Agent for WI-{id}: {name} (worktree)

You can continue working. I'll notify you as agents complete.
```

**Agent invocation pattern:**

For each WI, invoke the Agent tool with:
- `subagent_type`: "implementer" (if available) or "general-purpose"
- `isolation`: "worktree"
- `run_in_background`: true
- `description`: "Implement WI-{id}"
- `prompt`: See below

**Agent prompt template:**
```
You are the Implementer agent. Your job is to execute a single work item
with precision and focus. You start with clean context - only what you
need for this specific item.

## Task Context
{task_readme_content}

## Your Work Item
{work_item_file_content}

## Previous Feedback (if re-running)
{feedback_content_or_none}

## Implementation Guidelines

### Focus
- Implement ONLY what the work item specifies
- Don't add features, refactor unrelated code, or "improve" things
- If something is unclear, note it rather than assuming

### Quality
- Follow existing code patterns and conventions
- No security vulnerabilities (injection, XSS, etc.)
- Handle errors appropriately
- Write code that's easy to review

### Acceptance Criteria
- Each criterion must be satisfied
- If you cannot satisfy a criterion, mark it as blocked
- Test your changes when possible (run tests, build, etc.)

### Git Operations
- You are NOT allowed to commit, push, or modify git state
- The orchestrator handles all git operations
- You may run `git status` or `git diff` to check your changes

## Completion

When done, produce an implementation summary:

## Implementation Summary: {work_item_id}

### Changes Made
| File | Action | Description |
|------|--------|-------------|

### Acceptance Criteria
- [x] or [ ] Criterion with status

### Implementation Notes
- Details for reviewer

### Blockers (if any)
- Blocker description
```

#### 4b. Move WIs to in_progress

For each WI being executed:
1. Move work item file from `todo/` to `in_progress/`
2. Update status.yaml

#### 4c. Wait for Agent Completion

As each background agent completes, the system will notify automatically.
Do NOT poll or sleep — continue responding to user if they interact.

When an agent completes:
```
Agent completed: WI-{id} - {name}
├── Status: {success/failure}
├── Worktree: {path}
└── Branch: {branch}

Processing results...
```

#### 4d. Merge Worktree Changes

When an agent completes successfully:

1. Review the worktree branch changes
2. Merge the branch back to the current branch:
   ```bash
   git merge {worktree_branch} --no-ff -m "feat: implement WI-{id} - {name}"
   ```
3. If merge conflict:
   ```
   MERGE CONFLICT for WI-{id}

   Conflicting files:
     • {file1}
     • {file2}

   Options:
     [R]esolve - Launch agent to resolve conflicts
     [M]anual  - Stop and let user resolve
     [S]kip    - Skip this WI, continue with others
   ```

### Step 5: Semantic Coherence Review

After each WI is merged, run a coherence review to ensure the changes
make sense in the context of the overall task and sibling WIs.

**Launch a reviewer agent (background):**

```
Reviewing WI-{id} for semantic coherence...
```

**Reviewer prompt:**
```
You are the Coherence Reviewer. Your job is to validate that a work item's
implementation is semantically consistent with the overall task and other
completed work items.

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ READ-ONLY — DO NOT MODIFY ANY FILES                              │
│                                                                  │
│ You may ONLY use: Read, Glob, Grep, Bash (for tests/lints)      │
│ If you are about to use Edit or Write, STOP.                     │
└─────────────────────────────────────────────────────────────────┘

## Task Context
{task_readme_content}

## Work Item Just Completed
{work_item_content}

## Implementation Summary
{agent_output_summary}

## Other Completed Work Items
{list of other done WIs with their summaries}

## Changes Made (Git Diff)
```diff
{git_diff_of_merged_changes}
```

## Review Checklist

### 1. Acceptance Criteria
- Are all criteria from the work item satisfied?

### 2. Semantic Coherence
- Do these changes align with the task's overall goal?
- Are there naming inconsistencies with other WIs?
- Are there architectural conflicts with other WIs?
- Do imports/exports/interfaces align across WIs?

### 3. Integration
- Will this work correctly alongside other completed WIs?
- Any shared state or dependencies that could break?

## Output Format

### Verdict: COHERENT | NEEDS CORRECTION

### Coherence Issues (if NEEDS CORRECTION)
| Severity | Issue | Affected WIs | Suggestion |
|----------|-------|--------------|------------|

### Required Corrections
1. Specific action to fix

### Notes
- Observations for the orchestrator
```

**If verdict is COHERENT:**
```
WI-{id}: Coherence review passed
```
- Move WI to `done/`
- Update status.yaml
- Continue to next group or WI

**If verdict is NEEDS CORRECTION:**
```
╔══════════════════════════════════════════════════════════════════╗
║ COHERENCE REVIEW: NEEDS CORRECTION                               ║
╠══════════════════════════════════════════════════════════════════╣

WI-{id}: {name}

Issues Found:
  1. {issue description}
  2. {issue description}

╠══════════════════════════════════════════════════════════════════╣
║ Options:                                                         ║
║   [F]ix - Re-invoke agent with correction feedback               ║
║   [O]verride - Accept as-is                                      ║
║   [S]top - Pause orchestration for manual review                 ║
╚══════════════════════════════════════════════════════════════════╝
```

- If **Fix**: Re-launch implementer agent with the coherence feedback
  appended as "Previous Feedback". Use worktree isolation again.
  Maximum 2 correction rounds per WI before escalating to user.
- If **Override**: Mark as done, continue
- If **Stop**: Pause orchestration, report progress

### Step 6: Group Transition

After all WIs in a group are merged and reviewed:

```
╔══════════════════════════════════════════════════════════════════╗
║ GROUP {g} COMPLETE                                               ║
╠══════════════════════════════════════════════════════════════════╣

Completed:
  {for each WI in group}
  {id}. {name} - {COHERENT|CORRECTED}
  {/for}

{if more groups}
Proceeding to Group {g+1}...
{/if}
╚══════════════════════════════════════════════════════════════════╝
```

Then launch the next group (Step 4a).

### Step 7: Final Summary

When all groups are complete:

```
╔══════════════════════════════════════════════════════════════════╗
║ ORCHESTRATION COMPLETE                                           ║
╚══════════════════════════════════════════════════════════════════╝

Task: {task-id} - {title}
Status: ALL WORK ITEMS COMPLETED

Execution Summary:
+----------+--------+-----------+-------------+
| Group    | WIs    | Parallel  | Corrections |
+----------+--------+-----------+-------------+
{for each group}
| Group {g} | {count} | {yes/no}  | {count}     |
{/for}
+----------+--------+-----------+-------------+
| TOTAL    | {total} |           | {total_corr} |
+----------+--------+-----------+-------------+

Coherence Review:
  Passed first try: {count}
  Required correction: {count}
  Overridden: {count}

Files Modified:
{for each repo}
  {repo}:
{for each file}
    {file path}
{/for}
{/for}

Next Steps:
  Review changes and commit when ready
  Run /task-review for final comprehensive review
  Run /task-done to complete the task
```

### Step 8: Offer Commit

```
┌─────────────────────────────────────────────────────────────────┐
│ GIT SAFETY CHECKLIST                                             │
│                                                                  │
│ Before ANY git operation (add, commit, push, checkout):          │
│                                                                  │
│ 1. Read work item to get target repo                             │
│ 2. Read manifest.yaml for repo path                              │
│ 3. cd to the repo path                                           │
│ 4. Verify: git rev-parse --show-toplevel                         │
│ 5. Check: Is repo protected? If yes, STOP.                       │
│                                                                  │
│ NEVER run git commands from the project root when working        │
│ on nested repos - you'll commit to the wrong repo!               │
└─────────────────────────────────────────────────────────────────┘
```

Follow the same commit verification flow as `/task-work` Step 8.5 and Step 9.

If the repo is protected, inform the user but do not commit.

### Step 9: Auto-Sync (if enabled)

Check `.ai/_project/manifest.yaml` for `auto_sync.enabled`.

**If auto_sync is enabled:**

Use the [[ai-sync]] agent to commit and push changes:
```
Use the ai-sync agent to sync the .ai folder changes
```

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further.

---

## Error Handling

### Agent Failure
If a background agent fails or returns an error:
```
AGENT FAILURE: WI-{id}

Error: {error description}

Options:
  [R]etry - Re-launch the agent
  [S]kip  - Skip this WI, continue with others
  [H]alt  - Stop orchestration entirely
```

Maximum 2 retries per WI before escalating to user.

### Merge Conflict
See Step 4d. Offer resolution agent, manual resolution, or skip.

### Coherence Loop
Maximum 2 correction rounds per WI. After 2 failed coherence reviews:
```
WI-{id} failed coherence review after 2 correction rounds.
Escalating to user for manual review.

Orchestration paused. Resume with /task-orchestrate after fixing.
```

### All Agents Busy
If the system cannot launch more background agents, queue remaining WIs
and launch as agents complete.
