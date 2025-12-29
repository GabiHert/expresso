<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-files-changed-tree.md                              ║
║ TASK: LOCAL-004                                                  ║
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

# Add Files Changed to Tree View

## Objective

Add a "Files Changed" section to the task tree view showing files with shadow tracking.

## Implementation Steps

### Step 1: Add ShadowFileItem class

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

Add import:
```typescript
import { Shadow, ShadowManager } from '../services/ShadowManager';
```

Add new tree item class:
```typescript
class ShadowFileItem extends vscode.TreeItem {
  constructor(
    public readonly shadow: Shadow,
    public readonly syncStatus: 'synced' | 'user-modified' | 'file-deleted'
  ) {
    super(
      path.basename(shadow.meta.filePath),
      vscode.TreeItemCollapsibleState.None
    );

    this.description = `${shadow.meta.accumulated.editCount} edit${shadow.meta.accumulated.editCount !== 1 ? 's' : ''}`;
    this.tooltip = `${shadow.meta.filePath}\n${shadow.meta.accumulated.editCount} Claude edits\nStatus: ${syncStatus}`;

    // Icon based on sync status
    switch (syncStatus) {
      case 'synced':
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
        break;
      case 'user-modified':
        this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
        this.description += ' (modified)';
        break;
      case 'file-deleted':
        this.iconPath = new vscode.ThemeIcon('trash', new vscode.ThemeColor('charts.red'));
        this.description += ' (deleted)';
        break;
    }

    // Click to show Claude changes
    this.command = {
      command: 'aiCockpit.showClaudeChanges',
      title: 'Show Claude Changes',
      arguments: [shadow]
    };

    this.contextValue = `shadow-file-${syncStatus}`;
  }
}

class FilesChangedSection extends vscode.TreeItem {
  constructor(public readonly taskId: string, fileCount: number) {
    super('Files Changed', vscode.TreeItemCollapsibleState.Collapsed);

    this.description = `${fileCount}`;
    this.iconPath = new vscode.ThemeIcon('files');
    this.contextValue = 'files-changed-section';
  }
}
```

### Step 2: Update TaskTreeProvider

Add ShadowManager to constructor:
```typescript
constructor(
  private fileWatcher: CockpitFileWatcher,
  private shadowManager: ShadowManager
) {
  // ... existing code
}
```

Update `getTaskChildren` to include files section:
```typescript
private async getTaskChildren(task: TaskItem): Promise<TreeItemType[]> {
  const items: TreeItemType[] = [];

  // Existing: Work items
  if (task.task.workItems && task.task.workItems.length > 0) {
    for (const wi of task.task.workItems) {
      items.push(new WorkItemNode(wi));
    }
  }

  // NEW: Files Changed section
  const shadows = await this.shadowManager.getShadowsForTask(task.taskId);
  if (shadows.length > 0) {
    items.push(new FilesChangedSection(task.taskId, shadows.length));
  }

  // Existing: Events (last 10)
  const events = await this.fileWatcher.readTaskEvents(task.taskId);
  if (events.length > 0) {
    for (const event of events.slice(-10)) {
      items.push(new EventItem(
        event.id,
        event.tool,
        (event.input as { file_path?: string }).file_path || 'unknown',
        event.timestamp,
        event
      ));
    }
  }

  return items;
}
```

Add handler for FilesChangedSection children:
```typescript
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

  // NEW: Handle FilesChangedSection
  if (element instanceof FilesChangedSection) {
    return this.getFilesForTask(element.taskId);
  }

  return [];
}

private async getFilesForTask(taskId: string): Promise<ShadowFileItem[]> {
  const shadows = await this.shadowManager.getShadowsForTask(taskId);
  const items: ShadowFileItem[] = [];

  for (const shadow of shadows) {
    const syncStatus = await this.shadowManager.checkSyncStatus(shadow);
    items.push(new ShadowFileItem(shadow, syncStatus));
  }

  // Sort: modified first, then by filename
  items.sort((a, b) => {
    if (a.syncStatus !== b.syncStatus) {
      if (a.syncStatus === 'user-modified') return -1;
      if (b.syncStatus === 'user-modified') return 1;
    }
    return a.shadow.meta.filePath.localeCompare(b.shadow.meta.filePath);
  });

  return items;
}
```

### Step 3: Update type union

Update the TreeItemType:
```typescript
type TreeItemType = SectionItem | TaskItem | EventItem | WorkItemNode | FilesChangedSection | ShadowFileItem;
```

### Step 4: Update extension.ts

Pass ShadowManager to TaskTreeProvider:
```typescript
taskTreeProvider = new TaskTreeProvider(fileWatcher, shadowManager);
```

### Step 5: Add context menu items

**File**: `vscode-extension/package.json`

Add to `contributes.menus.view/item/context`:
```json
{
  "command": "aiCockpit.showClaudeChanges",
  "when": "view == aiCockpit.tasks && viewItem =~ /shadow-file/",
  "group": "navigation@1"
},
{
  "command": "aiCockpit.showYourChanges",
  "when": "view == aiCockpit.tasks && viewItem == shadow-file-user-modified",
  "group": "navigation@2"
},
{
  "command": "aiCockpit.showFullDiff",
  "when": "view == aiCockpit.tasks && viewItem =~ /shadow-file/",
  "group": "navigation@3"
}
```

## Acceptance Criteria

- [ ] "Files Changed" section appears under tasks with shadows
- [ ] Shows file count in section header
- [ ] Each file shows edit count and sync status icon
- [ ] Clicking file opens Claude Changes diff
- [ ] Right-click menu shows available diff options
- [ ] Modified files sorted to top

## Testing

1. Make edits to create shadows
2. Expand task → verify "Files Changed" section
3. Verify icons: ✓ synced, ⚠ modified
4. Click file → Claude Changes diff opens
5. Edit file manually → refresh → icon changes to warning

## Notes

- Tree view refreshes on file watcher events
- Consider adding auto-refresh when shadows change
