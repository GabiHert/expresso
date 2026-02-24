import * as vscode from 'vscode';

export class StatusBarProvider implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    this.statusBarItem.text = '$(tasklist) AI Cockpit';
    this.statusBarItem.tooltip = 'AI Cockpit: Click to view tasks';
    this.statusBarItem.command = 'aiCockpit.showTaskMenu';
    this.statusBarItem.show();
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
