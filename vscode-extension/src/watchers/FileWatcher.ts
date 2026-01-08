import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ActiveTask, CockpitEvent, TaskSwitchSignal } from '../types';

export class CockpitFileWatcher implements vscode.Disposable {
  private activeTaskWatcher: vscode.FileSystemWatcher | undefined;
  private eventsWatcher: vscode.FileSystemWatcher | undefined;
  private signalWatcher: vscode.FileSystemWatcher | undefined;
  private disposables: vscode.Disposable[] = [];

  private _onActiveTaskChanged = new vscode.EventEmitter<ActiveTask | null>();
  readonly onActiveTaskChanged = this._onActiveTaskChanged.event;

  private _onEventAdded = new vscode.EventEmitter<CockpitEvent>();
  readonly onEventAdded = this._onEventAdded.event;

  private _onTaskSwitched = new vscode.EventEmitter<TaskSwitchSignal>();
  readonly onTaskSwitched = this._onTaskSwitched.event;

  constructor(private workspaceRoot: string) {}

  start(): void {
    const cockpitPath = path.join(this.workspaceRoot, '.ai', 'cockpit');

    // Watch active-task.json
    const activeTaskPattern = new vscode.RelativePattern(
      cockpitPath,
      'active-task.json'
    );
    this.activeTaskWatcher = vscode.workspace.createFileSystemWatcher(activeTaskPattern);

    this.activeTaskWatcher.onDidCreate(() => this.loadActiveTask());
    this.activeTaskWatcher.onDidChange(() => this.loadActiveTask());
    this.activeTaskWatcher.onDidDelete(() => this._onActiveTaskChanged.fire(null));

    // Watch events directory
    const eventsPattern = new vscode.RelativePattern(
      path.join(cockpitPath, 'events'),
      '**/*.json'
    );
    this.eventsWatcher = vscode.workspace.createFileSystemWatcher(eventsPattern);

    this.eventsWatcher.onDidCreate((uri) => this.loadEvent(uri.fsPath));

    // Watch task-switch-signal.json for task switches
    const signalPattern = new vscode.RelativePattern(
      cockpitPath,
      'task-switch-signal.json'
    );
    this.signalWatcher = vscode.workspace.createFileSystemWatcher(signalPattern);
    this.signalWatcher.onDidChange(() => this.handleTaskSwitch());
    this.signalWatcher.onDidCreate(() => this.handleTaskSwitch());

    this.disposables.push(this.activeTaskWatcher, this.eventsWatcher, this.signalWatcher);

    // Load initial state
    this.loadActiveTask();
  }

  private loadActiveTask(): void {
    const activeTaskPath = path.join(
      this.workspaceRoot,
      '.ai',
      'cockpit',
      'active-task.json'
    );

    try {
      if (fs.existsSync(activeTaskPath)) {
        const content = fs.readFileSync(activeTaskPath, 'utf8');
        const task = JSON.parse(content) as ActiveTask;
        this._onActiveTaskChanged.fire(task);
      } else {
        this._onActiveTaskChanged.fire(null);
      }
    } catch (error) {
      console.error('[AI Cockpit] Error loading active task:', error);
      this._onActiveTaskChanged.fire(null);
    }
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

  getActiveTask(): ActiveTask | null {
    const activeTaskPath = path.join(
      this.workspaceRoot,
      '.ai',
      'cockpit',
      'active-task.json'
    );

    try {
      if (fs.existsSync(activeTaskPath)) {
        const content = fs.readFileSync(activeTaskPath, 'utf8');
        return JSON.parse(content) as ActiveTask;
      }
    } catch {
      // Return null on error
    }

    return null;
  }

  private async handleTaskSwitch(): Promise<void> {
    try {
      const signal = await this.readTaskSwitchSignal();
      if (signal) {
        console.log(
          `[AI Cockpit] Task switch detected: ${signal.previousTaskId} → ${signal.newTaskId}`
        );
        this._onTaskSwitched.fire(signal);

        // Delete signal file after processing
        await this.deleteSignalFile();
      }
    } catch (error) {
      console.error('[AI Cockpit] Error handling task switch signal:', error);
    }
  }

  private async readTaskSwitchSignal(): Promise<TaskSwitchSignal | null> {
    const signalPath = path.join(
      this.workspaceRoot,
      '.ai',
      'cockpit',
      'task-switch-signal.json'
    );

    try {
      const content = await fs.promises.readFile(signalPath, 'utf-8');
      const signal = JSON.parse(content) as TaskSwitchSignal;

      // Validate required fields
      if (!signal.previousTaskId || !signal.newTaskId || signal.type !== 'task-switch') {
        console.warn('[AI Cockpit] Invalid task-switch-signal format');
        return null;
      }

      return signal;
    } catch (error) {
      // File might have been deleted already or doesn't exist
      return null;
    }
  }

  private async deleteSignalFile(): Promise<void> {
    const signalPath = path.join(
      this.workspaceRoot,
      '.ai',
      'cockpit',
      'task-switch-signal.json'
    );

    try {
      await fs.promises.unlink(signalPath);
    } catch (error) {
      // File already deleted, ignore
    }
  }

  dispose(): void {
    this._onActiveTaskChanged.dispose();
    this._onEventAdded.dispose();
    this._onTaskSwitched.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
