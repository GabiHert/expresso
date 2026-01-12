<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 09-remove-review-changes-command.md                   ║
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

# Remove Review Changes Command

## Objective

Remove the `aiCockpit.openDiffReview` command from package.json and clean up related menu contributions.

## Implementation Steps

### Step 1: Remove command from package.json

**File**: `package.json`

**Instructions**:
Remove from `contributes.commands`:
```json
{
  "command": "aiCockpit.openDiffReview",
  "title": "Review Changes",
  "icon": "$(comment-discussion)"
}
```

### Step 2: Remove menu contributions

**File**: `package.json`

**Instructions**:
Remove all menu items in `contributes.menus.view/item/context` that reference `aiCockpit.openDiffReview`.

Look for entries like:
```json
{
  "command": "aiCockpit.openDiffReview",
  "when": "view == aiCockpit.tasks && viewItem =~ /shadow-file/",
  "group": "navigation@1"
}
```

### Step 3: Remove openFeedbackFile if no longer needed

Check if `aiCockpit.openFeedbackFile` is still needed. If it was only used with DiffReviewPanel, remove it too from:
- `contributes.commands`
- `contributes.menus`

## Acceptance Criteria

- [ ] `aiCockpit.openDiffReview` command removed from package.json
- [ ] All menu contributions for openDiffReview removed
- [ ] No JSON syntax errors in package.json
- [ ] Extension activates without errors

## Testing

1. Validate package.json: `npx json5 package.json`
2. Compile extension: `npm run compile`
3. Install and test that context menu no longer shows "Review Changes"

## Notes

Keep `aiCockpit.showPlainDiff` as it will become the primary diff action.
