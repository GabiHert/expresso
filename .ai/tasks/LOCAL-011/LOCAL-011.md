---
type: task
id: LOCAL-011
title: Change Default File Click to Full Diff
status: done
created: 2025-12-29
updated: 2025-12-29
tags:
  - task
  - done
  - vscode-extension
summary:
  total: 1
  todo: 0
  in_progress: 0
  done: 1
repos:
  - vscode-extension
---

# LOCAL-011: Change Default File Click to Full Diff

## Problem Statement

Currently, when a user clicks on a file in the "Files Changed" section of the AI Cockpit sidebar, the default behavior shows "Claude Changes" (baseline → accumulated). Users have requested that the default behavior show "Full Diff" instead, which provides a complete comparison including both Claude's changes and any user modifications.

## Acceptance Criteria

- [ ] Clicking a file in the "Files Changed" section opens the Full Diff view
- [ ] Right-click context menu still shows all three options (Claude Changes, Your Changes, Full Diff)
- [ ] The command title and diff title reflect "Full Diff" instead of "Claude Changes"

## Work Items


| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Change default click command to showFullDiff | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `feature/default-full-diff` |

## Technical Context

**Files to modify:**

1. **`vscode-extension/src/providers/TaskTreeProvider.ts:472-477`**
   - The `ShadowFileItem` class sets the default click command
   - Currently: `command: 'aiCockpit.showClaudeChanges'`
   - Change to: `command: 'aiCockpit.showFullDiff'`

2. **`vscode-extension/src/providers/TaskTreeProvider.ts:474`**
   - Update the title from `'Show Claude Changes'` to `'Show Full Diff'`

**Current implementation:**
```typescript
// Lines 472-477 in TaskTreeProvider.ts
this.command = {
  command: 'aiCockpit.showClaudeChanges',
  title: 'Show Claude Changes',
  arguments: [shadow]
};
```

**Target implementation:**
```typescript
this.command = {
  command: 'aiCockpit.showFullDiff',
  title: 'Show Full Diff',
  arguments: [shadow]
};
```

**Diff command already exists:**
- `aiCockpit.showFullDiff` is already registered in `extension.ts:633-639`
- `DiffViewer.showFullDiff()` is already implemented in `DiffViewer.ts:161-177`

## Implementation Approach

This is a minimal change - just update 2 lines in `TaskTreeProvider.ts` to change the default command from `showClaudeChanges` to `showFullDiff`.

## Risks & Considerations

- **Low risk**: The `showFullDiff` command already exists and works
- **User expectation**: Some users may prefer Claude Changes as default - could consider making this configurable in the future

## Testing Strategy

1. Build the extension: `npm run compile`
2. Launch extension in dev mode (F5)
3. Open a task with file changes
4. Click on a file - should open Full Diff view
5. Right-click on a file - all three options should still be available
6. Verify each context menu option works correctly

## References

- DiffViewer implementation: `vscode-extension/src/services/DiffViewer.ts`
- Command registration: `vscode-extension/src/extension.ts:617-641`
- Context menu: `vscode-extension/package.json:154-167`


## Linked Work Items

- [[01-default-full-diff]] — Change default click command to showFullDiff (done)
