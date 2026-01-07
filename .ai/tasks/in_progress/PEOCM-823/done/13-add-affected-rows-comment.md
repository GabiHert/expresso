<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 13-add-affected-rows-comment.md                      ║
║ TASK: PEOCM-823                                                  ║
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
pr_feedback: marco-galvao-deel
depends_on: 11
---

# Add affected rows count to migration comment

## Context (PR Feedback)

From marco-galvao-deel on PR #1593 (line 16 of migrate migration):
> "How many rows should be affected here?"

The reviewer wants to know how many rows the data migration will affect.

## Objective

Query the database to determine how many rows exist in `peo_employee_transfer_items` and update the migration comment with this information.

## Implementation Steps

### Step 1: Query affected rows count

Run this query against the production database (or a recent replica):

```sql
-- Count total rows in peo_employee_transfer_items
SELECT COUNT(*) as total_rows
FROM peo.peo_employee_transfer_items;

-- Count rows that need migration (have new_job_code but no new_position_public_id)
SELECT COUNT(*) as rows_to_migrate
FROM peo.peo_employee_transfer_items
WHERE new_job_code IS NOT NULL
  AND new_position_public_id IS NULL;

-- Verify all job codes have matching positions
SELECT ti.new_job_code, COUNT(*) as orphan_count
FROM peo.peo_employee_transfer_items ti
LEFT JOIN peo.peo_positions pp ON pp.code = ti.new_job_code
WHERE pp.public_id IS NULL
GROUP BY ti.new_job_code;
```

### Step 2: Update migration comment

In the post-deployment migration file (work item 11), update the header comment:

```javascript
// Affected records: X rows
// Estimated run time: Y seconds
```

Replace `X` with the actual row count and estimate runtime based on:
- ~1000 rows/second for simple UPDATE with JOIN
- Add buffer for index updates

Example:
```javascript
// Affected records: 150 rows
// Estimated run time: < 1 second
```

### Step 3: Reply to PR comment

Reply to marco-galvao-deel's comment with:
> "Currently X rows in the table. The migration will update rows where `new_job_code` is set but `new_position_public_id` is NULL."

## Acceptance Criteria

- [ ] Database queried for actual row count
- [ ] Migration file updated with accurate affected rows count
- [ ] Estimated runtime provided
- [ ] PR comment answered with the information

## Notes

- The row count may change between now and deployment
- The comment serves as documentation for reviewers to understand impact
- If the count is 0 (no existing data), note that in the comment
