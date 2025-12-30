<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-focus-session.md                                   ║
║ TASK: LOCAL-008                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Add focusSession Command for Active Sessions

## Objective

Create a new command `aiCockpit.focusSession` that focuses an existing terminal for an active session instead of creating a new one.

## Pre-Implementation

After work item 01, we have:
- TerminalManager service with `getTerminal(terminalId)` method
- `getTerminalManager()` exported from extension.ts

## Implementation Steps

### Step 1: Add focusSession Command

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
Add a new command that focuses an active session's terminal:

```typescript
const focusSession = vscode.commands.registerCommand(
  'aiCockpit.focusSession',
  async (session: { id: string; taskId: string; terminalId?: string; status: string }) => {
    if (!session?.terminalId) {
      vscode.window.showWarningMessage('Session has no terminal ID');
      return;
    }

    if (session.status !== 'active') {
      // Session is not active, delegate to resumeSession
      vscode.commands.executeCommand('aiCockpit.resumeSession', session);
      return;
    }

    const terminal = terminalManager?.getTerminal(session.terminalId);

    if (terminal) {
      // Terminal exists - just focus it
      terminal.show();
    } else {
      // Terminal was closed externally - update status and create new
      if (sessionManager) {
        await sessionManager.closeSession(session.id);
        taskTreeProvider?.refresh();
      }
      vscode.window.showInformationMessage(
        `Terminal for "${session.taskId}" was closed. Click again to resume.`
      );
    }
  }
);

context.subscriptions.push(focusSession);
```

### Step 2: Add Command to package.json

**File**: `vscode-extension/package.json`

**Instructions**:
Add the command declaration:

```json
{
  "command": "aiCockpit.focusSession",
  "title": "AI Cockpit: Focus Session"
}
```

### Step 3: Update resumeSession to Skip Active Check

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
Remove the "already active" warning from resumeSession since focusSession handles that case:

Find and remove these lines (around 367-370):
```typescript
if (session.status !== 'closed') {
  vscode.window.showWarningMessage('Session is already active');
  return;
}
```

The focusSession command now handles active sessions, and resumeSession is only for closed sessions.

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] focusSession command created
- [ ] Command registered in package.json
- [ ] Clicking active session focuses existing terminal
- [ ] If terminal was closed, session marked as closed and user notified
- [ ] resumeSession no longer checks for active status

## Testing

1. Open a task terminal (creates active session)
2. Minimize or switch away from terminal
3. Click the active session in tree view
4. Verify: terminal focuses, no new terminal created
5. Manually close the terminal (not through VSCode close event)
6. Click the session again
7. Verify: message shown that terminal was closed

## Notes

- focusSession handles the "terminal exists" check
- If terminal doesn't exist, it updates the session status and notifies user
- User then clicks again to resume (now closed session)
