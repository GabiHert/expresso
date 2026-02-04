<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-12-remove-uuid-fallback.md                  ║
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

# Remove UUID Fallback from CheckUnderwritingRequestStatus

## Objective

Remove the UUID fallback search logic from `CheckUnderwritingRequestStatusStep` (Step 3) that was added in commit `b1953da5d00d62932ece043a6f8577975b88271b`. Now that EEXPR-13-11 ensures UW requests use Prism codes as descriptions, the UUID fallback is no longer needed.

## Pre-Implementation

Verify EEXPR-13-11 is complete and deployed before starting this item. The UUID fallback should only be removed AFTER we confirm UW requests are created with Prism codes.

**Depends on**: EEXPR-13-11 (Use Prism codes for UW descriptions)

## Implementation Steps

### Step 1: Remove `searchUwRequestByUuid` method

**File**: `services/peo/entity_transfer/steps/check_underwriting_request_status_step.ts`

**Instructions**:
1. Find the `searchUwRequestByUuid` private method
2. Remove the entire method
3. Remove any imports that were only used by this method

### Step 2: Remove UUID fallback calls for work location

**File**: `services/peo/entity_transfer/steps/check_underwriting_request_status_step.ts`

**Instructions**:
Find the work location UUID fallback block (approximately lines 356-370):
```typescript
// Prism code search returned no results - try UUID fallback
this.log.info({
    message: '[CheckUnderwritingRequestStatus] No work location UW request found by prism code - trying UUID fallback',
    ...
});
const uuidFallbackResult = await this.searchUwRequestByUuid(...);
if (uuidFallbackResult) {
    return uuidFallbackResult;
}
```

Remove this entire block. The Prism code search should now find the request on the first try.

### Step 3: Remove UUID fallback calls for position

**File**: `services/peo/entity_transfer/steps/check_underwriting_request_status_step.ts`

**Instructions**:
Find the position UUID fallback block (approximately lines 481-491) and remove it. Same pattern as Step 2.

### Step 4: Clean up logging

**Instructions**:
Update any remaining log messages that reference "UUID fallback" to reflect that the search is now Prism-code-only.

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] `searchUwRequestByUuid` method removed
- [ ] UUID fallback code blocks removed for both work location and position
- [ ] No references to "UUID fallback" remain in the step
- [ ] Step 3 searches only by Prism code (standard flow)
- [ ] Code compiles without errors

## Testing

- Covered by EEXPR-13-13 (Giger E2E test)
- Verify no regressions in `CheckUnderwritingRequestStatus` behavior

## Notes

- The UUID fallback was added in commit `b1953da5d00d62932ece043a6f8577975b88271b` as a workaround for UW requests created with UUID descriptions
- Once EEXPR-13-11 ensures Prism codes are used, this fallback becomes dead code
- Keep this as a separate commit for clean git history and easy revert if needed
