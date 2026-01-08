<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/done/LOCAL-022/                              ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)          ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                 ║
║ 4. Work on ONE item at a time from todo/                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-022: Full-file diff as default view

## Problem Statement

Currently the DiffReviewPanel shows a side-by-side diff with only ~3 lines of context around changes. Users want to see the entire file with changes highlighted (like "Full Diff plain"), while keeping the inline comments functionality that exists in the current review panel.

## Acceptance Criteria

- [ ] Diff review panel shows entire file content, not just changed lines with limited context
- [ ] Changed lines are still highlighted (green for additions, red for deletions)
- [ ] Comments can be added to any line in the file (not just changed lines)
- [ ] Existing comment functionality (add, edit, delete, resolve) works unchanged
- [ ] Syntax highlighting works on all lines

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Update diff generator to use full file context | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `feature/full-file-diff` |

## Technical Context

**Key Files:**
- `vscode-extension/src/utils/diffGenerator.ts` - Generates unified diff using `diff` package
- `vscode-extension/src/panels/DiffReviewPanel.ts` - Webview panel that renders diffs
- `vscode-extension/media/diff-review.js` - Frontend rendering with diff2html

**Current Behavior:**
The `createTwoFilesPatch()` function from the `diff` package uses a default context of 3-4 lines around changes. This means only changed lines plus a few surrounding lines are included in the diff output.

**Solution:**
Pass `{ context: Infinity }` to `createTwoFilesPatch()` to include all lines from the file. The diff2html library will then render the entire file with changes highlighted.

## Implementation Approach

This is a one-line change in `diffGenerator.ts`:

```typescript
// Before
return createTwoFilesPatch(
  `a/${filePath}`,
  `b/${filePath}`,
  oldContent || '',
  newContent || '',
  'original',
  'modified'
);

// After
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

## Risks & Considerations

- **Large files**: Very large files may cause performance issues in the webview. Consider adding a toggle or file size threshold in a future enhancement.
- **Comment line mapping**: Since all lines are now visible, comments should work on any line. The existing line-number-based comment system should work without changes.

## Testing Strategy

1. Open a task with changed files
2. Click on a changed file to open the diff review panel
3. Verify the entire file is visible (not just hunks)
4. Add a comment to an unchanged line - should work
5. Add a comment to a changed line - should work
6. Verify syntax highlighting works throughout

## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.

## References

- Exploration from conversation: Full analysis of diff system architecture
- `diff` package: https://www.npmjs.com/package/diff
- `diff2html` library used for rendering
