import * as vscode from 'vscode';
import { ActiveTask } from '../types';

export class StatusBarProvider implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private activeTask: ActiveTask | null = null;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    this.updateStatusBar(null);
    this.statusBarItem.command = 'aiCockpit.showTaskMenu';
    this.statusBarItem.show();
  }

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

  getActiveTask(): ActiveTask | null {
    return this.activeTask;
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
