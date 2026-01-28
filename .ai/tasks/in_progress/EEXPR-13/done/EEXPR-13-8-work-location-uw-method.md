<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-8-work-location-uw-method.md                ║
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

# Add ensureUnderwritingRequestExists to PEOWorkLocationService

## Objective

Add a method to PEOWorkLocationService that ensures an underwriting request exists for a work location that is OBSOLETE or not found in Prism. This follows the existing pattern in validateWorkLocation() but extracts it into a reusable method.

## Pre-Implementation

Review the existing validateWorkLocation() method in work_location_service.ts (lines 266-325) to understand the current UW request creation pattern.

## Implementation Steps

### Step 1: Add ensureUnderwritingRequestExists method

**File**: `services/peo/work_location_service.ts`

**Instructions**:
Add a new public method that:
1. Accepts work location info and legal entity context
2. Checks if a pending UW request already exists using `peoPrismResourceRequestService.getPrismResourceRequestByLegalEntityId()`
3. If no pending request exists, creates one using `peoPrismResourceRequestService.createPrismResourceRequest()`
4. Notifies about the new request using `peoPrismResourceRequestService.notifyPrismResourceRequestCreation()`
5. Returns the UW request (existing or newly created)

**Method signature**:
```typescript
async ensureUnderwritingRequestExists(params: {
    workLocationId: string;
    legalEntityPublicId: string;
    organizationId: number;
    requestedBy: number; // profile ID
    reason: string; // e.g., "Entity transfer - work location not found"
}): Promise<PrismResourceRequest | null>
```

**Pattern to follow** (from validateWorkLocation):
```typescript
// Check if UW request already exists
const prismResourceRequests = await peoPrismResourceRequestService.getPrismResourceRequestByLegalEntityId({
    legalEntityId: legalEntity.publicId,
    prismRequestStatus: PrismResourceRequestStatus.UNDER_REVIEW,
    resource: PrismResourceRequestResource.WORK_LOCATION,
    description: peoWorkLocation.locationId,
});

if (prismResourceRequests.length > 0) {
    return prismResourceRequests[0]; // Already has pending UW
}

// Create new UW request
const prismResourceRequest = await peoPrismResourceRequestService.createPrismResourceRequest({
    resource: PrismResourceRequestResource.WORK_LOCATION,
    organizationId,
    deelLegalEntityId: legalEntityPublicId,
    status: PrismResourceRequestStatus.UNDER_REVIEW,
    // ... other fields
});

await peoPrismResourceRequestService.notifyPrismResourceRequestCreation(payload, {
    requestId: prismResourceRequest.id,
    resource: PrismResourceRequestResource.WORK_LOCATION,
    // ...
});

return prismResourceRequest;
```

## Acceptance Criteria

- [ ] Method is added to PEOWorkLocationService
- [ ] Method follows existing validateWorkLocation() pattern
- [ ] Method checks for existing pending UW requests before creating new ones
- [ ] Method creates OpsWorkbench task via notification
- [ ] Method returns the UW request (existing or new)

## Testing

- Unit test: Mock peoPrismResourceRequestService and verify correct behavior
- Test case: Existing UW request should not create duplicate
- Test case: No existing UW request should create new one

## Notes

This method will be called from the entity transfer POST endpoint when SanityCheckResourcesExistStep fails for work locations.
