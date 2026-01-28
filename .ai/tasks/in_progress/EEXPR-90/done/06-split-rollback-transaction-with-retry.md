<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 06-split-rollback-transaction-with-retry.md           ║
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

# Split Rollback Transaction with Exponential Backoff Retry

## Objective

Modify `TransferStepExecutor.rollbackSteps()` to split the rollback into two transaction phases. Transaction 1 includes all steps down to `ShareComplianceDocumentsStep` (which publishes the file submission deletion event). Transaction 2 includes `CreateContractStep` and remaining steps, with exponential backoff retry on FK constraint errors.

## Context

The FK constraint error occurs because:
1. `ShareComplianceDocumentsStep.rollback()` publishes an outbox event (delivered after commit)
2. `CreateContractStep.rollback()` tries to hard delete the contract
3. `peo_file_submissions` FK still exists → deletion fails

Splitting the transaction ensures the outbox event is committed and relayed before the contract deletion is attempted. Retrying with exponential backoff gives PEO time to process the deletion.

## Implementation Steps

### Step 1: Identify the split point

**File**: `backend/services/peo/entity_transfer/transfer_step_executor.ts`

The split point is between `ShareComplianceDocumentsStep` and `CreateContractStep` in the reversed rollback order. Steps are rolled back in reverse execution order:
- Transaction 1: Steps 13→7 (TerminateContract...ShareComplianceDocuments)
- Transaction 2: Steps 6→1 (CreateContract...CrossHireSanityCheck)

### Step 2: Refactor rollbackSteps() into two phases

**File**: `backend/services/peo/entity_transfer/transfer_step_executor.ts`

Replace the current single-transaction `rollbackSteps()` with:

```typescript
async rollbackSteps(context: TransferContext): Promise<RollbackError[]> {
    const rollbackErrors: RollbackError[] = [];
    const completedSteps = this.orderedSteps.filter(
        (step) => context.stepState.completedSteps.includes(step.name)
    );
    const reversedSteps = [...completedSteps].reverse();

    // Find split point: ShareComplianceDocumentsStep
    const splitIndex = reversedSteps.findIndex(
        (step) => step.name === 'ShareComplianceDocuments'
    );

    // Phase 1: Steps from top down to (and including) ShareComplianceDocuments
    const phase1Steps = splitIndex >= 0 ? reversedSteps.slice(0, splitIndex + 1) : reversedSteps;
    // Phase 2: Steps after ShareComplianceDocuments (CreateContract and below)
    const phase2Steps = splitIndex >= 0 ? reversedSteps.slice(splitIndex + 1) : [];

    // Transaction 1: Publish outbox events (including file submission deletion)
    await this.db.sequelize.transaction(async (transaction) => {
        for (const step of phase1Steps) {
            if (step.rollback) {
                try {
                    await step.rollback(context, transaction);
                } catch (error) {
                    rollbackErrors.push(this.buildRollbackError(step, error, context));
                }
            }
        }
    });
    // After commit: outbox events are relayed to PEO service

    // Transaction 2: Delete contract (with retry for FK constraint)
    if (phase2Steps.length > 0) {
        const phase2Errors = await this.rollbackPhase2WithRetry(phase2Steps, context);
        rollbackErrors.push(...phase2Errors);
    }

    return rollbackErrors;
}
```

### Step 3: Implement rollbackPhase2WithRetry

**File**: `backend/services/peo/entity_transfer/transfer_step_executor.ts`

Add the retry method using exponential backoff:

