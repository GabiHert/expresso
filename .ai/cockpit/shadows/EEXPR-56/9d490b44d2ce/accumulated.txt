<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-add-contractid-param.md                            ║
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

# Add contractId parameter to updateDefaultPEOContractWithI9

## Objective

Modify `updateDefaultPEOContractWithI9` function to accept an optional `contractId` parameter that allows targeting a specific contract instead of using `getDefaultContract`.

## Pre-Implementation

Before starting, review the current implementation:
- `backend/services/peo/peo_contract_service.ts` lines 3984-4016

## Implementation Steps

### Step 1: Add optional contractId parameter

**File**: `backend/services/peo/peo_contract_service.ts`

**Instructions**:

1. Locate `updateDefaultPEOContractWithI9` function (around line 3984)

2. Add optional `contractId` parameter to the function signature:
   ```typescript
   async updateDefaultPEOContractWithI9(
       profileId: number,
       i9Data: {...},
       contractId?: number  // NEW: Optional parameter
   ): Promise<void>
   ```

3. Modify the function body to use `contractId` if provided:
   ```typescript
   let contract;
   if (contractId) {
       contract = await this.db.peo_contract.findByPk(contractId);
       if (!contract) {
           throw new Error(`Contract not found with id: ${contractId}`);
       }
   } else {
       contract = await this.getDefaultContract(profileId);
   }
   ```

4. Add appropriate logging to indicate which path was taken

### Step 2: Add JSDoc documentation

**File**: `backend/services/peo/peo_contract_service.ts`

**Instructions**:

Update the function's JSDoc to document the new parameter:
```typescript
/**
 * Updates a PEO contract with I-9 data from I9Section1
 * @param profileId - The profile ID to find the contract
 * @param i9Data - The I-9 data to sync
 * @param contractId - Optional: Specific contract ID to update. If not provided,
 *                     uses getDefaultContract which returns the first active contract.
 *                     IMPORTANT: During entity transfers, always pass contractId to
 *                     ensure the correct (new) contract is updated.
 */
```

## Acceptance Criteria

- [ ] `updateDefaultPEOContractWithI9` accepts optional `contractId` parameter
- [ ] When `contractId` is provided, function uses `findByPk` to get specific contract
- [ ] When `contractId` is not provided, function falls back to `getDefaultContract`
- [ ] Appropriate error handling if contractId provided but contract not found
- [ ] JSDoc documents the new parameter and its importance

## Testing

- Verify existing callers (without contractId) continue to work
- Test with explicit contractId targets correct contract

## Notes

- This change is backward compatible - all existing callers will continue to work
- The optional parameter pattern allows gradual migration of callers
