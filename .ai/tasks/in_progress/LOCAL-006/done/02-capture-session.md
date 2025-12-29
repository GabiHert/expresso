<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-capture-session.md                                 ║
║ TASK: LOCAL-006                                                  ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Capture SessionId on Terminal Open

## Objective

When a new Claude terminal is opened, capture the sessionId and register it in the session registry.

## Challenge

Claude's sessionId is generated when Claude starts, not when we create the terminal. We need to:
1. Create terminal with COCKPIT_TASK
2. Wait for Claude to start
3. Query ~/.claude/history.jsonl for the new sessionId
4. Register in our sessions.json

## Implementation Steps

### Step 1: Update openTaskTerminal command

**File**: `vscode-extension/src/extension.ts`

```typescript
const openTaskTerminal = vscode.commands.registerCommand(
  'aiCockpit.openTaskTerminal',
  async (item: { taskId?: string }) => {
    const taskId = item.taskId || item.task?.taskId;
    if (!taskId) return;

    // Create terminal
    const terminal = vscode.window.createTerminal({
      name: `Cockpit: ${taskId}`,
      env: { COCKPIT_TASK: taskId }
    });
    terminal.show();
    terminal.sendText('claude');

    // Capture session after delay
    setTimeout(async () => {
      const sessionId = await captureLatestSessionId(taskId);
      if (sessionId) {
        await sessionManager.registerSession({
          id: sessionId,
          taskId,
          label: `Session ${Date.now()}`,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          status: 'active',
          terminalName: terminal.name
        });
      }
    }, 3000); // Wait for Claude to initialize
  }
);
```

### Step 2: Create captureLatestSessionId function

Query `~/.claude/history.jsonl` for most recent entry matching our project:

```typescript
async function captureLatestSessionId(taskId: string): Promise<string | null> {
  const historyPath = path.join(os.homedir(), '.claude', 'history.jsonl');
  const content = await fs.promises.readFile(historyPath, 'utf8');
  const lines = content.trim().split('\n').reverse();

  for (const line of lines.slice(0, 10)) { // Check last 10 entries
    const entry = JSON.parse(line);
    if (entry.project === workspaceRoot) {
      return entry.sessionId;
    }
  }
  return null;
}
```

### Step 3: Track terminal close events

```typescript
vscode.window.onDidCloseTerminal(terminal => {
  if (terminal.name.startsWith('Cockpit:')) {
    sessionManager.closeSessionByTerminal(terminal.name);
  }
});
```

## Acceptance Criteria

- [ ] Opening task terminal registers session
- [ ] SessionId captured from Claude history
- [ ] Closing terminal marks session as closed
- [ ] Session visible in sessions.json
