<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-accept-seniority-dates-peo-contract-service.md    ║
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

# Accept Seniority Dates in peo_contract_service

## Objective

Modify `peoContractService.createContract()` to accept `origHireDate` and `lastHireDate` from `contractDetails` and use them instead of hardcoding to `contractStartDate`.

## Implementation Steps

### Step 1: Add to destructuring

**File**: `backend/services/peo/peo_contract_service.ts`

**Location**: Around line 865-910, in the destructuring of `contractDetails`

**Add these fields to the destructuring** (around line 910):
```typescript
origHireDate,
lastHireDate,
```

The full destructuring block starts around line 865. Add `origHireDate` and `lastHireDate` near the other date-related fields.

### Step 2: Modify the createPEOContract call

**Location**: Lines 1212-1213

**Current code**:
```typescript
origHireDate: contractStartDate,
lastHireDate: contractStartDate,
```

**Change to**:
```typescript
origHireDate: origHireDate || contractStartDate,
lastHireDate: lastHireDate || contractStartDate,
```

This preserves backward compatibility:
- If `origHireDate`/`lastHireDate` are passed, use them
- If not passed (undefined), fall back to `contractStartDate` (existing behavior)

### Step 3: Verify schema supports these fields

**File**: `backend/services/peo/schemas.ts`

The schema at lines 139-140 already supports these fields:
```typescript
origHireDate: Joi.string(),
lastHireDate: Joi.string(),
```

No changes needed to the schema.

## Acceptance Criteria

- [ ] `origHireDate` is destructured from `contractDetails`
- [ ] `lastHireDate` is destructured from `contractDetails`
- [ ] The `createPEOContract` call uses passed values with fallback to `contractStartDate`
- [ ] Existing behavior is preserved when values aren't passed

## Testing

1. Entity transfer should now preserve original hire dates
2. Regular contract creation (non-entity-transfer) should still work with default behavior
3. Run existing tests to ensure no regression

## Notes

- `seniorityDate` is already handled at line 1242 with conditional spreading:
  ```typescript
  ...(seniorityDate ? {seniorityDate, isRehire: true} : {}),
  ```
  So no changes needed for `seniorityDate` - it will pass through if provided in Work Item 01.
