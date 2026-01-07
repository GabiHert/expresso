<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 11-convert-migrate-to-post-deployment.md             ║
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
---

# Convert data migration to post-deployment

## Context (PR Feedback)

From marco-galvao-deel on PR #1593:
> "Please, make it a post-deployment migration."

The migration that populates `new_position_public_id` from `new_job_code` should be a post-deployment migration since it's a data migration that can run after the release.

## Objective

Convert `migrations/20251229143155-migrate_job_code_to_position_public_id__pre_release.js` to a post-deployment migration in `post_deployment_migrations/` folder.

## Implementation Steps

### Step 1: Delete the pre_release migration

```bash
rm peo/migrations/20251229143155-migrate_job_code_to_position_public_id__pre_release.js
```

### Step 2: Create post-deployment migration

**File**: `peo/post_deployment_migrations/YYYYMMDDHHMMSS-migrate_job_code_to_position_public_id.js`

```javascript
// TODO provide the info below for the review
// Affected records: X rows (see work item 13)
// Estimated run time: Y seconds

const { schema } = require('../migrations/config');

const results = {
    success: 0,
    errors: 0,
};

/**
 * Migrate existing new_job_code values to new_position_public_id.
 * Looks up the public_id from peo_positions where code matches new_job_code.
 *
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {typeof import('sequelize')} Sequelize
 * @returns {Promise<void>}
 */
const up = async (queryInterface, Sequelize) => {
    try {
        // Migrate existing new_job_code to new_position_public_id
        // by looking up the public_id from peo_positions where code matches
        const [, metadata] = await queryInterface.sequelize.query(`
            UPDATE "${schema}"."peo_employee_transfer_items" ti
            SET new_position_public_id = pp.public_id
            FROM "${schema}"."peo_positions" pp
            WHERE pp.code = ti.new_job_code
              AND ti.new_position_public_id IS NULL;
        `);

        log.info({ message: 'Migrated rows', rowCount: metadata?.rowCount || 0 });

        // Validate that all rows were successfully migrated
        const [unmigrated] = await queryInterface.sequelize.query(`
            SELECT COUNT(*) as count
            FROM "${schema}"."peo_employee_transfer_items" ti
            WHERE ti.new_position_public_id IS NULL;
        `);

        if (unmigrated[0].count > 0) {
            throw new Error(
                `Data migration incomplete: ${unmigrated[0].count} transfer item(s) still have NULL new_position_public_id. ` +
                `These rows may have new_job_code values that don't match any peo_positions.code.`
            );
        }

        log.info('Successfully finished executing script');
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
# Use current timestamp for the new file name
TIMESTAMP=$(date '+%Y%m%d%H%M%S')
mv post_deployment_migrations/YYYYMMDDHHMMSS-migrate_job_code_to_position_public_id.js \
   post_deployment_migrations/${TIMESTAMP}-migrate_job_code_to_position_public_id.js
```

## Key Differences from Pre-Release

| Aspect | Pre-Release | Post-Deployment |
|--------|-------------|-----------------|
| Location | `migrations/` | `post_deployment_migrations/` |
| Functions | `up` + `down` | `up` only |
| Error handling | Throws error | Try/catch with results tracking |
| Suffix | `__pre_release` | None |
| Run command | `npm run migrate` | `npm run post_deployment_migrations` |

## Acceptance Criteria

- [ ] Pre-release migration file deleted
- [ ] Post-deployment migration created with correct structure
- [ ] Uses results tracking pattern
- [ ] Has only `up` function (no `down`)
- [ ] Includes affected rows comment (see work item 13)
- [ ] File named with current timestamp

## Notes

- Post-deployment migrations run after the code is deployed
- They are idempotent and can be re-run safely
- No rollback function needed since data can be re-migrated from source
