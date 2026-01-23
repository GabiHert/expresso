<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-95-2-update-execute-entity-transfer.md         ║
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

# Update executeEntityTransfer to Update Transfer Status

## Objective

Modify the `executeEntityTransfer()` method to update the parent transfer's status after updating the item status. This ensures transfers don't remain stuck in PENDING_SIGNATURES when their items have completed.

## Pre-Implementation

Before starting:
- Ensure EEXPR-95-1 is completed (determineTransferStatus helper method exists)
- Read `backend/controllers/admin/peo/tech_ops.ts:417-500` - Current implementation
- Read `backend/services/peo/entity_transfer/repositories/entity_transfer_repository.ts:58-128` - Repository methods available

## Implementation Steps

### Step 1: Locate the insertion point

**File**: `backend/controllers/admin/peo/tech_ops.ts`

**Method**: `executeEntityTransfer()` (lines 417-500)

**Current code** (around lines 438-442):
```typescript
if (result.success) {
    await repository.updateTransferItemStatus(itemId, TransferItemStatus.COMPLETED);
} else {
    await repository.updateTransferItemStatus(itemId, TransferItemStatus.FAILED);
}
```

### Step 2: Add transfer status update logic

**Instructions**:
After the item status update (after line 442, before line 444), add the following code:

```typescript
// Update transfer status based on all item statuses
try {
    const updatedTransfer = await repository.loadTransferWithItems(transferId);
    if (updatedTransfer) {
        const finalStatus = this.determineTransferStatus(updatedTransfer);
        await repository.updateTransferStatus(transferId, finalStatus);

        log.info('[TechOps] Transfer status updated after item execution', {
            transferId,
            itemId,
            itemStatus: result.status,
            transferStatus: finalStatus,
            totalItems: updatedTransfer.items?.length || 0,
        });
    } else {
        log.error('[TechOps] Could not load transfer to update status', {
            transferId,
            itemId,
        });
    }
} catch (error) {
    // Log but don't fail the request - item was already processed successfully
    log.error('[TechOps] Failed to update transfer status', {
        transferId,
        itemId,
        error: error instanceof Error ? error.message : String(error),
    });
}
```

### Step 3: Verify repository method exists

**File**: `backend/services/peo/entity_transfer/repositories/entity_transfer_repository.ts`

**Check**: Verify these methods exist:
- `loadTransferWithItems(transferId)` - Should be around line 109-128
- `updateTransferStatus(transferId, status)` - Should be around line 58-65

If methods have different names, adjust the code accordingly.

### Step 4: Update response to include transfer status

**File**: `backend/controllers/admin/peo/tech_ops.ts`

**Current response** (around lines 453-476): The response already includes transfer context, but we should ensure the updated status is reflected.

**Optional enhancement**: Add `transferStatus` to the response object around line 455:
```typescript
return {
    success: result.success,
    transferId: transfer.id,
    transferStatus: transfer.status,  // Add this line
    itemId: item.id,
    status: result.status,
    // ... rest of response
};
```

This is optional but helpful for API consumers to see the updated status.

## Post-Implementation

After completing:
1. Verify the code compiles without errors
2. Test manually with tech ops endpoint
3. Check logs to verify transfer status updates are logged
4. Verify no regressions in existing functionality

## Acceptance Criteria

- [ ] Transfer status update logic added after item status update
- [ ] Logic calls `loadTransferWithItems()` to get current state
- [ ] Logic calls `determineTransferStatus()` helper method (from EEXPR-95-1)
- [ ] Logic calls `updateTransferStatus()` to persist final status
- [ ] Appropriate logging added for success and error cases
- [ ] Error handling wraps the status update in try-catch to prevent item execution failures from affecting status update
- [ ] Code compiles without errors
- [ ] (Optional) Response includes transfer status for API consumers

## Testing

Manual testing steps:

### Test Case 1: Single item completes successfully
1. Execute transfer via tech ops endpoint
2. Verify item status updates to COMPLETED
3. Verify transfer status updates to COMPLETED
4. Check logs for status update message

### Test Case 2: Single item fails
1. Execute transfer that will fail (invalid data)
2. Verify item status updates to FAILED
3. Verify transfer status updates to FAILED
4. Check logs for status update message

### Test Case 3: Item waiting for resources
1. Execute transfer that halts (missing resource)
2. Verify item status updates to WAITING_FOR_RESOURCES
3. Verify transfer status updates to SCHEDULED
4. Check logs for "waiting for resources" message

### Test Case 4: Multiple items (if applicable)
1. Create transfer with multiple items
2. Execute first item successfully
3. Verify transfer status reflects current state
4. Execute second item (failure or success)
5. Verify transfer status reflects aggregated state

## Notes

- The transfer status update is wrapped in try-catch because item execution already succeeded - we don't want status update failures to make the entire request fail
- The logic loads the complete transfer with all items to ensure we're determining status based on ALL items, not just the one that was executed
- This approach handles both single-item and multi-item transfers correctly
- The repository method `updateTransferStatus()` calls the PEO microservice, so network errors are possible - hence the try-catch
