<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-fix-file-submissions-rollback-direct-sql.md       ║
║ TASK: EEXPR-94                                                  ║
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
# Repository Context (EEXPR-94)
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: EEXPR-94-fix-replication-lag
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Fix File Submissions Rollback - Direct SQL Deletion

## Objective

Replace the async outbox event pattern in `PeoFileSubmissionRepository.deleteFileSubmissions()` with a direct raw SQL DELETE query that executes within the rollback transaction. This fixes the FK constraint violation (`peo_file_submissions_deel_contract_id_fkey`) that occurs when `CreateContractStep.rollback()` tries to delete the contract while file submissions still reference it.

## Problem

During entity transfer rollback:
1. `ShareComplianceDocumentsStep.rollback()` publishes an async outbox event (not immediate deletion)
2. `CreateContractStep.rollback()` then tries to hard-delete the contract
3. The contract deletion fails because `peo_file_submissions` records still reference it via FK

The async event pattern doesn't work for rollback because the deletion needs to happen **within the same transaction** before the contract is deleted.

## Pre-Implementation

The pattern to follow is `CopyI9DataStep.rollback()` which does direct synchronous deletion within the transaction. However, since the `PeoFileSubmission` model lives in the PEO microservice (not available in backend's `Deel.Db`), we use raw SQL instead of model `.destroy()`.

Reference pattern from `transfer_resources_service.ts:143-154`:
```typescript
await this.db.sequelize.query<ResultType>(
    `SQL QUERY`,
    {
        replacements: { param: value },
        type: this.db.Sequelize.QueryTypes.SELECT,
        transaction,
    }
);
```

## Implementation Steps

### Step 1: Modify PeoFileSubmissionRepository

**File**: `services/peo/entity_transfer/repositories/peo_file_submission_repository.ts`

**Instructions**:

Replace the entire `deleteFileSubmissions` method implementation. Change from publishing an outbox event to executing a direct SQL DELETE:

```typescript
async deleteFileSubmissions(params: DeleteFileSubmissionsParams, transaction?: Transaction): Promise<number> {
    const {deelContractId, transferId, itemId} = params;

    if (!transaction) {
        throw new Error('[PeoFileSubmissionRepository] Transaction is required for deleteFileSubmissions');
    }

    this.log.info({
        message: '[PeoFileSubmissionRepository] Deleting file submissions directly',
        deelContractId,
        transferId,
        itemId,
    });

    try {
        const [, deletedCount] = await this.db.sequelize.query(
            'DELETE FROM peo.peo_file_submissions WHERE deel_contract_id = :deelContractId',
            {
                replacements: {deelContractId},
                type: this.db.Sequelize.QueryTypes.DELETE,
                transaction,
            }
        );

        this.log.info({
            message: '[PeoFileSubmissionRepository] File submissions deleted successfully',
            deelContractId,
            transferId,
            itemId,
            deletedCount,
        });

        return deletedCount as number;
    } catch (error) {
        this.log.error({
            message: '[PeoFileSubmissionRepository] Failed to delete file submissions',
            err: error,
            deelContractId,
            transferId,
            itemId,
        });
        throw error;
    }
}
```

**Key Changes:**
1. Remove `PeoTransactionalEventService` usage (no more outbox event)
2. Use `this.db.sequelize.query()` with raw SQL DELETE
3. Use `QueryTypes.DELETE` for the query type
4. Pass the transaction for atomicity
5. Return the deleted count for logging/monitoring
6. Update log messages to reflect "direct deletion" instead of "event publishing"

### Step 2: Remove PeoTransactionalEventService dependency

**File**: `services/peo/entity_transfer/repositories/peo_file_submission_repository.ts`

**Instructions**:

Remove `PeoTransactionalEventService` from the constructor since it's no longer needed:

```typescript
import {Transaction} from 'sequelize';

import {PEOLogger} from '../../../../modules/peo/utils/peo_logger';

export interface DeleteFileSubmissionsParams {
    deelContractId: number;
    transferId?: string;
    itemId?: string;
}

export class PeoFileSubmissionRepository {
    constructor(private readonly db: Deel.Db, private readonly log: PEOLogger) {}

    // ... deleteFileSubmissions method
}
```

Remove the unused imports:
- `PeoTransactionOutboxEventTypes`
- `PeoTransactionalEventService`

### Step 3: Update ShareComplianceDocumentsStep constructor

**File**: `services/peo/entity_transfer/steps/share_compliance_documents_step.ts`

**Instructions**:

Update the constructor to not pass `PeoTransactionalEventService` to the repository:

```typescript
constructor(private readonly log: PEOLogger, private readonly db: Deel.Db) {
    this.peoFileSubmissionRepository = new PeoFileSubmissionRepository(db, log);
}
```

Remove the `PeoTransactionalEventService` import and instantiation from this file.

### Step 4: Update ShareComplianceDocumentsStep rollback log message

**File**: `services/peo/entity_transfer/steps/share_compliance_documents_step.ts`

**Instructions**:

Update the success log message in rollback (line ~212) from:
```typescript
message: '[ShareComplianceDocumentsStep] File submission rollback event published',
```
to:
```typescript
message: '[ShareComplianceDocumentsStep] File submissions deleted successfully',
```

## Post-Implementation

After completing, run the unit tests:
```bash
cd /Users/gabriel.herter/Documents/Projects/deel/backend
npx jest services/peo/__tests__/entity_transfer/repositories/peo_file_submission_repository.spec.ts --no-coverage
npx jest services/peo/__tests__/entity_transfer/steps/share_compliance_documents_step.spec.ts --no-coverage
```

## Acceptance Criteria

- [ ] `PeoFileSubmissionRepository.deleteFileSubmissions()` executes a direct SQL DELETE
- [ ] The deletion runs within the provided transaction
- [ ] `PeoTransactionalEventService` is no longer used/imported in the repository
- [ ] `ShareComplianceDocumentsStep` constructor no longer creates `PeoTransactionalEventService`
- [ ] Log messages accurately describe "direct deletion" behavior

## Testing

- Unit tests updated in work item 03
- Manual test: Trigger entity transfer failure after CreateContract step and verify rollback completes without FK constraint error

## Notes

- The `peo.peo_file_submissions` table has a partial index on `deel_contract_id` (non-NULL values), so the DELETE query is efficient
- The FK constraint is `ON DELETE CASCADE`, but since `Contract.destroy()` does a soft delete (paranoid model), CASCADE doesn't trigger - hence the need for explicit deletion
- This is a cross-schema query (backend queries peo schema) - documented as pragmatic solution given microservice transaction constraints
