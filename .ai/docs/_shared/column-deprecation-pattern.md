<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: DOMAIN                                                    ║
║ STATUS: Current                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ NAVIGATION:                                                      ║
║ • Parent: .ai/docs/_shared/README.md                             ║
║ • Related: database-table-ownership.md                           ║
║ • Index: .ai/INDEX.md                                           ║
╚══════════════════════════════════════════════════════════════════╝
-->

# Column Deprecation Pattern

How to safely deprecate (remove) database columns at Deel.

---

## Overview

- **What**: The standard process for removing database columns
- **Why**: Ensures safe rollback capability and prevents data loss
- **When**: Whenever you need to drop a column from a table

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| Deprecation | Renaming a column to `{name}_old` instead of dropping it |
| Post-deployment | Migrations that run after code is deployed |
| Soft delete | Keeping data available for rollback before permanent removal |

---

## The Pattern

### Step 1: Rename to `_old` (First Migration)

**DO NOT** use `removeColumn()` directly. Instead, **rename** the column:

```javascript
// CORRECT: Deprecate by renaming
await queryInterface.renameColumn(
    'table_name',
    'column_name',
    'column_name_old',
    { transaction }
);
```

```javascript
// WRONG: Direct removal (unsafe)
await queryInterface.removeColumn(
    'table_name',
    'column_name',
    { transaction }
);
```

### Step 2: Drop `_old` Column (Later Migration)

After confirming the deprecation is safe (weeks/months later), create a separate migration to drop the `_old` column:

```javascript
await queryInterface.removeColumn(
    'table_name',
    'column_name_old',
    { transaction }
);
```

---

## Examples from Codebase

### Example 1: Deprecating `new_prism_employee_id`

**File**: `peo/post_deployment_migrations/20250826113643-deprecate_new_prism_employee_id_field_peo_contract.js`

```javascript
const up = async (queryInterface, Sequelize) => {
    try {
        await queryInterface.sequelize.transaction(async transaction => {
            log.info('Starting to deprecate new_prism_employee_id field');

            await queryInterface.renameColumn(
                'peo_contracts',
                'new_prism_employee_id',
                'new_prism_employee_id_old',
                { transaction }
            );

            log.info('Successfully finished executing script');
        });

        results.success++;
    } catch (err) {
        results.errors++;
        log.error({ err });
    }
};
```

### Example 2: Deprecating `is_new_instance`

**File**: `peo/post_deployment_migrations/20250826150149-deprecate_is_new_instance_field_peo_clients.js`

```javascript
await queryInterface.renameColumn(
    'peo_clients',
    'is_new_instance',
    'is_new_instance_old',
    { transaction }
);
```

---

## Migration Template

```javascript
// Affected records: Schema change (1 table)
// Estimated run time: < 1 second

const results = {
    success: 0,
    errors: 0,
};

/**
 * Deprecate {column_name} column from {table_name}
 *
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {typeof import('sequelize')} Sequelize
 * @returns {Promise<void>}
 */
const up = async (queryInterface, Sequelize) => {
    try {
        await queryInterface.sequelize.transaction(async transaction => {
            log.info('Starting to deprecate {column_name} field');

            await queryInterface.renameColumn(
                '{table_name}',
                '{column_name}',
                '{column_name}_old',
                { transaction }
            );

            log.info('Successfully finished executing script');
        });

        results.success++;
    } catch (err) {
        results.errors++;
        log.error({ err });
    }

    log.info({ message: 'Runtime script result', results: JSON.stringify(results) });
};

module.exports = { up };
```

---

## Common Pitfalls

1. **Using `removeColumn()` directly** - This permanently deletes data with no rollback option
2. **Forgetting to update the Sequelize model** - Remove the field from the model BEFORE running the deprecation migration
3. **Not waiting before dropping `_old`** - Give time to verify the change is safe before permanent removal

---

## Related Documentation

- [Database Table Ownership](./database-table-ownership.md)
- [Deel Wiki: Deprecating Tables/Columns](https://wiki.deel.network/i/4969#deprecating-tablescolumns)

---

_Created: 2026-01-05_
_Last Updated: 2026-01-05_
