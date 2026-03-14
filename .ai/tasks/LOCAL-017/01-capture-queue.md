---
type: work-item
id: "01"
parent: LOCAL-017
title: Add capture queue to extension.ts
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-017]]


# Add Capture Queue to extension.ts

## Objective

Implement a sequential capture queue that ensures only one session capture runs at a time. This eliminates the race condition where concurrent captures can grab each other's session IDs.

## Pre-Implementation

Review these sections of `extension.ts`:
- Lines 246-302: Current `captureLatestSessionId()` implementation
- Lines 320-392: `openTaskTerminal` command (primary caller)
- Lines 690-786: `newSession` command
- Lines 789-864: `startSession` command

## Implementation Steps

### Step 1: Add capture queue variable

**File**: `vscode-extension/src/extension.ts`

**Location**: Before the `captureLatestSessionId` function (around line 245)

**Add**:
```typescript
// Capture queue to prevent concurrent session captures (race condition fix)
let captureQueue: Promise<string | null> = Promise.resolve(null);
```

### Step 2: Rename existing function to implementation

**File**: `vscode-extension/src/extension.ts`

**Change**: Rename `captureLatestSessionId` to `captureLatestSessionIdImpl`

```typescript
// Helper function to capture latest sessionId from Claude history with polling
const captureLatestSessionIdImpl = async (
  knownSessionIds: Set<string>
): Promise<string | null> => {
  // ... existing implementation unchanged
};
```

### Step 3: Create queued wrapper function

**File**: `vscode-extension/src/extension.ts`

**Location**: After `captureLatestSessionIdImpl`

**Add**:
```typescript
/**
 * Queued version of session capture that prevents concurrent captures.
 * This fixes the race condition where multiple terminals starting Claude
 * simultaneously could capture each other's session IDs.
 */
const captureLatestSessionId = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    captureQueue = captureQueue.then(async () => {
      // Get FRESH known sessions at capture time (not terminal creation time)
      const allSessions = await sessionManager?.getSessions() ?? [];
      const knownSessionIds = new Set(allSessions.map(s => s.id));

      console.log(`AI Cockpit: Starting queued capture, ${knownSessionIds.size} known sessions`);

      const result = await captureLatestSessionIdImpl(knownSessionIds);
      resolve(result);
      return result;
    });
  });
};
```

### Step 4: Update function signature (remove parameter)

The new `captureLatestSessionId()` takes no parameters - it fetches fresh sessions internally.

This change will require updates in Step 02 (work item 02) to remove the pre-capture session fetching from callers.

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] `captureQueue` variable exists at module level
- [ ] `captureLatestSessionIdImpl` contains original implementation
- [ ] `captureLatestSessionId` wraps impl with queue
- [ ] New function fetches fresh sessions before each capture
- [ ] Console logging shows queue operation

## Testing

1. Add console.log to verify queue behavior
2. Start two terminals rapidly, observe logs show sequential captures
3. Verify no TypeScript compilation errors

## Notes

- The queue uses promise chaining - each capture waits for previous to complete
- The queue self-cleans as promises resolve
- This is work item 01 of 02 for the core fix (02 updates callers)
