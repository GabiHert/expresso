<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-update-sync-caller.md                              ║
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

# Update syncI9InfoToPEoContract to pass contractId

## Objective

Modify `syncI9InfoToPEoContract` to pass the contract ID to `updateDefaultPEOContractWithI9`, ensuring I-9 data is synced to the correct contract during entity transfers.

## Pre-Implementation

Before starting, review:
- `backend/services/peo/peo_contract_service.ts` lines 4018-4031 (syncI9InfoToPEoContract)
- Work item 01 must be completed first (contractId parameter added)

## Implementation Steps

### Step 1: Update syncI9InfoToPEoContract to pass contractId

**File**: `backend/services/peo/peo_contract_service.ts`

**Instructions**:

1. Locate `syncI9InfoToPEoContract` function (around line 4018)

2. The function already retrieves the contract by OID:
   ```typescript
   const contract = await this.db.peo_contract.findOne({
       where: { deelContractOid: contractOid }
   });
   ```

3. Update the call to `updateDefaultPEOContractWithI9` to include `contract.id`:
   ```typescript
   await this.updateDefaultPEOContractWithI9(
       contract.profileId,
       {
           // ... existing i9 data fields
       },
       contract.id  // NEW: Pass contract ID to target specific contract
   );
   ```

4. Add logging to confirm which contract is being targeted:
   ```typescript
   this.logger.info({
       message: '[syncI9InfoToPEoContract] Syncing I-9 data to specific contract',
       contractOid,
       contractId: contract.id,
       profileId: contract.profileId
   });
   ```

## Acceptance Criteria

- [ ] `syncI9InfoToPEoContract` passes `contract.id` to `updateDefaultPEOContractWithI9`
- [ ] Logging confirms which contract is being targeted
- [ ] Entity transfers sync I-9 data to the new contract (not the old one)

## Testing

- Run entity transfer for Z04 employee
- Verify I-9 data appears on new contract (not old contract)
- Check logs confirm correct contract ID was used

## Notes

- This is the critical fix that ensures CopyI9DataStep updates the correct contract
- The bug was that we had the correct contract OID but lost it when calling updateDefaultPEOContractWithI9
