---
type: work-item
id: "01"
parent: LOCAL-012
title: Add UNASSIGNED_TASK_ID constant
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-012]]


# Add UNASSIGNED_TASK_ID Constant

## Objective

Add a constant for the special taskId value used by unassigned sessions, centralizing this magic string.

## Implementation Steps

### Step 1: Add constant and helper to types/index.ts

**File**: `src/types/index.ts`

Add at the top of the file:

```typescript
export const UNASSIGNED_TASK_ID = '_unassigned';

export function isUnassignedSession(session: CockpitSession): boolean {
  return session.taskId === UNASSIGNED_TASK_ID;
}
```

## Acceptance Criteria

- [ ] `UNASSIGNED_TASK_ID` constant exported from types
- [ ] `isUnassignedSession()` helper function available
- [ ] No hardcoded `"_unassigned"` strings elsewhere
