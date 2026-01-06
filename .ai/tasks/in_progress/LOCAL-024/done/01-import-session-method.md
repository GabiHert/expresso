<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-import-session-method.md                           ║
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

# Add importSession Method to SessionManager

## Objective

Add a convenience method `importSession()` to SessionManager that creates a CockpitSession object with a provided UUID and registers it.

## Pre-Implementation

The `registerSession()` method at line 69-80 already handles the upsert logic. We just need a wrapper that constructs the session object.

## Implementation Steps

### Step 1: Add importSession method

**File**: `vscode-extension/src/services/SessionManager.ts`

**Location**: After `registerSession()` method (around line 80)

**Instructions**:

Add the following method:

```typescript
/**
 * Import an existing session by ID.
 * Creates a closed session that can be resumed later.
 */
async importSession(
  sessionId: string,
  taskId: string,
  label?: string
): Promise<CockpitSession> {
  const session: CockpitSession = {
    id: sessionId,
    taskId,
    label: label || `Imported: ${sessionId.substring(0, 8)}...`,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    status: 'closed',
    terminalName: `Cockpit: ${taskId}`,
    terminalId: undefined
  };
  await this.registerSession(session);
  return session;
}
```

### Step 2: Verify types

Ensure `CockpitSession` is imported at the top of the file (it should already be).

## Acceptance Criteria

- [ ] `importSession()` method exists on SessionManager
- [ ] Method creates session with status 'closed'
- [ ] Method generates a sensible label when none provided
- [ ] Method returns the created session object

## Testing

1. In the extension, call `sessionManager.importSession('test-uuid', 'LOCAL-024')` from debug console
2. Verify session appears in database
3. Verify session can be resumed

## Notes

- Sessions are created as 'closed' because there's no associated terminal yet
- The `terminalId` is undefined - it will be set when the session is resumed
- Label format "Imported: abc123..." makes it clear this was an import
