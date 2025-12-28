import * as vscode from 'vscode';
import { StatusBarProvider } from '../providers/StatusBarProvider';

export function registerCommands(
  context: vscode.ExtensionContext,
  statusBar: StatusBarProvider
): void {
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

      if (selected.label.includes('View Diff History')) {
        vscode.commands.executeCommand('aiCockpit.showDiffHistory');
      } else if (selected.label.includes('Complete Task')) {
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
