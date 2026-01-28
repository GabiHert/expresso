<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-9-position-uw-method.md                     ║
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

# Add ensureUnderwritingRequestExists to PEOPositionService

## Objective

Add a method to PEOPositionService that ensures an underwriting request exists for a job code/position that is not found in Prism. This follows the same pattern as PEOWorkLocationService.

## Pre-Implementation

Review the pattern established in EEXPR-13-8 (PEOWorkLocationService) and apply the same approach to positions/job codes.

## Implementation Steps

### Step 1: Add ensureUnderwritingRequestExists method

**File**: `services/peo/position_service.ts`

**Instructions**:
Add a new public method that:
1. Accepts job code/position info and legal entity context
2. Checks if a pending UW request already exists using `peoPrismResourceRequestService.getPrismResourceRequestByLegalEntityId()`
3. If no pending request exists, creates one using `peoPrismResourceRequestService.createPrismResourceRequest()`
4. Notifies about the new request using `peoPrismResourceRequestService.notifyPrismResourceRequestCreation()`
5. Returns the UW request (existing or newly created)

**Method signature**:
```typescript
async ensureUnderwritingRequestExists(params: {
    jobCode: string;
    legalEntityPublicId: string;
    organizationId: number;
    requestedBy: number; // profile ID
    reason: string; // e.g., "Entity transfer - job code not found"
}): Promise<PrismResourceRequest | null>
```

**Pattern to follow**:
```typescript
// Check if UW request already exists
const prismResourceRequests = await peoPrismResourceRequestService.getPrismResourceRequestByLegalEntityId({
    legalEntityId: legalEntityPublicId,
    prismRequestStatus: PrismResourceRequestStatus.UNDER_REVIEW,
    resource: PrismResourceRequestResource.JOB_CODE, // or POSITION depending on existing enum
    description: jobCode,
});

if (prismResourceRequests.length > 0) {
    return prismResourceRequests[0]; // Already has pending UW
}

// Create new UW request
const prismResourceRequest = await peoPrismResourceRequestService.createPrismResourceRequest({
    resource: PrismResourceRequestResource.JOB_CODE,
    organizationId,
    deelLegalEntityId: legalEntityPublicId,
    status: PrismResourceRequestStatus.UNDER_REVIEW,
    // ... other fields
});

await peoPrismResourceRequestService.notifyPrismResourceRequestCreation(payload, {
    requestId: prismResourceRequest.id,
    resource: PrismResourceRequestResource.JOB_CODE,
    // ...
});

return prismResourceRequest;
```

### Step 2: Verify PrismResourceRequestResource enum

**File**: Check `types/` or `enums/` for PrismResourceRequestResource

**Instructions**:
Verify that the enum has a value for job codes/positions. Common values:
- `JOB_CODE`
- `POSITION`
- `JOB_TITLE`

If not present, may need to add it to the enum.

## Acceptance Criteria

- [ ] Method is added to PEOPositionService
- [ ] Method follows same pattern as PEOWorkLocationService
- [ ] Method checks for existing pending UW requests before creating new ones
- [ ] Method creates OpsWorkbench task via notification
- [ ] Method returns the UW request (existing or new)

## Testing

- Unit test: Mock peoPrismResourceRequestService and verify correct behavior
- Test case: Existing UW request should not create duplicate
- Test case: No existing UW request should create new one

## Notes

This method will be called from the entity transfer POST endpoint when SanityCheckResourcesExistStep fails for job codes/positions.
