<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 15-fix-column-deprecation-pattern.md                 ║
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

# Fix column deprecation to follow Deel pattern

## Context (PR Feedback)

From marco-galvao-deel on PR #1593 (line 43):
> "Please, follow this guide on how to deprecate columns."
> Link: https://wiki.deel.network/i/4969#deprecating-tablescolumns

## The Problem

Our migration uses `removeColumn()` directly:
```javascript
await queryInterface.removeColumn(
    { tableName: 'peo_employee_transfer_items', schema },
    'new_job_code',
    { transaction },
);
```

## The Pattern

At Deel, columns must be **renamed to `_old`** first, then dropped later:
```javascript
await queryInterface.renameColumn(
    'peo_employee_transfer_items',
    'new_job_code',
    'new_job_code_old',
    { transaction }
);
```

See: `.ai/docs/_shared/column-deprecation-pattern.md`

## Objective

Update the finalize migration to rename `new_job_code` to `new_job_code_old` instead of dropping it.

## Implementation Steps

### Step 1: Update the migration file

**File**: `peo/post_deployment_migrations/20260105130001-finalize_position_public_id_schema.js`

Replace `removeColumn` with `renameColumn`:

```javascript
// OLD (wrong):
await queryInterface.removeColumn(
    { tableName: 'peo_employee_transfer_items', schema },
    'new_job_code',
    { transaction },
);

// NEW (correct):
await queryInterface.renameColumn(
    { tableName: 'peo_employee_transfer_items', schema },
    'new_job_code',
    'new_job_code_old',
    { transaction }
);
```

Also update the log message:
```javascript
// OLD:
log.info('Dropped new_job_code column');

// NEW:
log.info('Renamed new_job_code to new_job_code_old');
```

### Step 2: Commit and push

```bash
git add -A
git commit -m "PEOCM-823: use column deprecation pattern (rename to _old)"
git push
```

## Acceptance Criteria

- [ ] Migration uses `renameColumn` instead of `removeColumn`
- [ ] Column renamed to `new_job_code_old` (not dropped)
- [ ] Log message updated
- [ ] Changes committed and pushed

## Notes

- The `_old` column can be dropped in a future migration once confirmed safe
- This follows Deel's standard column deprecation process
- Preserves data for potential rollback
