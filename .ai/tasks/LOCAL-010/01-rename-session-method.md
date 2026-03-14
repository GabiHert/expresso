---
type: work-item
id: "01"
parent: LOCAL-010
title: Add renameSession method
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-010]]


# Add renameSession Method to SessionManager

## Objective

Add a method to SessionManager that allows updating the `label` property of a session by its ID.

## Implementation Steps

### Step 1: Add renameSession method

**File**: `src/services/SessionManager.ts`

**Location**: After `closeSession` method (around line 67)

**Instructions**:

Add the following method:

```typescript
/**
 * Rename a session's display label
 */
async renameSession(sessionId: string, newLabel: string): Promise<boolean> {
  return this.updateSession(sessionId, { label: newLabel });
}
```

This follows the same pattern as `closeSession` which delegates to `updateSession`.

## Acceptance Criteria

- [ ] `renameSession(sessionId, newLabel)` method exists on SessionManager
- [ ] Method returns `true` when session is found and updated
- [ ] Method returns `false` when session is not found
- [ ] Label change persists to `sessions.json`

## Testing

1. Manually test via debug console or temporary command
2. Verify sessions.json is updated with new label
3. Verify method handles non-existent session ID gracefully

## Notes

- The `updateSession` method already handles the write lock and persistence
- No validation needed here - command layer will validate empty strings
