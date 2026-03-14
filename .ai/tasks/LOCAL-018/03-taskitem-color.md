---
type: work-item
id: "03"
parent: LOCAL-018
title: Apply task color to TaskItem icons
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Apply Task Color to TaskItem Icons

## Objective

Update TaskItem class to use the task's custom color for its icon, falling back to status-based colors when no custom color is set.

## Pre-Implementation

Review TaskItem class in TaskTreeProvider.ts (lines 388-434) to understand current icon/color logic.

## Implementation Steps

### Step 1: Update TaskItem Constructor

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

**Instructions**:
Add color parameter to TaskItem constructor:

```typescript
class TaskItem extends vscode.TreeItem {
  constructor(
    public readonly taskId: string,
    public readonly title: string,
    public readonly status: 'todo' | 'in_progress' | 'done',
    public readonly progress: { done: number; total: number },
    public readonly taskColor?: TaskColor  // Add this parameter
  ) {
    // ... existing constructor logic
  }
}
```

### Step 2: Modify Icon Color Logic

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

**Instructions**:
Update the icon color assignment to prioritize task color:

```typescript
// Current logic (around line 410-421):
let iconColor: vscode.ThemeColor | undefined;
if (this.status === 'in_progress') {
  iconColor = new vscode.ThemeColor('charts.green');
} else if (this.status === 'todo') {
  iconColor = new vscode.ThemeColor('charts.yellow');
} else {
  iconColor = new vscode.ThemeColor('charts.blue');
}

// New logic - task color takes precedence:
let iconColor: vscode.ThemeColor | undefined;
if (this.taskColor) {
  // Use custom task color
  iconColor = new vscode.ThemeColor(this.taskColor);
} else {
  // Fall back to status-based color
  if (this.status === 'in_progress') {
    iconColor = new vscode.ThemeColor('charts.green');
  } else if (this.status === 'todo') {
    iconColor = new vscode.ThemeColor('charts.yellow');
  } else {
    iconColor = new vscode.ThemeColor('charts.blue');
  }
}
```

### Step 3: Store Color for Session Lookup

**Instructions**:
Ensure the taskColor is accessible for SessionItem to look up. Options:
- Pass via context value
- Store in a Map<taskId, color> at provider level
- Add method to TaskTreeProvider to get task color by ID

Recommended approach - add to provider:
```typescript
private taskColors: Map<string, TaskColor> = new Map();

// When creating TaskItem:
if (taskColor) {
  this.taskColors.set(taskId, taskColor);
}

// Public method for SessionItem:
public getTaskColor(taskId: string): TaskColor | undefined {
  return this.taskColors.get(taskId);
}
```

## Acceptance Criteria

- [ ] TaskItem accepts optional color in constructor
- [ ] Custom color overrides status-based color when present
- [ ] Status-based fallback works when no custom color
- [ ] Task color is accessible for session inheritance (next work item)

## Testing

1. Add `color: charts.purple` to a task's status.yaml
2. Reload VSCode window
3. Verify task icon shows purple color instead of status color
4. Verify tasks without color still show status-based colors

## Notes

Keep the icon shape (play-circle, circle-outline, check-all) based on status - only change the color.
