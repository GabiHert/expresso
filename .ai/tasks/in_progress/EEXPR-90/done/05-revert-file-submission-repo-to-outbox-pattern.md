<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 05-revert-file-submission-repo-to-outbox-pattern.md  ║
║ TASK: EEXPR-90                                                  ║
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

# Revert PeoFileSubmissionRepository to Outbox Event Pattern

## Objective

Revert `peo_file_submission_repository.ts` from the direct SQL DELETE approach (which fails because the backend lacks access to the PEO schema) back to the transactional outbox event pattern. This publishes an `ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK` event that the PEO service handles asynchronously.

## Context

The direct SQL approach (`DELETE FROM peo.peo_file_submissions`) was implemented in work item 03 but fails in practice because the backend database connection does not have access to the `peo` schema. The solution is to use the outbox event pattern (same as `peo_contract_repository.ts`) and rely on the executor's retry logic (work item 06) to wait for PEO to process the deletion.

## Implementation Steps

### Step 1: Add PeoTransactionalEventService dependency

**File**: `backend/services/peo/entity_transfer/repositories/peo_file_submission_repository.ts`

Add the `PeoTransactionalEventService` import and inject it as a constructor dependency (same pattern as `PeoContractRepository`).

### Step 2: Replace direct SQL with outbox event

**File**: `backend/services/peo/entity_transfer/repositories/peo_file_submission_repository.ts`

Replace the raw SQL DELETE with:
```typescript
await this.peoTransactionalEventService.createAndRelayEvent({
    eventType: PeoTransactionOutboxEventTypes.ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK,
    data: {deelContractId, transferId, itemId},
    transaction,
});
```

Reference: `peo_contract_repository.ts:41-49`

### Step 3: Update the return type

The method currently returns `Promise<number>` (deleted count). Change to `Promise<void>` since the outbox pattern doesn't return a count.

### Step 4: Update constructor injection

**File**: Where `PeoFileSubmissionRepository` is instantiated (likely in the entity transfer service or dependency injection setup).

Add the `PeoTransactionalEventService` instance to the constructor call.

## Acceptance Criteria

- [ ] `peo_file_submission_repository.ts` uses `createAndRelayEvent()` with `ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK`
- [ ] No direct SQL queries to `peo.*` tables remain
- [ ] `PeoTransactionalEventService` is properly injected
- [ ] Event type matches what `EntityTransferRollbackHandler` in PEO service expects

## Testing

- Unit test: Verify `createAndRelayEvent` is called with correct event type and data
- Verify existing PEO handler (`EntityTransferRollbackHandler.handleFileSubmissionRollback()`) processes the event correctly

## Notes

- The event type `ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK` already exists in `peo_transaction_outbox_event_types.ts`
- The PEO handler already exists: `peo/src/modules/transactional-outbox/handlers/EntityTransferRollbackHandler.ts:107-149`
- This work item MUST be completed before work item 06 (the retry logic depends on the event being published)
