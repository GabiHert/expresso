<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-drop-job-code-column.md                           ║
║ TASK: PEOCM-823                                                  ║
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
repo: peo
---

# Drop new_job_code and finalize schema

## Objective

After data migration is complete, make `new_position_public_id` NOT NULL and drop the `new_job_code` column. Update the Sequelize model and DTO validation.

## Pre-Implementation

Verify all data has been migrated:

```sql
-- Should return 0
SELECT COUNT(*) FROM peo.peo_employee_transfer_items WHERE new_position_public_id IS NULL;

-- Should return 0
SELECT COUNT(*) FROM peo.peo_employee_transfer_items WHERE new_job_code IS NOT NULL AND new_position_public_id IS NULL;
```

## Implementation Steps

### Step 1: Create schema finalization migration

**File**: `peo/migrations/YYYYMMDDHHMMSS-finalize_position_public_id_schema__pre_release.js`

```javascript
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Verify no NULL values before making NOT NULL
        const [nullRows] = await queryInterface.sequelize.query(`
            SELECT COUNT(*) as count FROM peo.peo_employee_transfer_items
            WHERE new_position_public_id IS NULL;
        `);

        if (nullRows[0].count > 0) {
            throw new Error(`Cannot make new_position_public_id NOT NULL: ${nullRows[0].count} rows have NULL values. Run data migration first.`);
        }

        // Make new_position_public_id NOT NULL
        await queryInterface.changeColumn(
            { tableName: 'peo_employee_transfer_items', schema: 'peo' },
            'new_position_public_id',
            {
                type: Sequelize.UUID,
                allowNull: false,
            }
        );

        // Drop the old new_job_code column
        await queryInterface.removeColumn(
            { tableName: 'peo_employee_transfer_items', schema: 'peo' },
            'new_job_code'
        );
    },

    async down(queryInterface, Sequelize) {
        // Re-add new_job_code column
        await queryInterface.addColumn(
            { tableName: 'peo_employee_transfer_items', schema: 'peo' },
            'new_job_code',
            {
                type: Sequelize.STRING(64),
                allowNull: true,  // Nullable since we can't restore the data
            }
        );

        // Make new_position_public_id nullable again
        await queryInterface.changeColumn(
            { tableName: 'peo_employee_transfer_items', schema: 'peo' },
            'new_position_public_id',
            {
                type: Sequelize.UUID,
                allowNull: true,
            }
        );
    },
};
```

### Step 2: Update Sequelize model

**File**: `peo/src/models/entityTransfer/PeoEmployeeTransferItem.ts`

Remove `newJobCode` and update `newPositionPublicId`:

```typescript
// REMOVE this:
// newJobCode: {
//     field: 'new_job_code',
//     type: DataTypes.STRING(64),
//     allowNull: false,
//     comment: 'Position code (e.g., MGR001)',
// },

// UPDATE this:
newPositionPublicId: {
    field: 'new_position_public_id',
    type: DataTypes.UUID,
    allowNull: false,  // Changed from true
    comment: 'Position public_id from peo_positions table',
},
```

Update TypeScript declaration:
```typescript
// REMOVE:
// declare newJobCode: string;

// UPDATE:
declare newPositionPublicId: string;  // No longer nullable
```

### Step 3: Update DTO validation

**File**: `peo/src/controllers/entityTransfer/entityTransferDto.ts`

```typescript
export const CreateTransferItemSchema = z.object({
    baseContractOid: z.string().min(1).max(20),
    newBenefitPrismGroupId: z.string().min(1).max(10),
    newEmploymentPayrollSettingId: z.string().min(1),
    newPtoPolicyId: z.string().uuid(),
    newWorkLocationId: z.string().uuid(),
    // CHANGE: newJobCode → newPositionPublicId
    newPositionPublicId: z.string().uuid(),  // UUID validation
    newTeamId: z.number().int().positive().optional(),
});
```

### Step 4: Update service layer

**File**: `peo/src/services/entityTransfer/entityTransferService.ts`

Update `CreateTransferItemInput` interface:
```typescript
export interface CreateTransferItemInput {
    baseContractOid: string;
    newBenefitPrismGroupId: string;
    newEmploymentPayrollSettingId: string;
    newPtoPolicyId: string;
    newWorkLocationId: string;
    newPositionPublicId: string;  // Changed from newJobCode
    newTeamId?: number;
}
```

Update `createTransfer()` method to use `newPositionPublicId`.

### Step 5: Update controller

**File**: `peo/src/controllers/entityTransfer/entityTransferController.ts`

Ensure controller uses updated DTO schema.

## Acceptance Criteria

- [ ] Migration makes `new_position_public_id` NOT NULL
- [ ] Migration drops `new_job_code` column
- [ ] Sequelize model updated (remove newJobCode, update newPositionPublicId)
- [ ] DTO validation updated for UUID format
- [ ] Service layer updated with new field name
- [ ] TypeScript compiles without errors
- [ ] All existing tests updated and passing

## Testing

```bash
# Run migration
cd peo && npm run migrate

# Verify column changes
psql -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'peo'
  AND table_name = 'peo_employee_transfer_items'
  AND column_name IN ('new_job_code', 'new_position_public_id');
"
# Should show: new_position_public_id | uuid | NO
# Should NOT show: new_job_code

# Run tests
cd peo && npm test
```

## Notes

- This migration is DESTRUCTIVE - cannot recover `new_job_code` values after rollback
- Ensure data migration (work item 03) is verified before running this
- Backend must be updated (work items 05-10) to use new field name
- Deploy PEO first, then backend
