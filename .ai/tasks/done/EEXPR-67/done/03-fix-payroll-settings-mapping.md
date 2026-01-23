<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-fix-payroll-settings-mapping.md                    ║
║ TASK: EEXPR-67                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
# Repository Context (EEXPR-67)
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: EEXPR-67-fix-transfer-resources
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Fix Payroll Settings Mapping

## Objective

Remove the fallback `||` chains in the `getEmploymentPayrollSettings` return mapping to ensure consistent responses without fallback values.

## Pre-Implementation

The current implementation uses fallback chains that can return inconsistent data:
- `id` might come from `pg.id`, `pg.publicId`, or empty string
- `label` might come from `pg.name`, `pg.description`, or `pg.id`

This inconsistency makes it harder for consumers to rely on the response structure.

## Implementation Steps

### Step 1: Update Return Mapping

**File**: `backend/services/peo/entity_transfer/services/transfer_resources_service.ts`
**Lines**: ~130-134

**Current Code**:
```typescript
return filteredPayGroups.map((pg) => ({
    id: pg.id || pg.publicId || '',
    label: pg.name || pg.description || pg.id,
}));
```

**Replace With**:
```typescript
return filteredPayGroups.map((pg) => ({
    id: pg.id,
    label: pg.name,
}));
```

## Post-Implementation

After completing, verify:
1. No TypeScript errors
2. The mapping uses direct property access without fallbacks

## Acceptance Criteria

- [ ] `id` field uses only `pg.id` (no fallback to publicId or empty string)
- [ ] `label` field uses only `pg.name` (no fallback to description or id)
- [ ] Response structure is consistent

## Testing

1. Verify that payroll settings are returned with correct `id` and `name` values
2. Ensure no undefined/null values appear in the response (data should be properly populated at source)

## Notes

- This change assumes that `pg.id` and `pg.name` are always populated
- If there are cases where these fields are missing, the source data should be fixed rather than using fallbacks
- This provides more predictable API responses for consumers