```typescript
private async rollbackPhase2WithRetry(
    steps: TransferStep[],
    context: TransferContext,
    maxRetries = 5,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
): Promise<RollbackError[]> {
    const rollbackErrors: RollbackError[] = [];
    let retryCount = 0;

    while (retryCount <= maxRetries) {
        try {
            rollbackErrors.length = 0; // Clear previous attempt errors

            await this.db.sequelize.transaction(async (transaction) => {
                for (const step of steps) {
                    if (step.rollback) {
                        try {
                            await step.rollback(context, transaction);
                        } catch (error) {
                            if (this.isForeignKeyConstraintError(error) && retryCount < maxRetries) {
                                throw error; // Rethrow to trigger retry
                            }
                            rollbackErrors.push(this.buildRollbackError(step, error, context));
                        }
                    }
                }
            });

            // Transaction committed successfully
            return rollbackErrors;
        } catch (error) {
            if (this.isForeignKeyConstraintError(error) && retryCount < maxRetries) {
                retryCount++;
                const delay = Math.min(maxDelayMs, Math.pow(2, retryCount) * baseDelayMs);
                const jitter = delay * 0.2 * Math.random();
                log.info('[TransferStepExecutor] FK constraint during rollback, retrying', {
                    retryCount,
                    maxRetries,
                    delayMs: delay + jitter,
                    transferId: context.request.transfer.id,
                    itemId: context.request.item.id,
                });
                await new Promise(resolve => setTimeout(resolve, delay + jitter));
            } else {
                // Non-retryable error or max retries exceeded
                rollbackErrors.push({
                    step: 'Phase2Rollback',
                    error: error.message,
                    details: {
                        name: error.name,
                        retryCount,
                        maxRetriesExceeded: retryCount >= maxRetries,
                    },
                });
                return rollbackErrors;
            }
        }
    }

    return rollbackErrors;
}
```

### Step 4: Add helper methods

**File**: `backend/services/peo/entity_transfer/transfer_step_executor.ts`

```typescript
private isForeignKeyConstraintError(error: any): boolean {
    return error.name === 'SequelizeForeignKeyConstraintError'
        || error.constructor?.name === 'ForeignKeyConstraintError';
}

private buildRollbackError(step: TransferStep, error: any, context: TransferContext): RollbackError {
    log.error('[TransferStepExecutor] Rollback failed', {
        err: error,
        step: step.name,
        transferId: context.request.transfer.id,
        itemId: context.request.item.id,
    });
    return {
        step: step.name,
        error: error.message,
        details: {
            name: error.name,
            code: error.code,
            method: error.method,
            url: error.url,
            status: error.status,
        },
    };
}
```

### Step 5: Handle edge case - ShareComplianceDocuments not in completed steps

If `ShareComplianceDocumentsStep` was never completed (failure happened before it), all steps go into a single transaction (no split needed). The `splitIndex === -1` case handles this: `phase1Steps = reversedSteps`, `phase2Steps = []`.

## Acceptance Criteria

- [ ] Rollback splits into two transactions at the ShareComplianceDocuments/CreateContract boundary
- [ ] Transaction 1 commits the outbox event before Transaction 2 starts
- [ ] FK constraint errors in Transaction 2 trigger exponential backoff retry (max 5 retries)
- [ ] Non-FK errors are not retried (thrown immediately)
- [ ] If ShareComplianceDocuments was not completed, all steps run in single transaction (no change)
- [ ] Retry logging includes attempt count, delay, and transfer context
- [ ] Max retry exceeded adds clear error to rollbackErrors

## Testing

- Unit test: Mock step rollbacks, verify split into two transactions
- Unit test: Mock FK error on first 2 attempts, success on 3rd → verify retry behavior
- Unit test: Mock non-FK error → verify no retry
- Unit test: Mock max retries exceeded → verify error in rollbackErrors
- Unit test: ShareComplianceDocuments not in completedSteps → verify single transaction
- Integration test: Trigger entity transfer rollback with time-off service down

## Notes

- Retry delays: 2s, 4s, 8s, 16s, 30s (capped) with 20% jitter
- Total max wait: ~60s across all retries
- PEO event handler (`EntityTransferRollbackHandler.handleFileSubmissionRollback()`) typically processes within seconds
- PostgreSQL READ_COMMITTED isolation ensures Transaction 2 sees PEO's deletions
- This depends on work item 05 being completed first (outbox event pattern)
