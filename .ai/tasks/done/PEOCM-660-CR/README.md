<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/done/PEOCM-660-CR/                          ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)          ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                 ║
║ 4. Work on ONE item at a time from todo/                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

# PEOCM-660-CR: Address Code Review Comments

## Problem Statement

PR #1577 (letsdeel/peo) for PEOCM-660 received code review feedback from rogerio-satler-deel. The comments address:
- Migration file naming conventions
- Table ownership requirements
- Index optimization
- Field length constraints

These must be addressed before the PR can be merged.

## Related PRs

| Repo | PR | URL |
|------|-----|-----|
| peo | #1577 | https://github.com/letsdeel/peo/pull/1577 |
| backend | #118374 | https://github.com/letsdeel/backend/pull/118374 |

## Acceptance Criteria

- [x] All migration files renamed with `__pre_release` suffix
- [x] All 3 tables have owner comments using `addOwnerToComment`
- [x] Redundant index removed from transfers table
- [x] Field length limited in items table
- [x] Migration/model type alignment for `newEmploymentPayrollSettingId`
- [x] Effective date validation enhanced
- [x] Date validation properly rejects invalid dates (rollover fix)
- [ ] PR approved

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Rename migrations with __pre_release suffix | peo | done |
| 02 | Add table ownership to peo_employee_transfers | peo | done |
| 03 | Add table ownership to peo_employee_transfer_items | peo | done |
| 04 | Add table ownership to peo_employee_transfer_signatures | peo | done |
| 05 | Remove redundant status index | peo | done |
| 06 | Limit field length in items table | peo | done |
| 07 | Fix migration/model type mismatch (BLOCKING) | peo | done |
| 08 | Improve effectiveDate validation (IMPORTANT) | peo | done |
| 09 | Fix date validation rollover issue (BLOCKING) | peo | done |

## Branches

| Repo | Branch |
|------|--------|
| peo | `PEOCM-660-entity-transfer-tables` |

## Technical Context

### CR Comments Summary

**Migration Naming (rogerio-satler-deel):**
> Please add `__pre_release` to the end on the filename, this should run on a previous process on deployment

Affected files:
- `migrations/20251217172700-create_peo_employee_transfers_table.js`
- `migrations/20251217172701-create_peo_employee_transfer_items_table.js`
- `migrations/20251217172702-create_peo_employee_transfer_signatures_table.js`

**Table Ownership (rogerio-satler-deel):**
> pls follow the instructions: https://wiki.deel.network/i/46026

Each table needs:
```js
comment: addOwnerToComment('@letsdeel/peo-team', 'Table description')
```

**Redundant Index (rogerio-satler-deel):**
> no need, already adding another index at status

Location: `migrations/20251217172700-create_peo_employee_transfers_table.js:124`

**Field Length (rogerio-satler-deel):**
> limit the length

Location: `migrations/20251217172701-create_peo_employee_transfer_items_table.js:78`

### Code Review Findings (2025-12-29)

**Migration/Model Type Mismatch (BLOCKING):**
> Migration uses `STRING(50)` but model uses `TEXT` for `new_employment_payroll_setting_id`

- Migration: `migrations/20251217172701-create_peo_employee_transfer_items_table__pre_release.js:79`
- Model: `src/models/entityTransfer/PeoEmployeeTransferItem.ts:82`

Fix: Change model to use `DataTypes.STRING(50)` to match migration.

**Effective Date Validation (IMPORTANT):**
> Current regex only validates format, not date validity

Location: `src/controllers/entityTransfer/entityTransferDto.ts:19,35`

Problem: Accepts invalid dates like `2025-02-30` or `2025-13-01`.

Fix: Add `.refine()` to validate with `Date.parse()`.

## Implementation Approach

1. **Rename migration files** - Add `__pre_release` suffix to all 3 migration files
2. **Add table ownership** - Import `addOwnerToComment` and add comment to each `createTable` call
3. **Remove redundant index** - Delete the duplicate status index
4. **Limit field length** - Add length constraint to the identified field

## References

- [Database Table Ownership](../../docs/_shared/database-table-ownership.md)
- [PEOCM-660 Original Task](../done/PEOCM-660/README.md)
- [PR #1577](https://github.com/letsdeel/peo/pull/1577)
