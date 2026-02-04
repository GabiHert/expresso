<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-signature-controller-endpoints.md                  ║
║ TASK: EEXPR-44-1                                                 ║
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
# Repository Context
repo: peo
repo_path: /Users/gabriel.herter/Documents/Projects/deel/peo
branch: EEXPR-44
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/peo
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Add Signature Controller Endpoints

## Objective

Expose 5 HTTP endpoints in the PEO entity transfer controller that call the service methods created in WI-01.

## Pre-Implementation

Before starting, explore:
- `peo/src/controllers/entityTransfer/entityTransferController.ts` - Existing controller patterns
- Existing route registration and middleware patterns
- How DTOs from WI-03 are used for validation

**Dependency**: WI-01 (service methods) should be completed first.

## Implementation Steps

### Step 1: Add POST /transfers/:transferId/signatures

**File**: `peo/src/controllers/entityTransfer/entityTransferController.ts`

**Instructions**:
- Create endpoint to receive an array of signature definitions
- Validate request body with Zod DTO
- Call `entityTransferService.createTransferSignatures()`
- Return created signatures with 201 status

### Step 2: Add GET /transfers/:transferId/signatures

**Instructions**:
- Get all signatures for a transfer
- Call `entityTransferService.getTransferSignatures()`
- Return signature array

### Step 3: Add GET /transfers/:transferId/signatures/signed

**Instructions**:
- Get only signed signatures
- Call `entityTransferService.getSignedTransferSignatures()`
- Return filtered signature array

### Step 4: Add PATCH /signatures/:agreementId/sign

**Instructions**:
- Mark a specific signature as signed
- Call `entityTransferService.markSignatureSigned()`
- Return 204 or updated record

### Step 5: Add GET /transfers/:transferId/signatures/complete

**Instructions**:
- Check if all signatures are complete
- Call `entityTransferService.areAllSignaturesComplete()`
- Return `{ complete: boolean }`

### Step 6: Register routes

**Instructions**:
- Register all new routes following existing patterns
- Apply appropriate middleware (auth, org validation, etc.)
- Ensure route prefix follows: `/peo/entity-transfer/...`

## Acceptance Criteria

- All 5 endpoints accessible via HTTP
- Proper HTTP status codes (201 for create, 200 for get, 204 for sign)
- Request validation using DTOs from WI-03
- Error handling consistent with existing controller patterns
- Routes registered in the correct router

## Testing

- Test each endpoint returns correct status codes
- Test validation rejects invalid requests
- Test proper error responses for missing transfers/signatures

## Notes

- Follow the exact URL patterns from the plan:
  - `POST   /peo/entity-transfer/transfers/:transferId/signatures`
  - `GET    /peo/entity-transfer/transfers/:transferId/signatures`
  - `GET    /peo/entity-transfer/transfers/:transferId/signatures/signed`
  - `PATCH  /peo/entity-transfer/signatures/:agreementId/sign`
  - `GET    /peo/entity-transfer/transfers/:transferId/signatures/complete`
- Check how existing entity transfer endpoints handle authentication/authorization
