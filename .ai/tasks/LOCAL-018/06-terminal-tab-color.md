---
type: work-item
id: "06"
parent: LOCAL-018
title: Terminal tab color support
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Terminal Tab Color Support

## Objective

Apply the task's color to terminal tabs when launching Cockpit terminals, providing visual consistency across the tree view and terminal panel.

## Pre-Implementation

Review terminal creation in extension.ts (around lines 390, 498, 772, 846) to understand current approach.

Explore VSCode Terminal API for color options:
- `vscode.TerminalOptions.color` - ThemeColor for terminal tab

## Implementation Steps

### Step 1: Research Terminal Color API

**Instructions**:
VSCode's TerminalOptions supports a `color` property:

```typescript
interface TerminalOptions {
  name?: string;
  color?: ThemeColor;  // Terminal tab color
  // ... other options
}
```

Verify this is available in current VSCode API version.

### Step 2: Pass Task Color to Terminal Creation

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
When creating a terminal for a task, include the color:

```typescript
// Current approach:
const terminal = vscode.window.createTerminal({
  name: `Cockpit: ${taskId}`,
  env: { COCKPIT_TASK: taskId, COCKPIT_TERMINAL_ID: terminalId }
});

// New approach with color:
const taskColor = getTaskColor(taskId);  // Need to implement lookup
const terminal = vscode.window.createTerminal({
  name: `Cockpit: ${taskId}`,
  color: taskColor ? new vscode.ThemeColor(taskColor) : undefined,
  env: { COCKPIT_TASK: taskId, COCKPIT_TERMINAL_ID: terminalId }
});
```

### Step 3: Implement Task Color Lookup

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
Add a function to read task color from status.yaml:

```typescript
async function getTaskColorFromYaml(taskId: string): Promise<TaskColor | undefined> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return undefined;

  // Check all status directories
  for (const status of ['todo', 'in_progress', 'done']) {
    const statusPath = path.join(
      workspaceRoot, '.ai', 'tasks', status, taskId, 'status.yaml'
    );
    try {
      const content = await fs.promises.readFile(statusPath, 'utf-8');
      const parsed = yaml.parse(content);
      if (parsed.color && TASK_COLORS.includes(parsed.color)) {
        return parsed.color as TaskColor;
      }
    } catch {
      // File doesn't exist in this status directory, continue
    }
  }
  return undefined;
}
```

### Step 4: Update All Terminal Creation Points

**Instructions**:
Find all calls to `createTerminal()` and update:

1. `startTaskTerminal()` - Main task terminal creation
2. `resumeSession()` - Resuming existing session
3. Any other terminal creation for Cockpit

Each should look up and apply the task color.

### Step 5: Handle Unassigned Terminals

**Instructions**:
Terminals without a task (unassigned) should use default styling:

```typescript
if (taskId && taskId !== UNASSIGNED_TASK_ID) {
  const taskColor = await getTaskColorFromYaml(taskId);
  // Apply color
} else {
  // No color for unassigned
}
```

## Acceptance Criteria

- [ ] Terminals for colored tasks show the task color in the tab
- [ ] Terminal color is visible in terminal dropdown
- [ ] Unassigned terminals have default styling
- [ ] Color persists after terminal focus changes

## Testing

1. Create a task with `color: charts.purple`
2. Start a terminal for that task (`/task-start`)
3. Verify terminal tab shows purple indicator
4. Open multiple terminals for different colored tasks
5. Verify each has correct color in tab

## Notes

Terminal tab colors are rendered as a small colored bar/dot in the terminal tab. The exact styling depends on VSCode theme.

Consider edge cases:
- Resuming sessions for tasks that now have colors
- Color changes after terminal is already open (won't update)
