---
type: work-item
id: "02"
parent: LOCAL-017
title: Refresh knownSessionIds at capture time
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Refresh knownSessionIds at Capture Time

## Objective

Update all callers of `captureLatestSessionId()` to use the new parameterless version. Remove the pre-capture session fetching since this is now handled inside the queued capture function.

## Pre-Implementation

Ensure work item 01 (capture queue) is complete first.

Review these caller locations in `extension.ts`:
- `openTaskTerminal` command (~lines 333-356)
- `newSession` command (~lines 730-760)
- `startSession` command (~lines 830-860)

## Implementation Steps

### Step 1: Update openTaskTerminal

**File**: `vscode-extension/src/extension.ts`

**Location**: `openTaskTerminal` command handler (~lines 320-392)

**Remove these lines** (around lines 333-335):
```typescript
// REMOVE:
const allSessions = await sessionManager?.getSessions() ?? [];
const knownSessionIds = new Set(allSessions.map(s => s.id));
```

**Update the capture call** (around line 356):
```typescript
// CHANGE FROM:
sessionId = await captureLatestSessionId(knownSessionIds);

// CHANGE TO:
sessionId = await captureLatestSessionId();
```

### Step 2: Update newSession

**File**: `vscode-extension/src/extension.ts`

**Location**: `newSession` command handler (~lines 690-786)

**Remove** the `knownSessionIds` pre-capture code (similar pattern).

**Update** the capture call to use no parameters.

### Step 3: Update startSession

**File**: `vscode-extension/src/extension.ts`

**Location**: `startSession` command handler (~lines 789-864)

**Remove** the `knownSessionIds` pre-capture code (similar pattern).

**Update** the capture call to use no parameters.

### Step 4: Verify no other callers

Search for any other uses of `captureLatestSessionId`:
```bash
grep -n "captureLatestSessionId" vscode-extension/src/extension.ts
```

Ensure all callers use the new parameterless signature.

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] `openTaskTerminal` no longer pre-fetches sessions
- [ ] `newSession` no longer pre-fetches sessions
- [ ] `startSession` no longer pre-fetches sessions
- [ ] All calls use `captureLatestSessionId()` with no parameters
- [ ] TypeScript compiles without errors
- [ ] No unused `knownSessionIds` variables remain

## Testing

1. `npm run compile` or `npx tsc` - should pass
2. Open task terminal - session should be captured correctly
3. Start new session - session should be captured correctly
4. Rapid task switching - sessions should be correctly assigned

## Notes

- This is the companion to work item 01
- Together, 01 and 02 constitute the complete race condition fix
- The key insight: fresh session IDs at capture time, not creation time
