<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-add-ownership-signatures-table.md                 ║
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

# Add Table Ownership to peo_employee_transfer_signatures

## Objective

Add table ownership comment to `peo_employee_transfer_signatures` table using `addOwnerToComment` function from `@deel-core/migration`.

## CR Comment

**Reviewer:** rogerio-satler-deel
**Location:** `migrations/20251217172702-create_peo_employee_transfer_signatures_table.js:122`
**Comment:** pls follow the instructions: https://wiki.deel.network/i/46026

## Implementation Steps

### Step 1: Import addOwnerToComment

**File:** `migrations/20251217172702-create_peo_employee_transfer_signatures_table__pre_release.js`

Add at the top of the file:
```js
const { addOwnerToComment } = require('@deel-core/migration');
```

### Step 2: Add comment to createTable

Find the `createTable` call and add the `comment` option:

```js
await queryInterface.createTable(
    'peo_employee_transfer_signatures',
    {
        // ... existing column definitions
    },
    {
        transaction,
        comment: addOwnerToComment('@letsdeel/peo-team', 'Tracks admin and employee agreement signatures for entity transfers'),
    }
);
```

## Acceptance Criteria

- [ ] `addOwnerToComment` imported from `@deel-core/migration`
- [ ] Comment added to createTable options with owner and description
- [ ] Owner uses CODEOWNERS format: `@letsdeel/peo-team`

## Testing

```bash
# Run migration locally to verify no syntax errors
npm run migrate:up

# Check table comment in database
psql -c "SELECT obj_description('peo_employee_transfer_signatures'::regclass);"
```

## Notes

- See [Database Table Ownership](../../../docs/_shared/database-table-ownership.md) for full documentation
- Owner format must be `@letsdeel/team-name`
- Description should explain the table's purpose
