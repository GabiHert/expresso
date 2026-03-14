---
type: work-item
id: "05"
parent: LOCAL-018
title: Add color picker to /task-create flow
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

> Parent: [[LOCAL-018]]


# Add Color Picker to /[[task-create]] Flow

## Objective

Update the /[[task-create]] command to offer a color selection step, allowing users to assign a color when creating new tasks.

## Pre-Implementation

Review the /[[task-create]] command in `.ai/_framework/commands/task-create.md`.

## Implementation Steps

### Step 1: Add Color Selection Step

**File**: `.ai/_framework/commands/task-create.md`

**Instructions**:
Add a new step after "Confirm with User" (Step 6) to offer color selection:

```markdown
### Step 6b: Select Task Color (Optional)

Ask the user to optionally select a color for the task:

```
TASK COLOR (optional)

Select a color for this task to help identify it and its sessions:

  1. Red      (charts.red)
  2. Orange   (charts.orange)
  3. Yellow   (charts.yellow)
  4. Green    (charts.green)
  5. Blue     (charts.blue)
  6. Purple   (charts.purple)
  7. None     (use default status-based colors)

Choice (1-7, default: 7):
```

Store the selected color for use in status.yaml generation.
```

### Step 2: Update status.yaml Template

**File**: `.ai/_framework/commands/task-create.md`

**Instructions**:
Update the status.yaml template in Step 7d to include the color field:

```yaml
# Task Status Index
task: "{ticket-id}"
title: "{title}"
color: "{selected-color}"  # Add this line (omit if None selected)
created: "{YYYY-MM-DD}"
updated: "{YYYY-MM-DD}"
```

### Step 3: Update Task README Template

**File**: `.ai/_framework/commands/task-create.md`

**Instructions**:
Optionally show the assigned color in the task README:

```markdown
# {ticket-id}: {title}

**Color**: {color-name} (or "Default" if none)

## Problem Statement
...
```

### Step 4: Color Display Names

**Instructions**:
Use friendly display names in the picker:

| ThemeColor Token | Display Name |
|-----------------|--------------|
| charts.red | Red |
| charts.orange | Orange |
| charts.yellow | Yellow |
| charts.green | Green |
| charts.blue | Blue |
| charts.purple | Purple |

## Acceptance Criteria

- [ ] /[[task-create]] prompts for optional color selection
- [ ] Selected color is written to status.yaml
- [ ] "None" option skips color (uses default behavior)
- [ ] Color is displayed in task creation summary

## Testing

1. Run `/task-create LOCAL-TEST "Test task"`
2. When prompted, select a color (e.g., Purple)
3. Verify status.yaml contains `color: charts.purple`
4. Run again and select "None"
5. Verify status.yaml has no color field

## Notes

Keep this step optional and quick - default to "None" if user presses Enter without selection.
