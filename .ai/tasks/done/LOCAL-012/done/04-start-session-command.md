---
repo: vscode-extension
---

# Register startSession Command

## Objective

Add command to start a Claude session without requiring a task selection.

## Implementation Steps

### Step 1: Import UNASSIGNED_TASK_ID

**File**: `src/extension.ts`

Add to imports:
```typescript
import { UNASSIGNED_TASK_ID } from './types';
```

### Step 2: Register startSession command

**Location**: After `newSession` command registration

```typescript
// Start session without task (unassigned)
const startSession = vscode.commands.registerCommand(
  'aiCockpit.startSession',
  async () => {
    if (!sessionManager) {
      return;
    }

    // Prompt for optional session label
    const label = await vscode.window.showInputBox({
      prompt: 'Session label (optional)',
      placeHolder: 'e.g., Exploration, Research, Debugging'
    });

    // User cancelled
    if (label === undefined) {
      return;
    }

    // Generate terminal ID for correlation
    const terminalId = crypto.randomUUID();

    // Get known session IDs before opening terminal
    const allSessions = await sessionManager.getSessions();
    const knownSessionIds = new Set(allSessions.map(s => s.id));

    // Create terminal WITHOUT COCKPIT_TASK env var
    const terminal = vscode.window.createTerminal({
      name: 'Cockpit: Session',
      env: {
        COCKPIT_TERMINAL_ID: terminalId
        // Note: No COCKPIT_TASK - this is intentional for unassigned sessions
      }
    });
    terminal.show();
    terminal.sendText('claude');

    // Store mapping for terminal close correlation
    terminalManager!.registerTerminal(terminalId, terminal);
    terminalManager!.markPendingCapture(terminalId);

    let sessionId: string | null = null;
    try {
      sessionId = await captureLatestSessionId(knownSessionIds);
    } finally {
      terminalManager!.clearPendingCapture(terminalId);
    }

    // Check if terminal was closed during capture
    if (!terminalManager!.hasTerminal(terminalId)) {
      console.warn('AI Cockpit: Terminal closed during session capture');
      return;
    }

    if (sessionId) {
      const sessionLabel = label || `Session ${new Date().toLocaleTimeString()}`;
      await sessionManager.registerSession({
        id: sessionId,
        taskId: UNASSIGNED_TASK_ID,  // Key difference: unassigned
        label: sessionLabel,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: 'active',
        terminalName: terminal.name,
        terminalId
      });
      taskTreeProvider?.refresh();
      console.log(`AI Cockpit: Unassigned session "${sessionLabel}" created`);
    } else {
      console.warn('AI Cockpit: Failed to capture sessionId');
      terminalManager!.unregisterTerminal(terminalId);
      vscode.window.showWarningMessage(
        'AI Cockpit: Could not capture session. Terminal is open but not tracked.',
        'Dismiss'
      );
    }
  }
);

context.subscriptions.push(startSession);
```

## Acceptance Criteria

- [ ] Command `aiCockpit.startSession` is registered
- [ ] Terminal opens without COCKPIT_TASK env var
- [ ] Session created with taskId = "_unassigned"
- [ ] Session appears in root "Sessions" section
- [ ] Terminal named "Cockpit: Session" (not task-specific)
