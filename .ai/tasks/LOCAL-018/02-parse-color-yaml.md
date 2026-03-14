---
type: work-item
id: "02"
parent: LOCAL-018
title: Update status.yaml parsing for color
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-018]]


# Update Status.yaml Parsing for Color

## Objective

Update the task loading logic to read the color property from status.yaml files.

## Pre-Implementation

Explore how tasks are currently loaded in TaskTreeProvider.ts to understand the parsing pattern.

## Implementation Steps

### Step 1: Locate Task Loading Logic

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

**Instructions**:
Find where status.yaml is parsed (likely in `getChildren()` or a helper method). The YAML parsing happens when building TaskItem objects.

### Step 2: Add Color Extraction

**Instructions**:
When parsing status.yaml, extract the color field:

```typescript
// In the YAML parsing section
const statusYaml = yaml.parse(statusContent);
const taskColor = statusYaml.color as TaskColor | undefined;

// Pass to TaskItem constructor
new TaskItem(taskId, title, status, progress, taskColor);
```

### Step 3: Update Status.yaml Schema

**File**: `.ai/tasks/*/status.yaml` (documentation update)

Add color field to status.yaml format. Example:

```yaml
task: "LOCAL-018"
title: "Add Task Color Support"
color: "charts.purple"  # Optional - valid values: charts.red, charts.orange, charts.yellow, charts.green, charts.blue, charts.purple
created: "2025-12-30"
```

## Acceptance Criteria

- [ ] Color is read from status.yaml when present
- [ ] Missing color defaults to undefined (not an error)
- [ ] Invalid color values are handled gracefully
- [ ] TaskItem receives color in constructor

## Testing

1. Add `color: charts.purple` to an existing task's status.yaml
2. Verify no errors in extension output
3. Verify color is passed to TaskItem (add temporary console.log)

## Notes

The YAML library should handle the color field automatically. Just need to extract and validate it.
