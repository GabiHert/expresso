<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 11-add-hard-delete-after-cancel.md                   ║
║ TASK: EEXPR-90                                                   ║
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
# Repository Context (EEXPR-90)
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: EEXPR-90-fix-rollback-null
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Add Hard Delete After Cancel in Rollback

## Objective

After `cancelPEOContract()` succeeds, attempt to hard delete the contract using `contract.destroy()`. If the hard delete fails due to FK constraints, fall back to leaving the contract in CANCELLED status.

## Background

Currently the rollback:
1. Calls `cancelPEOContract()` → sets status to CANCELLED, ends employment
2. Contract record remains in DB (CANCELLED status)

The `/admin/peo/contracts/:oid/delete` endpoint shows that after cancellation, hard delete is possible:
1. `cancelEmploymentOnContractDeactivation()` ends employment (already done by cancelPEOContract)
2. `contract.destroy()` hard deletes the record

## Pre-Implementation

Review:
- `services/peo/peo_contract_service.ts:3597-3672` - `deletePEOContractWithReason()` logic
- `services/peo/entity_transfer/steps/create_contract_step.ts` - current rollback logic

## Implementation Steps

### Step 1: Add hard delete attempt after cancelPEOContract

**File**: `services/peo/entity_transfer/steps/create_contract_step.ts`

After the `cancelPEOContract()` call (around line 617), add:

```typescript
// Attempt hard delete after successful cancellation
// This removes the contract record entirely instead of leaving it as CANCELLED
try {
    await this.db.Contract.destroy({
        where: { id: contractId },
        transaction,
    });

    this.log.info({
        message: '[CreateContractStep] Contract hard deleted during rollback',
        contractId,
        contractOid,
    });
} catch (deleteError) {
    // FK constraint or other error - contract remains CANCELLED
    this.log.warn({
        message: '[CreateContractStep] Hard delete failed, contract remains CANCELLED',
        contractId,
        contractOid,
        error: (deleteError as Error).message,
    });
}
```

### Step 2: Update the success log to reflect actual state

Update the success log (around line 619-637) to indicate whether the contract was deleted or just cancelled.

### Step 3: Handle the context clearing

Since the contract is now deleted (not just cancelled), we should clear the context:

```typescript
// Clear context since contract is deleted
context.contracts.new = undefined;
```

Wait - this conflicts with the previous change where we kept the context for audit trail.

**Decision needed**: If hard delete succeeds, should we:
- A) Clear context (contract no longer exists)
- B) Keep context (for response audit trail, even though contract is deleted)

Recommend B: Keep context so API response shows `newContractOid` - useful for debugging even if contract is deleted.

## Acceptance Criteria

- [ ] After `cancelPEOContract()`, attempt `contract.destroy()`
- [ ] If hard delete succeeds, log success
- [ ] If hard delete fails (FK constraint), log warning and continue
- [ ] Contract is either hard deleted OR remains CANCELLED
- [ ] `newContractOid` still appears in API response for audit

## Testing

1. Run unit tests for rollback
2. Test in Giger - verify contract is hard deleted
3. If hard delete fails, verify contract remains CANCELLED

## Notes

- `cancelPEOContract()` already calls `cancelEmploymentOnContractDeactivation()` which ends employment
- This should clear the FK constraint from `employments` table
- Other FK constraints may still exist - hence the try/catch fallback
