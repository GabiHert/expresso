---
type: work-item
id: "03"
parent: LOCAL-013
title: VSCode feedback button
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# VSCode Feedback Button

## Objective

Add a button/action in the VSCode task panel that opens the feedback file for the selected task, making it easy for users to add review comments.

## Implementation Steps

### Step 1: Add tree item action

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

Add an inline action button to task items:

```typescript
// In TaskItem class or when creating tree items
contextValue = 'task';  // Already exists

// Add inline button via package.json menus
```

### Step 2: Register command

**File**: `vscode-extension/src/extension.ts`

```typescript
const openFeedbackFile = vscode.commands.registerCommand(
  'aiCockpit.openFeedbackFile',
  async (item: { taskId: string; taskPath: string }) => {
    const feedbackPath = path.join(
      item.taskPath,
      'feedback',
      'diff-review.md'
    );

    // Create file from template if it doesn't exist
    if (!fs.existsSync(feedbackPath)) {
      const templatePath = path.join(
        workspaceRoot,
        '.ai/_framework/templates/feedback-template.md'
      );

      if (fs.existsSync(templatePath)) {
        fs.mkdirSync(path.dirname(feedbackPath), { recursive: true });
        fs.copyFileSync(templatePath, feedbackPath);
      } else {
        // Create minimal file
        fs.writeFileSync(feedbackPath, '# Diff Feedback\n\nAdd your feedback below.\n');
      }
    }

    // Open in editor
    const doc = await vscode.workspace.openTextDocument(feedbackPath);
    await vscode.window.showTextDocument(doc);
  }
);
```

### Step 3: Add menu contribution

**File**: `vscode-extension/package.json`

```json
{
  "contributes": {
    "menus": {
      "view/item/context": [
        {
          "command": "aiCockpit.openFeedbackFile",
          "when": "view == aiCockpit.tasks && viewItem == task",
          "group": "inline"
        }
      ]
    },
    "commands": [
      {
        "command": "aiCockpit.openFeedbackFile",
        "title": "Open Feedback",
        "icon": "$(comment-discussion)"
      }
    ]
  }
}
```

### Step 4: Show feedback indicator

Optionally show a badge or indicator when feedback file has unresolved items:

```typescript
// In TaskTreeProvider, when creating TaskItem
const hasFeedback = await this.checkForFeedback(taskPath);
if (hasFeedback) {
  item.description = `${item.description} 💬`;
}
```

## Acceptance Criteria

- [ ] Command registered: `aiCockpit.openFeedbackFile`
- [ ] Button visible on task items in tree view
- [ ] Clicking opens feedback file in editor
- [ ] Creates file from template if doesn't exist
- [ ] (Optional) Shows indicator when feedback exists

## Testing

1. Click feedback button on a task
2. Verify file opens (or is created then opens)
3. Add some feedback, save
4. Verify file persists
5. Test with task that has no feedback folder

## Notes

- Use comment-discussion icon for the button
- Consider adding keyboard shortcut
- File should open in current editor group
