---
type: work-item
id: "04"
parent: LOCAL-010
title: Register delete command
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Register Delete Session Command

## Objective

Add the `aiCockpit.deleteSession` command with a confirmation dialog before deletion.

## Implementation Steps

### Step 1: Add command registration

**File**: `src/extension.ts`

**Location**: After `renameSession` command

**Instructions**:

Add the following command registration:

```typescript
// Delete session
const deleteSession = vscode.commands.registerCommand(
  'aiCockpit.deleteSession',
  async (sessionItem: any) => {
    const session = sessionItem?.session;
    if (!session?.id || !sessionManager) {
      return;
    }

    // Different warning for active vs closed sessions
    const warningMessage = session.status === 'active'
      ? `Delete active session "${session.label}"? The terminal will remain open but session tracking will be lost.`
      : `Delete session "${session.label}"?`;

    const result = await vscode.window.showWarningMessage(
      warningMessage,
      { modal: true },
      'Delete'
    );

    if (result !== 'Delete') {
      return;
    }

    // If active, clean up terminal mapping
    if (session.status === 'active' && session.terminalId && terminalManager) {
      terminalManager.unregisterTerminal(session.terminalId);
    }

    const deleted = await sessionManager.deleteSession(session.id);
    if (deleted) {
      taskTreeProvider?.refresh();
      vscode.window.showInformationMessage(`Session "${session.label}" deleted`);
    } else {
      vscode.window.showWarningMessage('Session not found');
    }
  }
);

context.subscriptions.push(deleteSession);
```

### Step 2: Verify terminalManager access

**Check**: Ensure `terminalManager` is accessible in the scope where the command is registered. It should be defined earlier in `activate()`.

If `terminalManager` doesn't have `unregisterTerminal` method, you may need to add it or skip terminal cleanup (terminal will remain functional, just untracked).

## Acceptance Criteria

- [ ] Command `aiCockpit.deleteSession` is registered
- [ ] Confirmation dialog appears before deletion
- [ ] Active sessions show enhanced warning about terminal tracking
- [ ] Cancelled confirmation makes no changes
- [ ] Successful delete removes session and refreshes tree
- [ ] Success message shown after deletion
- [ ] Active session deletion cleans up terminal mapping (if method exists)

## Testing

1. Right-click closed session > "Delete Session"
2. Verify confirmation dialog appears
3. Cancel > verify session remains
4. Confirm > verify session removed from tree
5. Right-click active session > "Delete Session"
6. Verify warning mentions terminal tracking
7. Confirm > verify session removed, terminal still works

## Notes

- Modal dialog forces user to explicitly choose
- Terminal remains functional after active session deletion, just loses tracking
- The `terminalManager.unregisterTerminal` call is best-effort; if method doesn't exist, skip it
