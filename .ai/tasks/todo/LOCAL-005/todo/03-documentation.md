<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-documentation.md                                   ║
║ TASK: LOCAL-005                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: ai-framework
---

# Documentation Update

## Objective

Update the architecture documentation to reflect the new `COCKPIT_TASK` environment variable in the task ID resolution chain. Ensure users understand how to use parallel sessions.

## Pre-Implementation

Main documentation file: `.ai/docs/_architecture/ai-cockpit-mvp-v2.md`

## Implementation Steps

### Step 1: Update Task ID Resolution section

**File**: `.ai/docs/_architecture/ai-cockpit-mvp-v2.md`

**Location**: Task ID Resolution section (around lines 65-82)

**Update the resolution chain to include env var**:

```markdown
### Task ID Resolution

The hook determines task ID using this priority chain:

1. **Environment Variable** (NEW): `COCKPIT_TASK` env var
   - Highest priority, enables parallel sessions
   - Example: `COCKPIT_TASK=LOCAL-005 claude`

2. **Active Task File**: `.ai/cockpit/active-task.json`
   - Set by `/task-start` command
   - Single active task at a time

3. **Git Branch**: Parse branch name for task ID pattern
   - Matches: `feature/JIRA-123-*`, `LOCAL-001-*`, etc.

4. **Session Fallback**: Use Claude session ID
   - Last resort when no task context available
```

### Step 2: Add Parallel Sessions section

Add a new section explaining parallel session usage:

```markdown
### Parallel Sessions

To work on multiple tasks simultaneously, use the `COCKPIT_TASK` environment variable:

**Terminal 1:**
```bash
COCKPIT_TASK=LOCAL-001 claude
```

**Terminal 2:**
```bash
COCKPIT_TASK=LOCAL-002 claude
```

Each session's edits will be routed to the specified task independently.

**Without the env var**, all sessions use the same active task from `active-task.json`.
```

### Step 3: Update any existing examples

Search for and update any examples that show task ID resolution to include the new env var option.

## Acceptance Criteria

- [ ] Task ID resolution chain updated with env var as first priority
- [ ] Parallel sessions usage documented with examples
- [ ] No broken links or references

## Testing

1. Review documentation renders correctly in markdown preview
2. Verify examples are copy-pasteable
3. Check for consistency with actual implementation

## Notes

- Keep documentation concise and practical
- Focus on "how to use" rather than implementation details
- Include concrete examples users can copy-paste
