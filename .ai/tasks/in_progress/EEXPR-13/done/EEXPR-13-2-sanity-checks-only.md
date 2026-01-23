<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-2-sanity-checks-only.md                      ║
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

# Execute Sanity Checks Only Method

## Objective

Add a method to run sanity checks on all contracts without executing the full transfer pipeline. The method should collect ALL failures instead of failing fast.

## Pre-Implementation

Before starting, explore existing step classes:
- `backend/services/peo/entity_transfer/steps/cross_hire_sanity_check_step.ts`
- `backend/services/peo/entity_transfer/steps/termination_sanity_check_step.ts`
- `backend/services/peo/entity_transfer/steps/sanity_check_resources_exist_step.ts`
- `backend/services/peo/entity_transfer/entity_transfer_service.ts` - Main orchestrator

## Implementation Steps

### Step 1: Define the return type

**File**: `backend/services/peo/entity_transfer/entity_transfer_service.ts`

Add interface for the result:

```typescript
interface SanityCheckFailure {
  contractOid: string;
  step: string;
  message: string;
  details?: Record<string, unknown>;
}

interface MissingResource {
  contractOid: string;
  resourceType: 'WORK_LOCATION' | 'POSITION';
  resourceId: string;
  details?: Record<string, unknown>;
}

interface SanityCheckResult {
  success: boolean;
  failures: SanityCheckFailure[];
  missingResources: MissingResource[];
}
```

### Step 2: Create the method

Add new method `executeSanityChecksOnly`:

```typescript
async executeSanityChecksOnly(
  contracts: Array<{
    basePeoContractOid: string;
    newWorkLocationId: string;
    newPositionPublicId: string;
    // ... other fields
  }>,
  options: {
    organizationId: number;
    sourceLegalEntityPublicId: string;
    destinationLegalEntityPublicId: string;
    effectiveDate: string;
  }
): Promise<SanityCheckResult>
```

### Step 3: Implement the method logic

For EACH contract in the array:

1. **Run CrossHireSanityCheckStep**:
   - Instantiate the step
   - Execute and capture any errors
   - Add to `failures` if failed

2. **Run TerminationSanityCheckStep**:
   - Instantiate the step
   - Execute and capture any errors
   - Add to `failures` if failed

3. **Run SanityCheckResourcesExistStep**:
   - Instantiate the step
   - Execute and capture any errors
   - If work location or position not found, add to `missingResources` (NOT failures)

**IMPORTANT**: Do NOT fail fast. Collect ALL failures across ALL contracts.

### Step 4: Return the aggregated result

```typescript
return {
  success: failures.length === 0,
  failures,
  missingResources,
};
```

### Step 5: Handle step instantiation

Each step class needs specific context. Reference existing usage in `entity_transfer_service.ts` to understand how to instantiate them:

- `CrossHireSanityCheckStep` - needs PEO contract data
- `TerminationSanityCheckStep` - needs contract OID, organization context
- `SanityCheckResourcesExistStep` - needs destination entity, resource IDs

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Method runs all 3 sanity check steps for each contract
- [ ] Failures are collected, not failed-fast
- [ ] Missing resources are reported separately from hard failures
- [ ] Return type clearly indicates success/failure status
- [ ] Each failure includes contract OID, step name, and message

## Testing

1. Unit test with contracts that pass all checks
2. Unit test with contracts that fail CrossHireSanityCheck (missing SSN, etc.)
3. Unit test with contracts that fail TerminationSanityCheck (pending payroll events)
4. Unit test with contracts that have missing resources
5. Unit test with mix of passing and failing contracts

## Notes

- Reference existing pipeline in `entity_transfer_service.ts`
- The existing pipeline fails fast - our method must NOT
- Step classes have external service calls (EMS, PMS, PEO) - may need mocking
