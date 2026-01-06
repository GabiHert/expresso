<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-uuid-detection-start-session.md                    ║
║ TASK: LOCAL-024                                                  ║
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

# Add UUID Detection to startSession Command

## Objective

Modify the `aiCockpit.startSession` command to detect when a user pastes a UUID instead of a label, and import the session as unassigned instead of creating a new one.

## Pre-Implementation

Review the current command implementation at `extension.ts:969-1034`. This is very similar to work item 02, but for unassigned sessions.

## Implementation Steps

### Step 1: Update InputBox placeholder

**File**: `vscode-extension/src/extension.ts`

**Location**: Line 973-976 (the showInputBox call in startSession command)

**Current**:
```typescript
const label = await vscode.window.showInputBox({
  prompt: 'Session label (optional)',
  placeHolder: 'e.g., Exploration, Research, Debugging'
});
```

**Change to**:
```typescript
const input = await vscode.window.showInputBox({
  prompt: 'Session label or existing session ID',
  placeHolder: 'e.g., Exploration, or paste a session UUID to import'
});
```

### Step 2: Add UUID detection logic

**Location**: After the InputBox call (around line 978-984)

**Current flow**:
```typescript
if (label === undefined) {
  return;
}
// ... continues to create terminal
```

**New flow**:
```typescript
if (input === undefined) {
  return;
}

// Check if input is a UUID - import existing session as unassigned
if (UUID_REGEX.test(input)) {
  if (!sessionManager) {
    vscode.window.showErrorMessage('Session manager not initialized');
    return;
  }

  const imported = await sessionManager.importSession(input, '_unassigned');
  taskTreeProvider?.refresh();
  vscode.window.showInformationMessage(
    `Session ${input.substring(0, 8)}... imported as unassigned`
  );
  return;
}

// Not a UUID - treat as label and continue with existing flow
const label = input || `Session ${new Date().toLocaleTimeString()}`;
// ... rest of terminal creation code
```

### Step 3: Update variable references

Make sure any references to `label` after the InputBox use the new variable name or the derived `label` constant.

## Acceptance Criteria

- [ ] InputBox placeholder mentions UUID support
- [ ] Pasting a UUID imports the session as unassigned
- [ ] Typing a label creates a new unassigned session (existing behavior)
- [ ] Success message shows for imported sessions
- [ ] Tree view refreshes after import
- [ ] Imported session appears in "Unassigned Sessions" section

## Testing

1. Click "+" in the tree view header (or on Unassigned Sessions section)
2. Paste a valid UUID
3. Verify session appears under "Unassigned Sessions"
4. Verify session can be linked to a task via "Link to Task" command
5. Click "+" again, type "Research"
6. Verify new terminal opens and unassigned session is captured

## Notes

- Unassigned sessions use taskId `_unassigned` (special marker)
- The UUID_REGEX constant should already exist from work item 02
- Consider extracting the UUID detection logic into a helper function if the duplication is bothersome (optional refactor)
