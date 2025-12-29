<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-resume-command.md                                  ║
║ TASK: LOCAL-006                                                  ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Resume Session Command

## Objective

Implement command to resume a closed Claude session with full context.

## Implementation Steps

### Step 1: Register resumeSession command

**File**: `vscode-extension/src/extension.ts`

```typescript
const resumeSession = vscode.commands.registerCommand(
  'aiCockpit.resumeSession',
  async (session: CockpitSession) => {
    // Create terminal with COCKPIT_TASK
    const terminal = vscode.window.createTerminal({
      name: `Cockpit: ${session.taskId}`,
      env: {
        COCKPIT_TASK: session.taskId
      }
    });
    terminal.show();

    // Resume the session
    terminal.sendText(`claude --resume ${session.id}`);

    // Update session status
    await sessionManager.updateSession(session.id, {
      status: 'active',
      lastActive: new Date().toISOString(),
      terminalName: terminal.name
    });

    // Refresh tree view
    taskTreeProvider.refresh();
  }
);

context.subscriptions.push(resumeSession);
```

### Step 2: Add command to package.json

```json
{
  "command": "aiCockpit.resumeSession",
  "title": "AI Cockpit: Resume Session",
  "icon": "$(play)"
}
```

### Step 3: Add menu entry

```json
{
  "command": "aiCockpit.resumeSession",
  "when": "view == aiCockpit.tasks && viewItem == session-closed",
  "group": "inline"
}
```

### Step 4: Handle session not found

If Claude can't find the session:
```typescript
terminal.sendText(`claude --resume ${session.id} || claude`);
```

Or show error and offer to start fresh:
```typescript
vscode.window.showWarningMessage(
  `Session ${session.id} not found. Start new session?`,
  'Yes', 'No'
).then(answer => {
  if (answer === 'Yes') {
    terminal.sendText('claude');
  }
});
```

## Acceptance Criteria

- [ ] Clicking closed session opens terminal
- [ ] Terminal runs `claude --resume SESSION_ID`
- [ ] Session status updated to active
- [ ] Tree view refreshes to show active state
- [ ] COCKPIT_TASK env var set correctly
