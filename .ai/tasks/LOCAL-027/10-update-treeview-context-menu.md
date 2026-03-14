---
type: work-item
id: "10"
parent: LOCAL-027
title: Update TreeView Context Menu
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-027]]


# Update TreeView Context Menu

## Objective

Make "Show Plain Diff" the primary/default action for shadow files in the tree view, and clean up any orphaned references to the removed DiffReviewPanel.

## Implementation Steps

### Step 1: Update menu group ordering

**File**: `package.json`

**Instructions**:
Update the `showPlainDiff` menu entry to be in `navigation@1` group (primary position):
```json
{
  "command": "aiCockpit.showPlainDiff",
  "when": "view == aiCockpit.tasks && viewItem =~ /shadow-file/",
  "group": "navigation@1"
}
```

### Step 2: Update TaskTreeProvider if needed

**File**: `src/providers/TaskTreeProvider.ts`

**Instructions**:
- Remove any references to `openDiffReview`
- Ensure `showPlainDiff` is properly wired up
- Check if there are any tooltip or description updates needed

### Step 3: Clean up diff-related commands

**File**: `src/extension.ts`

**Instructions**:
Review and potentially simplify the diff-related commands:
- Keep `showPlainDiff`
- Keep `showClaudeChanges`, `showYourChanges`, `showFullDiff` if still useful
- Remove any that depended on DiffReviewPanel

### Step 4: Rename command if desired

Consider renaming `showPlainDiff` to just `showDiff` or `viewDiff` since it's now the only diff option. This would require updating:
- package.json command definition
- package.json menu contributions
- extension.ts command registration

## Acceptance Criteria

- [ ] Plain Diff is the primary action in context menu
- [ ] No references to DiffReviewPanel remain
- [ ] Context menu works correctly on shadow files
- [ ] Diff viewer opens correctly

## Testing

1. Compile and install extension
2. Open a task with shadow files
3. Right-click on a shadow file
4. Verify "Show Plain Diff" appears prominently
5. Click it and verify diff opens correctly

## Notes

The plain diff uses VSCode's native diff editor which is more familiar to users and doesn't require custom CSS/JS maintenance.
