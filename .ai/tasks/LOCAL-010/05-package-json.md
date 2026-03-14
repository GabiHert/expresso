---
type: work-item
id: "05"
parent: LOCAL-010
title: Add package.json contributions
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Add Package.json Command and Menu Contributions

## Objective

Declare the new commands and add context menu entries so users can access rename/delete from the session right-click menu.

## Implementation Steps

### Step 1: Add command declarations

**File**: `package.json`

**Location**: In `contributes.commands` array (after existing commands, around line 82)

**Instructions**:

Add these command declarations:

```json
{
  "command": "aiCockpit.renameSession",
  "title": "Rename Session",
  "icon": "$(edit)"
},
{
  "command": "aiCockpit.deleteSession",
  "title": "Delete Session",
  "icon": "$(trash)"
}
```

### Step 2: Add context menu entries

**File**: `package.json`

**Location**: In `contributes.menus["view/item/context"]` array (after existing session menu entries)

**Instructions**:

Add these menu contributions:

```json
{
  "command": "aiCockpit.renameSession",
  "when": "view == aiCockpit.tasks && viewItem == session-active",
  "group": "2_session@1"
},
{
  "command": "aiCockpit.renameSession",
  "when": "view == aiCockpit.tasks && viewItem == session-closed",
  "group": "2_session@1"
},
{
  "command": "aiCockpit.deleteSession",
  "when": "view == aiCockpit.tasks && viewItem == session-active",
  "group": "2_session@2"
},
{
  "command": "aiCockpit.deleteSession",
  "when": "view == aiCockpit.tasks && viewItem == session-closed",
  "group": "2_session@2"
}
```

**Explanation**:
- `view == aiCockpit.tasks` - Only show in the AI Cockpit tree view
- `viewItem == session-active` / `session-closed` - Match the context values set by SessionItem
- `group: "2_session@1"` - Groups commands together, `@1` and `@2` control order within group
- Using separate entries for active/closed (instead of regex) for clarity

### Step 3: Verify context values

**File**: `src/providers/TaskTreeProvider.ts`

**Check**: Verify `SessionItem.contextValue` is set correctly:
- Active sessions: `session-active`
- Closed sessions: `session-closed`

This should already be implemented (lines 516-527).

## Acceptance Criteria

- [ ] Commands declared in `contributes.commands`
- [ ] Menu entries added to `contributes.menus["view/item/context"]`
- [ ] Right-click on active session shows "Rename Session" and "Delete Session"
- [ ] Right-click on closed session shows "Rename Session" and "Delete Session"
- [ ] Commands appear in a separate group from inline actions (focus/resume)

## Testing

1. Reload extension in debug mode
2. Right-click active session
3. Verify context menu shows "Rename Session" and "Delete Session"
4. Right-click closed session
5. Verify same menu items appear
6. Verify menu items are grouped together, separate from other actions

## Notes

- The `$(edit)` and `$(trash)` icons are VSCode built-in Codicons
- Icons only show for inline menu items; context menu shows text only
- Using `group: "2_session"` separates from inline actions which use `group: "inline"`
