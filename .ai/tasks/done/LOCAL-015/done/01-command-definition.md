<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-command-definition.md                              ║
║ TASK: LOCAL-015                                                  ║
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
