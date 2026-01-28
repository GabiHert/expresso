<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-10-update-post-endpoint.md                  ║
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
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: EEXPR-13-entity-transfers-post
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Update Entity Transfer POST Endpoint to Use Service Methods

## Objective

Update the entity transfer POST endpoint (tech ops and public API) to use the new `ensureUnderwritingRequestExists` methods from PEOWorkLocationService and PEOPositionService instead of a separate underwriting request service.

## Pre-Implementation

- Verify EEXPR-13-8 and EEXPR-13-9 are complete
- Review the current POST endpoint implementation in tech_ops.ts

## Implementation Steps

### Step 1: Update tech ops endpoint

**File**: `controllers/admin/peo/tech_ops.ts`

**Instructions**:
In the entity transfer POST handler, when `SanityCheckResourcesExistStep` fails:

1. Check the failure type (work location vs job code)
2. Call the appropriate service method:
   - For work location failures: `peoWorkLocationService.ensureUnderwritingRequestExists(...)`
   - For job code failures: `peoPositionService.ensureUnderwritingRequestExists(...)`
3. Continue with transfer creation (status DRAFT or PENDING_UW depending on UW requests)

**Implementation flow**:
```typescript
// Run sanity checks
const sanityResult = await entityTransferService.executeSanityChecksOnly(transferData);

// Process failures
const uwRequests = [];
for (const failure of sanityResult.failures) {
    if (failure.step === 'SanityCheckResourcesExistStep') {
        if (failure.resourceType === 'WORK_LOCATION') {
            const uwRequest = await peoWorkLocationService.ensureUnderwritingRequestExists({
                workLocationId: failure.resourceId,
                legalEntityPublicId: destEntity.publicId,
                organizationId,
                requestedBy: requesterProfileId,
                reason: `Entity transfer - work location not found in destination entity`,
            });
            if (uwRequest) uwRequests.push(uwRequest);
        } else if (failure.resourceType === 'JOB_CODE') {
            const uwRequest = await peoPositionService.ensureUnderwritingRequestExists({
                jobCode: failure.resourceId,
                legalEntityPublicId: destEntity.publicId,
                organizationId,
                requestedBy: requesterProfileId,
                reason: `Entity transfer - job code not found in destination entity`,
            });
            if (uwRequest) uwRequests.push(uwRequest);
        }
    } else {
        // Non-resource failures are blocking errors
        throw new Error(`Sanity check failed: ${failure.message}`);
    }
}

// Create transfer with appropriate status
const transferStatus = uwRequests.length > 0 ? 'DRAFT' : 'PENDING_SIGNATURES';
const transfer = await entityTransferClientService.createTransfer({
    ...transferData,
    status: transferStatus,
    // Link UW request IDs if needed
});
```

### Step 2: Update public API endpoint

**File**: `controllers/api/public/peo/entity_transfers.ts` (or wherever public API lives)

**Instructions**:
Apply the same pattern as tech ops endpoint. Both endpoints should use the same service methods.

### Step 3: Remove underwriting_request_service references (if any)

If EEXPR-13-3 created a separate service file, it should be removed or the file was never actually created. Verify and clean up any references.

## Acceptance Criteria

- [ ] Tech ops POST endpoint uses PEOWorkLocationService.ensureUnderwritingRequestExists()
- [ ] Tech ops POST endpoint uses PEOPositionService.ensureUnderwritingRequestExists()
- [ ] Public API POST endpoint follows same pattern
- [ ] No separate underwriting_request_service.ts exists
- [ ] UW requests are created only when SanityCheckResourcesExistStep fails
- [ ] Transfer status reflects whether UW requests are pending

## Testing

- Integration test: Create transfer with missing work location
- Integration test: Create transfer with missing job code
- Integration test: Create transfer with all resources present (no UW requests)
- Verify OpsWorkbench tasks are created for UW requests

## Notes

This work item completes the refactor from the originally planned separate underwriting service to using existing service methods, following the established pattern in the codebase.
