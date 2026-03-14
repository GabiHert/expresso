---
type: work-item
id: "03"
parent: LOCAL-010
title: Register rename command
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Register Rename Session Command

## Objective

Add the `aiCockpit.renameSession` command that prompts for a new label and updates the session.

## Implementation Steps

### Step 1: Add command registration

**File**: `src/extension.ts`

**Location**: In the session commands section (after `focusSession` command, around line 476)

**Instructions**:

Add the following command registration:

```typescript
// Rename session
const renameSession = vscode.commands.registerCommand(
  'aiCockpit.renameSession',
  async (sessionItem: any) => {
    // sessionItem comes from tree view context, has session property
    const session = sessionItem?.session;
    if (!session?.id || !sessionManager) {
      return;
    }

    const newLabel = await vscode.window.showInputBox({
      prompt: 'Enter new session label',
      value: session.label,
      placeHolder: 'e.g., Bug fix session, Feature work, Testing'
    });

    // User cancelled
    if (newLabel === undefined) {
      return;
    }

    // Empty label not allowed
    if (!newLabel.trim()) {
      vscode.window.showWarningMessage('Session label cannot be empty');
      return;
    }

    const updated = await sessionManager.renameSession(session.id, newLabel.trim());
    if (updated) {
      taskTreeProvider?.refresh();
    } else {
      vscode.window.showWarningMessage('Session not found');
    }
  }
);

context.subscriptions.push(renameSession);
```

### Step 2: Verify SessionItem passes session data

**File**: `src/providers/TaskTreeProvider.ts`

**Check**: The `SessionItem` class (lines 498-536) should expose the session data. If using `command` property, verify the session object is passed as argument.

For context menu commands, VSCode passes the tree item itself. Ensure `SessionItem` has a `session` property accessible.

## Acceptance Criteria

- [ ] Command `aiCockpit.renameSession` is registered
- [ ] Input box shows with current label pre-filled
- [ ] Empty input shows warning message
- [ ] Cancelled input makes no changes
- [ ] Successful rename refreshes the tree view
- [ ] Non-existent session shows warning message

## Testing

1. Right-click a session in tree view
2. Select "Rename Session" from context menu
3. Verify input box appears with current label
4. Enter new label, verify tree updates
5. Try empty label, verify warning
6. Cancel dialog, verify no changes

## Notes

- The `sessionItem` parameter comes from the tree view when invoked via context menu
- Pattern follows `newSession` command which uses `showInputBox`
