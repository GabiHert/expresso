<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-remove-effectivedate-hris-sync-service.md          ║
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

# Remove effectiveDate from peo_hris_sync_service

## Objective

Remove the incorrect `effectiveDate` and `effectivePlainDate` assignments from Contract updates in `peo_hris_sync_service.ts`.

## Implementation Steps

### Step 1: Locate the bug

**File**: `backend/services/peo/peo_hris_sync_service.ts`

**Lines 170-171** - Find the Contract update that sets:
```typescript
// REMOVE THESE:
effectiveDate: (peoStartDate as unknown) as Date,
effectivePlainDate: (peoStartDate as unknown) as Date,
```

### Step 2: Remove effectiveDate assignments

Remove lines 170-171 from the Contract update object. Keep all other fields.

### Step 3: Verify no other occurrences

Search the file for other `effectiveDate` assignments on Contract:
```bash
grep -n "effectiveDate" backend/services/peo/peo_hris_sync_service.ts
```

Ensure only CORRECT usages remain (e.g., reading from payload, using for Employment/Compensation).

## Acceptance Criteria

- [x] `peo_hris_sync_service.ts` no longer sets `effectiveDate` on Contract during sync
- [x] `peo_hris_sync_service.ts` no longer sets `effectivePlainDate` on Contract during sync
- [x] Other effectiveDate usages (Employment, Compensation, Time Tracking) remain unchanged
- [x] TypeScript compiles without errors

## Testing

After changes, run:
```bash
cd backend && npm run test -- --grep "peo_hris_sync_service"
```

Tests may fail until Work Item 03 is completed.

## Notes

- This service handles a different code path than `job_data_update_builder.ts`
- Both paths need to be fixed for complete resolution
- Verify the sync flow this service handles vs the job data update flow

