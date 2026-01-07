<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: DOMAIN                                                    ║
║ STATUS: Current                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ NAVIGATION:                                                      ║
║ • Parent: .ai/docs/_shared/README.md                             ║
║ • Related: sequelize-patterns.md, column-deprecation-pattern.md  ║
║ • Index: .ai/INDEX.md                                           ║
║ • Source: https://wiki.deel.network/i/4969                       ║
╚══════════════════════════════════════════════════════════════════╝
-->

# PostgreSQL Best Practices

Comprehensive guide for PostgreSQL database usage at Deel, covering connections, ORM usage, modeling, querying, indexing, migrations, and more.

---

## Overview

- **What**: Standards and best practices for all PostgreSQL database interactions
- **Why**: Ensures performance, data integrity, security, and consistency across services
- **When**: Reference when writing any database code, migrations, or queries

---

## Key Resources

| Resource | Link |
|----------|------|
| Slack Channel | [#db-support](https://letsdeel.slack.com/archives/C04K4DRFTNU) |
| Performance Tickets | [DB-performance label](https://letsdeel.atlassian.net/issues/?filter=10757) |
| Query Plan Visualizer | [explain.dalibo.com](https://explain.dalibo.com/) |

---

## Definitions

| Term | Definition |
|------|------------|
| DML | Data Manipulation Language = INSERT/UPDATE/DELETE |
| DDL | Data Definition Language = CREATE/ALTER/DROP |

---

## Connections

### Connection Settings

- **Always** set `application_name` when opening a new connection - helps trace problematic statements
- Set `idleTimeout` to at least 1 minute to avoid connection overhead
- For high-pod services (like `backend`): use shorter `idleTimeout` (~5 seconds) until external connection pooler is implemented

### Approved Database Clients

| Client | Status |
|--------|--------|
| [DBeaver](https://dbeaver.io/) | Recommended |
| [pgAdmin](https://www.pgadmin.org/) | Approved |
| TablePlus | Approved |
| JetBrains DataGrip/PyCharm | Approved |

**No AI tool/extension is to connect directly to the database.** Cursor database extensions should NOT be used. Use APIs or Deel's MCP instead.

---

## ORM (Sequelize)

The **only** approved ORM is [Sequelize](https://sequelize.org/).

### Why Not Prisma

| Limitation | Issue |
|------------|-------|
| No read replica support | [Issue #172](https://github.com/prisma/prisma/issues/172) |
| No `SELECT ... FOR UPDATE` | [Issue #8580](https://github.com/prisma/prisma/issues/8580) |
| No partial indexes | [Issue #3076](https://github.com/prisma/prisma/issues/3076) |
| No session context for audit | Not supported |
| No cross schema reference | Not supported |
| No table/column comments | Not supported |
| `some`/`none` always use IN/NOT IN | Can cause performance issues |

### General ORM Guidelines

- **Avoid `promise.all`** for DB operations - use standard `for` loops
  - Without transaction: consumes one connection per query
  - With transaction: execution order can be problematic
- **Never use string concatenation** for raw queries (SQL injection risk)

### Sequelize-Specific Guidelines

#### SQL Injection Prevention

Use [Bind Parameters](https://sequelize.org/docs/v6/core-concepts/raw-queries/#bind-parameter) or [Replacements](https://sequelize.org/docs/v6/core-concepts/raw-queries/#replacements):

```javascript
// For arrays with IN clauses, use ANY instead:
// WHERE x = ANY($1) instead of WHERE x IN($1)
// WHERE x != ALL($1) instead of WHERE x NOT IN($1)
```

**Never** concatenate user input in `Sequelize.literal()`!

#### Read Replica Usage

Use `useMaster: false` to send queries to read replicas:

```javascript
// For raw queries, MUST include type: QueryTypes.SELECT
await sequelize.query('SELECT ...', {
  type: QueryTypes.SELECT,
  useMaster: false
});
```

Rules:
- Set `useMaster: false` in all `GET` APIs
- OK for `PUT/PATCH/POST` **only** when querying data not modified in same request
- Don't use `useMaster: false` with `transaction` (it gets ignored)

#### Read-Only Transaction on Replica

```javascript
await sequelize.transaction({readOnly: true}, async (transaction) => {
  // queries run on replica
});
```

#### Include/Join Behavior

| Scenario | Default | Result |
|----------|---------|--------|
| `include` without `where` | `required: false` | LEFT JOIN |
| `include` with `where` | `required: true` | INNER JOIN |

Always specify `required: true/false` when `include` has a `where` clause.

#### Common Pitfalls

| Issue | Problem | Solution |
|-------|---------|----------|
| Creating enums with table | Transaction hangs | Create enum first, then use it |
| Creating indexes with table | Index not created | Use `queryInterface.addIndex()` |
| Foreign key defaults | Differ from Postgres defaults | Always specify `onDelete` and `onUpdate` |
| `renameColumn` | [Bugged](https://github.com/sequelize/sequelize/issues/17288) | Use raw SQL instead |
| `findOne` | Adds `LIMIT 1` breaking includes | Use `findFirst` (sequelize-flavours) |
| `findOrCreate` | Memory leak from temp functions | Implement custom wrapper |
| `try/catch` in transaction | Prevents auto-rollback | Put try/catch around transaction |

#### Foreign Key Definition

```javascript
// WRONG - inside references
organization_id: {
  references: {
    model: 'Organizations',
    key: 'id',
    onDelete: 'CASCADE',    // WRONG location
  },
}

// CORRECT - outside references
organization_id: {
  references: {
    model: 'Organizations',
    key: 'id',
  },
  onDelete: 'CASCADE',      // CORRECT location
  onUpdate: 'CASCADE',
}
```

#### Transaction Error Handling

```javascript
// WRONG - error swallowed, transaction commits
await sequelize.transaction(async (transaction) => {
  try {
    await update1(transaction);
    await update2(transaction);
  } catch (err) {
    logger.error(err); // Transaction still commits!
  }
});

// CORRECT - proper rollback
try {
  await sequelize.transaction(async (transaction) => {
    await update1(transaction);
    await update2(transaction);
  });
} catch (err) {
  logger.error(err);
  // Transaction auto-rolled back
}
```

#### hasMany with Large Tables

Use `separate: true` to avoid duplicate data multiplication:

```javascript
include: [{
  model: LargeTable,
  separate: true  // Runs separate query, joins in code
}]
```

**Note**: `separate: true` doesn't work with `required: true` or `where`.

---

## Data Modeling

### Primary Keys

Use **either but not both**:

| Type | Use Case | Size | Notes |
|------|----------|------|-------|
| `serial/identity` | Internal IDs | 4 bytes | Sequential, great for pagination |
| `UUID v4` | External/exposed IDs | 16 bytes | Secure, collision-safe |

**Do NOT use**: hashid (reversible), cuid (25 bytes), nanoid (21 bytes, slower), UUIDv7 (exposes timestamp)

### Column Guidelines

| Rule | Rationale |
|------|-----------|
| **Booleans must be NOT NULL** | Avoid `NOT flag OR flag IS NULL` |
| **Use appropriate data types** | Protects from manual changes, bugs, external imports |
| **Specify string length limits** | Keep the DB clean |
| **Comment every table and column** | See [DB Documentation](https://wiki.deel.network/i/4986) |
| **Specify ON DELETE/ON UPDATE** | Always explicit on foreign keys |

### JSON(B) Usage

Avoid JSON(B) for structurally modelable data. Move to column if:
- Used repeatedly in filters
- Updated frequently
- References another column

### Cross-Schema Rules

**Foreign Keys**:
- FKs to `common` schema: Mandatory
- Intra-service FKs: Allowed
- Cross-service FKs: Not allowed (without DBA approval)

**Querying**:
- `common` schema: Always allowed
- Other schemas: Requires Engineering Director approval

---

## Pagination

### Use Keyset (Cursor) Pagination

```sql
-- GOOD: Keyset pagination
SELECT ...
FROM ...
WHERE (col1, col2) > (lastValue.col1, lastValue.col2)
ORDER BY col1, col2
LIMIT ...

-- BAD: Offset pagination
SELECT ...
FROM ...
LIMIT ... OFFSET ...
```

**Requirements for efficient keyset pagination**:
- All columns in key belong to same table
- All columns are NOT NULL
- Columns form unique value
- Appropriate index exists

### Count Optimization

```sql
-- Don't count all rows, limit to 1001
SELECT count(*)
FROM (
    SELECT 1
    FROM ...
    LIMIT 1001
)
-- If result is 1001, show "1000+"
```

**Avoid** `findAndCountAll` - counts all rows on every page fetch.

---

## Querying

### Core Rules

| Rule | Reason |
|------|--------|
| **Never SELECT *** | Waste of I/O, network; tables grow over time |
| **Always EXPLAIN (ANALYZE)** | Check for Seq Scans, Nested Loops |
| **Wrap OR with parentheses** | Clarify intent |
| **Use explicit JOIN syntax** | Not comma-separated tables |

### Existence Checks

```sql
-- BAD: Full count
SELECT count(*) FROM ... WHERE ...

-- GOOD: EXISTS
SELECT EXISTS (SELECT 1 FROM ... WHERE ...)

-- GOOD: Limited count
SELECT COUNT(*) FROM (
    SELECT 1 FROM ... WHERE ... LIMIT 1
);
```

In Sequelize: use `findFirst` with `attributes: ['id']`.

### NULL Handling

```sql
-- NULL comparisons always return NULL
SELECT NULL = 123;     -- NULL
SELECT NULL = NULL;    -- NULL

-- Use IS NULL / IS NOT NULL
SELECT 123 IS NULL;    -- FALSE
SELECT NULL IS NULL;   -- TRUE

-- Equality including NULL
SELECT ... WHERE col IS NOT DISTINCT FROM value;
```

**Beware**: `NOT IN` with NULL returns no rows!
```sql
SELECT 1 WHERE 1 NOT IN (2, NULL) -- NO ROWS!
```

### Function on Columns

**Avoid** functions on columns in WHERE (indexes won't be used):

```sql
-- BAD
WHERE COALESCE(col, 'default') = 'other'
WHERE id::text = '123'

-- GOOD
WHERE col = 'other'
WHERE id = '123'::int

-- If function needed, create matching index
CREATE INDEX ... ON t(lower(col));
```

### UNION vs UNION ALL

| Type | Behavior | Use When |
|------|----------|----------|
| `UNION` | Removes duplicates (sorts) | Need deduplication |
| `UNION ALL` | Keeps all rows (faster) | Rows are mutually exclusive |

---

## Indexes

### General Guidelines

| Guideline | Reason |
|-----------|--------|
| Small tables won't use indexes | Full scan is faster |
| Useful when selecting <5-10% of rows | Otherwise full scan preferred |
| Index FK columns | Required for parent deletion verification |
| More indexes = slower DML | DB must maintain them |
| NULL values ARE indexed | Unlike Oracle |

### Partial Indexes

```sql
-- Only index non-deleted records
CREATE INDEX ... ON table(column) WHERE deleted_at IS NULL;
```

### NULL in Unique Indexes

NULLs are not considered equal - `(NULL, 1)` and `(NULL, 1)` both allowed.

```sql
-- PostgreSQL 15+
CREATE UNIQUE INDEX ... ON table (a, b) NULLS NOT DISTINCT;

-- Earlier versions: two partial indexes
CREATE UNIQUE INDEX ... ON table (a, b) WHERE a IS NOT NULL;
CREATE UNIQUE INDEX ... ON table (b) WHERE a IS NULL;
```

### Column Order in Index

Order matters: equality columns first, then range, then ordering.

Index on `(a, b, c)` can be used for:
- `a` alone
- `a AND b`
- `a AND b AND c`
- Sometimes `a AND c`

Cannot be used for: `b`, `b AND c`, `c`

### Creating Indexes CONCURRENTLY

For large tables, avoid locking:

```javascript
module.exports = {
  async up(queryInterface) {
    try {
      await queryInterface.sequelize.query(
        `DROP INDEX CONCURRENTLY IF EXISTS my_index;`
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX CONCURRENTLY my_index ON table USING BTREE (column);`
      );
    } catch (error) {
      await queryInterface.sequelize.query(
        `DROP INDEX CONCURRENTLY IF EXISTS my_index;`
      );
      throw error;
    }
  }
};
```

Rules:
- Cannot run in transaction
- Add `SET maintenance_work_mem = '2GB'` before
- Do NOT use `IF NOT EXISTS`
- Drop index on failure
- Must be in separate migration file

### Index Types

| Type | Use Cases |
|------|-----------|
| B-Tree (default) | `<, <=, =, >=, >`, BETWEEN, IN, IS NULL, LIKE prefix, ORDER BY, joins |
| Hash | `=` only (prefer B-Tree) |
| GIN | Arrays, full-text search, ILIKE/suffix, JSON |
| GiST | Geometric types, range types |

---

## Changing Data

### Locking

DML (`INSERT`, `UPDATE`, `DELETE`, `MERGE`) implicitly locks rows until commit.

**For SELECT → UPDATE/DELETE pattern**, use explicit locks:

```sql
-- For rows to be deleted
SELECT ... FOR UPDATE;

-- For updates (allows FK inserts)
SELECT ... FOR NO KEY UPDATE;
```

Always include `ORDER BY` before lock to avoid deadlocks.

### Bulk Operations

Prefer bulk operations over one-by-one:

```sql
-- Insert multiple rows
INSERT INTO table(col1, col2)
SELECT name, other
FROM json_to_recordset('[{"name":"a","other":"b"}]') AS x(name TEXT, other TEXT);

-- Update multiple rows
UPDATE table
SET col = x.value
FROM json_to_recordset('[{"id":1,"value":"new"}]') AS x(id INT, value TEXT)
WHERE table.id = x.id;
```

**Do in small batches** - avoid long-running transactions.

### UPSERT

Use `INSERT ... ON CONFLICT DO UPDATE` (atomic).

**Caveat**: Advances sequences even for updates.

---

## Avoiding Deadlocks

### Database Deadlocks

```
Session 1: Lock row A
Session 2: Lock row B
Session 2: Lock row A → waits
Session 1: Lock row B → waits
= DEADLOCK
```

**Solution**: Lock rows in consistent order (use ORDER BY before FOR UPDATE).

### Migration Deadlocks

Modify different tables in separate migration files.

```javascript
// BAD - two tables in one migration
await transaction(async (t) => {
  await query("ALTER TABLE t1...", {transaction: t});
  await query("ALTER TABLE t2...", {transaction: t});
});

// GOOD - separate files
// File 1: ALTER TABLE t1...
// File 2: ALTER TABLE t2...
```

---

## Deprecating Tables/Columns

See also: [Column Deprecation Pattern](./column-deprecation-pattern.md)

### Process

1. **First PR**: Remove code references + migration to RENAME to `_old`
   ```sql
   ALTER TABLE t RENAME COLUMN col TO col_old;
   ```

2. **Update related configs**:
   - Service permissions
   - Publication configuration
   - Anonymized backup rules
   - Audit config

3. **1 week later**: Migration to DROP the `_old` column

### Backup Tables

Name format: `<table>_YYYYMMDD_bck`

All backup tables >90 days old are dropped automatically.

---

## Migrations

### General Guidelines

- Migrations run with **single DB connection**
- Use **single transaction** (except CONCURRENTLY indexes)
- **One table per migration file**
- **Always throw errors** (don't just log)

### Migration Anti-Patterns

```javascript
// BAD: Missing await
await transaction(async (t) => {
  queryInterface.query("ALTER...", {transaction: t}); // Missing await!
});

// BAD: Multiple transactions
await transaction(async (t) => {/*...*/});
await transaction(async (t) => {/*...*/}); // Separate transaction!

// GOOD: Single transaction, all awaited
await transaction(async (t) => {
  await queryInterface.query("ALTER...", {transaction: t});
  await queryInterface.query("ALTER...", {transaction: t});
});
```

### Migration Types

| Type | Timing | Duration | Use For |
|------|--------|----------|---------|
| **Migrations** | During deployment | <1 min | DDL, config data |
| **Pre-Release** | Before deployment | <1 min | Backward-compatible changes |
| **Post-Deployment** | After deployment | <30 min | Long DML, non-blocking DDL |
| **Suspended Cronjobs** | Manual | >30 min | Very long DMLs |
| **ADM** | On merge (prod only) | Varies | Urgent client data fixes |

### Pre-Release Migrations

Same as regular migrations but run independently before deployment.
**Cannot rename tables/columns** (must be backward compatible).

### Post-Deployment Migrations

Run after code is deployed. Good for:
- Making columns NOT NULL
- Adding indexes
- Data migrations/backfills

---

## Advanced

| Topic | Description |
|-------|-------------|
| Function volatility | Use `VOLATILE`, `STABLE`, `IMMUTABLE` appropriately |
| CLUSTER | Reorder records physically |
| PARTITION | For large, growing tables (time series) |

---

## Related Documentation

- [Sequelize Patterns](./sequelize-patterns.md)
- [Column Deprecation Pattern](./column-deprecation-pattern.md)
- [Database Table Ownership](./database-table-ownership.md)
- [NATS Events](./nats-events.md)

---

_Source: [Deel Wiki - PostgreSQL Guidelines](https://wiki.deel.network/i/4969)_
_Created: 2026-01-05_
_Last Updated: 2026-01-05_
