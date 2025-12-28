import * as vscode from 'vscode';
import * as path from 'path';
import { CockpitEvent } from '../types';
import { DiffContentProvider, DIFF_SCHEME } from '../providers/DiffContentProvider';

export class DiffViewer {
  constructor(
    private contentProvider: DiffContentProvider,
    private workspaceRoot: string
  ) {}

  async showEditDiff(event: CockpitEvent): Promise<void> {
    if (event.tool !== 'Edit') {
      vscode.window.showErrorMessage('Not an Edit event');
      return;
    }

    const input = event.input as { file_path?: string; old_string?: string; new_string?: string };
    const { file_path, old_string, new_string } = input;

    if (!old_string || !new_string || !file_path) {
      vscode.window.showErrorMessage('Event missing diff content');
      return;
    }

    const beforeUri = vscode.Uri.parse(
      `${DIFF_SCHEME}:before/${event.id}/${path.basename(file_path)}`
    );
    const afterUri = vscode.Uri.parse(
      `${DIFF_SCHEME}:after/${event.id}/${path.basename(file_path)}`
    );

    this.contentProvider.registerContent(beforeUri, old_string);
    this.contentProvider.registerContent(afterUri, new_string);

    const time = new Date(event.timestamp).toLocaleTimeString();

    await vscode.commands.executeCommand(
      'vscode.diff',
      beforeUri,
      afterUri,
      `${path.basename(file_path)} (${time}) - Before ↔ After`
    );
  }

  async showWriteDiff(event: CockpitEvent): Promise<void> {
    if (event.tool !== 'Write') {
      vscode.window.showErrorMessage('Not a Write event');
      return;
    }

    const input = event.input as { file_path?: string; content?: string };
    const { file_path, content } = input;

    if (!file_path) {
      vscode.window.showErrorMessage('Event missing file path');
      return;
    }

    const beforeUri = vscode.Uri.parse(
      `${DIFF_SCHEME}:before/${event.id}/${path.basename(file_path)}`
    );
    const afterUri = vscode.Uri.parse(
      `${DIFF_SCHEME}:after/${event.id}/${path.basename(file_path)}`
    );

    this.contentProvider.registerContent(beforeUri, '');
    this.contentProvider.registerContent(afterUri, content || '');

    const time = new Date(event.timestamp).toLocaleTimeString();

    await vscode.commands.executeCommand(
      'vscode.diff',
      beforeUri,
      afterUri,
      `${path.basename(file_path)} (${time}) - New File`
    );
  }

  async showContextDiff(event: CockpitEvent): Promise<void> {
    if (event.tool !== 'Edit') return;

    const input = event.input as { file_path?: string; old_string?: string; new_string?: string };
    const { file_path, old_string, new_string } = input;

    if (!file_path || !old_string || !new_string) {
      await this.showEditDiff(event);
      return;
    }

    const fullPath = path.join(this.workspaceRoot, file_path);

    try {
      const doc = await vscode.workspace.openTextDocument(fullPath);
      const currentContent = doc.getText();

      const changeIndex = currentContent.indexOf(new_string);

      if (changeIndex === -1) {
        await this.showEditDiff(event);
        return;
      }

      const lines = currentContent.split('\n');
      const lineStart = doc.positionAt(changeIndex).line;
      const contextStart = Math.max(0, lineStart - 5);
      const contextEnd = Math.min(lines.length, lineStart + 5);

      const beforeContext = currentContent.replace(new_string, old_string);
      const beforeLines = beforeContext.split('\n').slice(contextStart, contextEnd);
      const afterLines = lines.slice(contextStart, contextEnd);

      const beforeUri = vscode.Uri.parse(
        `${DIFF_SCHEME}:context-before/${event.id}/${path.basename(file_path)}`
      );
      const afterUri = vscode.Uri.parse(
        `${DIFF_SCHEME}:context-after/${event.id}/${path.basename(file_path)}`
      );

      this.contentProvider.registerContent(beforeUri, beforeLines.join('\n'));
      this.contentProvider.registerContent(afterUri, afterLines.join('\n'));

      const time = new Date(event.timestamp).toLocaleTimeString();

      await vscode.commands.executeCommand(
        'vscode.diff',
        beforeUri,
        afterUri,
        `${path.basename(file_path)} (${time}) - Lines ${contextStart + 1}-${contextEnd}`
      );
    } catch {
      await this.showEditDiff(event);
    }
  }
}
