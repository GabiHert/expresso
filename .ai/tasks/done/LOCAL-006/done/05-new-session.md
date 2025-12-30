<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 05-new-session.md                                     ║
║ TASK: LOCAL-006                                                  ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# New Session Command with Label

## Objective

Allow users to create a new session with a custom label for better organization.

## UI Flow

1. User clicks task or "New Session" button
2. Quick input prompt: "Enter session label (optional)"
3. Terminal opens with Claude
4. Session registered with label

## Implementation Steps

### Step 1: Add newSession command

**File**: `vscode-extension/src/extension.ts`

```typescript
const newSession = vscode.commands.registerCommand(
  'aiCockpit.newSession',
  async (item: { taskId?: string }) => {
    const taskId = item.taskId || item.task?.taskId;
    if (!taskId) return;

    // Prompt for label
    const label = await vscode.window.showInputBox({
      prompt: 'Session label (optional)',
      placeHolder: 'e.g., Bug fix, Feature work, Testing'
    });

    // Create terminal
    const terminal = vscode.window.createTerminal({
      name: `Cockpit: ${taskId}`,
      env: { COCKPIT_TASK: taskId }
    });
    terminal.show();
    terminal.sendText('claude');

    // Capture and register session
    setTimeout(async () => {
      const sessionId = await captureLatestSessionId();
      if (sessionId) {
        await sessionManager.registerSession({
          id: sessionId,
          taskId,
          label: label || `Session ${new Date().toLocaleTimeString()}`,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          status: 'active',
          terminalName: terminal.name
        });
        taskTreeProvider.refresh();
      }
    }, 3000);
  }
);
```

### Step 2: Update package.json

```json
{
  "command": "aiCockpit.newSession",
  "title": "AI Cockpit: New Session",
  "icon": "$(add)"
}
```

### Step 3: Add to Sessions section context menu

```json
{
  "command": "aiCockpit.newSession",
  "when": "view == aiCockpit.tasks && viewItem == sessions-section",
  "group": "inline"
}
```

### Step 4: Update task click behavior

Option A: Always prompt for label
Option B: Use default label, only prompt on explicit "New Session"

Recommend Option B for faster workflow.

## Acceptance Criteria

- [ ] "New Session" button on Sessions section
- [ ] Prompt for optional label
- [ ] Default label if none provided
- [ ] Session registered with label
- [ ] Tree view shows new session
