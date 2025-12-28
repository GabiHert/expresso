<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-task-panel.md                                      ║
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

# Create Task Panel (TreeView)

## Objective

Create a TreeView panel in the activity bar sidebar that displays tasks and their events.

## Implementation Steps

### Step 1: Create Tree Data Provider

**src/providers/TaskTreeProvider.ts**:
```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { ActiveTask, CockpitEvent } from '../types';
import { CockpitFileWatcher } from '../watchers/FileWatcher';

// Tree item types
type TreeItemType = TaskItem | EventItem;

export class TaskTreeProvider implements vscode.TreeDataProvider<TreeItemType> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItemType | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private activeTask: ActiveTask | null = null;
  private events: Map<string, CockpitEvent[]> = new Map();

  constructor(private fileWatcher: CockpitFileWatcher) {
    // Subscribe to changes
    fileWatcher.onActiveTaskChanged(task => {
      this.activeTask = task;
      this.refresh();
    });

    fileWatcher.onEventAdded(event => {
      const existing = this.events.get(event.taskId) || [];
      existing.push(event);
      this.events.set(event.taskId, existing);
      this.refresh();
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItemType): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeItemType): Promise<TreeItemType[]> {
    // Root level: show tasks
    if (!element) {
      return this.getTasks();
    }

    // Task level: show events
    if (element instanceof TaskItem) {
      return this.getTaskEvents(element.taskId);
    }

    return [];
  }

  private async getTasks(): Promise<TaskItem[]> {
    const items: TaskItem[] = [];

    // Active task
    if (this.activeTask) {
      items.push(new TaskItem(
        this.activeTask.taskId,
        this.activeTask.title,
        'active',
        vscode.TreeItemCollapsibleState.Expanded
      ));
    }

    // TODO: Load other tasks from .ai/tasks/ (future)

    return items;
  }

  private async getTaskEvents(taskId: string): Promise<EventItem[]> {
    // Load events from file watcher
    const events = await this.fileWatcher.readTaskEvents(taskId);

    return events.map(event => new EventItem(
      event.id,
      event.tool,
      event.input.file_path || 'unknown',
      event.timestamp,
      event
    ));
  }
}

class TaskItem extends vscode.TreeItem {
  constructor(
    public readonly taskId: string,
    public readonly title: string,
    public readonly status: 'active' | 'todo' | 'done',
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(title, collapsibleState);

    this.id = taskId;
    this.description = taskId;
    this.tooltip = `${taskId}: ${title}`;

    // Set icon based on status
    switch (status) {
      case 'active':
        this.iconPath = new vscode.ThemeIcon('play-circle', new vscode.ThemeColor('charts.green'));
        break;
      case 'done':
        this.iconPath = new vscode.ThemeIcon('check');
        break;
      default:
        this.iconPath = new vscode.ThemeIcon('circle-outline');
    }

    // Context value for menu contributions
    this.contextValue = `task-${status}`;
  }
}

class EventItem extends vscode.TreeItem {
  constructor(
    public readonly eventId: string,
    public readonly tool: string,
    public readonly filePath: string,
    public readonly timestamp: string,
    public readonly event: CockpitEvent
  ) {
    super(path.basename(filePath), vscode.TreeItemCollapsibleState.None);

    this.id = eventId;
    this.description = this.formatTime(timestamp);
    this.tooltip = `${tool}: ${filePath}\n${timestamp}`;

    // Set icon based on tool type
    switch (tool) {
      case 'Edit':
        this.iconPath = new vscode.ThemeIcon('edit');
        break;
      case 'Write':
        this.iconPath = new vscode.ThemeIcon('new-file');
        break;
      case 'TodoWrite':
        this.iconPath = new vscode.ThemeIcon('checklist');
        break;
      default:
        this.iconPath = new vscode.ThemeIcon('file');
    }

    // Command to view diff when clicked
    this.command = {
      command: 'aiCockpit.viewEventDiff',
      title: 'View Diff',
      arguments: [this.event]
    };

    this.contextValue = 'event';
  }

  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
```

### Step 2: Register Tree View

**src/extension.ts** (update):
```typescript
import { TaskTreeProvider } from './providers/TaskTreeProvider';

// In activate():
const taskTreeProvider = new TaskTreeProvider(fileWatcher);
const treeView = vscode.window.createTreeView('aiCockpit.tasks', {
  treeDataProvider: taskTreeProvider,
  showCollapseAll: true
});

context.subscriptions.push(treeView);
```

### Step 3: Add View Contribution to package.json

Update **package.json**:
```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "ai-cockpit",
          "title": "AI Cockpit",
          "icon": "media/icon.svg"
        }
      ]
    },
    "views": {
      "ai-cockpit": [
        {
          "id": "aiCockpit.tasks",
          "name": "Tasks",
          "icon": "$(tasklist)"
        }
      ]
    },
    "menus": {
      "view/item/context": [
        {
          "command": "aiCockpit.viewEventDiff",
          "when": "view == aiCockpit.tasks && viewItem == event",
          "group": "inline"
        }
      ]
    }
  }
}
```

### Step 4: Create Activity Bar Icon

**media/icon.svg**:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 6v6l4 2"/>
</svg>
```

### Step 5: Register Diff View Command

```typescript
// In commands/index.ts
const viewEventDiff = vscode.commands.registerCommand(
  'aiCockpit.viewEventDiff',
  async (event: CockpitEvent) => {
    if (event.tool === 'Edit' && event.input.old_string && event.input.new_string) {
      vscode.window.showInformationMessage(
        `Diff for ${event.input.file_path} - implementation in next work item`
      );
    }
  }
);
context.subscriptions.push(viewEventDiff);
```

## Acceptance Criteria

- [ ] Activity bar icon appears
- [ ] Task panel shows in sidebar
- [ ] Active task is displayed with green icon
- [ ] Events are listed under task
- [ ] Events show file name and time
- [ ] Clicking event triggers diff command
- [ ] Tree refreshes when events are added

## Testing

1. Open extension
2. Verify activity bar icon appears
3. Click to open task panel
4. Create active-task.json
5. Verify task appears in tree
6. Create event file
7. Verify event appears under task
8. Click event to test command

## Notes

- Consider adding drag-and-drop for task reordering (future)
- Could add inline actions (view, revert) on hover
- May want to group events by file (future)
