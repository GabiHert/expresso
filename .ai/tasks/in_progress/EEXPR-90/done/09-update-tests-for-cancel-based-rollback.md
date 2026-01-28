<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 09-update-tests-for-cancel-based-rollback.md         ║
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

# Update Unit Tests for Cancel-Based Rollback

## Objective

Update the CreateContractStep unit tests to mock `peoContractService.cancelPEOContract` instead of `Contract.destroy`.

## Pre-Implementation

Read these files for context:
- `backend/services/peo/__tests__/entity_transfer/steps/create_contract_step.spec.ts` - existing tests
- Work item 08 changes for understanding what's being tested

## Implementation Steps

### Step 1: Add mock for peoContractService

**File**: `backend/services/peo/__tests__/entity_transfer/steps/create_contract_step.spec.ts`

Add mock at the top (after existing mocks):
```typescript
jest.mock('@/services/peo/peo_contract_service', () => ({
    peoContractService: {
        cancelPEOContract: jest.fn().mockResolvedValue(undefined),
    },
}));
```

Add import and mock reference:
```typescript
import {peoContractService} from '@/services/peo/peo_contract_service';

const mockCancelPEOContract = peoContractService.cancelPEOContract as jest.MockedFunction<
    typeof peoContractService.cancelPEOContract
>;
```

### Step 2: Remove EMSEmploymentsService mock if no longer needed

If `EMSEmploymentsService.updateEmploymentStatus` is no longer called in rollback, remove its mock or update tests accordingly.

Check if it's used elsewhere in CreateContractStep before removing completely.

### Step 3: Update rollback test assertions

**File**: `backend/services/peo/__tests__/entity_transfer/steps/create_contract_step.spec.ts`

Find the rollback test and update assertions:

```typescript
// Remove this assertion:
expect(mockUpdateEmploymentStatus).toHaveBeenCalledWith({
    contractOids: ['new-contract-oid'],
    status: 'ENDED',
});

// Remove this assertion:
expect(mockContractDestroy).toHaveBeenCalledWith({
    where: {id: mockNewContract.id},
    transaction: mockTransaction,
});

// Add this assertion:
expect(mockCancelPEOContract).toHaveBeenCalledWith({
    contractOid: 'new-contract-oid',
    reason: expect.stringContaining('Entity transfer rollback'),
    transaction: mockTransaction,
});
```

### Step 4: Update test description

Update the test description to reflect the new behavior:
```typescript
it('should cancel contract via cancelPEOContract during rollback', async () => {
    // ...
});
```

### Step 5: Add test for cancelPEOContract failure

Add a new test case for when `cancelPEOContract` fails:
```typescript
it('should propagate error when cancelPEOContract fails during rollback', async () => {
    mockCancelPEOContract.mockRejectedValueOnce(new Error('Cancel failed'));

    await expect(step.rollback(context, mockTransaction)).rejects.toThrow('Cancel failed');
});
```

### Step 6: Clean up unused mocks

Remove any mocks that are no longer needed:
- `Contract.destroy` mock (if only used for rollback)
- `EMSEmploymentsService.updateEmploymentStatus` mock (if only used for rollback)

## Post-Implementation

Run tests to ensure they pass:
```bash
cd /Users/gabriel.herter/Documents/Projects/deel/backend
npm test -- --grep "CreateContractStep"
```

## Acceptance Criteria

- [ ] `peoContractService.cancelPEOContract` is mocked
- [ ] Rollback test asserts `cancelPEOContract` is called with correct params
- [ ] Old assertions for `Contract.destroy` are removed
- [ ] Old assertions for `EMSEmploymentsService.updateEmploymentStatus` in rollback are removed
- [ ] Test for `cancelPEOContract` failure is added
- [ ] All tests pass

## Testing

```bash
npm test -- --grep "CreateContractStep"
```

## Notes

- Keep other mocks that may be used in execute() method
- The dependent record deletions (WorkStatements, etc.) tests should remain unchanged
