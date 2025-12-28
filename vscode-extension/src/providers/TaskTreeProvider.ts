import * as vscode from 'vscode';
import * as path from 'path';
import { ActiveTask, CockpitEvent } from '../types';
import { CockpitFileWatcher } from '../watchers/FileWatcher';

type TreeItemType = TaskItem | EventItem;

export class TaskTreeProvider implements vscode.TreeDataProvider<TreeItemType> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItemType | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private activeTask: ActiveTask | null = null;
  private events: Map<string, CockpitEvent[]> = new Map();

  constructor(private fileWatcher: CockpitFileWatcher) {
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
    if (!element) {
      return this.getTasks();
    }

    if (element instanceof TaskItem) {
      return this.getTaskEvents(element.taskId);
    }

    return [];
  }

  private async getTasks(): Promise<TaskItem[]> {
    const items: TaskItem[] = [];

    if (this.activeTask) {
      items.push(new TaskItem(
        this.activeTask.taskId,
        this.activeTask.title,
        'active',
        vscode.TreeItemCollapsibleState.Expanded
      ));
    }

    return items;
  }

  private async getTaskEvents(taskId: string): Promise<EventItem[]> {
    const events = await this.fileWatcher.readTaskEvents(taskId);

    return events.map(event => new EventItem(
      event.id,
      event.tool,
      (event.input as { file_path?: string }).file_path || 'unknown',
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
