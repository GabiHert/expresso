---
type: work-item
id: "01"
parent: LOCAL-018
title: Add color property to Task types
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-018]]


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
