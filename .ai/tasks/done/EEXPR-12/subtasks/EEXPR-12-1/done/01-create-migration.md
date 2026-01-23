<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-create-migration.md                                ║
║ TASK: EEXPR-12-1                                                 ║
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

# Create Migration: Fix signature profile_public_id type

## Objective

Create a Sequelize migration to convert `peo_employee_transfer_signatures.profile_public_id` from INTEGER to UUID.

## Implementation Steps

### Step 1: Create migration file

**File:** `peo/migrations/YYYYMMDDHHMMSS-fix-signature-profile-public-id-type.js`

Generate using Sequelize CLI or create manually:

```bash
cd peo
npx sequelize-cli migration:generate --name fix-signature-profile-public-id-type
```

### Step 2: Implement up() migration

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Step 1: Add new UUID column
      await queryInterface.addColumn(
        { tableName: 'peo_employee_transfer_signatures', schema: 'peo' },
        'profile_public_id_new',
        {
          type: Sequelize.UUID,
          allowNull: true,
        },
        { transaction }
      );

      // Step 2: Migrate data - lookup profile.public_id from profile.id
      await queryInterface.sequelize.query(
        `
        UPDATE peo.peo_employee_transfer_signatures s
        SET profile_public_id_new = p.public_id
        FROM public.profile p
        WHERE s.profile_public_id = p.id
        `,
        { transaction }
      );

      // Step 3: Drop old INTEGER column
      await queryInterface.removeColumn(
        { tableName: 'peo_employee_transfer_signatures', schema: 'peo' },
        'profile_public_id',
        { transaction }
      );

      // Step 4: Rename new column to profile_public_id
      await queryInterface.renameColumn(
        { tableName: 'peo_employee_transfer_signatures', schema: 'peo' },
        'profile_public_id_new',
        'profile_public_id',
        { transaction }
      );

      // Step 5: Add index for query performance
      await queryInterface.addIndex(
        { tableName: 'peo_employee_transfer_signatures', schema: 'peo' },
        ['profile_public_id'],
        {
          name: 'idx_transfer_signatures_profile_public_id',
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Step 1: Remove index
      await queryInterface.removeIndex(
        { tableName: 'peo_employee_transfer_signatures', schema: 'peo' },
        'idx_transfer_signatures_profile_public_id',
        { transaction }
      );

      // Step 2: Add INTEGER column back
      await queryInterface.addColumn(
        { tableName: 'peo_employee_transfer_signatures', schema: 'peo' },
        'profile_public_id_old',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      );

      // Step 3: Migrate data back - lookup profile.id from profile.public_id
      await queryInterface.sequelize.query(
        `
        UPDATE peo.peo_employee_transfer_signatures s
        SET profile_public_id_old = p.id
        FROM public.profile p
        WHERE s.profile_public_id = p.public_id
        `,
        { transaction }
      );

      // Step 4: Drop UUID column
      await queryInterface.removeColumn(
        { tableName: 'peo_employee_transfer_signatures', schema: 'peo' },
        'profile_public_id',
        { transaction }
      );

      // Step 5: Rename back
      await queryInterface.renameColumn(
        { tableName: 'peo_employee_transfer_signatures', schema: 'peo' },
        'profile_public_id_old',
        'profile_public_id',
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
```

### Step 3: Update model type

**File:** `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts`

Update the `profilePublicId` field:

```typescript
// Before
profilePublicId: {
  type: DataTypes.INTEGER,
  field: 'profile_public_id',
  allowNull: false,
}

// After
profilePublicId: {
  type: DataTypes.UUID,
  field: 'profile_public_id',
  allowNull: false,
}
```

### Step 4: Run pre-deployment checks

Before deploying, run these checks against the target database:

```sql
-- Check: All signatures have valid profile references
SELECT COUNT(*)
FROM peo.peo_employee_transfer_signatures s
LEFT JOIN public.profile p ON s.profile_public_id = p.id
WHERE p.id IS NULL;
-- Expected: 0

-- Check: Total signatures to migrate
SELECT COUNT(*) FROM peo.peo_employee_transfer_signatures;
```

### Step 5: Test migration locally

```bash
# Run migration
cd peo
npm run db:migrate

# Verify column type changed
psql -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'peo' AND table_name = 'peo_employee_transfer_signatures' AND column_name = 'profile_public_id';"

# Test rollback
npm run db:migrate:undo
```

## Key Files

| File | Purpose |
|------|---------|
| `peo/migrations/YYYYMMDD-fix-signature-profile-public-id-type.js` | Migration file |
| `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts` | Model definition |

## Acceptance Criteria

- [ ] Migration file created with up() and down() functions
- [ ] Migration uses transaction for atomicity
- [ ] Data is migrated from profile.id to profile.public_id
- [ ] Model updated to use UUID type
- [ ] Migration tested locally (up and down)
- [ ] Pre-deployment checks documented

## Notes

- Use transactions to ensure atomicity
- The down() migration enables rollback if issues occur
- Index added for query performance on profile_public_id lookups
- This migration accesses cross-schema (peo → public) for profile lookup
