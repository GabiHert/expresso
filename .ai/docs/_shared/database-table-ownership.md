<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: DOMAIN                                                    ║
║ STATUS: Current                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ NAVIGATION:                                                      ║
║ • Parent: .ai/docs/_shared/                                      ║
║ • Related: sequelize-patterns.md                                 ║
║ • Index: .ai/INDEX.md                                           ║
╚══════════════════════════════════════════════════════════════════╝
-->

# Database Table Ownership

Every new database table at Deel must have an owner assigned via table-level comments.

---

## Overview

- **What**: A mandatory process to assign ownership to every database table
- **Why**: Enables change management, enforces standards across teams (e.g., DLP initiative)
- **When**: Every time you create a new table migration

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| Table Owner | Team responsible for the table, set as table comment in CODEOWNERS format |
| `addOwnerToComment` | Function from `@deel-core/migration` that formats owner + description |
| Pre-release Migration | Migrations with `__pre_release` suffix run in a previous deployment step |
| dbdocs | Database documentation at https://dbdocs.deel.network/ - source of truth for ownership |

---

## Implementation

### Creating a New Table with Owner

```js
const { addOwnerToComment } = require('@deel-core/migration');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.createTable(
                'your_table_name',
                {
                    id: {
                        type: Sequelize.INTEGER,
                        primaryKey: true,
                        autoIncrement: true,
                    },
                    // ... other fields
                },
                {
                    transaction,
                    // REQUIRED: Set table owner
                    comment: addOwnerToComment('@letsdeel/your-team', 'Table description here'),
                }
            );
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('your_table_name');
    },
};
```

### Changing Ownership of Existing Table

```js
const { addOwnerToComment } = require('@deel-core/migration');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.sequelize.query(
                `COMMENT ON TABLE public.your_table IS '${addOwnerToComment(
                    '@letsdeel/your-team',
                    'The table description'
                )}'`,
                { transaction }
            );
        });
    },

    down: async (queryInterface) => {
        // Restore previous owner/comment if needed
    },
};
```

### Get Current Table Description

```sql
SELECT
    schemaname,
    tablename,
    obj_description((schemaname || '.' || tablename)::regclass) as comment
FROM pg_tables
WHERE schemaname = 'your_schema'
  AND tablename = 'your_table';
```

---

## Important Rules

| Rule | Details |
|------|---------|
| Owner format | CODEOWNERS format: `@letsdeel/team-name` |
| Package requirement | `@deel-core/migration` version `1.46.0+` |
| Description preservation | When changing ownership, existing description is NOT preserved - must provide it explicitly |
| Pre-release suffix | Add `__pre_release` to migration filename for schema changes |

---

## Migration Naming Convention

For schema migrations (CREATE TABLE, ALTER TABLE), use the `__pre_release` suffix:

```
✗ 20251217172700-create_peo_employee_transfers_table.js
✓ 20251217172700-create_peo_employee_transfers_table__pre_release.js
```

This ensures the migration runs in a previous deployment step before the application code changes.

---

## Example PR

See [backend PR #100601](https://github.com/letsdeel/backend/pull/100601) for a complete example.

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Missing `__pre_release` suffix | Add suffix to migration filename for schema changes |
| Missing owner comment | Add `comment: addOwnerToComment(...)` to createTable options |
| Lost description on ownership change | Always provide the table description when updating ownership |
| Wrong owner format | Use `@letsdeel/team-name` format, not email or username |

---

## Related Documentation

- [Sequelize Patterns](./sequelize-patterns.md)
- [Deel Wiki - Table Ownership](https://wiki.deel.network/i/46026)

---

_Created: 2025-12-29_
_Last Updated: 2025-12-29_
