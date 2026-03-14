---
type: work-item
id: "01"
parent: LOCAL-011
title: Change default click command to showFullDiff
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-011]]


# Change Default Click Command to showFullDiff

## Objective

Change the default behavior when clicking a file in the "Files Changed" section from showing "Claude Changes" to showing "Full Diff".

## Pre-Implementation

The affected code has already been identified:
- `vscode-extension/src/providers/TaskTreeProvider.ts` lines 472-477

## Implementation Steps

### Step 1: Update ShadowFileItem default command

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

**Location**: Lines 472-477 (inside `ShadowFileItem` constructor)

**Current code:**
```typescript
this.command = {
  command: 'aiCockpit.showClaudeChanges',
  title: 'Show Claude Changes',
  arguments: [shadow]
};
```

**Change to:**
```typescript
this.command = {
  command: 'aiCockpit.showFullDiff',
  title: 'Show Full Diff',
  arguments: [shadow]
};
```

## Acceptance Criteria

- [ ] Single-clicking a file opens the Full Diff view (showing baseline → current file state)
- [ ] The command title is "Show Full Diff"
- [ ] Right-click context menu options remain unchanged
- [ ] Extension compiles without errors

## Testing

1. Run `npm run compile` in the vscode-extension directory
2. Launch the extension in development mode (F5)
3. Open a project with AI Cockpit tasks
4. Navigate to a task with file changes
5. Click on a file in "Files Changed" - verify Full Diff opens
6. Right-click on a file - verify all three options appear
7. Test each context menu option to ensure they still work

## Notes

- This is a 2-line change
- The `showFullDiff` command already exists and is fully implemented
- No changes needed to DiffViewer.ts or extension.ts
