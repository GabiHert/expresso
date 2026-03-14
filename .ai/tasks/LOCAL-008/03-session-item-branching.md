---
type: work-item
id: "03"
parent: LOCAL-008
title: Fix SessionItem click handler branching
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Fix SessionItem Click Handler Branching

## Objective

Update SessionItem to use different commands based on session status:
- Active sessions → focusSession (focus existing terminal)
- Closed sessions → resumeSession (create new terminal and resume)

## Pre-Implementation

After work items 01 and 02:
- focusSession command exists for active sessions
- resumeSession command exists for closed sessions
- Currently SessionItem always uses resumeSession

## Implementation Steps

### Step 1: Update SessionItem Command Binding

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

**Instructions**:
Find the SessionItem class (around line 482) and update the command property:

Current code:
```typescript
// Click to resume session
this.command = {
  command: 'aiCockpit.resumeSession',
  title: 'Resume Session',
  arguments: [session]
};
```

Replace with:
```typescript
// Click behavior depends on session status
if (session.status === 'active') {
  this.command = {
    command: 'aiCockpit.focusSession',
    title: 'Focus Session',
    arguments: [session]
  };
} else {
  this.command = {
    command: 'aiCockpit.resumeSession',
    title: 'Resume Session',
    arguments: [session]
  };
}
```

### Step 2: Update Context Menu

**File**: `vscode-extension/package.json`

**Instructions**:
Add focusSession to context menu for active sessions:

Find the menus section and add:
```json
{
  "command": "aiCockpit.focusSession",
  "when": "view == aiCockpit.tasks && viewItem == session-active",
  "group": "inline"
}
```

Keep the existing resumeSession for closed sessions:
```json
{
  "command": "aiCockpit.resumeSession",
  "when": "view == aiCockpit.tasks && viewItem == session-closed",
  "group": "inline"
}
```

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Active sessions use focusSession command
- [ ] Closed sessions use resumeSession command
- [ ] Context menus show appropriate icons/commands
- [ ] Click behavior is correct for both states

## Testing

1. Open a task terminal → session shows active (green)
2. Click the active session → terminal focuses (no new terminal)
3. Close the terminal → session shows closed (gray)
4. Click the closed session → new terminal opens with `claude --resume`

## Notes

- This is the key behavioral fix that routes clicks to the correct handler
- The session object already contains all needed data (id, taskId, terminalId, status)
