<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-create-subtask-eexpr-12-1.md                       ║
║ TASK: EEXPR-12 (Epic)                                            ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                 ║
║ 2. Update status.yaml with new status                           ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml              ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: peo
---

# Create Subtask EEXPR-12-1: [PEO] Migration - Fix signature profile_public_id type

## Objective

Create the subtask folder and work items for EEXPR-12-1, which handles the database migration to fix the `profile_public_id` column type in `peo_employee_transfer_signatures` table.

## Subtask Details

**ID:** EEXPR-12-1
**Title:** [PEO] Migration - Fix signature profile_public_id type
**Repo:** peo
**Branch:** `EEXPR-12-1-fix-signature-profile-id-type`

### Problem

The `peo_employee_transfer_signatures.profile_public_id` column is currently INTEGER but should be UUID to match `profile.public_id`.

**Current state:**
- Column type: INTEGER
- Stores: `profile.id` (internal integer ID)

**Required state:**
- Column type: UUID
- Stores: `profile.public_id` (UUID)

### Migration Strategy

1. Add new column `profile_public_id_new` (UUID, nullable)
2. Migrate data: lookup `profile.public_id` from `profile.id`
3. Drop old column `profile_public_id`
4. Rename new column to `profile_public_id`
5. Add NOT NULL constraint if required

### Migration SQL Pattern

```sql
-- Step 1: Add new column
ALTER TABLE peo.peo_employee_transfer_signatures
ADD COLUMN profile_public_id_new UUID;

-- Step 2: Migrate data
UPDATE peo.peo_employee_transfer_signatures s
SET profile_public_id_new = p.public_id
FROM public.profile p
WHERE s.profile_public_id = p.id;

-- Step 3: Drop old, rename new
ALTER TABLE peo.peo_employee_transfer_signatures
DROP COLUMN profile_public_id;

ALTER TABLE peo.peo_employee_transfer_signatures
RENAME COLUMN profile_public_id_new TO profile_public_id;
```

## Work Items for EEXPR-12-1

| ID | Name | Description |
|----|------|-------------|
| 01 | Create migration file | Sequelize migration to fix column type |

## Implementation Steps

### Step 1: Create subtask folder structure

```
.ai/tasks/todo/EEXPR-12-1/
├── README.md
├── status.yaml
├── todo/
│   └── 01-create-migration.md
├── in_progress/
├── done/
└── feedback/
```

### Step 2: Create README.md

Include:
- Problem statement (type mismatch)
- Migration strategy
- SQL patterns
- Rollback strategy
- Testing approach
- Reference to parent epic EEXPR-12

### Step 3: Create status.yaml

```yaml
task: "EEXPR-12-1"
title: "[PEO] Migration - Fix signature profile_public_id type"
parent: "EEXPR-12"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"

work_items:
  - id: "01"
    name: "Create migration file"
    repo: peo
    status: todo
    file: "todo/01-create-migration.md"
```

### Step 4: Create work item file

Create `todo/01-create-migration.md` with:
- Migration file location: `peo/migrations/YYYYMMDD-fix_signature_profile_public_id_type.js`
- Complete up() and down() migration code
- Pre/post checks
- Testing instructions

## Acceptance Criteria

- [ ] Subtask folder created at `.ai/tasks/todo/EEXPR-12-1/`
- [ ] README.md with complete context
- [ ] status.yaml with work items
- [ ] Work item file with detailed migration instructions
- [ ] References parent epic EEXPR-12

## Notes

- This migration must deploy BEFORE EEXPR-12-2 and EEXPR-12-3
- Ensure rollback is possible
- Check for existing data in production before deploying
