<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-fix-pto-policies-filter.md                         ║
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

# Fix PTO Policies Filter

## Objective

Replace the raw SQL query that filters PTO policies with the `timeOffService.getPoliciesByOrganizationId()` method, and update the filtering logic to include policies with PEO worker type OR no worker types defined (universal policies).

## Pre-Implementation

The exploration has already been done. Key findings:
- Service method: `backend/services/time_off/service.js:423-444`
- Returns policies with `PolicyWorkerTypes` array
- Worker type for PEO is `'peo'`

## Implementation Steps

### Step 1: Add Import

**File**: `backend/services/peo/entity_transfer/services/transfer_resources_service.ts`

**Instructions**:
Add the timeOffService import at the top of the file:

```typescript
import timeOffService from '../../../time_off/service';
```

### Step 2: Replace getPtoPolicies Method

**File**: `backend/services/peo/entity_transfer/services/transfer_resources_service.ts`
**Lines**: ~142-164

**Current Code**:
```typescript
private async getPtoPolicies(organizationId: number): Promise<ResourceOption[]> {
    const policies = await this.db.sequelize.query<PtoPolicyRow>(
        `SELECT pol.uid, pol.name
        FROM time_off.policies pol
        INNER JOIN time_off.policy_worker_types pwt ON pwt.policy_id = pol.id AND pwt.worker_type = 'peo'
        WHERE pol.organization_id = :organizationId
        ORDER BY pol.name`,
        {
            replacements: {organizationId},
            type: this.db.Sequelize.QueryTypes.SELECT,
            useMaster: false,
        }
    );

    if (!policies?.length) {
        return [];
    }

    return policies.map((policy) => ({
        id: policy.uid,
        label: policy.name,
    }));
}
```

**Replace With**:
```typescript
private async getPtoPolicies(organizationId: number): Promise<ResourceOption[]> {
    const policies = await timeOffService.getPoliciesByOrganizationId(
        organizationId,
        {fetchAll: true}
    );

    if (!policies?.length) {
        return [];
    }

    // Include policies with PEO worker type OR no worker types defined (universal policies)
    const filteredPolicies = policies.filter((policy) => {
        const workerTypes = policy.PolicyWorkerTypes || [];
        return workerTypes.length === 0 || workerTypes.some((wt) => wt.workerType === 'peo');
    });

    return filteredPolicies.map((policy) => ({
        id: policy.uid,
        label: policy.name,
    }));
}
```

### Step 3: Verify Types

Check if any type adjustments are needed for the Policy type. The `PolicyWorkerTypes` field should be available on the returned policies.

If TypeScript errors occur, you may need to add type definitions or use type assertions.

## Post-Implementation

After completing, verify:
1. The import is correctly resolved
2. No TypeScript errors
3. The filtering logic is correct

## Acceptance Criteria

- [ ] Raw SQL query is removed
- [ ] Using `timeOffService.getPoliciesByOrganizationId()` method
- [ ] Filtering includes policies with 'peo' worker type
- [ ] Filtering includes policies with NO worker types (universal)
- [ ] Returns correct `id` (uid) and `label` (name) structure

## Testing

Test with an organization that has:
1. Policies with PEO worker type - should be included
2. Policies with NO worker types - should be included
3. Policies with only other worker types (e.g., 'eor') - should be excluded

## Notes

- The `PolicyWorkerTypes` field contains an array of worker type objects
- Each worker type object has a `workerType` property with values like 'peo', 'eor', etc.
- Policies with empty `PolicyWorkerTypes` array are considered universal
