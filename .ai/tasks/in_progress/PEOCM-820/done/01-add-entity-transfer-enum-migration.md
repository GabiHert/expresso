<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-add-entity-transfer-enum-migration.md              ║
║ TASK: PEOCM-820                                                   ║
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

# Add entity_transfer to database enum

## Objective

Create a database migration to add the `'entity_transfer'` value to the `peo.enum_peo_contracts_origin` PostgreSQL enum type. This will resolve the database error when filtering or creating contracts with the EntityTransfer origin.

## Pre-Implementation

Before starting, consider running an **exploration agent** to gather context about:
- Migration patterns in the peo service
- How enum values are added to existing enums
- Migration naming conventions

## Implementation Steps

### Step 1: Create migration file

**File**: `peo/migrations/{timestamp}-add_entity_transfer_in_peo_contracts_origin.js`

**Instructions**:
1. Generate a migration timestamp using the standard format: `YYYYMMDDHHMMSS`
2. Create the migration file following the pattern from `20250424133208-add_workday_gpc_in_peo_contracts_origin.js`
3. Use `ALTER TYPE` with `IF NOT EXISTS` to safely add the enum value

**Migration template**:
```javascript
const { schema } = require('./config');

module.exports = {
    /**
     * Instructions (https://www.notion.so/deel/SQL-Best-Practices-62fe8f21e66e48d791e9c2f2e24c7a51)
     * =============
     * Separate modifying different tables to different transactions/migrations - to avoid potential deadlocks
     * Avoid long running migrations - use a runtime_script instead
     * Comment all new/modified tables and columns. Add the `SENSITIVE` tag and anonymize sensitive columns (https://www.notion.so/deel/DB-Documentation-dbdocs-651dd0f7226d4c21a2db0b5b56bc60cb#dcd88923d2b041a085e79aebb092e3c2)
     * Use lower_snake_case for table, column and any other object name. Table names should be last-word-plural
     * Use the proper data type, for strings set an appropriate size limit
     * Any change you make in the migration must reflect in the model and vice versa - they must be aligned
     *
     * @param {import("sequelize").QueryInterface} queryInterface
     * @param {typeof import('sequelize')} Sequelize
     * @returns {Promise<void>}
     */
    up: async (queryInterface) => {
        await queryInterface.sequelize.query(
            "ALTER TYPE peo.enum_peo_contracts_origin ADD VALUE IF NOT EXISTS 'entity_transfer';"
        );
    },
};
```

### Step 2: Verify migration structure

**Instructions**:
1. Ensure the migration follows the exact pattern from existing enum migrations
2. Use `IF NOT EXISTS` to make the migration idempotent
3. Verify the schema is `peo` and enum name is `enum_peo_contracts_origin`
4. Verify the value is `'entity_transfer'` (matches TypeScript enum value)

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [x] Migration file created with correct timestamp format
- [x] Migration uses `ALTER TYPE ... ADD VALUE IF NOT EXISTS` pattern
- [x] Enum value `'entity_transfer'` is added to `peo.enum_peo_contracts_origin`
- [x] Migration is idempotent (can be run multiple times safely)
- [x] Migration follows project conventions and includes proper comments

## Testing

1. **Local testing**: Run the migration locally and verify the enum value is added
2. **Verify enum**: Query the database to confirm `'entity_transfer'` appears in the enum:
   ```sql
   SELECT unnest(enum_range(NULL::peo.enum_peo_contracts_origin));
   ```
3. **Idempotency**: Run the migration twice to ensure it doesn't fail on second run

## Notes

- The TypeScript enum already has `EntityTransfer: 'entity_transfer'` defined
- This migration only adds the database enum value
- No data migration is needed as no contracts currently use this origin
- Migration must be deployed before the backend code changes

## Implementation Notes

✅ **Completed**: Migration file created at `peo/migrations/20251222150000-add_entity_transfer_in_peo_contracts_origin.js`
- Follows the exact pattern from `20250424133208-add_workday_gpc_in_peo_contracts_origin.js`
- Uses `IF NOT EXISTS` for idempotency
- Properly formatted with all required comments

