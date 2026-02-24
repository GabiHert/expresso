import * as vscode from 'vscode';
import { StatusBarProvider } from '../providers/StatusBarProvider';

export function registerCommands(
  context: vscode.ExtensionContext,
  statusBar: StatusBarProvider
): void {

  const showTaskMenu = vscode.commands.registerCommand(
    'aiCockpit.showTaskMenu',
    async () => {
      const items: vscode.QuickPickItem[] = [
        {
          label: '$(list-tree) View All Tasks',
          description: 'Open task panel'
        },
        { kind: vscode.QuickPickItemKind.Separator, label: '' },
        {
          label: '$(add) Create Task',
          description: 'Run /task-create in terminal'
        },
        {
          label: '$(dashboard) Task Status',
          description: 'Run /task-status in terminal'
        }
      ];

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'AI Cockpit'
      });

      if (!selected) return;

      if (selected.label.includes('View All Tasks')) {
        vscode.commands.executeCommand('aiCockpit.tasks.focus');
      } else if (selected.label.includes('Create Task')) {
        const terminal = vscode.window.createTerminal('AI Cockpit');
        terminal.show();
        terminal.sendText('/task-create');
      } else if (selected.label.includes('Task Status')) {
        const terminal = vscode.window.createTerminal('AI Cockpit');
        terminal.show();
        terminal.sendText('/task-status');
      }
    }
  );

  context.subscriptions.push(showTaskMenu);
}
