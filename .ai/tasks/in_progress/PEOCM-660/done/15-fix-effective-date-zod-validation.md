<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 15-fix-effective-date-zod-validation.md               ║
║ TASK: PEOCM-660                                                  ║
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

# Fix effectiveDate Zod Validation Type Mismatch

## Problem

The `TerminationSanityCheckStep` Zod schema expects `effectiveDate` to be a **string**, but the `entity_transfer_repository.ts` mapper converts it to a **Date object** before validation runs.

**Error**: "Effective date is required" - caused by calling `.trim()` on a Date object.

## Root Cause

1. **Line 189** (`entity_transfer_repository.ts`): Converts string to Date:
   ```typescript
   effectiveDate: new Date(response.effectiveDate)
   ```

2. **Lines 53-77** (`termination_sanity_check_step.ts`): Validates as string:
   ```typescript
   effectiveDate: z
       .string({ message: 'Effective date is required' })
       .refine((val) => val && val.trim().length > 0, ...)
   ```

3. When `.trim()` is called on a Date object, it fails → validation error.

## Implementation Steps

### Step 1: Update Zod Schema

**File**: `backend/services/peo/entity_transfer/steps/termination_sanity_check_step.ts`

**Change**: Update the `effectiveDate` validation to accept Date objects instead of strings.

Replace lines 53-77:
```typescript
effectiveDate: z
    .date({
        message: 'Effective date is required',
    })
    .refine(
        (val) => {
            return val instanceof Date && !isNaN(val.getTime());
        },
        {
            message: 'Invalid effective date',
        }
    )
    .refine(
        (val) => {
            const effectiveDate = moment(val);
            return !effectiveDate.isBefore(moment().startOf('day'));
        },
        {
            message: 'Effective date is in the past',
        }
    ),
```

### Step 2: Verify Usage in Step

**File**: `backend/services/peo/entity_transfer/steps/termination_sanity_check_step.ts`

**Line 350**: The `effectiveDate` is passed to `findManyCycles`:
```typescript
startFrom: context.request.transfer.effectiveDate,
```

Verify that `findManyCycles` can accept a Date object (it likely can, since JS handles Date → string coercion).

### Step 3: Check Other Steps

Search for other steps that validate `effectiveDate` and ensure consistency:
- `CrossHireSanityCheckStep`
- Any other steps using similar Zod schemas

## Acceptance Criteria

- [ ] Entity transfer endpoint no longer fails with "Effective date is required"
- [ ] Effective date validation still rejects:
  - Missing/null dates
  - Invalid date values
  - Dates in the past
- [ ] Payroll cycle query works correctly with Date object

## Testing

1. Run the entity transfer test with validated payload
2. Verify the request passes `TerminationSanityCheckStep`
3. Confirm date-in-past validation still works

## Notes

- The `PeoEmployeeTransfer` interface defines `effectiveDate: Date` (line 27 in types.ts)
- This is consistent with the fix - the schema should match the type definition
