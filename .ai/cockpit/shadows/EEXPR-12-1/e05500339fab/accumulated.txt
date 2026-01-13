<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK (SUBTASK)                                            ║
║ LOCATION: .ai/tasks/in_progress/EEXPR-12-1/                     ║
╠══════════════════════════════════════════════════════════════════╣
║ PARENT EPIC: EEXPR-12                                            ║
║ REPO: peo                                                        ║
║ BRANCH: EEXPR-12-1-fix-signature-profile-id-type                ║
╚══════════════════════════════════════════════════════════════════╝
-->

# EEXPR-12-1: [PEO] Migration - Fix signature profile_public_id type

## Problem Statement

The `peo_employee_transfer_signatures.profile_public_id` column has the wrong data type:

| Current State | Required State |
|---------------|----------------|
| Type: INTEGER | Type: UUID |
| Stores: `profile.id` | Stores: `profile.public_id` |

This prevents the EEXPR-12 endpoint from properly linking signatures to profiles using the public UUID.

## Migration Strategy

### Approach: Column Replacement (Safe)

This approach is safer than in-place type conversion:

1. **Add** new column `profile_public_id_new` (UUID, nullable)
2. **Migrate** data by looking up `profile.public_id` from `profile.id`
3. **Drop** old column `profile_public_id`
4. **Rename** new column to `profile_public_id`

### Why Not ALTER COLUMN?

PostgreSQL doesn't support direct INTEGER → UUID conversion. We must:
- Create a new UUID column
- Populate it with the mapped values
- Replace the old column

## SQL Implementation

### Up Migration

```sql
-- Step 1: Add new UUID column
ALTER TABLE peo.peo_employee_transfer_signatures
ADD COLUMN profile_public_id_new UUID;

-- Step 2: Migrate data from profile.id to profile.public_id
UPDATE peo.peo_employee_transfer_signatures s
SET profile_public_id_new = p.public_id
FROM public.profile p
WHERE s.profile_public_id = p.id;

-- Step 3: Drop old INTEGER column
ALTER TABLE peo.peo_employee_transfer_signatures
DROP COLUMN profile_public_id;

-- Step 4: Rename new column
ALTER TABLE peo.peo_employee_transfer_signatures
RENAME COLUMN profile_public_id_new TO profile_public_id;

-- Step 5: Add index for query performance (optional)
CREATE INDEX IF NOT EXISTS idx_transfer_signatures_profile_public_id
ON peo.peo_employee_transfer_signatures(profile_public_id);
```

### Down Migration (Rollback)

```sql
-- Step 1: Add INTEGER column back
ALTER TABLE peo.peo_employee_transfer_signatures
ADD COLUMN profile_public_id_old INTEGER;

-- Step 2: Migrate data back (UUID → INTEGER via profile lookup)
UPDATE peo.peo_employee_transfer_signatures s
SET profile_public_id_old = p.id
FROM public.profile p
WHERE s.profile_public_id = p.public_id;

-- Step 3: Drop index
DROP INDEX IF EXISTS peo.idx_transfer_signatures_profile_public_id;

-- Step 4: Drop UUID column
ALTER TABLE peo.peo_employee_transfer_signatures
DROP COLUMN profile_public_id;

-- Step 5: Rename back
ALTER TABLE peo.peo_employee_transfer_signatures
RENAME COLUMN profile_public_id_old TO profile_public_id;
```

## Pre-Deployment Checks

Before deploying, verify:

1. **Data exists to migrate:**
   ```sql
   SELECT COUNT(*) FROM peo.peo_employee_transfer_signatures;
   ```

2. **All profile_public_id values have matching profiles:**
   ```sql
   SELECT COUNT(*)
   FROM peo.peo_employee_transfer_signatures s
   LEFT JOIN public.profile p ON s.profile_public_id = p.id
   WHERE p.id IS NULL;
   -- Should return 0
   ```

3. **No NULL profile_public_id values (if column is NOT NULL):**
   ```sql
   SELECT COUNT(*)
   FROM peo.peo_employee_transfer_signatures
   WHERE profile_public_id IS NULL;
   ```

## Post-Deployment Verification

After migration, verify:

```sql
-- Check column type changed
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'peo'
  AND table_name = 'peo_employee_transfer_signatures'
  AND column_name = 'profile_public_id';
-- Expected: data_type = 'uuid'

-- Check data was migrated correctly
SELECT s.profile_public_id, p.public_id
FROM peo.peo_employee_transfer_signatures s
JOIN public.profile p ON s.profile_public_id = p.public_id
LIMIT 5;
```

## Acceptance Criteria

- [ ] Migration file created in `peo/migrations/`
- [ ] Up migration converts INTEGER to UUID with data migration
- [ ] Down migration provides rollback capability
- [ ] Pre-deployment checks pass
- [ ] Post-deployment verification confirms type change

## Work Items

| ID | Name | Status |
|----|------|--------|
| 01 | Create migration file | todo |

## Technical Context

### Table Location
- Schema: `peo`
- Table: `peo_employee_transfer_signatures`
- Column: `profile_public_id`

### Related Tables
- `public.profile` - Source of `public_id` UUID
- `peo.peo_employee_transfers` - Parent transfer records
- `peo.peo_employee_transfer_items` - Transfer items

### Model File
`peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts`

## Dependencies

**This migration must deploy BEFORE:**
- EEXPR-12-2: PEO GET transfers endpoint
- EEXPR-12-3: Backend tech ops endpoint

## Risks

1. **Data loss** - Mitigated by column replacement approach (old data preserved until drop)
2. **Missing profiles** - Pre-check ensures all INTEGER IDs map to valid profiles
3. **Application errors** - Deploy during low-traffic period, ensure app handles UUID type

## Parent Epic

[EEXPR-12: Endpoint to retrieve transfer details](../in_progress/EEXPR-12/README.md)
