---
type: work-item
id: "07"
parent: LOCAL-014
title: Wire tree view to webview
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-014]]


# Wire Tree View to Webview

## Objective

Replace the default click action on shadow files (which opens native VSCode diff) with the new DiffReviewPanel for in-progress tasks. Keep native diff available via context menu.

## Pre-Implementation

- Complete WI-03 through WI-06 (webview fully functional)
- Review current tree view implementation in `TaskTreeProvider.ts`

## Implementation Steps

### Step 1: Update ShadowFileItem Default Command

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

Modify `ShadowFileItem` to open review panel instead of native diff:

```typescript
class ShadowFileItem extends vscode.TreeItem {
  constructor(
    public readonly shadow: Shadow,
    public readonly taskId: string,
    public readonly taskStatus: string  // Add task status
  ) {
    super(path.basename(shadow.meta.filePath), vscode.TreeItemCollapsibleState.None);

    // Set icon based on sync status
    this.iconPath = this.getStatusIcon(shadow.meta.sync?.status);
    this.description = this.getDescription();
    this.tooltip = shadow.meta.filePath;

    // Context value for menu items
    this.contextValue = `shadow-file-${shadow.meta.sync?.status || 'unknown'}`;

    // Default click action: Open review panel for in_progress, native diff otherwise
    if (taskStatus === 'in_progress') {
      this.command = {
        command: 'aiCockpit.openDiffReview',
        title: 'Review Changes',
        arguments: [shadow]
      };
    } else {
      // For todo/done tasks, use native diff (read-only review)
      this.command = {
        command: 'aiCockpit.showFullDiff',
        title: 'Show Full Diff',
        arguments: [shadow]
      };
    }
  }

  // ... rest of implementation
}
```

### Step 2: Update Context Menu

**File**: `vscode-extension/package.json`

Add menu items for opening review panel or plain diff:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "aiCockpit.openDiffReview",
        "title": "Review Changes",
        "icon": "$(comment-discussion)"
      },
      {
        "command": "aiCockpit.showPlainDiff",
        "title": "Show Plain Diff",
        "icon": "$(diff)"
      }
    ],
    "menus": {
      "view/item/context": [
        {
          "command": "aiCockpit.openDiffReview",
          "when": "view == aiCockpit.tasks && viewItem =~ /shadow-file/",
          "group": "navigation@1"
        },
        {
          "command": "aiCockpit.showPlainDiff",
          "when": "view == aiCockpit.tasks && viewItem =~ /shadow-file/",
          "group": "navigation@2"
        },
        {
          "command": "aiCockpit.showClaudeChanges",
          "when": "view == aiCockpit.tasks && viewItem =~ /shadow-file/",
          "group": "diff@1"
        },
        {
          "command": "aiCockpit.showYourChanges",
          "when": "view == aiCockpit.tasks && viewItem == shadow-file-user-modified",
          "group": "diff@2"
        }
      ]
    }
  }
}
```

### Step 3: Register Plain Diff Command

**File**: `vscode-extension/src/extension.ts`

Add a command that explicitly opens native diff:

```typescript
// Show plain diff (native VSCode diff, no comments)
const showPlainDiff = vscode.commands.registerCommand(
  'aiCockpit.showPlainDiff',
  async (shadow: Shadow) => {
    if (!shadow) {
      vscode.window.showWarningMessage('No shadow data provided');
      return;
    }
    // Reuse existing showFullDiff logic
    await diffViewer.showFullDiff(shadow);
  }
);
context.subscriptions.push(showPlainDiff);
```

### Step 4: Pass Task Status to ShadowFileItem

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

Update where `ShadowFileItem` is created to include task status:

```typescript
// In getChildren() for FilesChangedSection
async getChildren(): Promise<ShadowFileItem[]> {
  const shadows = await this.shadowManager.getShadowsForTask(this.taskId);
  return shadows.map(shadow => new ShadowFileItem(
    shadow,
    this.taskId,
    this.taskStatus  // Pass status from parent
  ));
}
```

### Step 5: Add Review Icon to Files

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

Show comment count badge on files with feedback:

```typescript
class ShadowFileItem extends vscode.TreeItem {
  constructor(
    shadow: Shadow,
    taskId: string,
    taskStatus: string,
    commentCount: number = 0  // Add comment count
  ) {
    super(path.basename(shadow.meta.filePath), vscode.TreeItemCollapsibleState.None);

    // Show comment count in description
    if (commentCount > 0) {
      this.description = `${this.description || ''} 💬 ${commentCount}`;
    }

    // ... rest
  }
}

// Update getChildren to fetch comment counts
async getChildren(): Promise<ShadowFileItem[]> {
  const shadows = await this.shadowManager.getShadowsForTask(this.taskId);
  const feedback = await this.commentManager.loadFeedback(this.taskId);

  return shadows.map(shadow => {
    const commentCount = feedback.comments.filter(
      c => c.filePath === shadow.meta.filePath && c.status === 'open'
    ).length;

    return new ShadowFileItem(shadow, this.taskId, this.taskStatus, commentCount);
  });
}
```

### Step 6: Update Tree Provider Constructor

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

Inject CommentManager:

```typescript
export class TaskTreeProvider implements vscode.TreeDataProvider<TaskTreeItem> {
  private commentManager: CommentManager;

  constructor(
    workspaceRoot: string,
    shadowManager: ShadowManager,
    commentManager: CommentManager  // Add parameter
  ) {
    this.workspaceRoot = workspaceRoot;
    this.shadowManager = shadowManager;
    this.commentManager = commentManager;

    // Refresh tree when comments change
    this.commentManager.onChange(() => {
      this._onDidChangeTreeData.fire();
    });
  }
}
```

## Acceptance Criteria

- [ ] Click on shadow file opens DiffReviewPanel (for in_progress tasks)
- [ ] Right-click shows "Review Changes" and "Show Plain Diff"
- [ ] Plain diff opens native VSCode diff viewer
- [ ] Files with open comments show 💬 badge with count
- [ ] Tree refreshes when comments added/resolved
- [ ] Todo/done tasks still open native diff by default

## Testing

1. Click file in in_progress task - verify review panel opens
2. Right-click same file - verify both menu options
3. Select "Show Plain Diff" - verify native diff opens
4. Add comment - verify tree shows 💬 badge
5. Resolve all comments - verify badge disappears
6. Click file in done task - verify native diff opens

## Notes

- Consider adding a setting to always use native diff for users who prefer it
- Comment count only shows open comments, not resolved
- Tree refresh is triggered by CommentManager.onChange
