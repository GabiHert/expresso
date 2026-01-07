<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 12-convert-finalize-to-post-deployment.md            ║
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
pr_feedback: marco-galvao-deel
depends_on: 11
---

# Convert finalize schema migration to post-deployment

## Context (PR Feedback)

From marco-galvao-deel on PR #1593:
> "Please, make it a post-deployment migration."

The migration that makes `new_position_public_id` NOT NULL and drops `new_job_code` should be a post-deployment migration. This ensures data migration (work item 11) completes first.

## Objective

Convert `migrations/20251229145152-finalize_position_public_id_schema__pre_release.js` to a post-deployment migration in `post_deployment_migrations/` folder.

## Implementation Steps

### Step 1: Delete the pre_release migration

```bash
rm peo/migrations/20251229145152-finalize_position_public_id_schema__pre_release.js
```

### Step 2: Create post-deployment migration

**File**: `peo/post_deployment_migrations/YYYYMMDDHHMMSS-finalize_position_public_id_schema.js`

```javascript
// TODO provide the info below for the review
// Affected records: Schema change (1 table)
// Estimated run time: < 1 second (schema modification)

const { schema } = require('../migrations/config');
const { addOwnerToComment } = require('@deel-core/migration');

const results = {
    success: 0,
    errors: 0,
};

/**
 * Finalize position public_id schema:
 * 1. Make new_position_public_id NOT NULL
 * 2. Drop the old new_job_code column
 *
 * IMPORTANT: Run this AFTER the data migration (migrate_job_code_to_position_public_id)
 * has completed successfully.
 *
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {typeof import('sequelize')} Sequelize
 * @returns {Promise<void>}
 */
const up = async (queryInterface, Sequelize) => {
    try {
        // First, verify all rows have been migrated
        const [unmigrated] = await queryInterface.sequelize.query(`
            SELECT COUNT(*) as count
            FROM "${schema}"."peo_employee_transfer_items"
            WHERE new_position_public_id IS NULL;
        `);

        if (unmigrated[0].count > 0) {
            throw new Error(
                `Cannot finalize schema: ${unmigrated[0].count} rows still have NULL new_position_public_id. ` +
                `Run the data migration first: migrate_job_code_to_position_public_id`
            );
        }

        await queryInterface.sequelize.transaction(async transaction => {
            log.info('Starting to finalize position_public_id schema');

            // Make new_position_public_id NOT NULL
            await queryInterface.changeColumn(
                { tableName: 'peo_employee_transfer_items', schema },
                'new_position_public_id',
                {
                    type: Sequelize.UUID,
                    allowNull: false,
                    comment: addOwnerToComment('@letsdeel/peo-cm', 'FK to peo_positions.public_id - Position identifier (UUID)'),
                },
                { transaction },
            );

            log.info('Made new_position_public_id NOT NULL');

            // Drop the old new_job_code column
            await queryInterface.removeColumn(
                { tableName: 'peo_employee_transfer_items', schema },
                'new_job_code',
                { transaction },
            );

            log.info('Dropped new_job_code column');
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

### Step 3: Generate timestamp and rename file

```bash
cd peo
# Use current timestamp for the new file name (must be AFTER work item 11's timestamp)
TIMESTAMP=$(date '+%Y%m%d%H%M%S')
mv post_deployment_migrations/YYYYMMDDHHMMSS-finalize_position_public_id_schema.js \
   post_deployment_migrations/${TIMESTAMP}-finalize_position_public_id_schema.js
```

## Execution Order

Post-deployment migrations run in timestamp order. Ensure:
1. `migrate_job_code_to_position_public_id` runs first (populates data)
2. `finalize_position_public_id_schema` runs second (makes NOT NULL, drops old column)

The timestamp naming will ensure correct order.

## Acceptance Criteria

- [ ] Pre-release migration file deleted
- [ ] Post-deployment migration created with correct structure
- [ ] Uses results tracking pattern
- [ ] Has only `up` function (no `down`)
- [ ] Includes pre-check for NULL values before schema change
- [ ] File timestamp is AFTER work item 11's migration timestamp

## Notes

- This migration has a safety check to ensure data migration completed first
- The transaction ensures both changes (NOT NULL + drop column) succeed or fail together
- No rollback needed - if we need to restore, create a new migration to add the column back
