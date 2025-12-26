<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-remove-effectivedate-job-data-builder.md           ║
║ TASK: PEOCM-819                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
---

repo: backend
---

# Remove effectiveDate from job_data_update_builder

## Objective

Remove the incorrect `effectiveDate` assignments from the `buildContractUpdateData` and `buildWorkStatementUpdateData` methods in `job_data_update_builder.ts`.

## Implementation Steps

### Step 1: Remove effectiveDate from Contract update

**File**: `backend/services/peo/integrations/hris_integration_update/builders/job_data_update_builder.ts`

**Line 163** - Remove this block:
```typescript
// REMOVE THIS:
...(peoStartDate ? {effectiveDate: (peoStartDate as unknown) as Date, effectivePlainDate: peoStartDate} : {}),
```

**Keep** the `initialEffectiveDate` block (lines 164-165):
```typescript
// KEEP THIS:
...(contractStartDate ? {initialEffectiveDate: (contractStartDate as unknown) as Date, initialEffectivePlainDate: contractStartDate} : {}),
```

### Step 2: Remove effectiveDate from WorkStatement update

**File**: `backend/services/peo/integrations/hris_integration_update/builders/job_data_update_builder.ts`

**Line 176** - Remove this block:
```typescript
// REMOVE THIS:
...(contractStartDate ? {effectiveDate: (contractStartDate as unknown) as Date} : {}),
```

**Note**: Also check if `effectivePlainDate` should be removed from WorkStatement at line 177.

### Step 3: Update interfaces if needed

Check if `ContractUpdateData` and `WorkStatementUpdateData` interfaces still need `effectiveDate` field. If not used elsewhere in HRIS flow, consider removing from interface.

## Acceptance Criteria

- [x] `buildContractUpdateData` no longer returns `effectiveDate` or `effectivePlainDate`
- [x] `buildWorkStatementUpdateData` no longer returns `effectiveDate`
- [x] `initialEffectiveDate` and `initialEffectivePlainDate` still work correctly
- [x] TypeScript compiles without errors

## Testing

After changes, run:
```bash
cd backend && npm run test -- --grep "job_data_update_builder"
```

Tests will fail until Work Item 03 is completed.

## Notes

- This is the PRIMARY bug location causing Bitfarms date overwrites
- The `initialEffectiveDate` field is CORRECT and should be kept
- Work Statement may need `effectivePlainDate` for other purposes - verify before removing

