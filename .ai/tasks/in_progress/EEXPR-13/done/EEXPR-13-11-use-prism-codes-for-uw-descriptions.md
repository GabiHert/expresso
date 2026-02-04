<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-11-use-prism-codes-for-uw-descriptions.md   ║
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

# Use Prism Codes Instead of UUIDs for UW Request Descriptions

## Objective

Modify the underwriting request creation during entity transfers to use Prism codes (work location `locationId`/`state`, position `code`/`title`) as the `description` field instead of UUIDs (`newWorkLocationId`, `newPositionPublicId`). This aligns entity transfer UW requests with the standard PEO flow and eliminates the need for the UUID fallback search in Step 3.

## Pre-Implementation

Run an exploration agent on these key files before starting:
- `services/peo/entity_transfer/services/underwriting_request_service.ts` (lines 106-146)
- `services/peo/work_location_service.ts` (`ensureUnderwritingRequestExists`, `getPEOWorkLocationByEntityWorkLocationId`)
- `services/peo/peo_position_service.ts` (`ensureUnderwritingRequestExists`, `getByFilters`)
- `services/peo/entity_transfer/steps/check_underwriting_request_status_step.ts` (lines 283-305 for reference on how Prism codes are looked up)

## Implementation Steps

### Step 1: Enrich `createSingleUnderwritingRequest` with Prism code lookups

**File**: `services/peo/entity_transfer/services/underwriting_request_service.ts`

**Instructions**:
In `createSingleUnderwritingRequest()` (line 106), before calling `ensureUnderwritingRequestExists`, look up the Prism code for the resource using its UUID:

For **WORK_LOCATION** (line 109-122):
1. Call `peoWorkLocationService.getPEOWorkLocationByEntityWorkLocationId(resource.resourceId)` to get the work location record
2. Extract `locationId` (the Prism code) or `state` as fallback
3. Pass that as `workLocationId` instead of `resource.resourceId`
4. Keep `resource.resourceId` (UUID) as fallback if lookup fails

For **POSITION** (line 124-137):
1. Call `peoPositionService.getByFilters({ positionPublicIds: [resource.resourceId] })` to get the position record
2. Extract `code` (job code) or `title` as fallback
3. Pass that as `jobCode` instead of `resource.resourceId`
4. Keep `resource.resourceId` (UUID) as fallback if lookup fails

**Key reference**: `check_underwriting_request_status_step.ts` lines 283-305 already does this exact pattern for work locations, and lines 379-395 for positions. Reuse the same approach.

### Step 2: Update `buildRequestDescription` with richer details

**File**: `services/peo/entity_transfer/services/underwriting_request_service.ts`

**Instructions**:
In `buildRequestDescription()` (line 151), update the `resourceIdentifier` to use the Prism code when available. The current fallback chain is:
```typescript
const resourceIdentifier = resource.details?.name || resource.details?.jobTitle || resource.resourceId;
```

This may need updating if we store the looked-up Prism code on the resource details.

### Step 3: Add error handling for Prism code lookup failures

**Instructions**:
If the Prism code lookup fails (network error, resource not found), log a warning and fall back to the UUID. The UW request should still be created - just with a UUID description. This preserves the current behavior as a safety net.

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] UW requests created during entity transfer use Prism codes as `description` (not UUIDs)
- [ ] Work location UW requests use `locationId` (Prism work location code)
- [ ] Position UW requests use `code` (Prism job code) or `title` as fallback
- [ ] If Prism code lookup fails, falls back to UUID (current behavior)
- [ ] Logging includes both UUID and resolved Prism code for debugging

## Testing

- Unit test: Mock `getPEOWorkLocationByEntityWorkLocationId` and `getByFilters` to return Prism codes, verify `ensureUnderwritingRequestExists` receives Prism code as description
- Unit test: Verify fallback to UUID when lookup returns null
- Integration: Covered by EEXPR-13-13 (Giger E2E test)

## Notes

- The standard PEO flow (`validateWorkLocation`, `createLocation`) already uses Prism codes. This change makes entity transfers consistent.
- `CheckUnderwritingRequestStatus` (Step 3) already knows how to resolve UUID -> Prism code. We're moving that resolution to creation time instead.
- After this change, the UUID fallback in Step 3 (commit b1953da5) should become dead code.
