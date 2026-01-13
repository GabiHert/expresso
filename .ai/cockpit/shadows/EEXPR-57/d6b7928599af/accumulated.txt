<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-refactor-to-use-contract-oid.md                    ║
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

# Refactor updateDefaultPEOContractWithI9 to use contractOid instead of contractId

## Objective

Simplify the implementation by passing `contractOid` instead of `contractId` to `updateDefaultPEOContractWithI9`. This is cleaner because:
1. `syncI9InfoToPEoContract` already has `contractOid` as input
2. We can reuse the existing `getContractByOid` pattern which includes proper filtering
3. Avoids redundant validation since `getContractByOid` already validates contractType and deletedAt

## Pre-Implementation

Before starting, review:
- `backend/services/peo/peo_contract_service.ts` lines 3693-3723 (getContractByOid)
- Current implementation of `updateDefaultPEOContractWithI9` (lines 3984-4044)
- Current implementation of `syncI9InfoToPEoContract` (lines 4046-4068)

## Implementation Steps

### Step 1: Update updateDefaultPEOContractWithI9 to accept contractOid

**File**: `backend/services/peo/peo_contract_service.ts`

**Instructions**:

1. Change the parameter from `contractId` to `contractOid`:
   ```typescript
   async updateDefaultPEOContractWithI9({
       legalStatus,
       arnUscisNumber,
       i94Number,
       authorizedToWorkUntil,
       passportNumber,
       passportIssuingCountry,
       firstName,
       lastName,
       profileId,
       contractOid,  // Changed from contractId
   })
   ```

2. Update the contract lookup logic to use `getContractByOid` or similar pattern:
   ```typescript
   let contract;
   if (contractOid) {
       contract = await this.db.Contract.findFirst({
           where: {
               oid: contractOid,
               contractType: CONTRACT_TYPES.PEO,
               deletedAt: null,
           },
           attributes: ['id', 'clientLegalEntityId', 'HrisProfileId'],
           raw: true,
       });
       if (!contract) {
           throw new Error(`PEO contract not found with oid: ${contractOid}`);
       }
       this.log.info({message: 'Using explicit contractOid for I-9 update', data: {contractOid}});
   } else {
       contract = await this.getDefaultContract(profileId, ['id', 'clientLegalEntityId', 'HrisProfileId']);
       this.log.info({message: 'Using getDefaultContract for I-9 update (no contractOid provided)', data: {profileId, foundContractId: contract?.id}});
   }
   ```

3. Update JSDoc to reflect the change:
   ```typescript
   /**
    * Updates a PEO contract with I-9 data from I9Section1
    * @param profileId - The profile ID to find the contract (used for fallback)
    * @param i9Data - The I-9 data to sync (legalStatus, arnUscisNumber, etc.)
    * @param contractOid - Optional: Specific contract OID to update. If not provided,
    *                      uses getDefaultContract which returns the first active contract.
    *                      IMPORTANT: During entity transfers, always pass contractOid to
    *                      ensure the correct (new) contract is updated.
    */
   ```

### Step 2: Update syncI9InfoToPEoContract to pass contractOid

**File**: `backend/services/peo/peo_contract_service.ts`

**Instructions**:

1. Update the call to pass `contractOid` instead of `contract.id`:
   ```typescript
   return await this.updateDefaultPEOContractWithI9({
       ...i9Info,
       profileId: contract.contractorId,
       contractOid: contractOid,  // Changed from contractId: contract.id
   });
   ```

### Step 3: Update unit tests

**File**: `backend/services/peo/__tests__/peo_contract_service.spec.js`

**Instructions**:

1. Update test cases to use `contractOid` instead of `contractId`
2. Update assertions to check for `oid` in where clause instead of `id`

## Acceptance Criteria

- [ ] `updateDefaultPEOContractWithI9` accepts `contractOid` parameter instead of `contractId`
- [ ] When `contractOid` is provided, function uses `findFirst` with `oid` filter
- [ ] When `contractOid` is not provided, function falls back to `getDefaultContract`
- [ ] `syncI9InfoToPEoContract` passes `contractOid` directly (no need to look up contract.id)
- [ ] Unit tests updated and passing
- [ ] Existing functionality preserved (backward compatible)

## Testing

- Verify existing callers (without contractOid) continue to work
- Test with explicit contractOid targets correct contract
- Run existing unit tests

## Notes

- This simplification removes the need to look up `contract.id` in `syncI9InfoToPEoContract` since we already have the OID
- The `oid` column has a unique constraint (`uq_contract_oid`) so it's safe to use as identifier
- Using `oid` is consistent with other public-facing identifiers in the codebase
