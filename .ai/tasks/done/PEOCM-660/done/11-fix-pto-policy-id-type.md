<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 11-fix-pto-policy-id-type.md                         ║
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

# Fix new_pto_policy_id Type (VARCHAR(64) → UUID)

## Problem

The `new_pto_policy_id` column in `peo.peo_employee_transfer_items` is defined as `VARCHAR(64)`, but the source table `time_off.policies.uid` is `UUID`.

**Impact**: Works functionally but loses type safety and validation. UUIDs stored as VARCHAR don't get database-level format validation.

## Objective

Change `new_pto_policy_id` from `VARCHAR(64)` to `UUID` for type consistency and validation.

## Implementation Steps

### Step 1: Create Migration

**File**: `peo/migrations/YYYYMMDDHHMMSS-alter_peo_employee_transfer_items_fix_pto_policy_id_type.js`

```javascript
const { schema } = require('./config');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // First, ensure all existing values are valid UUIDs
        // This will fail if there are invalid values, which is the intended behavior
        await queryInterface.changeColumn(
            { tableName: 'peo_employee_transfer_items', schema },
            'new_pto_policy_id',
            {
                type: Sequelize.UUID,
                allowNull: false,
            }
        );
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn(
            { tableName: 'peo_employee_transfer_items', schema },
            'new_pto_policy_id',
            {
                type: Sequelize.STRING(64),
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
new_pto_policy_id: DataTypes.STRING(64)
```

To:
```typescript
new_pto_policy_id: DataTypes.UUID
```

### Step 3: Verify Existing Data

Before running migration, verify all existing values are valid UUIDs:

```sql
SELECT new_pto_policy_id
FROM peo.peo_employee_transfer_items
WHERE new_pto_policy_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
```

Should return 0 rows.

## Acceptance Criteria

- [ ] Migration created and tested locally
- [ ] Sequelize model updated
- [ ] TypeScript types remain unchanged (already `string`)
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
   AND column_name = 'new_pto_policy_id';
   ```
   Should return `uuid` instead of `character varying`.

## Notes

- This is a **narrowing** type change (VARCHAR → UUID)
- Migration will fail if any existing values are not valid UUIDs
- Should be safe since all PTO policy UIDs are generated as UUIDs
