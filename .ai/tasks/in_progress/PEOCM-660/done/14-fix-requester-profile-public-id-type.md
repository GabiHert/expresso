<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 14-fix-requester-profile-public-id-type.md           ║
║ TASK: PEOCM-660                                                 ║
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
priority: CRITICAL
---

# Fix requester_profile_public_id Type (INTEGER → UUID)

## Problem

The `requester_profile_public_id` column in `peo.peo_employee_transfers` is defined as `INTEGER`, but:

- The column name contains `public_id` which implies it stores `profile.public_id`
- `profile.public_id` is **UUID**, not INTEGER
- `profile.id` is INTEGER

**Current state is semantically incorrect:**
- Either the column stores `profile.id` (integer) and should be renamed to `requester_profile_id`
- Or the column should store `profile.public_id` (uuid) and the type should be UUID

**Impact**: The column name is misleading and may cause bugs when developers assume it stores a UUID but it actually stores an integer.

## Decision Required

Before implementing, clarify which approach:

1. **Option A: Change type to UUID** (Recommended if column should store public_id)
   - Column keeps name `requester_profile_public_id`
   - Type changes from INTEGER to UUID
   - Migration must convert existing integer values to UUIDs by looking up `profile.public_id`

2. **Option B: Rename column** (If column should store profile.id)
   - Column renamed from `requester_profile_public_id` to `requester_profile_id`
   - Type stays INTEGER
   - Existing data remains valid

## Objective

Fix the type mismatch to ensure semantic correctness between column name and data type.

## Implementation Steps (Option A - Recommended)

### Step 1: Verify Current Usage

Check how the field is currently used:

```sql
-- Check if there's existing data
SELECT COUNT(*), requester_profile_public_id
FROM peo.peo_employee_transfers
GROUP BY requester_profile_public_id;

-- If there is data, verify it matches profile.id (integer)
SELECT pet.id, pet.requester_profile_public_id, p.id as profile_id, p.public_id as profile_public_id
FROM peo.peo_employee_transfers pet
LEFT JOIN profile p ON p.id = pet.requester_profile_public_id;
```

### Step 2: Create Migration

**File**: `peo/migrations/YYYYMMDDHHMMSS-alter_peo_employee_transfers_fix_requester_profile_public_id_type.js`

```javascript
const { schema } = require('./config');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Step 1: Add new UUID column
        await queryInterface.addColumn(
            { tableName: 'peo_employee_transfers', schema },
            'requester_profile_public_id_new',
            {
                type: Sequelize.UUID,
                allowNull: true,
            }
        );

        // Step 2: Migrate data - lookup profile.public_id from profile.id
        await queryInterface.sequelize.query(`
            UPDATE peo.peo_employee_transfers pet
            SET requester_profile_public_id_new = p.public_id
            FROM profile p
            WHERE p.id = pet.requester_profile_public_id;
        `);

        // Step 3: Drop old column
        await queryInterface.removeColumn(
            { tableName: 'peo_employee_transfers', schema },
            'requester_profile_public_id'
        );

        // Step 4: Rename new column to original name
        await queryInterface.renameColumn(
            { tableName: 'peo_employee_transfers', schema },
            'requester_profile_public_id_new',
            'requester_profile_public_id'
        );

        // Step 5: Make column NOT NULL
        await queryInterface.changeColumn(
            { tableName: 'peo_employee_transfers', schema },
            'requester_profile_public_id',
            {
                type: Sequelize.UUID,
                allowNull: false,
            }
        );
    },

    down: async (queryInterface, Sequelize) => {
        // Reverse: UUID back to INTEGER
        // WARNING: This will lose data if public_ids don't map back to profile.id
        await queryInterface.addColumn(
            { tableName: 'peo_employee_transfers', schema },
            'requester_profile_public_id_old',
            {
                type: Sequelize.INTEGER,
                allowNull: true,
            }
        );

        await queryInterface.sequelize.query(`
            UPDATE peo.peo_employee_transfers pet
            SET requester_profile_public_id_old = p.id
            FROM profile p
            WHERE p.public_id = pet.requester_profile_public_id;
        `);

        await queryInterface.removeColumn(
            { tableName: 'peo_employee_transfers', schema },
            'requester_profile_public_id'
        );

        await queryInterface.renameColumn(
            { tableName: 'peo_employee_transfers', schema },
            'requester_profile_public_id_old',
            'requester_profile_public_id'
        );

        await queryInterface.changeColumn(
            { tableName: 'peo_employee_transfers', schema },
            'requester_profile_public_id',
            {
                type: Sequelize.INTEGER,
                allowNull: false,
            }
        );
    },
};
```

### Step 3: Update Sequelize Model

**File**: `peo/src/models/peoEmployeeTransfer.ts` (or similar)

Change the field definition from:
```typescript
requester_profile_public_id: DataTypes.INTEGER
```

To:
```typescript
requester_profile_public_id: DataTypes.UUID
```

### Step 4: Update API/Service Layer

Ensure any code that sets `requester_profile_public_id`:
- Now passes a UUID (profile.public_id) instead of an integer (profile.id)
- Update any API documentation or types

## Acceptance Criteria

- [ ] Decision made on which approach (Option A or B)
- [ ] Migration created and tested locally
- [ ] Sequelize model updated
- [ ] API/Service layer updated if needed
- [ ] TypeScript types updated
- [ ] Unit tests pass

## Testing

1. Run migration locally:
   ```bash
   npm run db:migrate
   ```

2. Verify column type changed:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'peo'
   AND table_name = 'peo_employee_transfers'
   AND column_name = 'requester_profile_public_id';
   ```
   Should return `uuid` instead of `integer`.

3. Verify data migrated correctly:
   ```sql
   SELECT pet.id, pet.requester_profile_public_id, p.public_id
   FROM peo.peo_employee_transfers pet
   JOIN profile p ON p.public_id = pet.requester_profile_public_id;
   ```
   All rows should match.

## Notes

- This is a **CRITICAL** fix - the column name is semantically incorrect
- Migration requires data transformation (integer → UUID lookup)
- Ensure no API consumers rely on the integer type before migrating
- May need to coordinate with backend team if they're passing profile.id instead of profile.public_id
