<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /task-resume                                            ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Resume work on an in-progress task (session continuity) ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /task-resume - Resume In-Progress Task

## Description

Orient to the current in-progress task at the start of a new session. Provides full context to continue where the previous session left off.

This is the recommended command to run at the start of any new AI session when continuing work.

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ ⛔ READ-ONLY COMMAND — DO NOT MODIFY ANY FILES                  │
│                                                                 │
│ ALLOWED:  Read any file, display output to user                 │
│ FORBIDDEN: Edit, Write, create, or delete ANY files             │
│ TEMP FILES: If you must create scratch files, use .ai/tmp/      │
│                                                                 │
│ This command displays information only. If you find yourself    │
│ about to edit or create a file, STOP — you are off track.       │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/task-resume              # Resume the in-progress task (if only one)
/task-resume JIRA-123     # Resume specific task
```

## Workflow

```
1. FIND IN-PROGRESS TASK
   • Scan .ai/tasks/in_progress/
   • If none, inform user and suggest /task-start
   • If multiple, list them and ask which one

2. READ TASK CONTEXT
   • Read task README.md thoroughly
   • Identify problem statement and acceptance criteria
   • Note affected repositories

3. CHECK WORK ITEM STATUS
   • Read status.yaml for quick overview
   • Identify completed items (done/)
   • Identify current item (in_progress/)
   • Identify remaining items (todo/)

4. ANNOUNCE ORIENTATION
   • State task name and objective
   • Summarize what's done vs remaining
   • Identify the current/next work item
   • Note any blockers or considerations from README

5. OFFER NEXT STEPS
   • Suggest continuing current work item
   • Or starting next work item if current is done
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand:
   - Available repositories
   - Commit conventions
   - Available MCPs

2. **Extension Support**: This command supports compiled extensions
   via `/command-extend task-resume --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

### Step 1: Find In-Progress Task

**If task ID provided:**
- Look for task in `.ai/tasks/in_progress/{task-id}/`
- If not found, say: "Task {task-id} is not in progress. Use /task-status to see all tasks."

**If no task ID provided:**
- Scan `.ai/tasks/in_progress/`
- If no tasks found:
  ```
  No tasks in progress.

  Options:
    1. /task-start     - Start a task from todo
    2. /task-create    - Create a new task
    3. /task-status    - View all tasks
  ```
- If exactly one task found, use that task.
- If multiple tasks found:
  ```
  Multiple tasks in progress:
    1. {task-id-1}: {title}
    2. {task-id-2}: {title}

  Which task would you like to resume? (Enter number or task ID)
  ```

### Step 2: Read Task Context

1. Read the task's README.md completely.
2. Read the task's status.yaml for work item overview.
3. Extract key information:
   - Problem statement
   - Acceptance criteria
   - Technical context
   - Implementation approach
   - Any notes or warnings

### Step 3: Analyze Work Item Status

From status.yaml, categorize work items:
- **Done**: Items in done/ folder
- **In Progress**: Items in in_progress/ folder (currently being worked on)
- **Todo**: Items in todo/ folder (not yet started)

For any item in in_progress/, also read its file to understand:
- Current objective
- Which step was last worked on
- Any notes added during implementation

### Step 4: Announce Orientation

Output a comprehensive orientation:

```
╔══════════════════════════════════════════════════════════════════╗
║ RESUMING TASK                                                    ║
╚══════════════════════════════════════════════════════════════════╝

Task: {task-id} - {title}
Location: .ai/tasks/in_progress/{task-id}/

══════════════════════════════════════════════════════════════════
PROBLEM
══════════════════════════════════════════════════════════════════
{problem statement - 2-3 sentences}

══════════════════════════════════════════════════════════════════
PROGRESS
══════════════════════════════════════════════════════════════════

{progress bar: ████████░░ 8/10}

Done ({done_count}):
{for each done item}
  ✓ {id}. {name} ({repo})
{/for}

{if in_progress items}
In Progress ({in_progress_count}):
{for each in_progress item}
  ▶ {id}. {name} ({repo})
    Objective: {objective from work item}
{/for}
{/if}

{if todo items}
Remaining ({todo_count}):
{for each todo item}
  □ {id}. {name} ({repo})
{/for}
{/if}

══════════════════════════════════════════════════════════════════
CONTEXT
══════════════════════════════════════════════════════════════════
{key technical context from README - bullets}

{if notes or warnings exist}
══════════════════════════════════════════════════════════════════
NOTES
══════════════════════════════════════════════════════════════════
{any notes or warnings from README}
{/if}
```

### Step 5: Suggest Next Action

Based on current state, suggest the appropriate next action:

**If there's an in_progress work item:**
```
══════════════════════════════════════════════════════════════════
NEXT ACTION
══════════════════════════════════════════════════════════════════

Continue with: {id} - {name}

{objective of the work item}

Run /task-work to continue, or /task-work {next-id} to switch items.
```

**If no in_progress but todo items exist:**
```
══════════════════════════════════════════════════════════════════
NEXT ACTION
══════════════════════════════════════════════════════════════════

No work item currently in progress.

Suggested next item: {id} - {name}

{objective of the work item}

Run /task-work to start this item.
```

**If all items are done:**
```
══════════════════════════════════════════════════════════════════
NEXT ACTION
══════════════════════════════════════════════════════════════════

All work items complete!

Acceptance Criteria:
{list criteria with ✓/□}

Run /task-done to complete and archive this task.
```

Then stop. Wait for user to indicate what to do next.

## Output Format Example

```
╔══════════════════════════════════════════════════════════════════╗
║ RESUMING TASK                                                    ║
╚══════════════════════════════════════════════════════════════════╝

Task: JIRA-123 - Fix authentication bug
Location: .ai/tasks/in_progress/JIRA-123/

══════════════════════════════════════════════════════════════════
PROBLEM
══════════════════════════════════════════════════════════════════
Users are being logged out unexpectedly due to token validation
failing on certain edge cases. The issue affects users with
special characters in their email addresses.

══════════════════════════════════════════════════════════════════
PROGRESS
══════════════════════════════════════════════════════════════════

████████░░░░░░░░░░░░ 4/10

Done (4):
  ✓ 01. Research token handling (backend)
  ✓ 02. Write failing test (backend)
  ✓ 03. Update token encoder (backend)
  ✓ 04. Update token decoder (backend)

In Progress (1):
  ▶ 05. Update auth middleware (backend)
    Objective: Modify middleware to handle new token format

Remaining (5):
  □ 06. Update login form (frontend)
  □ 07. Update auth context (frontend)
  □ 08. Add E2E tests (frontend)
  □ 09. Update documentation (docs)
  □ 10. Deploy and verify (ops)

══════════════════════════════════════════════════════════════════
CONTEXT
══════════════════════════════════════════════════════════════════
• Token format changed from base64 to base64url encoding
• Special characters (+, /, =) were causing URL parsing issues
• Backend changes are backwards compatible

══════════════════════════════════════════════════════════════════
NEXT ACTION
══════════════════════════════════════════════════════════════════

Continue with: 05 - Update auth middleware

Modify middleware to handle new token format while maintaining
backwards compatibility with existing tokens.

Run /task-work to continue.
```
