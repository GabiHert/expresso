<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-add-rollback-test.md                              ║
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

# Add Unit Test for CreateContractStep Rollback

## Objective

Add a unit test that verifies the CreateContractStep rollback method works correctly, specifically that it doesn't send `null` values that would fail PEO service validation.

## Pre-Implementation

Explore existing tests for CreateContractStep to understand the testing patterns:
- Look for existing test files in `services/peo/entity_transfer/steps/` or `__tests__/`
- Understand how mocks are set up for `entityTransferRepository`

## Implementation Steps

### Step 1: Find existing test file or create new one

Look for:
- `create_contract_step.test.ts`
- `create_contract_step.spec.ts`
- Tests in a `__tests__` folder nearby

### Step 2: Add rollback test

Create a test that:
1. Sets up a CreateContractStep instance with mocked dependencies
2. Sets up a context that has a created contract (so rollback has work to do)
3. Calls the `rollback()` method
4. Verifies `entityTransferRepository.updateTransferItem` is called
5. Verifies the call does NOT include `newContractOid: null` in the payload

Example structure:
```typescript
describe('CreateContractStep', () => {
  describe('rollback', () => {
    it('should not send null newContractOid when updating transfer item', async () => {
      // Setup mocks
      const mockUpdateTransferItem = jest.fn().mockResolvedValue(undefined);
      const mockEntityTransferRepository = {
        updateTransferItem: mockUpdateTransferItem,
      };

      // Create step with mocked dependencies
      const step = new CreateContractStep({
        entityTransferRepository: mockEntityTransferRepository,
        // ... other dependencies
      });

      // Setup context with a created contract
      const context = {
        request: { item: { id: 'test-item-id' } },
        // ... other context
      };

      // Execute rollback
      await step.rollback(context);

      // Verify updateTransferItem was called without null
      expect(mockUpdateTransferItem).toHaveBeenCalledWith(
        'test-item-id',
        expect.not.objectContaining({ newContractOid: null }),
        expect.anything()
      );
    });
  });
});
```

### Step 3: Run the test

```bash
cd /Users/gabriel.herter/Documents/Projects/deel/backend
npm test -- --grep "CreateContractStep"
# or
npm test -- create_contract_step
```

## Post-Implementation

Run a code review agent to check the test quality and coverage.

## Acceptance Criteria

- [ ] Test exists for rollback scenario
- [ ] Test verifies `newContractOid: null` is NOT sent
- [ ] Test passes with the fix from work item 01
- [ ] Test would fail if the bug were reintroduced

## Testing

Run the full test suite for entity transfer:
```bash
npm test -- entity_transfer
```

## Notes

- The test should be regression-proof: if someone changes back to `null`, the test should fail
- Consider adding an integration test if the project has that pattern
