---
type: work-item
id: "05"
parent: LOCAL-012
title: Register linkSessionToTask command
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-012]]


# Register linkSessionToTask Command

## Objective

Add command to link an unassigned session to a task, with quick pick for task selection.

## Implementation Steps

### Step 1: Add helper to get available tasks

**File**: `src/extension.ts`

Add helper function (can be inside activate or as module-level):

```typescript
async function getAvailableTasks(workspaceRoot: string): Promise<Array<{ taskId: string; title: string; status: string }>> {
  const tasks: Array<{ taskId: string; title: string; status: string }> = [];
  const statuses = ['in_progress', 'todo'];

  for (const status of statuses) {
    const tasksDir = path.join(workspaceRoot, '.ai/tasks', status);
    try {
      const entries = await fs.promises.readdir(tasksDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const statusPath = path.join(tasksDir, entry.name, 'status.yaml');
          try {
            const content = await fs.promises.readFile(statusPath, 'utf8');
            const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m);
            tasks.push({
              taskId: entry.name,
              title: titleMatch ? titleMatch[1] : entry.name,
              status
            });
          } catch {
            tasks.push({ taskId: entry.name, title: entry.name, status });
          }
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  return tasks;
}
```

### Step 2: Register linkSessionToTask command

**Location**: After `startSession` command

```typescript
// Link unassigned session to a task
const linkSessionToTask = vscode.commands.registerCommand(
  'aiCockpit.linkSessionToTask',
  async (sessionItem?: { session?: CockpitSession }) => {
    if (!sessionManager) {
      return;
    }

    let session = sessionItem?.session;

    // If no session provided, try to get from active terminal
    if (!session) {
      const activeTerminal = vscode.window.activeTerminal;
      if (activeTerminal) {
        const terminalId = terminalManager?.findTerminalId(activeTerminal);
        if (terminalId) {
          session = await sessionManager.getActiveSessionByTerminalId(terminalId) ?? undefined;
        }
      }
    }

    if (!session) {
      vscode.window.showWarningMessage('No session selected');
      return;
    }

    if (session.taskId !== UNASSIGNED_TASK_ID) {
      vscode.window.showWarningMessage(`Session is already linked to task ${session.taskId}`);
      return;
    }

    // Get available tasks for quick pick
    const tasks = await getAvailableTasks(workspaceRoot);

    if (tasks.length === 0) {
      vscode.window.showWarningMessage('No tasks available. Create a task first with /task-create');
      return;
    }

    const selected = await vscode.window.showQuickPick(
      tasks.map(t => ({
        label: t.taskId,
        description: t.title,
        detail: `Status: ${t.status}`,
        taskId: t.taskId
      })),
      {
        placeHolder: 'Select task to link session to',
        matchOnDescription: true
      }
    );

    if (!selected) {
      return; // User cancelled
    }

    const success = await sessionManager.linkSessionToTask(session.id, selected.taskId);
    if (success) {
      // Update terminal name to reflect new task
      // Note: VSCode doesn't allow renaming terminals, so this is just for new sessions

      taskTreeProvider?.refresh();
      vscode.window.showInformationMessage(`Session linked to ${selected.taskId}`);
    } else {
      vscode.window.showWarningMessage('Failed to link session');
    }
  }
);

context.subscriptions.push(linkSessionToTask);
```

## Acceptance Criteria

- [ ] Command `aiCockpit.linkSessionToTask` is registered
- [ ] Quick pick shows available tasks from in_progress and todo
- [ ] Only unassigned sessions can be linked
- [ ] Session moves from root "Sessions" to task's sessions after linking
- [ ] Success message shows task ID
