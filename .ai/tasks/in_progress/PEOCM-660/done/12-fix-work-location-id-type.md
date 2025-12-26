<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 12-fix-work-location-id-type.md                      ║
║ TASK: PEOCM-660                                                 ║
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
priority: MEDIUM
---

# Fix new_work_location_id Type (VARCHAR(100) → UUID)

## Problem

The `new_work_location_id` column in `peo.peo_employee_transfer_items` is defined as `VARCHAR(100)`, but the source tables use `UUID`:

- `public.entity_work_locations.public_id` → UUID
- `peo.peo_work_locations.deel_entity_work_location_id` → UUID

**Impact**: Works functionally but loses type safety and validation.

## Objective

Change `new_work_location_id` from `VARCHAR(100)` to `UUID` for type consistency.

## Implementation Steps

### Step 1: Create Migration

**File**: `peo/migrations/YYYYMMDDHHMMSS-alter_peo_employee_transfer_items_fix_work_location_id_type.js`

```javascript
const { schema } = require('./config');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn(
            { tableName: 'peo_employee_transfer_items', schema },
            'new_work_location_id',
            {
                type: Sequelize.UUID,
                allowNull: false,
            }
        );
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn(
            { tableName: 'peo_employee_transfer_items', schema },
            'new_work_location_id',
            {
                type: Sequelize.STRING(100),
                allowNull: false,
            }
        );
    },
};
```

### Step 2: Update Sequelize Model

**File**: `peo/src/models/peoEmployeeTransferItem.ts` (or similar)

Change the field definition from:
```typescript
new_work_location_id: DataTypes.STRING(100)
```

To:
```typescript
new_work_location_id: DataTypes.UUID
```

### Step 3: Verify Existing Data

Before running migration, verify all existing values are valid UUIDs:

```sql
SELECT new_work_location_id
FROM peo.peo_employee_transfer_items
WHERE new_work_location_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
```

Should return 0 rows.

## Acceptance Criteria

- [ ] Migration created and tested locally
- [ ] Sequelize model updated
- [ ] No breaking changes to existing API contracts
- [ ] Unit tests pass

## Testing

1. Run migration locally:
   ```bash
   npm run db:migrate
   ```

2. Verify column type changed:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'peo'
   AND table_name = 'peo_employee_transfer_items'
   AND column_name = 'new_work_location_id';
   ```
   Should return `uuid` instead of `character varying`.

## Notes

- This is a **narrowing** type change (VARCHAR → UUID)
- Migration will fail if any existing values are not valid UUIDs
- Work location public IDs are always UUIDs, so this should be safe
