<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-migrate-job-code-to-public-id.md                  ║
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

# Migrate existing new_job_code data to new_position_public_id

## Objective

Create a migration that populates `new_position_public_id` by looking up the `public_id` from `peo_positions` table using the existing `new_job_code` value.

## Pre-Implementation

Before creating the migration, verify the data mapping:

```sql
-- Check how many transfer items exist
SELECT COUNT(*) FROM peo.peo_employee_transfer_items;

-- Check if all new_job_code values can be mapped to positions
SELECT
    ti.new_job_code,
    pp.public_id,
    pp.code,
    pp.title
FROM peo.peo_employee_transfer_items ti
LEFT JOIN peo.peo_positions pp ON pp.code = ti.new_job_code
WHERE ti.new_position_public_id IS NULL;

-- Check for any orphaned codes (no matching position)
SELECT ti.new_job_code, COUNT(*)
FROM peo.peo_employee_transfer_items ti
LEFT JOIN peo.peo_positions pp ON pp.code = ti.new_job_code
WHERE pp.id IS NULL
GROUP BY ti.new_job_code;
```

## Implementation Steps

### Step 1: Create data migration

**File**: `peo/migrations/YYYYMMDDHHMMSS-migrate_job_code_to_position_public_id__pre_release.js`

```javascript
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Migrate existing new_job_code to new_position_public_id
        // by looking up the public_id from peo_positions where code matches
        await queryInterface.sequelize.query(`
            UPDATE peo.peo_employee_transfer_items ti
            SET new_position_public_id = pp.public_id
            FROM peo.peo_positions pp
            WHERE pp.code = ti.new_job_code
              AND ti.new_position_public_id IS NULL;
        `);

        // Log any rows that couldn't be migrated (orphaned codes)
        const [orphanedRows] = await queryInterface.sequelize.query(`
            SELECT id, new_job_code
            FROM peo.peo_employee_transfer_items
            WHERE new_position_public_id IS NULL;
        `);

        if (orphanedRows.length > 0) {
            console.warn('WARNING: The following transfer items could not be migrated (no matching position):');
            orphanedRows.forEach(row => {
                console.warn(`  - ID: ${row.id}, new_job_code: ${row.new_job_code}`);
            });
            throw new Error(`Migration failed: ${orphanedRows.length} transfer items have no matching position. Please resolve manually.`);
        }
    },

    async down(queryInterface, Sequelize) {
        // Clear the new_position_public_id values (data can be re-migrated)
        await queryInterface.sequelize.query(`
            UPDATE peo.peo_employee_transfer_items
            SET new_position_public_id = NULL;
        `);
    },
};
```

### Step 2: Handle edge cases

If there are orphaned codes (job codes that don't match any position), you have options:

**Option A: Manual fix before migration**
```sql
-- Find the correct position and update manually
UPDATE peo.peo_employee_transfer_items
SET new_job_code = 'CORRECT_CODE'
WHERE id = 'orphaned_item_id';
```

**Option B: Create missing positions**
```sql
-- If the position should exist but doesn't
INSERT INTO peo.peo_positions (public_id, code, title, peo_client_id, created_at, updated_at)
VALUES (gen_random_uuid(), 'MISSING_CODE', 'Position Title', client_id, NOW(), NOW());
```

## Acceptance Criteria

- [ ] Migration file created with `__pre_release` suffix
- [ ] All existing `new_job_code` values mapped to `new_position_public_id`
- [ ] No orphaned transfer items (all have `new_position_public_id`)
- [ ] Migration fails gracefully if orphaned rows exist
- [ ] Rollback clears `new_position_public_id` values

## Testing

```bash
# Run migration
cd peo && npm run migrate

# Verify all rows have new_position_public_id
psql -c "SELECT COUNT(*) FROM peo.peo_employee_transfer_items WHERE new_position_public_id IS NULL;"
# Should return 0

# Verify data integrity
psql -c "
SELECT ti.id, ti.new_job_code, ti.new_position_public_id, pp.code, pp.title
FROM peo.peo_employee_transfer_items ti
JOIN peo.peo_positions pp ON pp.public_id = ti.new_position_public_id
LIMIT 10;
"
```

## Notes

- This migration depends on work item 02 being completed first
- If there are orphaned codes, investigate and fix before proceeding
- The migration will fail (by design) if any rows can't be migrated
- Consider running on staging first to identify any data issues
