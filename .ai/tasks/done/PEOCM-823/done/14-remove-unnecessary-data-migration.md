<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 14-remove-unnecessary-data-migration.md              ║
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

# Remove unnecessary data migration

## Context

Since `peo_employee_transfer_items` has 0 rows (new feature, no existing data), the data migration `migrate_job_code_to_position_public_id` is unnecessary. It would run an UPDATE that affects 0 rows.

## Objective

Delete the unnecessary data migration file. Keep only the schema finalization migration.

## Implementation Steps

### Step 1: Delete the data migration

```bash
rm peo/post_deployment_migrations/20260105130000-migrate_job_code_to_position_public_id.js
```

### Step 2: Update finalize migration

Remove the NULL check from the finalize migration since there's no data to validate:

**File**: `peo/post_deployment_migrations/20260105130001-finalize_position_public_id_schema.js`

Remove this block (lines ~26-36):
```javascript
// First, verify all rows have been migrated
const [unmigrated] = await queryInterface.sequelize.query(`
    SELECT COUNT(*) as count
    FROM "${schema}"."peo_employee_transfer_items"
    WHERE new_position_public_id IS NULL;
`);

if (parseInt(unmigrated[0].count) > 0) {
    throw new Error(
        `Cannot finalize schema: ${unmigrated[0].count} rows still have NULL new_position_public_id. ` +
        `Run the data migration first: migrate_job_code_to_position_public_id`
    );
}
```

### Step 3: Commit and push

```bash
git add -A
git commit -m "PEOCM-823: remove unnecessary data migration"
git push
```

## Acceptance Criteria

- [ ] Data migration file deleted
- [ ] Finalize migration simplified (NULL check removed)
- [ ] Changes committed and pushed

## Notes

- The finalize migration still handles: making column NOT NULL and dropping old column
- No data migration needed since table has 0 rows
