<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-sessions-ui.md                                     ║
║ TASK: LOCAL-006                                                  ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Sessions Section in TaskTreeProvider

## Objective

Add a "Sessions" collapsible section under each task showing active and closed sessions.

## UI Design

```
▼ LOCAL-001 (3/3)
  ▼ Sessions (2)
      ● Session A - Main work        [active]
      ○ Session B - Bug investigation [closed]
  ▼ Files Changed (5)
      ...
```

## Implementation Steps

### Step 1: Create SessionsSection TreeItem

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

```typescript
class SessionsSection extends vscode.TreeItem {
  constructor(
    public readonly taskId: string,
    public readonly sessionCount: number
  ) {
    super('Sessions', vscode.TreeItemCollapsibleState.Collapsed);
    this.description = `${sessionCount}`;
    this.iconPath = new vscode.ThemeIcon('terminal');
    this.contextValue = 'sessions-section';
  }
}
```

### Step 2: Create SessionItem TreeItem

```typescript
class SessionItem extends vscode.TreeItem {
  constructor(public readonly session: CockpitSession) {
    super(session.label, vscode.TreeItemCollapsibleState.None);

    this.description = session.status;

    // Icon: green dot for active, gray for closed
    this.iconPath = session.status === 'active'
      ? new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'))
      : new vscode.ThemeIcon('circle-outline');

    // Click to resume
    this.command = {
      command: 'aiCockpit.resumeSession',
      title: 'Resume Session',
      arguments: [session]
    };

    this.contextValue = `session-${session.status}`;
    this.tooltip = `Created: ${session.createdAt}\nLast active: ${session.lastActive}`;
  }
}
```

### Step 3: Update getChildren for TaskItem

```typescript
async getChildren(element?: TreeItem): Promise<TreeItem[]> {
  if (element instanceof TaskItem) {
    const children: TreeItem[] = [];

    // Add Sessions section
    const sessions = await sessionManager.getSessionsForTask(element.taskId);
    if (sessions.length > 0) {
      children.push(new SessionsSection(element.taskId, sessions.length));
    }

    // Add Files Changed section (existing)
    // ...

    return children;
  }

  if (element instanceof SessionsSection) {
    const sessions = await sessionManager.getSessionsForTask(element.taskId);
    return sessions.map(s => new SessionItem(s));
  }
}
```

### Step 4: Add context menu for sessions

**File**: `package.json`

```json
{
  "command": "aiCockpit.resumeSession",
  "when": "view == aiCockpit.tasks && viewItem == session-closed",
  "group": "inline"
}
```

## Acceptance Criteria

- [ ] Sessions section appears under tasks with sessions
- [ ] Active sessions show green icon
- [ ] Closed sessions show gray icon
- [ ] Clicking closed session triggers resume
