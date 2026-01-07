<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-add-position-public-id-column.md                  ║
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

# Add new_position_public_id column

## Objective

Create a migration to add the `new_position_public_id` column to `peo_employee_transfer_items` table. The column is nullable initially to allow for data migration.

## Implementation Steps

### Step 1: Create migration file

**File**: `peo/migrations/YYYYMMDDHHMMSS-add_new_position_public_id_column__pre_release.js`

```javascript
'use strict';

const { addOwnerToComment } = require('../src/utils/dbCommentOwner');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            { tableName: 'peo_employee_transfer_items', schema: 'peo' },
            'new_position_public_id',
            {
                type: Sequelize.UUID,
                allowNull: true,  // Nullable initially for data migration
                comment: addOwnerToComment('@letsdeel/peo-team', 'Position public_id from peo_positions table'),
            }
        );

        // Add index for lookups
        await queryInterface.addIndex(
            { tableName: 'peo_employee_transfer_items', schema: 'peo' },
            ['new_position_public_id'],
            {
                name: 'idx_peo_employee_transfer_items_new_position_public_id',
            }
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex(
            { tableName: 'peo_employee_transfer_items', schema: 'peo' },
            'idx_peo_employee_transfer_items_new_position_public_id'
        );

        await queryInterface.removeColumn(
            { tableName: 'peo_employee_transfer_items', schema: 'peo' },
            'new_position_public_id'
        );
    },
};
```

### Step 2: Update Sequelize model (add new field, keep old)

**File**: `peo/src/models/entityTransfer/PeoEmployeeTransferItem.ts`

Add the new field alongside the existing `newJobCode`:

```typescript
// Keep existing field for now
newJobCode: {
    field: 'new_job_code',
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'Position code (e.g., MGR001)',
},
// Add new field
newPositionPublicId: {
    field: 'new_position_public_id',
    type: DataTypes.UUID,
    allowNull: true,  // Nullable until migration completes
    comment: 'Position public_id from peo_positions table',
},
```

Also add the TypeScript declaration:
```typescript
declare newPositionPublicId: string | null;
```

## Acceptance Criteria

- [ ] Migration file created with `__pre_release` suffix
- [ ] Migration adds `new_position_public_id` UUID column (nullable)
- [ ] Index created on the new column
- [ ] Sequelize model updated with new field
- [ ] Migration runs successfully: `npm run migrate`
- [ ] Rollback works: `npm run migrate:undo`

## Testing

```bash
# Run migration
cd peo && npm run migrate

# Verify column exists
psql -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'peo' AND table_name = 'peo_employee_transfer_items' AND column_name = 'new_position_public_id';"

# Verify index exists
psql -c "SELECT indexname FROM pg_indexes WHERE tablename = 'peo_employee_transfer_items' AND indexname LIKE '%new_position_public_id%';"
```

## Notes

- Column is nullable initially to allow existing rows to remain valid
- Next work item (03) will populate this column from existing data
- Following work item (04) will make it NOT NULL and drop old column
