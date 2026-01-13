<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-add-unit-tests.md                                  ║
║ TASK: EEXPR-57                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: backend
---

# Add unit tests for targeted contract update

## Objective

Add unit tests to verify that `updateDefaultPEOContractWithI9` correctly uses the `contractId` parameter when provided, and falls back to `getDefaultContract` when not provided.

## Pre-Implementation

Before starting, review:
- Existing test patterns in `backend/services/peo/__tests__/`
- Work items 01 and 02 must be completed first

## Implementation Steps

### Step 1: Create or update test file

**File**: `backend/services/peo/__tests__/peo_contract_service.spec.ts` (or create if needed)

**Instructions**:

Add test cases for `updateDefaultPEOContractWithI9`:

```typescript
describe('updateDefaultPEOContractWithI9', () => {
    describe('with explicit contractId', () => {
        it('should update the specified contract', async () => {
            // Setup: Create two active contracts for same profile
            const profileId = 12345;
            const oldContract = await createPeoContract({ profileId, isActive: true });
            const newContract = await createPeoContract({ profileId, isActive: true });

            const i9Data = {
                i9AlienRegistrationNumber: 'A123456789',
                i9AlienRegistrationExpiration: '2025-12-31',
            };

            // Act: Update with explicit contractId
            await peoContractService.updateDefaultPEOContractWithI9(
                profileId,
                i9Data,
                newContract.id  // Explicitly target new contract
            );

            // Assert: Only new contract should have the I-9 data
            const updatedNew = await db.peo_contract.findByPk(newContract.id);
            const updatedOld = await db.peo_contract.findByPk(oldContract.id);

            expect(updatedNew.i9AlienRegistrationNumber).toBe('A123456789');
            expect(updatedOld.i9AlienRegistrationNumber).toBeNull();
        });

        it('should throw error if contractId not found', async () => {
            const profileId = 12345;
            const nonExistentContractId = 999999;

            await expect(
                peoContractService.updateDefaultPEOContractWithI9(
                    profileId,
                    {},
                    nonExistentContractId
                )
            ).rejects.toThrow('Contract not found');
        });
    });

    describe('without contractId (fallback)', () => {
        it('should use getDefaultContract when contractId not provided', async () => {
            // Setup: Create single active contract
            const profileId = 12345;
            const contract = await createPeoContract({ profileId, isActive: true });

            const i9Data = {
                i9AlienRegistrationNumber: 'A123456789',
            };

            // Act: Update without contractId
            await peoContractService.updateDefaultPEOContractWithI9(profileId, i9Data);

            // Assert: Contract should have the I-9 data
            const updated = await db.peo_contract.findByPk(contract.id);
            expect(updated.i9AlienRegistrationNumber).toBe('A123456789');
        });
    });
});
```

### Step 2: Add integration test for entity transfer scenario

**File**: `backend/services/peo/__tests__/entity_transfer/copy_i9_data_step.spec.ts`

**Instructions**:

Add test case that verifies I-9 data goes to new contract:

```typescript
describe('CopyI9DataStep with multiple active contracts', () => {
    it('should sync I-9 data to new contract, not old contract', async () => {
        // Setup: Both old and new contracts are active during transfer
        const oldContract = await createPeoContract({ isActive: true });
        const newContract = await createPeoContract({
            profileId: oldContract.profileId,
            isActive: true
        });

        // Create I9Section1 data for old contract
        await createI9Section1({
            contractOid: oldContract.deelContractOid,
            alienRegistrationNumber: 'A123456789',
            authorizedToWorkUntil: '2025-12-31',
        });

        // Act: Run CopyI9DataStep
        const context = createTransferContext(oldContract, newContract);
        await copyI9DataStep.execute(context);

        // Assert: New contract should have synced I-9 data
        const updatedNew = await db.peo_contract.findByPk(newContract.id);
        expect(updatedNew.i9AlienRegistrationNumber).toBe('A123456789');
        expect(updatedNew.i9AlienRegistrationExpiration).toBe('2025-12-31');

        // Assert: Old contract should NOT have the data
        const updatedOld = await db.peo_contract.findByPk(oldContract.id);
        // (Old contract may have had this data before, but the point is
        // the sync went to the right place)
    });
});
```

## Acceptance Criteria

- [ ] Test: `updateDefaultPEOContractWithI9` with explicit contractId updates correct contract
- [ ] Test: `updateDefaultPEOContractWithI9` without contractId falls back to getDefaultContract
- [ ] Test: Invalid contractId throws appropriate error
- [ ] Test: Entity transfer syncs I-9 to new contract when both old and new are active

## Testing

Run tests:
```bash
npm test -- --grep "updateDefaultPEOContractWithI9"
npm test -- --grep "CopyI9DataStep"
```

## Notes

- Focus on the critical scenario: two active contracts for same profile
- The bug manifests when getDefaultContract returns the "wrong" contract (typically the older one)
