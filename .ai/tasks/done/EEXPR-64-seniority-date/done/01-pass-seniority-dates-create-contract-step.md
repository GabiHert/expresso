<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-pass-seniority-dates-create-contract-step.md      ║
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

# Pass Seniority Dates in CreateContractStep

## Objective

Modify the `CreateContractStep.buildContractDetails()` method to extract and include `origHireDate`, `lastHireDate`, and `seniorityDate` from the old contract when building the new contract details.

## Implementation Steps

### Step 1: Modify buildContractDetails()

**File**: `backend/services/peo/entity_transfer/steps/create_contract_step.ts`

**Location**: Around line 435, in the `buildContractDetails()` method's return statement

**Current code** (lines 434-435):
```typescript
peoStartDate: transfer.effectiveDate,
startDate: transfer.effectiveDate,
```

**Add after line 435** (after `startDate`):
```typescript
// Preserve seniority dates from old contract
origHireDate: oldContract.peoContract.origHireDate,
lastHireDate: oldContract.peoContract.lastHireDate,
...(oldContract.peoContract.seniorityDate && {
    seniorityDate: oldContract.peoContract.seniorityDate,
}),
```

### Step 2: Verify the data is available

The `oldContract.peoContract` object is loaded via `peoContractService.getContractById()` with `addPEOData: true`, which calls the PEO microservice's `getPeoContractById()`. This endpoint returns ALL columns including `origHireDate`, `lastHireDate`, and `seniorityDate`.

No changes needed to the data loading - the fields are already available.

## Acceptance Criteria

- [ ] `origHireDate` is extracted from `oldContract.peoContract.origHireDate`
- [ ] `lastHireDate` is extracted from `oldContract.peoContract.lastHireDate`
- [ ] `seniorityDate` is conditionally extracted if present
- [ ] The return object includes these new fields

## Testing

After this change:
1. Run existing entity transfer tests to ensure no regression
2. Add a console.log or debugger to verify the values are being passed
3. The actual saving will be handled in Work Item 02

## Notes

- The validation schema at lines 58-72 validates these fields exist on the OLD contract
- We're just passing them through to the new contract creation
- The PEO schema (`schemas.ts`) already accepts these fields
