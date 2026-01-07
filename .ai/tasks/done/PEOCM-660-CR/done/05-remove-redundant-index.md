<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 05-remove-redundant-index.md                         ║
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

# Remove Redundant Status Index

## Objective

Remove redundant index on `status` column in `peo_employee_transfers` table since there's already another index that covers it.

## CR Comment

**Reviewer:** rogerio-satler-deel
**Location:** `migrations/20251217172700-create_peo_employee_transfers_table.js:124`
**Comment:** no need, already adding another index at status

## Pre-Implementation

Before making changes, review the existing indexes in the migration to understand:
1. What index exists at line 124
2. What other index already covers the `status` column

## Implementation Steps

### Step 1: Identify the redundant index

**File:** `migrations/20251217172700-create_peo_employee_transfers_table__pre_release.js`

Find the index definition around line 124. It's likely something like:
```js
await queryInterface.addIndex('peo_employee_transfers', ['status'], {
    name: 'idx_peo_employee_transfers_status',
    transaction,
});
```

### Step 2: Remove the redundant index

Delete or comment out the redundant index creation. Keep the other index that already covers `status` (likely a composite index).

### Step 3: Verify remaining indexes are sufficient

Ensure the remaining indexes cover the query patterns:
- Filtering by `status` alone
- Filtering by `status` + other columns

## Acceptance Criteria

- [ ] Redundant index removed from migration
- [ ] At least one index still covers `status` queries
- [ ] Migration runs without errors

## Testing

```bash
# Run migration locally
npm run migrate:up

# Verify indexes on the table
psql -c "\d peo_employee_transfers"
```

## Notes

- Redundant indexes waste storage and slow down writes
- A composite index like `(status, effective_date)` can still be used for `status`-only queries
