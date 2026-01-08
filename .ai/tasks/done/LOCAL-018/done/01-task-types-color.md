<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-task-types-color.md                                ║
║ TASK: LOCAL-018                                                  ║
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

# Add Color Property to Task Types

## Objective

Extend the Task interface and related types to support an optional color property for visual differentiation.

## Pre-Implementation

The types are defined in `vscode-extension/src/types/index.ts`.

## Implementation Steps

### Step 1: Define Color Type

**File**: `vscode-extension/src/types/index.ts`

**Instructions**:
Add a type for valid task colors based on VSCode's ThemeColor tokens:

```typescript
export type TaskColor =
  | 'charts.red'
  | 'charts.orange'
  | 'charts.yellow'
  | 'charts.green'
  | 'charts.blue'
  | 'charts.purple';

export const TASK_COLORS: TaskColor[] = [
  'charts.red',
  'charts.orange',
  'charts.yellow',
  'charts.green',
  'charts.blue',
  'charts.purple',
];
```

### Step 2: Add Color to Task Interface

**File**: `vscode-extension/src/types/index.ts`

**Instructions**:
Add optional color property to the Task interface (around line 27-32):

```typescript
export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  events: CockpitEvent[];
  color?: TaskColor;  // Add this line
}
```

## Acceptance Criteria

- [ ] TaskColor type is exported
- [ ] TASK_COLORS array is exported for color picker usage
- [ ] Task interface has optional color property
- [ ] TypeScript compiles without errors

## Testing

Run `npm run compile` in vscode-extension directory to verify types are correct.

## Notes

The color is optional - tasks without a color will fall back to status-based coloring.
