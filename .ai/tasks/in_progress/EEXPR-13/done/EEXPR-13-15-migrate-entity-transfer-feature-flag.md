<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-15-migrate-entity-transfer-feature-flag.md  ║
║ TASK: EEXPR-13                                                   ║
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
# Repository Context (EEXPR-13)
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/worktrees/EEXPR-13/backend
branch: EEXPR-13-entity-transfer-post
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/worktrees/EEXPR-13/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Migrate Entity Transfer Feature Flag from Frontend to Backend

## Objective

Migrate `isEntityTransferEnabled` from reading `frontendFlags.PEOEnableEntityTransfer` to reading `peo.enableEntityTransfer` (a proper backend flag). Frontend flags are managed by the frontend team and should not be used to gate backend service logic.

## Background

The current `isEntityTransferEnabled` function in `peo_feature_flags.ts:214-229` reads from `frontendFlags?.PEOEnableEntityTransfer`, which is a frontend flag sourced from `/var/features/frontend.json`. Backend logic should use flags under the `peo` namespace sourced from `/var/features/backend.json`.

The organization-scoped backend flag pattern already exists in this file — see `useNewPEOEligibilityCheck` at line 164 which reads from `peo.useNewPEOEligibilityCheck` with `enableForAll` + `enableForOrgs` structure.

## Implementation Steps

### Step 1: Update `isEntityTransferEnabled` in `peo_feature_flags.ts`

**File**: `services/peo/peo_feature_flags.ts` (lines 214-229)

**Current code**:
```typescript
export const isEntityTransferEnabled = (organizationId: number): boolean => {
    const flag = featureFlagsProvider.getFlags().frontendFlags?.PEOEnableEntityTransfer;
    if (!flag) return false;

    log.info({flag, organizationId}, 'PEO ENTITY TRANSFER: PEOEnableEntityTransfer');

    if (typeof flag === 'boolean') {
        return flag;
    }

    if ('organization' in flag && Array.isArray(flag.organization) && organizationId) {
        return flag.organization.includes(organizationId);
    }

    return false;
};
```

**Replace with** (follows the `useNewPEOEligibilityCheck` pattern at line 164):
```typescript
export const isEntityTransferEnabled = (organizationId: number): boolean => {
    const flag = featureFlagsProvider.getFlags().peo?.enableEntityTransfer ?? {enableForAll: false, enableForOrgs: []};

    log.info({flag, organizationId}, 'PEO ENTITY TRANSFER: enableEntityTransfer');

    if (flag.enableForAll) {
        return true;
    }

    if (Array.isArray(flag.enableForOrgs) && flag.enableForOrgs.includes(organizationId)) {
        return true;
    }

    return false;
};
```

**Key changes**:
- Source: `frontendFlags?.PEOEnableEntityTransfer` -> `peo?.enableEntityTransfer`
- Flag name: `PEOEnableEntityTransfer` (frontend PascalCase) -> `enableEntityTransfer` (backend camelCase)
- Structure: `{ organization: [...] }` -> `{ enableForAll: bool, enableForOrgs: [...] }` (standard backend pattern)
- Log message updated to reflect the new flag name

### Step 2: Add the flag to local dev feature flags

**File**: `.features/backend.json`

**Instructions**:
- Add `enableEntityTransfer` under the `peo` key:
```json
{
  "peo": {
    "enableEntityTransfer": {
      "enableForAll": false,
      "enableForOrgs": []
    }
  }
}
```
- For local development/testing, set `enableForAll: true` or add your test org IDs to `enableForOrgs`

### Step 3: Update tests that mock the feature flag

**Instructions**:
- Search for any test files that mock `PEOEnableEntityTransfer` or `isEntityTransferEnabled`
- Update mocks from:
  ```typescript
  featureFlagsProvider.getFlags.mockReturnValue({
      frontendFlags: {
          PEOEnableEntityTransfer: true  // or { organization: [123] }
      }
  });
  ```
- To:
  ```typescript
  featureFlagsProvider.getFlags.mockReturnValue({
      peo: {
          enableEntityTransfer: { enableForAll: true, enableForOrgs: [] }
      }
  });
  ```

### Step 4: Coordinate flag deployment

**IMPORTANT**: This is a deployment coordination step, not a code change.

Before deploying the code change, the `enableEntityTransfer` flag must exist in the backend feature flags configuration (the system that writes to `/var/features/backend.json`). Otherwise, the flag will default to `{ enableForAll: false, enableForOrgs: [] }` and entity transfer will be disabled for all organizations.

**Steps**:
1. Identify which organizations currently have the frontend flag `PEOEnableEntityTransfer` enabled
2. Add those same organization IDs to the backend flag `peo.enableEntityTransfer.enableForOrgs`
3. Deploy the backend flag configuration first
4. Then deploy the code change
5. After verifying the backend flag works, the frontend flag `PEOEnableEntityTransfer` can be cleaned up (separate task)

## Files Summary

| File | Action |
|------|--------|
| `services/peo/peo_feature_flags.ts` | Change flag source from `frontendFlags` to `peo` namespace |
| `.features/backend.json` | Add `enableEntityTransfer` flag for local dev |
| Test files referencing `PEOEnableEntityTransfer` | Update mocks to use new flag structure |

## Files That DON'T Need Changes

These files use `isEntityTransferEnabled` by import and are unaffected by the internal change:
- `services/peo/entity_transfer/entity_transfer_service.ts` — calls `isEntityTransferEnabled(transfer.organizationId)` at line 72

## Acceptance Criteria

- [ ] `isEntityTransferEnabled` reads from `peo.enableEntityTransfer` (not `frontendFlags`)
- [ ] Flag follows the standard backend organization-scope pattern (`enableForAll` + `enableForOrgs`)
- [ ] Log message updated to reflect the new flag name
- [ ] Local dev `.features/backend.json` includes the new flag
- [ ] Any existing tests updated to mock the new flag structure
- [ ] No references to `frontendFlags?.PEOEnableEntityTransfer` remain in entity transfer code

## Testing

1. **Unit**: Run existing entity transfer tests — they should pass after updating mocks
2. **Local dev**: Set `enableForAll: true` in `.features/backend.json` and verify entity transfer works
3. **Giger**: Deploy with the flag configured and verify the POST endpoint still gates correctly

## Notes

- The function signature `(organizationId: number): boolean` does NOT change — callers are unaffected
- The frontend flag `PEOEnableEntityTransfer` may still be needed by the frontend UI — this work item only removes the backend dependency on it
- Coordinate with whoever manages the feature flag configuration to ensure the backend flag exists before deployment
