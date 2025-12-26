<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 13-fix-contract-oid-type.md                          ║
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
priority: LOW
---

# Fix new_contract_oid Type (VARCHAR(100) → VARCHAR(20))

## Problem

The `new_contract_oid` column in `peo.peo_employee_transfer_items` is defined as `VARCHAR(100)`, but:

- `peo.peo_contracts.deel_contract_oid` is `VARCHAR(20)`
- `base_contract_oid` in the same table is `VARCHAR(20)`

**Impact**: Inconsistency within the same table and with the source table. Functionally works but allows storing longer values than should ever exist.

## Objective

Change `new_contract_oid` from `VARCHAR(100)` to `VARCHAR(20)` for consistency.

## Implementation Steps

### Step 1: Verify No Long Values Exist

Before creating migration, verify no values exceed 20 characters:

```sql
SELECT new_contract_oid, LENGTH(new_contract_oid)
FROM peo.peo_employee_transfer_items
WHERE LENGTH(new_contract_oid) > 20;
```

Should return 0 rows.

### Step 2: Create Migration

**File**: `peo/migrations/YYYYMMDDHHMMSS-alter_peo_employee_transfer_items_fix_contract_oid_type.js`

```javascript
const { schema } = require('./config');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn(
            { tableName: 'peo_employee_transfer_items', schema },
            'new_contract_oid',
            {
                type: Sequelize.STRING(20),
                allowNull: true, // This field is nullable
            }
        );
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn(
            { tableName: 'peo_employee_transfer_items', schema },
            'new_contract_oid',
            {
                type: Sequelize.STRING(100),
                allowNull: true,
            }
        );
    },
};
```

### Step 3: Update Sequelize Model

**File**: `peo/src/models/peoEmployeeTransferItem.ts` (or similar)

Change the field definition from:
```typescript
new_contract_oid: DataTypes.STRING(100)
```

To:
```typescript
new_contract_oid: DataTypes.STRING(20)
```

## Acceptance Criteria

- [ ] No existing values exceed 20 characters (verified via SQL)
- [ ] Migration created and tested locally
- [ ] Sequelize model updated
- [ ] Consistent with `base_contract_oid` column type
- [ ] Unit tests pass

## Testing

1. Run migration locally:
   ```bash
   npm run db:migrate
   ```

2. Verify column type changed:
   ```sql
   SELECT column_name, character_maximum_length
   FROM information_schema.columns
   WHERE table_schema = 'peo'
   AND table_name = 'peo_employee_transfer_items'
   AND column_name = 'new_contract_oid';
   ```
   Should return `20` instead of `100`.

## Notes

- This is a **narrowing** type change (VARCHAR(100) → VARCHAR(20))
- Migration will fail if any existing values exceed 20 characters
- Low priority since it doesn't cause functional issues
- Should be bundled with other type fixes in a single migration if possible
