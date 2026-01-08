<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-remove-auto-close.md                               ║
║ TASK: LOCAL-008                                                  ║
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

# Remove Auto-Close of Other Active Sessions

## Objective

Remove the logic that automatically closes other active sessions when resuming a session. This allows multiple sessions per task to be active simultaneously.

## Pre-Implementation

The problematic code is in `extension.ts` around lines 375-386:

```typescript
// Close any existing active sessions for this terminal name (except the one we're resuming)
if (sessionManager) {
  const allSessions = await sessionManager.getSessions();
  const existing = allSessions.filter(
    s =>
      s.terminalName === `Cockpit: ${session.taskId}` &&
      s.status === 'active' &&
      s.id !== session.id
  );
  for (const existingSession of existing) {
    await sessionManager.closeSession(existingSession.id);
  }
}
```

This code was intended to prevent orphaned sessions but has the side effect of marking other legitimate active sessions as closed.

## Implementation Steps

### Step 1: Remove Auto-Close from resumeSession

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
Find the resumeSession command (around line 359) and remove the auto-close block.

Delete these lines:
```typescript
// Close any existing active sessions for this terminal name (except the one we're resuming)
if (sessionManager) {
  const allSessions = await sessionManager.getSessions();
  const existing = allSessions.filter(
    s =>
      s.terminalName === `Cockpit: ${session.taskId}` &&
      s.status === 'active' &&
      s.id !== session.id
  );
  for (const existingSession of existing) {
    await sessionManager.closeSession(existingSession.id);
  }
}
```

### Step 2: Remove Auto-Close from openTaskTerminal

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
The same pattern exists in openTaskTerminal command (around line 227-234). Remove it:

Delete:
```typescript
// Close any existing active sessions for this terminal name
if (sessionManager) {
  const existing = allSessions.filter(
    s => s.terminalName === `Cockpit: ${taskId}` && s.status === 'active'
  );
  for (const session of existing) {
    await sessionManager.closeSession(session.id);
  }
}
```

### Step 3: Remove Auto-Close from newSession

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
The same pattern exists in newSession command (around line 423-430). Remove it:

Delete:
```typescript
// Close any existing active sessions for this terminal name
if (sessionManager) {
  const existing = allSessions.filter(
    s => s.terminalName === `Cockpit: ${taskId}` && s.status === 'active'
  );
  for (const session of existing) {
    await sessionManager.closeSession(session.id);
  }
}
```

### Step 4: Make Terminal Names Unique (Optional Enhancement)

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
To help distinguish multiple terminals for the same task, include a short session ID suffix:

Instead of:
```typescript
name: `Cockpit: ${taskId}`
```

Use:
```typescript
name: `Cockpit: ${taskId} [${sessionId?.slice(0, 6) || 'new'}]`
```

This makes each terminal name unique and easier to identify.

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Auto-close logic removed from resumeSession
- [ ] Auto-close logic removed from openTaskTerminal
- [ ] Auto-close logic removed from newSession
- [ ] Multiple sessions for same task can be active simultaneously
- [ ] Each session's status is independent

## Testing

1. Open task terminal → session 1 active
2. Click "New Session" → session 2 active
3. Verify: BOTH sessions show active (green)
4. Close terminal 1 → session 1 closed, session 2 still active
5. Resume session 1 → session 1 active again, session 2 still active

## Notes

- The auto-close was likely added to prevent orphaned sessions from accumulating
- With proper terminal tracking (work item 01), we can detect closed terminals correctly
- The cleanup command (from LOCAL-007) handles old sessions
