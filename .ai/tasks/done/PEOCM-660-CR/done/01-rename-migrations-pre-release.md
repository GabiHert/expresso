<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-rename-migrations-pre-release.md                  ║
║ TASK: PEOCM-660-CR                                              ║
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

# Rename Migrations with __pre_release Suffix

## Objective

Rename all 3 entity transfer migration files to include `__pre_release` suffix so they run in a previous deployment step before application code changes.

## CR Comment

**Reviewer:** rogerio-satler-deel
**Comment:** Please add `__pre_release` to the end on the filename, this should run on a previous process on deployment

## Implementation Steps

### Step 1: Rename migration files

**Files to rename:**

| Current Name | New Name |
|--------------|----------|
| `20251217172700-create_peo_employee_transfers_table.js` | `20251217172700-create_peo_employee_transfers_table__pre_release.js` |
| `20251217172701-create_peo_employee_transfer_items_table.js` | `20251217172701-create_peo_employee_transfer_items_table__pre_release.js` |
| `20251217172702-create_peo_employee_transfer_signatures_table.js` | `20251217172702-create_peo_employee_transfer_signatures_table__pre_release.js` |

**Commands:**
```bash
cd peo/migrations
git mv 20251217172700-create_peo_employee_transfers_table.js 20251217172700-create_peo_employee_transfers_table__pre_release.js
git mv 20251217172701-create_peo_employee_transfer_items_table.js 20251217172701-create_peo_employee_transfer_items_table__pre_release.js
git mv 20251217172702-create_peo_employee_transfer_signatures_table.js 20251217172702-create_peo_employee_transfer_signatures_table__pre_release.js
```

## Acceptance Criteria

- [ ] All 3 migration files renamed with `__pre_release` suffix
- [ ] Git tracks the rename (use `git mv`)
- [ ] No references to old filenames exist

## Testing

```bash
# Verify files are renamed
ls -la peo/migrations/*transfer*

# Verify git status shows renames
git status
```

## Notes

- The `__pre_release` suffix tells the deployment system to run these migrations before the main deployment
- This is important for schema changes that the application code depends on
