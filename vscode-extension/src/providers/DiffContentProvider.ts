import * as vscode from 'vscode';

export class DiffContentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  private contentMap = new Map<string, string>();

  registerContent(uri: vscode.Uri, content: string): void {
    this.contentMap.set(uri.toString(), content);
    this._onDidChange.fire(uri);
  }

  clearContent(uri: vscode.Uri): void {
    this.contentMap.delete(uri.toString());
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contentMap.get(uri.toString()) || '';
  }

  dispose(): void {
    this._onDidChange.dispose();
    this.contentMap.clear();
  }
}

export const DIFF_SCHEME = 'ai-cockpit-diff';
