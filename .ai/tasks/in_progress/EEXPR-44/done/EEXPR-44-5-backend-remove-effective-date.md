<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-44-5-backend-remove-effective-date.md          ║
║ TASK: EEXPR-44                                                   ║
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
# Repository Context (EEXPR-44)
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/worktrees/EEXPR-44/backend
branch: EEXPR-44
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/worktrees/EEXPR-44/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Backend: Remove effectiveDate from Transfer Creation

## Objective

Completely remove the effectiveDate calculation from the `createEntityTransfer()` flow. During PENDING_SIGNATURES phase, transfers have no effectiveDate — it will be resolved later by a cron job before the transfer moves to SCHEDULED status.

## Context

The `effectiveDateService.calculateEffectiveDate()` call in `createEntityTransfer()` is being removed because:
- During PENDING_SIGNATURES, we don't have an effectiveDate yet
- The effectiveDate will be resolved by a separate cron job
- All downstream consumers need to be updated to handle null effectiveDate

Downstream consumers of effectiveDateResult:
1. **Sanity checks** (`SanityCheckOptions.effectiveDate`) — used in mock transfer creation
2. **Underwriting requests** (`UnderwritingRequestContext.effectiveDate`) — used in description text
3. **PEO API call** (`CreateTransferApiRequest.effectiveDate`) — required field, Zod-validated
4. **Response** (`CreateTransferSuccess.effectiveDateDetails`) — returned to clients

## Pre-Implementation

Before starting:
- Ensure EEXPR-44-4 (PEO nullable effectiveDate) is complete and deployed
- Read `create_transfer_service.ts` fully
- Read `entity_transfer_service.ts` for SanityCheckOptions usage
- Read `underwriting_request_service.ts` for UnderwritingRequestContext usage
- Read `types.ts` for CreateTransferApiRequest

## Implementation Steps

### Step 1: Remove effectiveDateDetails from Response Interface

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

**Instructions**:
1. Remove the `effectiveDateDetails: EffectiveDateResult;` field from `CreateTransferSuccess` interface (line ~39)
2. Remove the `@expresso` comment block above it (lines ~37-38)
3. Remove the `import {EffectiveDateResult, effectiveDateService}` import (line ~7)

### Step 2: Remove effectiveDate Calculation from createEntityTransfer

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

**Instructions**:
1. Remove the `effectiveDateResult` calculation (line ~104):
   ```typescript
   // DELETE:
   const effectiveDateResult = await effectiveDateService.calculateEffectiveDate(sourceLegalEntityPublicId);
   ```
2. Remove the log block about effective date calculated (lines ~106-110)
3. Remove the `@expresso` comment block (lines ~102-103)

### Step 3: Update Sanity Checks Call

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

**Instructions**:
Remove `effectiveDate` from the sanity checks options (line ~126):
```typescript
// BEFORE:
const sanityResult = await this.runSanityChecks(sanityCheckContracts, {
    organizationId,
    sourceLegalEntityPublicId,
    destinationLegalEntityPublicId,
    effectiveDate: effectiveDateResult.effectiveDate,
    requesterProfilePublicId,
});

// AFTER:
const sanityResult = await this.runSanityChecks(sanityCheckContracts, {
    organizationId,
    sourceLegalEntityPublicId,
    destinationLegalEntityPublicId,
    requesterProfilePublicId,
});
```

### Step 4: Update SanityCheckOptions Interface

**File**: `services/peo/entity_transfer/entity_transfer_service.ts`

**Instructions**:
1. Make `effectiveDate` optional in `SanityCheckOptions`:
   ```typescript
   export interface SanityCheckOptions {
       organizationId: number;
       sourceLegalEntityPublicId: string;
       destinationLegalEntityPublicId: string;
       effectiveDate?: string;  // Now optional - null during PENDING_SIGNATURES
       requesterProfilePublicId: string;
   }
   ```
2. Find where `options.effectiveDate` is used in `executeSanityChecksOnly()` (mock transfer creation at line ~610) and handle null:
   ```typescript
   effectiveDate: options.effectiveDate ? new Date(options.effectiveDate) : null,
   ```

### Step 5: Update Underwriting Requests Call

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

**Instructions**:
Remove `effectiveDate` parameter from `createUnderwritingRequests()` call (line ~134):
```typescript
// BEFORE:
const uwRequestIds = await this.createUnderwritingRequests(
    sanityResult.missingResources,
    organizationId,
    destinationLegalEntityPublicId,
    effectiveDateResult.effectiveDate
);

// AFTER:
const uwRequestIds = await this.createUnderwritingRequests(
    sanityResult.missingResources,
    organizationId,
    destinationLegalEntityPublicId,
);
```

