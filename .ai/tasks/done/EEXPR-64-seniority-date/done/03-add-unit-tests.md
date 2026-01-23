<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-add-unit-tests.md                                 ║
║ TASK: EEXPR-64-seniority-date                                   ║
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
repo: backend
---

# Add Unit Tests for Seniority Date Copying

## Objective

Add unit tests to verify that `origHireDate`, `lastHireDate`, and `seniorityDate` are correctly copied during entity transfers.

## Implementation Steps

### Step 1: Locate existing test file

**File**: `backend/services/peo/entity_transfer/steps/entity_transfer_steps.spec.js`

This file contains tests for the entity transfer steps.

### Step 2: Add test for CreateContractStep seniority dates

Add a test case that verifies the seniority dates are passed in the contract details:

```javascript
describe('CreateContractStep', () => {
    describe('buildContractDetails', () => {
        it('should include origHireDate, lastHireDate, and seniorityDate from old contract', async () => {
            // Setup: Create mock old contract with seniority dates
            const oldContract = {
                id: 123,
                peoContract: {
                    // ... other required fields ...
                    origHireDate: '2024-07-29',
                    lastHireDate: '2024-07-29',
                    seniorityDate: '2024-07-29',
                },
            };

            const transfer = {
                effectiveDate: new Date('2026-01-03'),
            };

            // Execute: Build contract details
            // ... call buildContractDetails ...

            // Assert: Verify seniority dates are included
            expect(contractDetails.origHireDate).toBe('2024-07-29');
            expect(contractDetails.lastHireDate).toBe('2024-07-29');
            expect(contractDetails.seniorityDate).toBe('2024-07-29');

            // Assert: Verify startDate is still transfer effective date
            expect(contractDetails.startDate).toEqual(transfer.effectiveDate);
        });

        it('should handle missing seniorityDate gracefully', async () => {
            // Setup: Create mock old contract WITHOUT seniorityDate
            const oldContract = {
                id: 123,
                peoContract: {
                    // ... other required fields ...
                    origHireDate: '2024-07-29',
                    lastHireDate: '2024-07-29',
                    seniorityDate: null,  // Not set
                },
            };

            // Execute and Assert: Should not throw, seniorityDate should not be in result
            // ... verify seniorityDate is not included when null ...
        });
    });
});
```

### Step 3: Add integration test

If there's an integration test file, add a test that runs a full entity transfer and verifies the database values.

### Step 4: Run existing tests

```bash
cd backend
npm test -- --grep "entity_transfer" --reporter spec
```

Ensure all existing tests still pass.

## Acceptance Criteria

- [ ] Test case verifies `origHireDate` is passed through
- [ ] Test case verifies `lastHireDate` is passed through
- [ ] Test case verifies `seniorityDate` is conditionally passed
- [ ] Test case verifies `startDate` is still the transfer effective date
- [ ] All existing entity transfer tests pass

## Testing

Run the test suite:
```bash
cd backend
npm test -- --grep "CreateContractStep"
```

## Notes

- Follow existing test patterns in the codebase
- Use existing fixtures and mocks where available
- The test should verify the data flow, not just the final database state
