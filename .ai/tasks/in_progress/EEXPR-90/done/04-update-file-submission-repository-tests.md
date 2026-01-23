<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-update-file-submission-repository-tests.md        ║
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
branch: EEXPR-94-fix-replication-lag
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Update File Submission Repository Tests

## Objective

Update the test file `peo_file_submission_repository.spec.ts` to verify the new direct SQL deletion behavior instead of the previous outbox event pattern.

## Pre-Implementation

Depends on work item 02 being completed first.

## Implementation Steps

### Step 1: Rewrite the test file

**File**: `services/peo/__tests__/entity_transfer/repositories/peo_file_submission_repository.spec.ts`

**Instructions**:

Replace the test file content to test the new raw SQL deletion behavior:

```typescript
import {Transaction} from 'sequelize';

import {PEOLogger} from '../../../../../modules/peo/utils/peo_logger';
import {DeleteFileSubmissionsParams, PeoFileSubmissionRepository} from '../../../entity_transfer/repositories/peo_file_submission_repository';

describe('PeoFileSubmissionRepository', () => {
    let repository: PeoFileSubmissionRepository;
    let mockDb: Record<string, any>;
    let mockLog: PEOLogger;
    let mockTransaction: Transaction;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDb = {
            sequelize: {
                query: jest.fn().mockResolvedValue([undefined, 3]),
            },
            Sequelize: {
                QueryTypes: {
                    DELETE: 'DELETE',
                },
            },
        };

        mockLog = ({
            info: jest.fn(),
            error: jest.fn(),
        } as unknown) as PEOLogger;

        mockTransaction = ({id: 'transaction-123'} as unknown) as Transaction;

        repository = new PeoFileSubmissionRepository(mockDb as any, mockLog);
    });

    describe('deleteFileSubmissions()', () => {
        describe('Happy Path', () => {
            it('should execute direct SQL DELETE for file submissions', async () => {
                const params: DeleteFileSubmissionsParams = {
                    deelContractId: 123,
                    transferId: 'transfer-456',
                    itemId: 'item-789',
                };

                await repository.deleteFileSubmissions(params, mockTransaction);

                expect(mockDb.sequelize.query).toHaveBeenCalledWith(
                    'DELETE FROM peo.peo_file_submissions WHERE deel_contract_id = :deelContractId',
                    {
                        replacements: {deelContractId: 123},
                        type: 'DELETE',
                        transaction: mockTransaction,
                    }
                );
            });

            it('should return the count of deleted records', async () => {
                mockDb.sequelize.query.mockResolvedValue([undefined, 5]);
                const params: DeleteFileSubmissionsParams = {deelContractId: 123};

                const result = await repository.deleteFileSubmissions(params, mockTransaction);

                expect(result).toBe(5);
            });

            it('should log deletion start and completion with count', async () => {
                mockDb.sequelize.query.mockResolvedValue([undefined, 2]);
                const params: DeleteFileSubmissionsParams = {
                    deelContractId: 123,
                    transferId: 'transfer-456',
                    itemId: 'item-789',
                };

                await repository.deleteFileSubmissions(params, mockTransaction);

                expect(mockLog.info).toHaveBeenCalledWith({
                    message: '[PeoFileSubmissionRepository] Deleting file submissions directly',
                    deelContractId: 123,
                    transferId: 'transfer-456',
                    itemId: 'item-789',
                });
                expect(mockLog.info).toHaveBeenCalledWith({
                    message: '[PeoFileSubmissionRepository] File submissions deleted successfully',
                    deelContractId: 123,
                    transferId: 'transfer-456',
                    itemId: 'item-789',
                    deletedCount: 2,
                });
            });

            it('should handle zero deletions gracefully', async () => {
                mockDb.sequelize.query.mockResolvedValue([undefined, 0]);
                const params: DeleteFileSubmissionsParams = {deelContractId: 999};

                const result = await repository.deleteFileSubmissions(params, mockTransaction);

                expect(result).toBe(0);
                expect(mockLog.info).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: '[PeoFileSubmissionRepository] File submissions deleted successfully',
                        deletedCount: 0,
                    })
                );
            });

            it('should work with optional fields omitted', async () => {
                const params: DeleteFileSubmissionsParams = {
                    deelContractId: 456,
                };

                await repository.deleteFileSubmissions(params, mockTransaction);

                expect(mockDb.sequelize.query).toHaveBeenCalledWith(
                    'DELETE FROM peo.peo_file_submissions WHERE deel_contract_id = :deelContractId',
                    {
                        replacements: {deelContractId: 456},
                        type: 'DELETE',
                        transaction: mockTransaction,
                    }
                );
            });

            it('should require transaction parameter', async () => {
                const params: DeleteFileSubmissionsParams = {deelContractId: 123};

                await expect(repository.deleteFileSubmissions(params)).rejects.toThrow(
                    '[PeoFileSubmissionRepository] Transaction is required for deleteFileSubmissions'
                );

                expect(mockDb.sequelize.query).not.toHaveBeenCalled();
            });
        });

        describe('Error Handling', () => {
            it('should log error and re-throw when SQL query fails', async () => {
                const params: DeleteFileSubmissionsParams = {
                    deelContractId: 123,
                    transferId: 'transfer-456',
                    itemId: 'item-789',
                };
                const queryError = new Error('Database connection lost');
                mockDb.sequelize.query.mockRejectedValue(queryError);

                await expect(repository.deleteFileSubmissions(params, mockTransaction)).rejects.toThrow('Database connection lost');

                expect(mockLog.error).toHaveBeenCalledWith({
                    message: '[PeoFileSubmissionRepository] Failed to delete file submissions',
                    err: queryError,
                    deelContractId: 123,
                    transferId: 'transfer-456',
                    itemId: 'item-789',
                });
            });

            it('should handle transaction errors gracefully', async () => {
                const params: DeleteFileSubmissionsParams = {
                    deelContractId: 789,
                    transferId: 'transfer-abc',
                    itemId: 'item-xyz',
                };
                const transactionError = new Error('Transaction aborted');
                mockDb.sequelize.query.mockRejectedValue(transactionError);

                await expect(repository.deleteFileSubmissions(params, mockTransaction)).rejects.toThrow('Transaction aborted');

                expect(mockLog.error).toHaveBeenCalledWith({
                    message: '[PeoFileSubmissionRepository] Failed to delete file submissions',
                    err: transactionError,
                    deelContractId: 789,
                    transferId: 'transfer-abc',
                    itemId: 'item-xyz',
                });
            });
        });
    });
});
```

## Post-Implementation

Run the tests to verify:
```bash
cd /Users/gabriel.herter/Documents/Projects/deel/backend
npx jest services/peo/__tests__/entity_transfer/repositories/peo_file_submission_repository.spec.ts --no-coverage
npx jest services/peo/__tests__/entity_transfer/steps/share_compliance_documents_step.spec.ts --no-coverage
```

## Acceptance Criteria

- [ ] All tests pass for `peo_file_submission_repository.spec.ts`
- [ ] Tests verify raw SQL query execution with correct parameters
- [ ] Tests verify transaction is required
- [ ] Tests verify error handling and logging
- [ ] `share_compliance_documents_step.spec.ts` tests still pass (may need constructor mock update)

## Testing

Run the full entity transfer test suite:
```bash
npx jest services/peo/__tests__/entity_transfer/ --no-coverage
```

## Notes

- The `share_compliance_documents_step.spec.ts` may also need a minor update to remove `PeoTransactionalEventService` mock from the constructor if it was being passed through
- Check if any other tests reference the old outbox event pattern for file submissions