### Step 6: Update createUnderwritingRequests Method

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

**Instructions**:
1. Remove `effectiveDate` parameter from the method signature (line ~206)
2. Remove it from the context passed to `underwritingRequestService` (line ~231)

### Step 7: Update UnderwritingRequestContext

**File**: `services/peo/entity_transfer/services/underwriting_request_service.ts`

**Instructions**:
1. Make `effectiveDate` optional in `UnderwritingRequestContext`:
   ```typescript
   effectiveDate?: string;
   ```
2. Update `buildRequestDescription()` (~line 200) to handle missing date:
   ```typescript
   // BEFORE:
   `This resource is required for entity transfer effective ${context.effectiveDate}.`

   // AFTER:
   `This resource is required for entity transfer${context.effectiveDate ? ` effective ${context.effectiveDate}` : ''}.`
   ```

### Step 8: Update PEO API Call

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

**Instructions**:
Remove `effectiveDate` from the `entityTransferClientService.createTransfer()` call (line ~146):
```typescript
// BEFORE:
const result = await entityTransferClientService.createTransfer({
    organizationId,
    requesterProfilePublicId,
    sourceLegalEntityPublicId,
    destinationLegalEntityPublicId,
    effectiveDate: effectiveDateResult.effectiveDate,
    items: contracts.map((...)),
    signatures,
});

// AFTER:
const result = await entityTransferClientService.createTransfer({
    organizationId,
    requesterProfilePublicId,
    sourceLegalEntityPublicId,
    destinationLegalEntityPublicId,
    items: contracts.map((...)),
    signatures,
});
```

### Step 9: Update Backend Types

**File**: `services/peo/entity_transfer/types.ts`

**Instructions**:
1. Make `effectiveDate` optional in `CreateTransferApiRequest`:
   ```typescript
   effectiveDate?: string;  // Null during PENDING_SIGNATURES, resolved before SCHEDULED
   ```
2. Make `effectiveDate` nullable in `TransferApiResponse` (if present):
   ```typescript
   effectiveDate: string | null;
   ```

### Step 10: Update buildSuccessResponse

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

**Instructions**:
1. Remove `effectiveDateResult` parameter from `buildSuccessResponse()` signature
2. Remove `effectiveDateDetails: effectiveDateResult` from the return object
3. Update the method call in `createEntityTransfer()` to not pass effectiveDateResult

```typescript
// BEFORE:
return await this.buildSuccessResponse(
    result,
    sourceLegalEntityPublicId,
    destinationLegalEntityPublicId,
    effectiveDateResult,
    uwRequestIds,
    sanityResult.missingResources
);

// AFTER:
return await this.buildSuccessResponse(
    result,
    sourceLegalEntityPublicId,
    destinationLegalEntityPublicId,
    uwRequestIds,
    sanityResult.missingResources
);
```

### Step 11: Clean Up Unused Import

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

**Instructions**:
Remove the `effective_date_service` import entirely if no other code in this file uses it:
```typescript
// DELETE this line:
import {EffectiveDateResult, effectiveDateService} from './effective_date_service';
```

## Post-Implementation

After completing, run a code review agent to check for:
- No remaining references to `effectiveDateResult` in create_transfer_service.ts
- No TypeScript compilation errors from missing required fields
- All `@expresso` tags from this work are resolved

## Acceptance Criteria

- `effectiveDateService.calculateEffectiveDate()` is no longer called in `createEntityTransfer()`
- `effectiveDateDetails` is removed from `CreateTransferSuccess` interface
- `effectiveDate` is optional in `SanityCheckOptions`, `UnderwritingRequestContext`, and `CreateTransferApiRequest`
- Sanity checks and underwriting requests handle null effectiveDate gracefully
- PEO API call does not send effectiveDate
- No TypeScript compilation errors
- All 2 `@expresso` tags in create_transfer_service.ts are resolved

## Testing

1. Verify TypeScript compilation passes with `npx tsc --noEmit`
2. Create a transfer via tech_ops endpoint — should succeed without effectiveDate
3. Verify sanity checks run without effectiveDate
4. Verify underwriting request descriptions are well-formed without date
5. Verify PEO receives transfer creation request without effectiveDate

## Notes

- **Dependency**: EEXPR-44-4 (PEO) must be deployed first so PEO accepts null effectiveDate
- The `effective_date_service.ts` file itself is NOT deleted — it may still be used by the future cron job that resolves effective dates
- The existing cron processor (`getReadyTransfers`) is unaffected — it only queries SCHEDULED transfers which will have effectiveDate set by then
