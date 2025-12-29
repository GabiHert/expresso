<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-file-watcher.md                                    ║
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

# Implement File Watcher

## Objective

Create a file watcher service that monitors `.ai/cockpit/` for changes and notifies the UI.

## Implementation Steps

### Step 1: Create File Watcher Service

**src/watchers/FileWatcher.ts**:
```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { ActiveTask, CockpitEvent } from '../types';

export class CockpitFileWatcher implements vscode.Disposable {
  private activeTaskWatcher: vscode.FileSystemWatcher | undefined;
  private eventsWatcher: vscode.FileSystemWatcher | undefined;
  private disposables: vscode.Disposable[] = [];

  // Event emitters
  private _onActiveTaskChanged = new vscode.EventEmitter<ActiveTask | null>();
  readonly onActiveTaskChanged = this._onActiveTaskChanged.event;

  private _onEventAdded = new vscode.EventEmitter<CockpitEvent>();
  readonly onEventAdded = this._onEventAdded.event;

  constructor(private workspaceRoot: string) {}

  /**
   * Start watching for cockpit file changes
   */
  start(): void {
    this.watchActiveTask();
    this.watchEvents();
  }

  /**
   * Watch active-task.json for changes
   */
  private watchActiveTask(): void {
    const pattern = new vscode.RelativePattern(
      this.workspaceRoot,
      '.ai/cockpit/active-task.json'
    );

    this.activeTaskWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    // File created or changed
    this.activeTaskWatcher.onDidCreate(uri => this.handleActiveTaskChange(uri));
    this.activeTaskWatcher.onDidChange(uri => this.handleActiveTaskChange(uri));

    // File deleted
    this.activeTaskWatcher.onDidDelete(() => {
      this._onActiveTaskChanged.fire(null);
    });

    this.disposables.push(this.activeTaskWatcher);

    // Initial read
    this.readActiveTask();
  }

  /**
   * Watch events directory for new event files
   */
  private watchEvents(): void {
    const pattern = new vscode.RelativePattern(
      this.workspaceRoot,
      '.ai/cockpit/events/**/*.json'
    );

    this.eventsWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    // New event file created
    this.eventsWatcher.onDidCreate(uri => this.handleNewEvent(uri));

    this.disposables.push(this.eventsWatcher);
  }

  /**
   * Handle active task file change
   */
  private async handleActiveTaskChange(uri: vscode.Uri): Promise<void> {
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const activeTask: ActiveTask = JSON.parse(content.toString());
      this._onActiveTaskChanged.fire(activeTask);
    } catch (error) {
      console.error('Error reading active-task.json:', error);
      this._onActiveTaskChanged.fire(null);
    }
  }

  /**
   * Handle new event file
   */
  private async handleNewEvent(uri: vscode.Uri): Promise<void> {
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const event: CockpitEvent = JSON.parse(content.toString());
      this._onEventAdded.fire(event);
    } catch (error) {
      console.error('Error reading event file:', error);
    }
  }

  /**
   * Read current active task (for initial state)
   */
  async readActiveTask(): Promise<ActiveTask | null> {
    const activeTaskPath = path.join(
      this.workspaceRoot,
      '.ai/cockpit/active-task.json'
    );
    const uri = vscode.Uri.file(activeTaskPath);

    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const activeTask: ActiveTask = JSON.parse(content.toString());
      this._onActiveTaskChanged.fire(activeTask);
      return activeTask;
    } catch {
      this._onActiveTaskChanged.fire(null);
      return null;
    }
  }

  /**
   * Read all events for a task
   */
  async readTaskEvents(taskId: string): Promise<CockpitEvent[]> {
    const eventsDir = path.join(
      this.workspaceRoot,
      '.ai/cockpit/events',
      taskId
    );

    try {
      const uri = vscode.Uri.file(eventsDir);
      const entries = await vscode.workspace.fs.readDirectory(uri);

      const events: CockpitEvent[] = [];
      for (const [name, type] of entries) {
        if (type === vscode.FileType.File && name.endsWith('.json')) {
          const eventUri = vscode.Uri.file(path.join(eventsDir, name));
          const content = await vscode.workspace.fs.readFile(eventUri);
          events.push(JSON.parse(content.toString()));
        }
      }

      // Sort by filename (sequential numbering)
      events.sort((a, b) => a.id.localeCompare(b.id));
      return events;
    } catch {
      return [];
    }
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this._onActiveTaskChanged.dispose();
    this._onEventAdded.dispose();
  }
}
```

### Step 2: Integrate with Extension

**src/extension.ts** (update):
```typescript
import * as vscode from 'vscode';
import { CockpitFileWatcher } from './watchers/FileWatcher';

let fileWatcher: CockpitFileWatcher | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Cockpit extension activated');

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  // Initialize file watcher
  fileWatcher = new CockpitFileWatcher(workspaceRoot);

  // Subscribe to events
  fileWatcher.onActiveTaskChanged(task => {
    if (task) {
      console.log(`Active task: ${task.taskId} - ${task.title}`);
    } else {
      console.log('No active task');
    }
  });

  fileWatcher.onEventAdded(event => {
    console.log(`New event: ${event.tool} on ${event.input.file_path}`);
  });

  // Start watching
  fileWatcher.start();

  context.subscriptions.push(fileWatcher);
}

export function deactivate() {
  fileWatcher?.dispose();
}
```

### Step 3: Test File Watcher

```typescript
// In extension.ts, add test command
const testWatcherCommand = vscode.commands.registerCommand(
  'aiCockpit.testWatcher',
  async () => {
    if (!fileWatcher) return;

    // Read current state
    const activeTask = await fileWatcher.readActiveTask();
    vscode.window.showInformationMessage(
      activeTask
        ? `Active: ${activeTask.taskId}`
        : 'No active task'
    );

    // Read events if task exists
    if (activeTask) {
      const events = await fileWatcher.readTaskEvents(activeTask.taskId);
      vscode.window.showInformationMessage(
        `Events: ${events.length} captured`
      );
    }
  }
);
context.subscriptions.push(testWatcherCommand);
```

## Acceptance Criteria

- [ ] `CockpitFileWatcher` class exists
- [ ] Watches `active-task.json` for create/change/delete
- [ ] Watches `events/**/*.json` for new files
- [ ] Emits events via `onActiveTaskChanged` and `onEventAdded`
- [ ] Can read initial state on activation
- [ ] Can read all events for a task
- [ ] Properly disposes watchers

## Testing

1. Start extension
2. Create `.ai/cockpit/active-task.json` manually
3. Verify console log shows "Active task: ..."
4. Delete the file
5. Verify console log shows "No active task"
6. Create event file in `.ai/cockpit/events/TEST/001-edit.json`
7. Verify console log shows "New event: ..."

## Notes

- File watchers are efficient (use OS-level notifications)
- Debouncing may be needed for rapid changes
- Consider batching multiple event notifications
