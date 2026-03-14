---
type: work-item
id: "04"
parent: LOCAL-018
title: Inherit color in SessionItem display
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Inherit Color in SessionItem Display

## Objective

Update SessionItem to inherit and display the parent task's color, making it easy to visually associate sessions with their tasks.

## Pre-Implementation

Review SessionItem class in TaskTreeProvider.ts (lines 627-670) to understand current styling.

## Implementation Steps

### Step 1: Pass Provider Reference to SessionItem

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

**Instructions**:
SessionItem needs access to the provider to look up task colors. Modify constructor:

```typescript
class SessionItem extends vscode.TreeItem {
  constructor(
    public readonly session: CockpitSession,
    private readonly provider: TaskTreeProvider  // Add this
  ) {
    // ... existing logic
  }
}
```

### Step 2: Update SessionItem Icon Color

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

**Instructions**:
Modify the icon color logic in SessionItem to use inherited task color:

```typescript
// Current logic (around lines 638-643):
if (this.session.status === 'active') {
  this.iconPath = new vscode.ThemeIcon('circle-filled',
    new vscode.ThemeColor('charts.green'));
} else {
  this.iconPath = new vscode.ThemeIcon('circle-outline');
}

// New logic - inherit task color:
const taskColor = this.provider.getTaskColor(this.session.taskId);

if (this.session.status === 'active') {
  const color = taskColor
    ? new vscode.ThemeColor(taskColor)
    : new vscode.ThemeColor('charts.green');
  this.iconPath = new vscode.ThemeIcon('circle-filled', color);
} else {
  // Closed sessions: use faded task color or default outline
  if (taskColor) {
    this.iconPath = new vscode.ThemeIcon('circle-outline',
      new vscode.ThemeColor(taskColor));
  } else {
    this.iconPath = new vscode.ThemeIcon('circle-outline');
  }
}
```

### Step 3: Update SessionItem Creation

**Instructions**:
Where SessionItem instances are created, pass the provider reference:

```typescript
// In getChildren() or wherever sessions are created:
new SessionItem(session, this)  // 'this' is the TaskTreeProvider
```

### Step 4: Handle Unassigned Sessions

**Instructions**:
Unassigned sessions (taskId = "_unassigned") should retain default styling:

```typescript
const taskColor = this.session.taskId !== UNASSIGNED_TASK_ID
  ? this.provider.getTaskColor(this.session.taskId)
  : undefined;
```

## Acceptance Criteria

- [ ] Sessions under colored tasks show the task's color
- [ ] Active sessions use filled circle with task color
- [ ] Closed sessions use outline with task color
- [ ] Unassigned sessions retain default styling
- [ ] Sessions under uncolored tasks use default green/outline

## Testing

1. Create a task with `color: charts.purple`
2. Start a session for that task
3. Verify session icon is purple filled circle
4. Close the session
5. Verify closed session is purple outline
6. Verify unassigned sessions are still default styled

## Notes

The visual hierarchy should be clear: task color → session inherits → terminal tab (next work item).
