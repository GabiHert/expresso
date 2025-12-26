<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 10-fix-payroll-setting-id-type.md                    ║
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
priority: CRITICAL
---

# Fix new_employment_payroll_setting_id Type (UUID → TEXT)

## Problem

The `new_employment_payroll_setting_id` column in `peo.peo_employee_transfer_items` is defined as `UUID`, but the source table `employment.payroll_settings.id` uses `TEXT` with mixed formats:

- UUIDs: `617046f3-f7ab-4469-81b3-f2f88e3c401f`
- CUIDs: `clu6rwbbl0km9uu01oxe3xts9`
- CUIDs: `cm8g3kk1008ua01t2fonc2hpr`

**Impact**: Inserts will FAIL for any transfer with CUID-style payroll setting IDs because UUIDs cannot store CUID values.

## Objective

Change `new_employment_payroll_setting_id` from `UUID` to `TEXT` to match the source table type.

## Implementation Steps

### Step 1: Create Migration

**File**: `peo/migrations/YYYYMMDDHHMMSS-alter_peo_employee_transfer_items_fix_payroll_setting_id_type.js`

```javascript
const { schema } = require('./config');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn(
            { tableName: 'peo_employee_transfer_items', schema },
            'new_employment_payroll_setting_id',
            {
                type: Sequelize.TEXT,
                allowNull: false,
            }
        );
    },

    down: async (queryInterface, Sequelize) => {
        // NOTE: This down migration may fail if there are CUID values in the column
        await queryInterface.changeColumn(
            { tableName: 'peo_employee_transfer_items', schema },
            'new_employment_payroll_setting_id',
            {
                type: Sequelize.UUID,
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
new_employment_payroll_setting_id: DataTypes.UUID
```

To:
```typescript
new_employment_payroll_setting_id: DataTypes.TEXT
```

### Step 3: Update TypeScript Types

If there are any TypeScript interfaces/types that reference this field, update them:

```typescript
// Before
new_employment_payroll_setting_id: string; // UUID format expected

// After
new_employment_payroll_setting_id: string; // TEXT - can be UUID or CUID
```

## Acceptance Criteria

- [ ] Migration created and tested locally
- [ ] Sequelize model updated
- [ ] TypeScript types updated (if any)
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
   AND column_name = 'new_employment_payroll_setting_id';
   ```
   Should return `text` instead of `uuid`.

3. Test inserting a CUID value:
   ```sql
   -- This should now succeed
   INSERT INTO peo.peo_employee_transfer_items (
       ..., new_employment_payroll_setting_id, ...
   ) VALUES (
       ..., 'clu6rwbbl0km9uu01oxe3xts9', ...
   );
   ```

## Notes

- This is a **CRITICAL** fix - the current schema will fail for organizations using CUID-style payroll setting IDs
- The migration is non-destructive (widening type from UUID to TEXT)
- Rollback may fail if CUID values exist in the column
