<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-status-bar.md                                      ║
║ TASK: LOCAL-003                                                  ║
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

# Add Status Bar Provider

## Objective

Create a status bar item that shows the currently active task and allows quick actions.

## Implementation Steps

### Step 1: Create Status Bar Provider

**src/providers/StatusBarProvider.ts**:
```typescript
import * as vscode from 'vscode';
import { ActiveTask } from '../types';

export class StatusBarProvider implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private activeTask: ActiveTask | null = null;

  constructor() {
    // Create status bar item on the left side
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100 // Priority (higher = more left)
    );

    // Set initial state
    this.updateStatusBar(null);

    // Add click command
    this.statusBarItem.command = 'aiCockpit.showTaskMenu';

    // Show the status bar item
    this.statusBarItem.show();
  }

  /**
   * Update status bar with current task
   */
  updateStatusBar(task: ActiveTask | null): void {
    this.activeTask = task;

    if (task) {
      this.statusBarItem.text = `$(tasklist) ${task.taskId}`;
      this.statusBarItem.tooltip = `AI Cockpit: ${task.title}\nClick for options`;
      this.statusBarItem.backgroundColor = undefined;
    } else {
      this.statusBarItem.text = '$(tasklist) No task';
      this.statusBarItem.tooltip = 'AI Cockpit: No active task\nClick to view tasks';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
    }
  }

  /**
   * Get current active task
   */
  getActiveTask(): ActiveTask | null {
    return this.activeTask;
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
```

### Step 2: Create Task Menu Command

**src/commands/index.ts**:
```typescript
import * as vscode from 'vscode';
import { StatusBarProvider } from '../providers/StatusBarProvider';

export function registerCommands(
  context: vscode.ExtensionContext,
  statusBar: StatusBarProvider
): void {
  // Show task menu when status bar is clicked
  const showTaskMenu = vscode.commands.registerCommand(
    'aiCockpit.showTaskMenu',
    async () => {
      const activeTask = statusBar.getActiveTask();

      const items: vscode.QuickPickItem[] = [];

      if (activeTask) {
        items.push(
          {
            label: `$(tasklist) ${activeTask.taskId}`,
            description: activeTask.title,
            detail: 'Currently active task'
          },
          {
            label: '$(eye) View Diff History',
            description: 'See all changes for this task'
          },
          {
            label: '$(check) Complete Task',
            description: 'Run /task-done in terminal'
          },
          { kind: vscode.QuickPickItemKind.Separator, label: '' },
          {
            label: '$(list-tree) View All Tasks',
            description: 'Open task panel'
          }
        );
      } else {
        items.push(
          {
            label: '$(warning) No Active Task',
            description: 'Start a task with /task-start',
            detail: 'Run /task-start <task-id> in terminal'
          },
          { kind: vscode.QuickPickItemKind.Separator, label: '' },
          {
            label: '$(list-tree) View All Tasks',
            description: 'Open task panel'
          }
        );
      }

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'AI Cockpit'
      });

      if (!selected) return;

      // Handle selection
      if (selected.label.includes('View Diff History')) {
        vscode.commands.executeCommand('aiCockpit.showDiffHistory');
      } else if (selected.label.includes('Complete Task')) {
        // Open terminal with /task-done
        const terminal = vscode.window.createTerminal('AI Cockpit');
        terminal.show();
        terminal.sendText('/task-done');
      } else if (selected.label.includes('View All Tasks')) {
        vscode.commands.executeCommand('aiCockpit.tasks.focus');
      }
    }
  );

  context.subscriptions.push(showTaskMenu);
}
```

### Step 3: Integrate with Extension

**src/extension.ts** (update):
```typescript
import * as vscode from 'vscode';
import { CockpitFileWatcher } from './watchers/FileWatcher';
import { StatusBarProvider } from './providers/StatusBarProvider';
import { registerCommands } from './commands';

let fileWatcher: CockpitFileWatcher | undefined;
let statusBar: StatusBarProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Cockpit extension activated');

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  // Initialize providers
  statusBar = new StatusBarProvider();
  fileWatcher = new CockpitFileWatcher(workspaceRoot);

  // Connect file watcher to status bar
  fileWatcher.onActiveTaskChanged(task => {
    statusBar?.updateStatusBar(task);
  });

  // Start watching
  fileWatcher.start();

  // Register commands
  registerCommands(context, statusBar);

  // Add to subscriptions
  context.subscriptions.push(fileWatcher, statusBar);
}

export function deactivate() {
  fileWatcher?.dispose();
  statusBar?.dispose();
}
```

### Step 4: Add Command to package.json

Update **package.json** contributes.commands:
```json
{
  "contributes": {
    "commands": [
      {
        "command": "aiCockpit.showPanel",
        "title": "AI Cockpit: Show Panel"
      },
      {
        "command": "aiCockpit.showTaskMenu",
        "title": "AI Cockpit: Show Task Menu"
      },
      {
        "command": "aiCockpit.showDiffHistory",
        "title": "AI Cockpit: Show Diff History"
      }
    ]
  }
}
```

## Acceptance Criteria

- [ ] Status bar item appears on the left
- [ ] Shows task ID when task is active
- [ ] Shows "No task" with warning background when inactive
- [ ] Tooltip shows task title
- [ ] Clicking shows quick pick menu
- [ ] Menu has relevant options based on state

## Testing

1. Start extension with no active task
   - Status bar shows "No task" with warning color
2. Create `.ai/cockpit/active-task.json`
   - Status bar updates to show task ID
3. Click status bar
   - Quick pick menu appears with options
4. Delete `active-task.json`
   - Status bar reverts to "No task"

## Notes

- Use VSCode theme colors for consistency
- Consider adding event count badge (future)
- Could show progress percentage (future)
