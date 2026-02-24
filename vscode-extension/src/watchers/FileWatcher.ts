import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CockpitEvent } from '../types';

export class CockpitFileWatcher implements vscode.Disposable {
  private eventsWatcher: vscode.FileSystemWatcher | undefined;
  private disposables: vscode.Disposable[] = [];

  private _onEventAdded = new vscode.EventEmitter<CockpitEvent>();
  readonly onEventAdded = this._onEventAdded.event;

  constructor(private workspaceRoot: string) {}

  start(): void {
    const cockpitPath = path.join(this.workspaceRoot, '.ai', 'cockpit');

    // Watch events directory
    const eventsPattern = new vscode.RelativePattern(
      path.join(cockpitPath, 'events'),
      '**/*.json'
    );
    this.eventsWatcher = vscode.workspace.createFileSystemWatcher(eventsPattern);

    this.eventsWatcher.onDidCreate((uri) => this.loadEvent(uri.fsPath));

    this.disposables.push(this.eventsWatcher);
  }

  private loadEvent(eventPath: string): void {
    try {
      const content = fs.readFileSync(eventPath, 'utf8');
      const event = JSON.parse(content) as CockpitEvent;
      this._onEventAdded.fire(event);
    } catch (error) {
      console.error('[AI Cockpit] Error loading event:', error);
    }
  }

  async readTaskEvents(taskId: string): Promise<CockpitEvent[]> {
    const eventsDir = path.join(
      this.workspaceRoot,
      '.ai',
      'cockpit',
      'events',
      taskId
    );

    const events: CockpitEvent[] = [];

    try {
      if (!fs.existsSync(eventsDir)) {
        return events;
      }

      const files = fs.readdirSync(eventsDir)
        .filter(f => f.endsWith('.json'))
        .sort();

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(eventsDir, file), 'utf8');
          events.push(JSON.parse(content) as CockpitEvent);
        } catch {
          // Skip malformed files
        }
      }
    } catch (error) {
      console.error('[AI Cockpit] Error reading events:', error);
    }

    return events;
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  dispose(): void {
    this._onEventAdded.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
