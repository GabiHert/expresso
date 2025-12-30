---
repo: vscode-extension
---

# Add package.json Contributions

## Objective

Declare commands and add context menu entries for unassigned sessions.

## Implementation Steps

### Step 1: Add command declarations

**File**: `package.json`

**Location**: In `contributes.commands` array

```json
{
  "command": "aiCockpit.startSession",
  "title": "Start Session",
  "icon": "$(add)"
},
{
  "command": "aiCockpit.linkSessionToTask",
  "title": "Link to Task",
  "icon": "$(link)"
}
```

### Step 2: Add menu entries for unassigned sessions section

**Location**: In `contributes.menus["view/item/context"]` array

```json
{
  "command": "aiCockpit.startSession",
  "when": "view == aiCockpit.tasks && viewItem == unassigned-sessions-section",
  "group": "inline"
}
```

### Step 3: Add context menu for linking unassigned sessions

```json
{
  "command": "aiCockpit.linkSessionToTask",
  "when": "view == aiCockpit.tasks && viewItem == session-active-unassigned",
  "group": "inline"
},
{
  "command": "aiCockpit.linkSessionToTask",
  "when": "view == aiCockpit.tasks && viewItem == session-closed-unassigned",
  "group": "inline"
}
```

### Step 4: Add rename/delete menus for unassigned sessions

```json
{
  "command": "aiCockpit.renameSession",
  "when": "view == aiCockpit.tasks && viewItem == session-active-unassigned",
  "group": "2_session@1"
},
{
  "command": "aiCockpit.renameSession",
  "when": "view == aiCockpit.tasks && viewItem == session-closed-unassigned",
  "group": "2_session@1"
},
{
  "command": "aiCockpit.deleteSession",
  "when": "view == aiCockpit.tasks && viewItem == session-active-unassigned",
  "group": "2_session@2"
},
{
  "command": "aiCockpit.deleteSession",
  "when": "view == aiCockpit.tasks && viewItem == session-closed-unassigned",
  "group": "2_session@2"
}
```

## Acceptance Criteria

- [ ] `aiCockpit.startSession` command declared
- [ ] `aiCockpit.linkSessionToTask` command declared
- [ ] "+" button appears on unassigned sessions section
- [ ] "Link to Task" button appears on unassigned session items
- [ ] Rename/delete available on unassigned sessions
