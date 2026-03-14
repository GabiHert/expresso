---
type: work-item
id: "02"
parent: LOCAL-013
title: Create /address-feedback command
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

# Create /address-feedback Command

## Objective

Create a framework command that reads feedback from the task's feedback folder and presents it to the agent for discussion or resolution.

## Implementation Steps

### Step 1: Create command file

**File**: `.ai/_framework/commands/address-feedback.md`

**Command structure**:
```markdown
# /address-feedback - Address Diff Feedback

## Description
Read and address feedback comments left on task diffs.

## Usage
/address-feedback              # Address feedback for current task
/address-feedback LOCAL-013    # Address feedback for specific task

## Workflow
1. Determine current task (env var, active-task, or argument)
2. Read feedback/diff-review.md
3. Parse feedback entries (file:line format)
4. For each entry, optionally show the relevant code
5. Present feedback to agent for discussion
6. Offer to mark items as resolved
```

### Step 2: Implement command logic

The command should:

1. **Resolve task ID** (same pattern as other commands):
   - Check argument first
   - Fall back to COCKPIT_TASK env var
   - Fall back to active-task.json
   - Fall back to git branch

2. **Read feedback file**:
   - Path: `.ai/tasks/{status}/{taskId}/feedback/diff-review.md`
   - Handle missing file gracefully

3. **Parse feedback entries**:
   - Extract headers matching `### path/to/file:line` pattern
   - Group by file
   - Identify resolved (strikethrough) vs unresolved

4. **Present to agent**:
   ```
   ╔══════════════════════════════════════════════════════════════════╗
   ║ FEEDBACK FOR LOCAL-013                                           ║
   ╚══════════════════════════════════════════════════════════════════╝

   Unresolved Feedback (3 items):

   ### src/services/auth.ts:42
   > This modifies token refresh - verify it handles concurrent requests

   ### src/components/Login.tsx:15-20
   > Consider adding loading state here

   ### General
   > Make sure all error messages are user-friendly

   ──────────────────────────────────────────────────────────────────

   How would you like to proceed?
   1. Discuss a specific item
   2. Show code context for an item
   3. Mark items as resolved
   4. Continue working
   ```

5. **Optionally show code context**:
   - If user selects an item, read the file at that line
   - Show surrounding context (5-10 lines)

6. **Mark as resolved**:
   - Add strikethrough to header: `### ~~src/file.ts:42~~`
   - Or move to "Resolved" section

### Step 3: Register command

Update any command registry or help system to include `/address-feedback`.

## Acceptance Criteria

- [ ] Command file created at `.ai/_framework/commands/address-feedback.md`
- [ ] Command reads feedback from task folder
- [ ] Parses file:line format correctly
- [ ] Distinguishes resolved from unresolved
- [ ] Presents feedback in readable format
- [ ] Offers options to discuss, show context, or resolve

## Testing

1. Create feedback file with sample entries
2. Run `/address-feedback`
3. Verify all entries are displayed
4. Test resolving an item
5. Verify resolved items show differently

## Notes

- Keep the command simple - read, parse, present
- Let the agent decide how to address each item
- Resolution is optional - user can just discuss and fix manually
