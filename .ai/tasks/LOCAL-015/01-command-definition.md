---
type: work-item
id: "01"
parent: LOCAL-015
title: Add deleteTask command definition
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-015]]


# Add deleteTask Command Definition

## Objective

Register the `aiCockpit.deleteTask` command in package.json so it can be invoked from the extension.

## Implementation Steps

### Step 1: Add command to contributes.commands

**File**: `vscode-extension/package.json`

**Instructions**:
Add the deleteTask command definition in the `contributes.commands` array (around line 117):

```json
{
  "command": "aiCockpit.deleteTask",
  "title": "Delete Task",
  "icon": "$(trash)"
}
```

## Acceptance Criteria

- [ ] Command `aiCockpit.deleteTask` is defined in package.json
- [ ] Command has appropriate title "Delete Task"
- [ ] Command has trash icon for visual consistency

## Testing

Run `npm run compile` in vscode-extension to verify no JSON syntax errors.

## Notes

This is a foundational step - the command won't do anything yet until we implement it in extension.ts.
