<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-129-3-data-model.md                           ║
║ TASK: EEXPR-129                                                 ║
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
# Repository Context (EEXPR-129)
repo: backend, peo
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend, /Users/gabriel.herter/Documents/Projects/deel/peo
branch: N/A (documentation review)
protected: false
---

# Phase 3: Data Model

## Objective

Compare the TDD's 4 table definitions against actual database migrations and Sequelize models. Verify column names, types, nullability, constraints, and indexes. Identify any new tables or columns added since the TDD was written.

## TDD Sections Under Review

1. **`peo_employee_transfers`** table (10 columns)
2. **`peo_employee_transfer_items`** table (13 columns)
3. **`peo_employee_transfer_signatures`** table (8 columns)
4. **`peo_employee_transfer_item_signatures`** table (8 columns)
5. **Migration strategy** section

## Pre-Implementation

Before starting, launch an **exploration agent** to:
- Find all migration files related to entity transfers in `peo/migrations/`
- Find Sequelize models in `peo/src/models/entityTransfer/`
- Check `backend/` for any backend-side model definitions
- Look at EEXPR-44-4 docs (made effectiveDate nullable)
- Check EEXPR-124 migration file in `automated-data-migrations/`

## Implementation Steps

### Step 1: Extract actual `peo_employee_transfers` schema

**Sources**:
- PEO migration files creating this table
- PEO Sequelize model definition
- Any ALTER TABLE migrations

Compare every column: name, type, nullability, default values, foreign keys.

### Step 2: Extract actual `peo_employee_transfer_items` schema

Same approach. Known changes to look for:
- `new_contract_oid` — was this added after the TDD?
- `resume_from_step` — verify existence and type
- Any new columns

### Step 3: Extract actual `peo_employee_transfer_signatures` schema

Known from EEXPR-44 exploration:
- 8 columns documented in the exploration doc
- `profile_public_id` type — TDD says INTEGER but exploration says UUID

### Step 4: Extract actual `peo_employee_transfer_item_signatures` schema

Verify:
- Column names and types
- `agreement_type` enum values
- Foreign key relationships

### Step 5: Check for additional tables or columns

- Look for any entity transfer-related tables not in the TDD
- Check EEXPR-124 migration for what it adds/changes
- Check if `effective_date` nullability changed (EEXPR-44-4)

### Step 6: Review indexes

TDD describes specific indexes. Verify:
- Composite index on `(status, effective_date)` for cron job
- Indexes on `transfer_id`, `peo_contract_id`, etc.

### Step 7: Document findings

Column-by-column comparison tables for each entity.

## Acceptance Criteria

- [ ] All 4 tables verified column-by-column against migrations/models
- [ ] Column types and nullability checked
- [ ] Foreign key constraints verified
- [ ] Indexes verified
- [ ] New tables/columns not in TDD identified
- [ ] EEXPR-44-4 nullable effectiveDate change documented
- [ ] Findings report created

## Notes

- Can also query the actual database via `mcp__sql-query` to verify live schema if needed
- EEXPR-44-4 specifically made effectiveDate nullable in PEO
- The TDD says `profile_public_id` is INTEGER in signatures table but it's likely UUID
