<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 08-refactor-rollback-to-use-cancel-peo-contract.md   ║
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

# Refactor CreateContractStep Rollback to Use cancelPEOContract

## Context / Why This Change

The previous approach attempted to soft-delete the contract using `Contract.destroy()`, which fails due to FK constraints from the `employment.employments` table. Even after ending the employment, other FK constraints may still block deletion.

**New approach**: Use `peoContractService.cancelPEOContract()` which:
- Sets contract status to `CANCELLED` (no deletion, no FK issues)
- Properly ends employment via `cancelEmploymentOnContractDeactivation()`
- Removes employment from payroll cycles
- Cancels associated transitions
- Saves work records sidecar
- Publishes employment events

This matches the behavior of the `/admin/peo/contracts/:contractOid/cancel` endpoint.

## Objective

Replace `Contract.destroy()` with `peoContractService.cancelPEOContract()` in the CreateContractStep rollback method.

## Pre-Implementation

Read these files for context:
- `backend/services/peo/peo_contract_service.ts:3520-3595` - cancelPEOContract implementation
- `backend/services/peo/peo_contract_service.ts:4141-4210` - cancelEmploymentOnContractDeactivation
- `backend/services/peo/entity_transfer/steps/create_contract_step.ts:500-661` - current rollback

## Implementation Steps

### Step 1: Add import for peoContractService

**File**: `backend/services/peo/entity_transfer/steps/create_contract_step.ts`

Add at top of file:
```typescript
import {peoContractService} from '@/services/peo/peo_contract_service';
```

### Step 2: Remove manual EMSEmploymentsService call

**File**: `backend/services/peo/entity_transfer/steps/create_contract_step.ts`

Remove these lines (around 610-623) since `cancelPEOContract` handles employment termination:
```typescript
// DELETE THIS:
await EMSEmploymentsService.updateEmploymentStatus({
    contractOids: [contractOid],
    status: EMSEmploymentsService.statuses.ENDED,
});

this.log.info({
    message: '[CreateContractStep] Employment status updated to ENDED',
    contractId,
    contractOid,
});
```

### Step 3: Replace Contract.destroy() with cancelPEOContract

**File**: `backend/services/peo/entity_transfer/steps/create_contract_step.ts`

Replace:
```typescript
const contractsDeleted = await this.db.Contract.destroy({
    where: {id: contractId},
    transaction,
});
```

With:
```typescript
// Use cancelPEOContract for proper contract cancellation
// This handles: status change to CANCELLED, employment termination,
// payroll cycle removal, transition cancellation, work records, and events
await peoContractService.cancelPEOContract({
    contractOid,
    reason: `Entity transfer rollback - transfer: ${context.request.transfer.id}, item: ${context.request.item.id}`,
    transaction,
});
```

### Step 4: Update log message

**File**: `backend/services/peo/entity_transfer/steps/create_contract_step.ts`

Update the success log to reflect the new approach:
```typescript
this.log.info({
    message: '[CreateContractStep] Contract cancelled successfully during rollback',
    transferId: context.request.transfer.id,
    itemId: context.request.item.id,
    contractId,
    contractOid,
    summary: {
        contractStatus: 'CANCELLED',
        peoContractRollbackEventPublished: true,
        cancelPEOContractCalled: true,
        dependentRecordsDeleted: {
            workStatements: workStatementsDeleted,
            userContracts: userContractsDeleted,
            onboardingSteps: onboardingStepsDeleted,
            actionEvents: actionEventsDeleted,
            guarantees: guaranteesDeleted,
        },
    },
});
```

### Step 5: Remove EMSEmploymentsService import if no longer needed

Check if `EMSEmploymentsService` is used elsewhere in the file. If only used in rollback, remove the import.

## Post-Implementation

Run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] `peoContractService.cancelPEOContract` is called instead of `Contract.destroy()`
- [ ] Manual `EMSEmploymentsService.updateEmploymentStatus` call is removed
- [ ] Log messages accurately reflect the new behavior
- [ ] Existing dependent record deletions (WorkStatements, UserContracts, etc.) are preserved
- [ ] `ENTITY_TRANSFER_CONTRACT_ROLLBACK` event is still published for PEO service cleanup

## Testing

1. Run unit tests: `npm test -- --grep "CreateContractStep"`
2. Deploy to Giger and trigger entity transfer rollback
3. Verify contract status is `CANCELLED` (not deleted)
4. Verify employment is `ENDED`
5. Verify no FK constraint errors

## Notes

- The `isCancellationAllowed` check in `cancelPEOContract` validates the contract isn't active. For entity transfer, contracts should be in ONBOARDING status, so this should pass.
- Keep the `ENTITY_TRANSFER_CONTRACT_ROLLBACK` event since `CONTRACT_TERMINATION` doesn't clean up `peo_contracts` in the PEO service.
- The dependent record deletions (WorkStatements, etc.) are still needed since `cancelPEOContract` doesn't delete these.
