import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TaskColor, isValidTaskColor } from '../types';
import { CockpitFileWatcher } from '../watchers/FileWatcher';
import { CommentManager } from '../services/CommentManager';

type TreeItemType = SectionItem | TaskItem | WorkItemNode | WorkItemsSection;

interface FrameworkTask {
  taskId: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  summary?: { total: number; done: number; in_progress: number; todo: number };
  workItems?: WorkItem[];
  color?: TaskColor;
}

interface WorkItem {
  id: string;
  name: string;
  status: string;
  file?: string;
}

export class TaskTreeProvider implements vscode.TreeDataProvider<TreeItemType>, vscode.Disposable {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItemType | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private workspaceRoot: string;
  private disposables: vscode.Disposable[] = [];
  private taskColors: Map<string, TaskColor> = new Map();

  constructor(
    private fileWatcher: CockpitFileWatcher,
    private commentManager?: CommentManager
  ) {
    this.workspaceRoot = fileWatcher.getWorkspaceRoot();

    // Refresh tree when comments change
    if (commentManager) {
      this.disposables.push(
        commentManager.onChange(() => {
          this.refresh();
        })
      );
    }

    // Pre-load task colors
    this.loadAllTaskColors();
  }

  /**
   * Pre-load all task colors to ensure they're available
   */
  private async loadAllTaskColors(): Promise<void> {
    for (const status of ['in_progress', 'todo', 'done']) {
      const dirPath = path.join(this.workspaceRoot, '.ai/tasks', status);
      try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const task = await this.readFrameworkTask(entry.name, status);
          if (task?.color) {
            this.taskColors.set(task.taskId, task.color);
          }
        }
      } catch {
        // Directory doesn't exist, continue
      }
    }
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this._onDidChangeTreeData.dispose();
  }

  refresh(): void {
    // Reload task colors on refresh to catch any changes
    this.loadAllTaskColors();
    this._onDidChangeTreeData.fire(undefined);
  }

  public getTaskColor(taskId: string): TaskColor | undefined {
    return this.taskColors.get(taskId);
  }

  getTreeItem(element: TreeItemType): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeItemType): Promise<TreeItemType[]> {
    if (!element) {
      return this.getSections();
    }

    if (element instanceof SectionItem) {
      return this.getTasksForSection(element.section);
    }

    if (element instanceof TaskItem) {
      return this.getTaskChildren(element);
    }

    if (element instanceof WorkItemsSection) {
      return this.getWorkItemsForSection(element);
    }

    return [];
  }

  private async getSections(): Promise<SectionItem[]> {
    const sections: SectionItem[] = [];

    const inProgressCount = await this.countTasksInDir('in_progress');
    const todoCount = await this.countTasksInDir('todo');
    const doneCount = await this.countTasksInDir('done');

    if (inProgressCount > 0) {
      sections.push(new SectionItem('in_progress', inProgressCount));
    }
    if (todoCount > 0) {
      sections.push(new SectionItem('todo', todoCount));
    }
    if (doneCount > 0) {
      sections.push(new SectionItem('done', doneCount));
    }

    return sections;
  }

  private async countTasksInDir(status: string): Promise<number> {
    const dirPath = path.join(this.workspaceRoot, '.ai/tasks', status);
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      return entries.filter(e => e.isDirectory()).length;
    } catch {
      return 0;
    }
  }

  private async getTasksForSection(section: 'in_progress' | 'todo' | 'done'): Promise<TaskItem[]> {
    const dirPath = path.join(this.workspaceRoot, '.ai/tasks', section);
    const items: TaskItem[] = [];

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const taskId = entry.name;
        const task = await this.readFrameworkTask(taskId, section);

        if (task) {
          // Store task color
          if (task.color) {
            this.taskColors.set(taskId, task.color);
          }
          items.push(new TaskItem(task));
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return items;
  }

  private async readFrameworkTask(taskId: string, status: string): Promise<FrameworkTask | null> {
    const statusPath = path.join(this.workspaceRoot, '.ai/tasks', status, taskId, 'status.yaml');

    try {
      const content = await fs.promises.readFile(statusPath, 'utf8');
      return this.parseStatusYaml(content, taskId, status as 'todo' | 'in_progress' | 'done');
    } catch {
      return {
        taskId,
        title: taskId,
        status: status as 'todo' | 'in_progress' | 'done'
      };
    }
  }

  private parseStatusYaml(content: string, taskId: string, status: 'todo' | 'in_progress' | 'done'): FrameworkTask {
    const lines = content.split('\n');
    let title = taskId;
    let color: TaskColor | undefined;
    let summary = { total: 0, done: 0, in_progress: 0, todo: 0 };
    const workItems: WorkItem[] = [];

    let inSummary = false;
    let inWorkItems = false;
    let currentWorkItem: Partial<WorkItem> | null = null;

    for (const line of lines) {
      if (line.startsWith('title:')) {
        title = line.replace('title:', '').trim().replace(/^["']|["']$/g, '');
      }

      // Parse color field
      if (line.startsWith('color:')) {
        const colorValue = line.replace('color:', '').trim().replace(/^["']|["']$/g, '');
        if (isValidTaskColor(colorValue)) {
          color = colorValue;
        }
      }

      if (line.startsWith('summary:')) {
        inSummary = true;
        inWorkItems = false;
        continue;
      }

      if (line.startsWith('work_items:')) {
        inSummary = false;
        inWorkItems = true;
        continue;
      }

      if (inSummary && line.includes(':')) {
        const [key, val] = line.split(':').map(s => s.trim());
        if (key === 'total') summary.total = parseInt(val) || 0;
        if (key === 'done') summary.done = parseInt(val) || 0;
        if (key === 'in_progress') summary.in_progress = parseInt(val) || 0;
        if (key === 'todo') summary.todo = parseInt(val) || 0;
      }

      if (inWorkItems) {
        if (line.trim().startsWith('- id:')) {
          if (currentWorkItem?.id) {
            workItems.push(currentWorkItem as WorkItem);
          }
          currentWorkItem = { id: line.split(':')[1]?.trim().replace(/["']/g, '') };
        } else if (currentWorkItem && line.includes('name:')) {
          currentWorkItem.name = line.split('name:')[1]?.trim().replace(/["']/g, '');
        } else if (currentWorkItem && line.includes('status:')) {
          currentWorkItem.status = line.split('status:')[1]?.trim();
        } else if (currentWorkItem && line.includes('file:')) {
          currentWorkItem.file = line.split('file:')[1]?.trim().replace(/["']/g, '');
        }
      }
    }

    if (currentWorkItem?.id) {
      workItems.push(currentWorkItem as WorkItem);
    }

    return { taskId, title, status, summary, workItems, color };
  }

  private async getTaskChildren(task: TaskItem): Promise<TreeItemType[]> {
    const items: TreeItemType[] = [];

    // Add work items section if available
    if (task.task.workItems && task.task.workItems.length > 0) {
      items.push(new WorkItemsSection(task.task.taskId, task.task.status, task.task.workItems, task.task.workItems.length));
    }

    return items;
  }

  private getWorkItemsForSection(section: WorkItemsSection): WorkItemNode[] {
    return section.workItems.map(wi => new WorkItemNode(wi, section.taskId, section.taskStatus));
  }
}

class SectionItem extends vscode.TreeItem {
  constructor(
    public readonly section: 'in_progress' | 'todo' | 'done',
    count: number
  ) {
    const labels: Record<string, string> = {
      'in_progress': 'In Progress',
      'todo': 'Todo',
      'done': 'Done'
    };

    super(labels[section], vscode.TreeItemCollapsibleState.Expanded);

    this.description = `${count}`;
    this.contextValue = `section-${section}`;

    const icons: Record<string, string> = {
      'in_progress': 'play-circle',
      'todo': 'circle-outline',
      'done': 'check-all'
    };

    const colors: Record<string, string> = {
      'in_progress': 'charts.green',
      'todo': 'charts.yellow',
      'done': 'charts.blue'
    };

    this.iconPath = new vscode.ThemeIcon(icons[section], new vscode.ThemeColor(colors[section]));
  }
}

class TaskItem extends vscode.TreeItem {
  public readonly taskId: string;

  constructor(
    public readonly task: FrameworkTask
  ) {
    super(task.title, vscode.TreeItemCollapsibleState.Collapsed);

    this.taskId = task.taskId;
    this.id = task.taskId;

    // Show progress in description
    if (task.summary && task.summary.total > 0) {
      this.description = `${task.taskId} (${task.summary.done}/${task.summary.total})`;
    } else {
      this.description = task.taskId;
    }

    this.tooltip = `${task.taskId}: ${task.title}`;

    // Determine icon color: task color takes precedence over status-based color
    const getIconColor = (): vscode.ThemeColor | undefined => {
      if (task.color) {
        return new vscode.ThemeColor(task.color);
      }
      if (task.status === 'in_progress') {
        return new vscode.ThemeColor('charts.green');
      }
      return undefined;
    };

    const iconColor = getIconColor();

    switch (task.status) {
      case 'done':
        this.iconPath = new vscode.ThemeIcon('check', iconColor);
        break;
      case 'in_progress':
        this.iconPath = new vscode.ThemeIcon('circle-large-outline', iconColor);
        break;
      default:
        this.iconPath = new vscode.ThemeIcon('circle-outline', iconColor);
    }

    this.contextValue = `task-${task.status}`;

    // Click to open task README
    this.command = {
      command: 'aiCockpit.openTask',
      title: 'View Task',
      arguments: [{ taskId: task.taskId, status: task.status, title: task.title }]
    };
  }
}

class WorkItemNode extends vscode.TreeItem {
  constructor(workItem: WorkItem, taskId: string, taskStatus: string) {
    super(workItem.name, vscode.TreeItemCollapsibleState.None);

    this.description = workItem.id;

    switch (workItem.status) {
      case 'done':
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
        break;
      case 'in_progress':
        this.iconPath = new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('charts.yellow'));
        break;
      default:
        this.iconPath = new vscode.ThemeIcon('circle-outline');
    }

    this.contextValue = `workitem-${workItem.status}`;

    // Click to open work item file
    this.command = {
      command: 'aiCockpit.openWorkItem',
      title: 'View Work Item',
      arguments: [{
        taskId: taskId,
        taskStatus: taskStatus,
        workItem: workItem
      }]
    };
  }
}

class WorkItemsSection extends vscode.TreeItem {
  constructor(
    public readonly taskId: string,
    public readonly taskStatus: string,
    public readonly workItems: WorkItem[],
    workItemCount: number
  ) {
    super('Work Items', vscode.TreeItemCollapsibleState.Collapsed);

    this.id = `workitems-${taskId}`;
    this.description = `${workItemCount}`;
    this.iconPath = new vscode.ThemeIcon('checklist');
    this.contextValue = 'workitems-section';
  }
}
