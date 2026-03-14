---
type: work-item
id: "07"
parent: LOCAL-012
title: Update task-create.md integration
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

> Parent: [[LOCAL-012]]


# Update [[task-create]].md Integration

## Objective

Document how /[[task-create]] can link the current unassigned session to the new task.

## Implementation Steps

### Step 1: Add session linking step to [[task-create]].md

**File**: `.ai/_framework/commands/task-create.md`

**Location**: After Step 9 (Output Summary), add new step:

```markdown
### Step 9.5: Link Current Session (if applicable)

If running in a Cockpit session that is unassigned, offer to link it to the new task:

1. Check if there's an active unassigned session:
   - Look for terminal with `COCKPIT_TERMINAL_ID` env var but no `COCKPIT_TASK`
   - Or check `.ai/cockpit/sessions.json` for active sessions with `taskId: "_unassigned"`

2. If an unassigned session is found, ask:
   ```
   LINK SESSION

   You're working in an unassigned session. Link it to {task-id}?

   This will associate your current session history with the new task.

   Link session? (y/n)
   ```

3. If yes, update the session:
   - Update session's taskId from "_unassigned" to new task ID
   - Refresh the Cockpit tree view

4. If no, continue without linking.

**Note**: This step requires the AI Cockpit VSCode extension. When running outside
VSCode or without the extension, this step is skipped silently.
```

### Step 2: Add note about manual linking

In the "Next Steps" section at the end, add:

```markdown
  • If session is unassigned, use "Link to Task" in Cockpit sidebar
```

## Acceptance Criteria

- [ ] task-create.md documents session linking workflow
- [ ] Clear instructions for manual linking fallback
- [ ] Explains when automatic linking works vs manual
