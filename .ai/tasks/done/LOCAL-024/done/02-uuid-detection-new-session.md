<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-uuid-detection-new-session.md                      ║
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

# Add UUID Detection to newSession Command

## Objective

Modify the `aiCockpit.newSession` command to detect when a user pastes a UUID instead of a label, and import the session instead of creating a new one.

## Pre-Implementation

Review the current command implementation at `extension.ts:875-964`.

## Implementation Steps

### Step 1: Add UUID regex constant

**File**: `vscode-extension/src/extension.ts`

**Location**: Near top of file with other constants (around line 30-50)

**Instructions**:

Add a UUID validation regex:

```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

### Step 2: Update InputBox placeholder

**File**: `vscode-extension/src/extension.ts`

**Location**: Line 895-898 (the showInputBox call in newSession command)

**Current**:
```typescript
const label = await vscode.window.showInputBox({
  prompt: 'Session label (optional)',
  placeHolder: 'e.g., Bug fix, Feature work, Testing'
});
```

**Change to**:
```typescript
const input = await vscode.window.showInputBox({
  prompt: 'Session label or existing session ID',
  placeHolder: 'e.g., Bug fix, or paste a session UUID to import'
});
```

### Step 3: Add UUID detection logic

**Location**: After the InputBox call (around line 900-905)

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

// Check if input is a UUID - import existing session instead of creating new
if (UUID_REGEX.test(input)) {
  if (!sessionManager) {
    vscode.window.showErrorMessage('Session manager not initialized');
    return;
  }

  const imported = await sessionManager.importSession(input, taskId);
  taskTreeProvider?.refresh();
  vscode.window.showInformationMessage(
    `Session ${input.substring(0, 8)}... imported to ${taskId}`
  );
  return;
}

// Not a UUID - treat as label and continue with existing flow
const label = input || `Session ${new Date().toLocaleTimeString()}`;
// ... rest of terminal creation code
```

### Step 4: Update variable references

Make sure any references to `label` after the InputBox use the new variable name or the derived `label` constant.

## Acceptance Criteria

- [ ] InputBox placeholder mentions UUID support
- [ ] Pasting a UUID imports the session
- [ ] Typing a label creates a new session (existing behavior)
- [ ] Success message shows for imported sessions
- [ ] Tree view refreshes after import

## Testing

1. Click "+" on a task's Sessions section
2. Paste a valid UUID (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
3. Verify session appears under the task
4. Verify session status is "closed"
5. Click "+" again, type "Test label"
6. Verify new terminal opens and session is captured

## Notes

- The UUID regex is case-insensitive
- Empty input still creates a new session with auto-generated label
- The imported session's taskId comes from the tree item clicked
