<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/done/LOCAL-018/                              ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)           ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                  ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-018: Add Task Color Support

## Problem Statement

When multitasking with multiple concurrent tasks, it's difficult to visually distinguish which sessions belong to which tasks. Adding color support to tasks - where sessions inherit their parent task's color - would make it easier to identify and switch between different work contexts.

## Acceptance Criteria

- [ ] Tasks can have an optional color from a predefined palette (charts.red, charts.orange, charts.yellow, charts.green, charts.blue, charts.purple)
- [ ] Task TreeView items display with their assigned color (overriding status-based colors)
- [ ] Sessions inherit and display their parent task's color
- [ ] New tasks prompt for optional color selection during creation
- [ ] Terminal tabs reflect task color for easy identification
- [ ] Unassigned sessions retain default styling

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Add color property to Task types | vscode-extension | todo |
| 02 | Update status.yaml parsing for color | vscode-extension | todo |
| 03 | Apply task color to TaskItem icons | vscode-extension | todo |
| 04 | Inherit color in SessionItem display | vscode-extension | todo |
| 05 | Add color picker to /task-create flow | ai-framework | todo |
| 06 | Terminal tab color support | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| ai-framework | `feature/task-colors` |

## Technical Context

### Current Color System

The extension uses VSCode's `ThemeColor` API for semantic colors:
- `TaskTreeProvider.ts:378-382` - Status-based color mapping
- Colors: `charts.green` (in_progress), `charts.yellow` (todo), `charts.blue` (done)

### Key Files

- `vscode-extension/src/types/index.ts:27-32` - Task interface
- `vscode-extension/src/providers/TaskTreeProvider.ts:388-434` - TaskItem class
- `vscode-extension/src/providers/TaskTreeProvider.ts:627-670` - SessionItem class
- `vscode-extension/src/services/SessionManager.ts` - Session registry

### Available ThemeColor Palette

```typescript
const TASK_COLORS = [
  'charts.red',
  'charts.orange',
  'charts.yellow',
  'charts.green',
  'charts.blue',
  'charts.purple',
  'charts.foreground', // neutral/default
];
```

## Implementation Approach

1. **Types First**: Add optional `color?: string` to Task interface
2. **Data Layer**: Parse color from `status.yaml` when loading tasks
3. **Display Layer**: TaskItem uses task.color if set, else falls back to status color
4. **Inheritance**: SessionItem looks up parent task's color via taskId
5. **Creation**: Update `/task-create` command to offer color picker
6. **Terminals**: Apply color via `createTerminal()` options

## Risks & Considerations

- VSCode ThemeColor is limited to predefined tokens; custom hex colors won't work for TreeItem icons
- Terminal tab coloring uses different API than TreeView colors
- Need to handle undefined/null colors gracefully (fallback to status-based)

## Testing Strategy

- Manually verify colors display correctly in TreeView
- Test with light and dark themes
- Verify session inheritance works for existing and new sessions
- Test terminal tab colors reflect task color

## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.

## References

- VSCode ThemeColor API: https://code.visualstudio.com/api/references/theme-color
- TreeItem iconPath with ThemeIcon: https://code.visualstudio.com/api/references/vscode-api#ThemeIcon
