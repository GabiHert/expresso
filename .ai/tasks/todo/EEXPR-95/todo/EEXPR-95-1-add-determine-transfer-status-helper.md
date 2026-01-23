<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-95-1-add-determine-transfer-status-helper.md   ║
║ TASK: EEXPR-95                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                 ║
║ 2. Update status.yaml with new status                           ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml              ║
║ 5. Update task README with any learnings                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
# Repository Context (EEXPR-95)
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: EEXPR-95-fix-transfer-status
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Add determineTransferStatus Helper Method

## Objective

Add a private helper method `determineTransferStatus()` to the `TechOpsAdminController` class that determines the final transfer status based on all item statuses within a transfer. This method will mirror the proven logic from `EntityTransferProcessor`.

## Pre-Implementation

Before starting, read:
- `backend/services/peo/entity_transfer/entity_transfer_processor.ts:96-131` - Reference implementation
- `backend/controllers/admin/peo/tech_ops.ts:365-611` - Current controller structure
- `backend/services/peo/entity_transfer/types.ts` - Type definitions

## Implementation Steps

### Step 1: Locate insertion point

**File**: `backend/controllers/admin/peo/tech_ops.ts`

**Location**: After the `handleFullPayloadMode()` method (around line 611)

Add the new private method after existing methods but before the closing class brace.

### Step 2: Add the determineTransferStatus method

**Instructions**:
Add the following method as a private method of the `TechOpsAdminController` class:

```typescript
/**
 * Determines the final transfer status based on all item statuses.
 * Mirrors logic from EntityTransferProcessor.determineTransferStatus()
 *
 * @param transfer - Transfer with items array
 * @returns Final transfer status
 */
private determineTransferStatus(transfer: PeoEmployeeTransfer): TransferStatus {
    const items = transfer.items || [];

    // Edge case: no items (shouldn't happen, but defensive)
    if (items.length === 0) {
        return TransferStatus.COMPLETED;
    }

    const completed = items.filter((i) => i.status === TransferItemStatus.COMPLETED).length;
    const failed = items.filter((i) => i.status === TransferItemStatus.FAILED).length;
    const waiting = items.filter((i) => i.status === TransferItemStatus.WAITING_FOR_RESOURCES).length;

    // If any items waiting for resources, return to SCHEDULED for retry
    if (waiting > 0) {
        log.info('[TechOps] Transfer has items waiting for resources', {
            transferId: transfer.id,
            waitingCount: waiting,
            completedCount: completed,
            failedCount: failed,
            totalItems: items.length,
        });
        return TransferStatus.SCHEDULED;
    }

    // All items completed
    if (completed === items.length) {
        return TransferStatus.COMPLETED;
    }

    // All items failed
    if (failed === items.length) {
        return TransferStatus.FAILED;
    }

    // Mix of completed and failed
    log.warn('[TechOps] Transfer completed with partial failure', {
        transferId: transfer.id,
        completedCount: completed,
        failedCount: failed,
        totalItems: items.length,
    });
    return TransferStatus.PARTIAL_FAILURE;
}
```

### Step 3: Verify imports

**File**: `backend/controllers/admin/peo/tech_ops.ts`

**Check**: Ensure the following types are imported (should already be at top of file around line 8):
- `TransferStatus`
- `TransferItemStatus`
- `PeoEmployeeTransfer`

These should already be imported from:
```typescript
import {PeoEmployeeTransfer, PeoEmployeeTransferItem, TransferItemStatus, TransferStatus} from '../../../services/peo/entity_transfer/types';
```

If not present, add this import.

## Post-Implementation

After completing:
1. Verify the method compiles without errors
2. Verify all types are properly imported
3. Run `npm run lint` in backend directory to check for linting issues

## Acceptance Criteria

- [ ] `determineTransferStatus()` method added to `TechOpsAdminController` class
- [ ] Method is private (not public)
- [ ] Method signature matches: `private determineTransferStatus(transfer: PeoEmployeeTransfer): TransferStatus`
- [ ] Logic handles all four status outcomes: COMPLETED, FAILED, PARTIAL_FAILURE, SCHEDULED
- [ ] Logic includes appropriate logging for WAITING_FOR_RESOURCES and PARTIAL_FAILURE cases
- [ ] All required types are imported
- [ ] Code compiles without errors

## Testing

This work item creates a helper method that will be tested in work item EEXPR-95-3. No immediate testing required for this step.

## Notes

- The method works on `PeoEmployeeTransfer` objects (which have an `items` array) rather than `TransferResult[]` like the processor
- The logic is identical to the processor's implementation, just adapted to work with transfer items instead of results
- This is a pure function with no side effects - it only determines status, doesn't update anything
