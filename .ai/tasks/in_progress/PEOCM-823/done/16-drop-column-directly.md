<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 16                                                    ║
║ REPO: peo                                                        ║
║ STATUS: todo                                                     ║
╠══════════════════════════════════════════════════════════════════╣
║ OBJECTIVE: Drop new_job_code column directly instead of _old     ║
║ FEEDBACK FROM: Marco Galvão                                      ║
╚══════════════════════════════════════════════════════════════════╝
-->

# 16: Drop new_job_code column directly

## Context

Per Marco Galvão's feedback: since this is a new product not yet in production, we can directly drop the column instead of using the `_old` deprecation pattern.

The `_old` pattern is designed for backward compatibility when a feature is already in production. Since entity transfers with position_public_id are not yet in production, we can skip the intermediate step.

## Objective

Change the finalize migration from `renameColumn` (to `_old`) back to `removeColumn` (direct drop).

## File to Modify

`post_deployment_migrations/20260105130001-finalize_position_public_id_schema.js`

## Implementation Steps

### Step 1: Revert renameColumn to removeColumn

Change:
```javascript
// Current (WRONG for new product):
await queryInterface.renameColumn(
    { tableName: 'peo_employee_transfer_items', schema },
    'new_job_code',
    'new_job_code_old',
    { transaction },
);
log.info('Renamed new_job_code to new_job_code_old');
```

To:
```javascript
// Correct for new product not in production:
await queryInterface.removeColumn(
    { tableName: 'peo_employee_transfer_items', schema },
    'new_job_code',
    { transaction },
);
log.info('Dropped new_job_code column');
```

### Step 2: Update migration comment

Update the top comment to clarify the change:
```javascript
/**
 * Finalize position public_id schema:
 * 1. Make new_position_public_id NOT NULL
 * 2. Drop the old new_job_code column (direct drop - product not yet in production)
 * ...
 */
```

## Acceptance Criteria

- [ ] Migration uses `removeColumn` instead of `renameColumn`
- [ ] Log message updated to "Dropped new_job_code column"
- [ ] Comment updated to reflect direct drop rationale
- [ ] Code committed and pushed

## Rationale

Quote from Marco:
> "If this is not in use yet, we can drop it, yes."

The `_old` pattern exists for:
1. Rolling back if issues are found
2. Giving dependent code time to adapt

Neither applies here since the feature isn't in production yet.
