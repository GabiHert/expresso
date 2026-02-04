<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-14-remove-effective-date-calculation.md      ║
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

# Remove effectiveDate Calculation - Accept from Request Body

## Objective

Remove the `effectiveDateService` from the create transfer flow entirely. Instead, accept `effectiveDate` as a required field in the POST request body. The effective date calculation will be handled in a separate step of the process (tracked by EEXPR-44).

## Background

The `EffectiveDateService` calculates the effective date from the source legal entity's pay cycle. This calculation will be moved to a different step in the transfer process. For now, the POST endpoint should simply accept `effectiveDate` as input and pass it through.

## Implementation Steps

### Step 1: Add `effectiveDate` to Joi schema in controller

**File**: `controllers/peo_integration/index.js` (~line 1856)

**Instructions**:
- Add `effectiveDate: Joi.string().required()` to the `body` schema (alongside `organizationId`, etc.)
- Add a comment: `// TODO [EEXPR-44]: effectiveDate will eventually be removed from request - calculated in a separate step`

### Step 2: Update `CreateTransferRequest` interface

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

**Instructions**:
- Add `effectiveDate: string;` to `CreateTransferRequest` interface (around line 21-28)
- Add a comment: `// TODO [EEXPR-44]: Remove effectiveDate - will be calculated in a separate step`

### Step 3: Remove `effectiveDateService` import and call

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

**Instructions**:
- Remove the import: `import {EffectiveDateResult, effectiveDateService} from './effective_date_service';`
- Remove the `EffectiveDateResult` type from `CreateTransferSuccess` interface (the `effectiveDateDetails` field)
- Remove the effective date calculation block (~lines 101-108):
  ```typescript
  const effectiveDateResult = await effectiveDateService.calculateEffectiveDate(sourceLegalEntityPublicId);
  ```
- Replace all references to `effectiveDateResult.effectiveDate` with `request.effectiveDate`:
  - In `runSanityChecks` call
  - In `createUnderwritingRequests` call
  - In `entityTransferClientService` call
  - In `buildSuccessResponse` call
- Remove `effectiveDateDetails` from the success response object in `buildSuccessResponse`

### Step 4: Remove `effectiveDateDetails` from success response

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

**Instructions**:
- Remove `effectiveDateDetails: EffectiveDateResult;` from `CreateTransferSuccess` interface
- Remove `effectiveDateDetails` from the return object in `buildSuccessResponse` method

### Step 5: Delete effective_date_service.ts (optional)

**File**: `services/peo/entity_transfer/services/effective_date_service.ts`

**Instructions**:
- This file is only imported by `create_transfer_service.ts`
- It can be deleted entirely OR kept with a `// TODO [EEXPR-44]` comment if you want to reference it later
- Recommended: Keep the file but add a deprecation comment at top, since EEXPR-44 may reference the logic

## Files Summary

| File | Action |
|------|--------|
| `controllers/peo_integration/index.js` | Add `effectiveDate` to Joi schema |
| `services/peo/entity_transfer/services/create_transfer_service.ts` | Remove service import/call, add to request interface, use `request.effectiveDate` |
| `services/peo/entity_transfer/services/effective_date_service.ts` | Keep with deprecation comment (or delete) |

## Files That DON'T Need Changes

These downstream files already receive `effectiveDate` as a string parameter:
- `entity_transfer_service.ts` - `SanityCheckOptions.effectiveDate: string`
- `underwriting_request_service.ts` - `UnderwritingRequestContext.effectiveDate: string`
- `entity_transfer_client_service.ts` - passes through to PEO API
- `types.ts` - `CreateTransferApiRequest` already has `effectiveDate: string`

## Acceptance Criteria

- [ ] POST request body accepts `effectiveDate` as a required string field
- [ ] `effectiveDateService.calculateEffectiveDate()` is no longer called
- [ ] `effectiveDateDetails` is removed from success response
- [ ] All downstream consumers receive `effectiveDate` from the request body
- [ ] TODO [EEXPR-44] comments mark where effective date handling will change
- [ ] Endpoint returns successful response when called with valid `effectiveDate`

## Testing

1. Deploy to Giger environment
2. Call the POST endpoint with `effectiveDate` in the request body:
   ```json
   {
     "effectiveDate": "2026-02-28",
     ...other fields
   }
   ```
3. Verify the transfer is created successfully
4. Verify `effectiveDateDetails` is NOT in the response

## Notes

- The `EffectiveDateService` contains pay cycle calculation logic (MONTHLY, BIMONTHLY, BIWEEKLY, WEEKLY) that EEXPR-44 will need to reference
- Downstream files (`entity_transfer_service.ts`, `underwriting_request_service.ts`, `entity_transfer_client_service.ts`) don't need changes - they already accept `effectiveDate` as a string parameter
