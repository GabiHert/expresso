---
type: work-item
id: "03"
parent: LOCAL-009
title: Register openWorkItem command
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-009]]


# Register openWorkItem command

## Objective

Create and register the `aiCockpit.openWorkItem` command that opens work item markdown files in the editor.

## Pre-Implementation

Review existing command patterns in extension.ts, particularly the `openTask` command (lines 115-135) which opens README files.

## Implementation Steps

### Step 1: Add command to package.json

**File**: `vscode-extension/package.json`

**Location**: In the `contributes.commands` array (around lines 70-111)

**Add**:
```json
{
  "command": "aiCockpit.openWorkItem",
  "title": "AI Cockpit: Open Work Item"
}
```

### Step 2: Create command handler in extension.ts

**File**: `vscode-extension/src/extension.ts`

**Location**: After the openTask command (around line 135)

**Add handler**:
```typescript
const openWorkItem = vscode.commands.registerCommand(
  'aiCockpit.openWorkItem',
  async (args: { taskId: string; taskStatus: string; workItem: { file: string; name: string } }) => {
    if (!args?.workItem?.file) {
      vscode.window.showErrorMessage('Work item file path not available');
      return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const workItemPath = path.join(
      rootPath,
      '.ai',
      'tasks',
      args.taskStatus,
      args.taskId,
      args.workItem.file
    );

    try {
      const uri = vscode.Uri.file(workItemPath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    } catch (error) {
      vscode.window.showErrorMessage(`Could not open work item: ${args.workItem.name}`);
    }
  }
);
```

### Step 3: Add to subscriptions

**File**: `vscode-extension/src/extension.ts`

**Location**: In the activate function where other commands are pushed to subscriptions

**Add**:
```typescript
context.subscriptions.push(openWorkItem);
```

## Acceptance Criteria

- [ ] Command is registered in package.json
- [ ] Command handler opens the correct work item file
- [ ] Error handling for missing files or workspace
- [ ] Command is added to extension subscriptions

## Testing

1. Click a work item in todo status → Opens `.ai/tasks/{status}/{taskId}/todo/{file}.md`
2. Click a work item in in_progress status → Opens correct file
3. Click a work item in done status → Opens correct file
4. Test error case: work item file doesn't exist → Shows error message

## Notes

- The file path is constructed from: taskStatus, taskId, and workItem.file
- workItem.file already contains the status subdirectory (e.g., "todo/01-something.md")
- Handle gracefully if file doesn't exist (show error message, don't crash)
