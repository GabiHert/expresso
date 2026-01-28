<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 07-add-split-rollback-tests.md                       ║
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

# Add Unit Tests for Split Rollback with Retry

## Objective

Add comprehensive unit tests for the new split-transaction rollback logic in `TransferStepExecutor`, covering the two-phase split, exponential backoff retry, FK error detection, and edge cases.

## Implementation Steps

### Step 1: Find existing test file

Look for existing tests:
- `backend/__tests__/services/peo/entity_transfer/transfer_step_executor.spec.ts`
- Or similar path following the test convention

### Step 2: Add test cases

**Test Cases:**

1. **Split transaction - normal flow**: When ShareComplianceDocuments is in completed steps, rollback splits into two transactions
2. **Split transaction - no ShareComplianceDocuments**: When step wasn't completed, all steps run in single transaction
3. **Retry on FK constraint error**: When CreateContractStep.rollback() throws SequelizeForeignKeyConstraintError, retries with backoff
4. **Retry succeeds on 2nd attempt**: FK error first, success second → no rollback errors
5. **Retry succeeds on 3rd attempt**: FK error twice, success third → no rollback errors
6. **Max retries exceeded**: FK error on all attempts → rollback error with maxRetriesExceeded flag
7. **Non-FK error not retried**: Other errors thrown immediately without retry
8. **Exponential backoff timing**: Verify delays increase exponentially (mock setTimeout)
9. **Phase 1 error doesn't prevent Phase 2**: Error in Phase 1 step is captured but Phase 2 still runs
10. **Transaction isolation**: Phase 2 runs in a NEW transaction (not the same as Phase 1)

### Step 3: Mock setup

```typescript
// Mock Sequelize transaction
const mockTransaction = { afterCommit: jest.fn() };
const mockSequelize = {
    transaction: jest.fn((fn) => fn(mockTransaction)),
};

// Mock steps
const mockShareComplianceStep = {
    name: 'ShareComplianceDocuments',
    rollback: jest.fn(),
};
const mockCreateContractStep = {
    name: 'CreateContract',
    rollback: jest.fn(),
};

// FK Error
const fkError = new Error('FK constraint violation');
fkError.name = 'SequelizeForeignKeyConstraintError';
```

## Acceptance Criteria

- [ ] All 10 test cases pass
- [ ] Tests verify transaction splitting behavior
- [ ] Tests verify retry count and backoff delays
- [ ] Tests verify error classification (FK vs non-FK)
- [ ] Tests cover edge case where ShareComplianceDocuments not in completed steps

## Notes

- Use `jest.useFakeTimers()` to verify exponential backoff without waiting
- Depends on work items 05 and 06 being completed
