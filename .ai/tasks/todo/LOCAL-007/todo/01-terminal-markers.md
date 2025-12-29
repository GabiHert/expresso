<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-terminal-markers.md                                ║
║ TASK: LOCAL-007                                                  ║
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

# Improve Session Capture with Unique Terminal Markers

## Objective

Fix the race condition where rapid terminal opens could cause session ID misattribution. Add unique markers to terminals so session capture can reliably identify which session belongs to which terminal.

## Pre-Implementation

Consider running an **exploration agent** to understand:
- How Claude's history.jsonl captures terminal environment
- Whether COCKPIT_TERMINAL_ID could be logged by Claude
- Alternative correlation methods

## Implementation Steps

### Step 1: Generate Unique Terminal ID

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
1. Generate a unique ID (UUID or timestamp-based) when creating a terminal
2. Pass it as an environment variable `COCKPIT_TERMINAL_ID`
3. Store the mapping between terminal ID and terminal name

```typescript
// Example approach
const terminalId = crypto.randomUUID();
const terminal = vscode.window.createTerminal({
  name: `Cockpit: ${taskId}`,
  env: {
    COCKPIT_TASK: taskId,
    COCKPIT_TERMINAL_ID: terminalId
  }
});
```

### Step 2: Use Terminal ID in Session Capture

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
1. Modify `captureLatestSessionId` to accept a `terminalId` parameter
2. Check if Claude's history includes environment or correlatable data
3. If Claude doesn't log terminal env, fall back to current behavior but add the terminal ID to the session record for future correlation

### Step 3: Update Session Registration

**File**: `vscode-extension/src/services/SessionManager.ts`

**Instructions**:
1. Add `terminalId` field to `CockpitSession` interface
2. Use terminalId instead of terminalName for session correlation
3. Update `closeSessionByTerminal` to use terminalId when available

### Step 4: Update Types

**File**: `vscode-extension/src/types/index.ts`

**Instructions**:
1. Add `terminalId?: string` to `CockpitSession` interface

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Each terminal has a unique identifier
- [ ] Sessions can be correlated to specific terminals
- [ ] Rapid terminal opens don't cause session misattribution
- [ ] Backward compatible with existing sessions (terminalId optional)

## Testing

1. Open 3 terminals rapidly for different tasks
2. Verify each session is registered to the correct task
3. Verify terminal close correctly marks the right session as closed
4. Test with existing sessions.json (no terminalId) to verify backward compatibility

## Notes

- Claude may not log environment variables in history.jsonl
- If not, the terminalId still helps us track which terminal opened which session locally
- Consider using VS Code's Terminal.processId as additional correlation
