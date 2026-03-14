---
type: work-item
id: "01"
parent: LOCAL-022
title: Update diff generator to use full file context
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Update diff generator to use full file context

## Objective

Modify the unified diff generator to include all lines from the file, not just changed lines with limited context. This enables the diff review panel to show the entire file with changes highlighted.

## Pre-Implementation

No exploration needed - the change is already well understood from prior analysis.

## Implementation Steps

### Step 1: Update createTwoFilesPatch call

**File**: `vscode-extension/src/utils/diffGenerator.ts`

**Instructions**:
Add the `context: Infinity` option to the `createTwoFilesPatch()` call:

```typescript
return createTwoFilesPatch(
  `a/${filePath}`,
  `b/${filePath}`,
  oldContent || '',
  newContent || '',
  'original',
  'modified',
  { context: Infinity }
);
```

This single change makes the diff include every line from both versions of the file.

## Post-Implementation

1. Build the extension: `npm run compile`
2. Test in VS Code with a task that has changed files
3. Verify the full file is displayed in the diff review panel

## Acceptance Criteria

- [ ] Diff review panel shows all lines from the file
- [ ] Changed lines (additions/deletions) are still highlighted
- [ ] Unchanged lines are visible with neutral styling
- [ ] Comments can be added to any line
- [ ] No build errors or warnings

## Testing

1. Start the extension in debug mode (F5)
2. Open a task with file changes
3. Click a changed file to open the diff review panel
4. Scroll through - entire file should be visible
5. Try adding a comment to an unchanged line
6. Verify syntax highlighting works on all lines

## Notes

- The `context: Infinity` value tells the diff algorithm to include unlimited context lines
- diff2html will render all lines, using its existing styling for unchanged vs changed lines
- Performance may be a concern for very large files (1000+ lines) - monitor and consider optimization if needed
