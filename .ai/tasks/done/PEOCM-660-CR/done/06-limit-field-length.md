<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 06-limit-field-length.md                             ║
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

# Limit Field Length in Items Table

## Objective

Add length constraint to a field in `peo_employee_transfer_items` table as requested in code review.

## CR Comment

**Reviewer:** rogerio-satler-deel
**Location:** `migrations/20251217172701-create_peo_employee_transfer_items_table.js:78`
**Comment:** limit the length

## Pre-Implementation

Before making changes, review the migration file to identify:
1. Which field is at line 78
2. What the current type is (likely TEXT or VARCHAR without limit)
3. What an appropriate length would be based on the data stored

## Implementation Steps

### Step 1: Identify the field

**File:** `migrations/20251217172701-create_peo_employee_transfer_items_table__pre_release.js`

Read the migration file and find the field definition around line 78.

### Step 2: Determine appropriate length

Based on the field's purpose:
- If it's an ID field (UUID): `VARCHAR(36)` or `UUID`
- If it's a short text field: `VARCHAR(100)` or `VARCHAR(255)`
- If it's a code field: `VARCHAR(50)`

### Step 3: Update the field definition

Change from unlimited to limited length:

**Before:**
```js
field_name: {
    type: Sequelize.TEXT,
    allowNull: true,
},
```

**After:**
```js
field_name: {
    type: Sequelize.STRING(100), // or appropriate length
    allowNull: true,
},
```

## Acceptance Criteria

- [ ] Field at line 78 has length constraint
- [ ] Length is appropriate for the data stored
- [ ] Migration runs without errors

## Testing

```bash
# Run migration locally
npm run migrate:up

# Verify column definition
psql -c "\d peo_employee_transfer_items"
```

## Notes

- Limiting field length helps with:
  - Query performance (smaller data scans)
  - Storage efficiency
  - Data validation (prevents unexpectedly large values)
- Choose length based on actual data requirements
