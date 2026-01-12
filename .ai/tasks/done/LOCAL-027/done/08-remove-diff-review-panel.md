<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 08-remove-diff-review-panel.md                        ║
║ TASK: LOCAL-027                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                 ║
║ 2. Update status.yaml with new status                           ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml              ║
║ 5. Update task README with any learnings                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Remove DiffReviewPanel

## Objective

Remove the DiffReviewPanel webview component and its associated assets. This removes the custom diff viewer with comment functionality in favor of using VSCode's native plain diff.

## Implementation Steps

### Step 1: Delete DiffReviewPanel

**Files to delete**:
- `src/panels/DiffReviewPanel.ts`
- `media/diff-review.css`
- `media/diff-review.js`

### Step 2: Remove imports from extension.ts

**File**: `src/extension.ts`

**Instructions**:
- Remove the import for DiffReviewPanel
- Remove any initialization or registration of DiffReviewPanel
- Remove the `openDiffReview` command registration

### Step 3: Clean up any remaining references

Search for any remaining references to:
- `DiffReviewPanel`
- `diff-review`
- `openDiffReview`

And remove them.

## Acceptance Criteria

- [ ] DiffReviewPanel.ts is deleted
- [ ] diff-review.css is deleted
- [ ] diff-review.js is deleted
- [ ] No compile errors after removal
- [ ] Extension still loads correctly

## Testing

1. Compile the extension: `npm run compile`
2. Verify no errors related to missing DiffReviewPanel

## Notes

This is part of simplifying the diff review experience by using VSCode's native diff viewer instead of a custom webview.
