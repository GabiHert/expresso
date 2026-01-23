<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-3-underwriting-request-service.md            ║
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
branch: EEXPR-13-entity-transfer-post
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Underwriting Request Service

## Objective

Create a service to generate underwriting (UW) requests for missing resources (work locations, positions) during entity transfer creation.

## Pre-Implementation

Before starting, explore:
- `backend/services/peo/peo_ops_workbench_service.ts:645-669` - `createTaskForUnderwritingRequest()`
- `backend/services/ops_workbench/ops_workbench_task.js` - Lower-level task service

## Implementation Steps

### Step 1: Create the service file

**File**: `backend/services/peo/entity_transfer/services/underwriting_request_service.ts`

### Step 2: Define input types

```typescript
interface MissingResource {
  contractOid: string;
  resourceType: 'WORK_LOCATION' | 'POSITION';
  resourceId: string;
  details?: Record<string, unknown>;
}

interface UnderwritingRequestContext {
  organizationId: number;
  organizationName: string;
  destinationLegalEntityId: number;
  destinationLegalEntityPublicId: string;
  employeeName?: string;
  effectiveDate: string;
}

interface CreateUWRequestsResult {
  requestIds: string[];
  errors: Array<{ resourceType: string; error: string }>;
}
```

### Step 3: Implement the main function

```typescript
async function createUnderwritingRequestsForMissingResources(
  missingResources: MissingResource[],
  context: UnderwritingRequestContext
): Promise<CreateUWRequestsResult>
```

### Step 4: Build UW request payloads

For each missing resource, build the payload:

**For WORK_LOCATION**:
```typescript
{
  field: 'WORK_LOCATION',
  organizationName: context.organizationName,
  requestDescription: `Work location ${resource.resourceId} not found in destination entity`,
  legalEntityId: context.destinationLegalEntityId,
  employeeName: context.employeeName,
  originalEffectiveDate: context.effectiveDate,
  // Include any address info from resource.details if available
}
```

**For POSITION**:
```typescript
{
  field: 'POSITION',
  organizationName: context.organizationName,
  requestDescription: `Position ${resource.resourceId} not found in destination entity`,
  legalEntityId: context.destinationLegalEntityId,
  jobTitle: resource.details?.jobTitle,
  employeeName: context.employeeName,
  originalEffectiveDate: context.effectiveDate,
}
```

### Step 5: Call the ops workbench service

For each payload:

```typescript
const requestId = uuidv4();
await peoOpsWorkbenchService.createTaskForUnderwritingRequest({
  requestId,
  payload,
});
```

### Step 6: Handle errors gracefully

- If one UW request fails, continue creating others
- Collect errors and return them in the result
- Log failures for monitoring

### Step 7: Export the service

Export the function for use in the main POST endpoint.

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Creates UW request for missing WORK_LOCATION
- [ ] Creates UW request for missing POSITION
- [ ] Generates unique requestId (UUID) for each request
- [ ] Includes appropriate payload fields based on resource type
- [ ] Handles errors gracefully (continues on failure)
- [ ] Returns list of created requestIds and any errors

## Testing

1. Unit test creating UW request for work location
2. Unit test creating UW request for position
3. Unit test with multiple missing resources
4. Unit test error handling when ops workbench call fails

## Notes

- Reference: `.ai/tasks/in_progress/EEXPR-13-discussion.md` for full payload fields
- Task type in ops workbench: `PEO_UNDERWRITING_REQUEST`
- The ops workbench service handles custom field mapping internally
