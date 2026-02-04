<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-44-4-peo-nullable-effective-date.md            ║
║ TASK: EEXPR-44                                                   ║
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
# Repository Context (EEXPR-44)
repo: peo
repo_path: /Users/gabriel.herter/Documents/Projects/deel/peo
branch: EEXPR-44
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/peo
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# PEO: Make effectiveDate Nullable

## Objective

Make the `effective_date` column nullable in the `peo_employee_transfers` table and update all PEO-side types, models, DTOs, and formatters to handle null effectiveDate. This enables the backend to create transfers without an effectiveDate during the PENDING_SIGNATURES phase. A separate cron job will resolve the effectiveDate later before the transfer moves to SCHEDULED status.

## Context

Currently `effective_date` is `NOT NULL` in the database and required in all API contracts. The effectiveDate calculation is being removed from the transfer creation flow (see EEXPR-44-5) because:
- During PENDING_SIGNATURES, we don't have an effectiveDate yet
- The effectiveDate will be resolved later by a cron job
- The existing cron processor (`getReadyTransfers`) uses `WHERE effective_date <= today AND status = 'SCHEDULED'`, so null-date transfers in PENDING_SIGNATURES are naturally excluded

## Pre-Implementation

Before starting:
- Read `peo/migrations/20251217172700-create_peo_employee_transfers_table__pre_release.js` to see current column definition
- Read `peo/src/models/entityTransfer/PeoEmployeeTransfer.ts` for model definition
- Read `peo/src/controllers/entityTransfer/entityTransferDto.ts` for Zod validation schemas
- Read `peo/src/services/entityTransfer/entityTransferService.ts` for service usage

## Implementation Steps

### Step 1: Database Migration

**File**: `peo/migrations/YYYYMMDDHHMMSS-make_effective_date_nullable__pre_release.js` (new file)

**Instructions**:
Create a migration that changes `effective_date` from `NOT NULL` to nullable:

```javascript
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.changeColumn('peo_employee_transfers', 'effective_date', {
            type: Sequelize.DATEONLY,
            allowNull: true,
            comment: 'Date transfer takes effect. Null during PENDING_SIGNATURES phase, resolved before SCHEDULED.',
        });
    },
    down: async (queryInterface) => {
        await queryInterface.changeColumn('peo_employee_transfers', 'effective_date', {
            type: Sequelize.DATEONLY,
            allowNull: false,
            comment: 'Date transfer takes effect',
        });
    },
};
```

### Step 2: Update Model

**File**: `peo/src/models/entityTransfer/PeoEmployeeTransfer.ts`

**Instructions**:
1. Change the model field declaration from `declare effectiveDate: Date;` to `declare effectiveDate: Date | null;`
2. Update the column definition to `allowNull: true`

### Step 3: Update DTOs

**File**: `peo/src/controllers/entityTransfer/entityTransferDto.ts`

**Instructions**:
1. Find the create transfer schema where `effectiveDate` is validated with `.regex(/^\d{4}-\d{2}-\d{2}$/)`
2. Make it optional/nullable: `.string().regex(...).nullable().optional()`
3. Update any response DTOs that include effectiveDate to allow null

### Step 4: Update Service Formatters

**File**: `peo/src/services/entityTransfer/entityTransferService.ts`

**Instructions**:
1. Find the `formatTransferResponse()` or equivalent formatter that converts model to API response
2. Handle null effectiveDate: output `null` instead of formatting a date string
3. Update the `createTransfer()` method to accept optional effectiveDate in input
4. Update the `TransferRecordResponse` interface to make effectiveDate nullable: `effectiveDate: string | null`

### Step 5: Update Type Interfaces

**File**: `peo/src/services/entityTransfer/entityTransferService.ts` (or wherever `CreateTransferInput` is defined)

**Instructions**:
1. Make effectiveDate optional in the create transfer input type: `effectiveDate?: Date`
2. Make effectiveDate nullable in any response type: `effectiveDate: string | null`

## Post-Implementation

After completing, run a code review agent to check for issues.

## Acceptance Criteria

- `effective_date` column is nullable in the database
- PEO model accepts null effectiveDate
- Create transfer API accepts requests without effectiveDate
- Response types return `null` when effectiveDate is not set
- Existing `getReadyTransfers()` query still works (WHERE clause naturally excludes nulls with `<=` comparison)
- No breaking changes to existing transfers that already have effectiveDate

## Testing

1. Run migration on local/giger DB, verify column is nullable
2. Create a transfer without effectiveDate via API — should succeed
3. Create a transfer with effectiveDate — should still work
4. Verify `getReadyTransfers()` excludes null-date transfers
5. Verify response format for both null and non-null effectiveDate

## Notes

- **Shared file**: `PeoEmployeeTransfer.ts` is also modified by EEXPR-44-1 Step 1b-ii (agreementId removal). If EEXPR-44-1 runs first, re-explore line numbers before executing Step 2.
- **Dependency**: EEXPR-44-5 (Backend) depends on this being deployed first
- The `getReadyTransfers()` query uses `effective_date <= :date` which in PostgreSQL evaluates to NULL for null values (excluded from results), so no query changes needed
- Existing transfers with effectiveDate set are unaffected
