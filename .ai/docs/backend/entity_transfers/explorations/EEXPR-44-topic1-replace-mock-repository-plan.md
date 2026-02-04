# EEXPR-44 Topic 1: Replace Mock Repository with PEO Service Calls

## Overview

Replace the 4 mock signature methods in backend's `entity_transfer_repository.ts` with actual PEO service calls to use the existing `peo_employee_transfer_signatures` table.

## Current State

### Backend Mock Methods (to replace)
**File**: `worktrees/EEXPR-44/backend/services/peo/entity_transfer/repositories/entity_transfer_repository.ts`

| Method | Current Behavior | Needs |
|--------|------------------|-------|
| `createTransferItemSignatures()` | Returns mock signatures with PENDING | Call PEO to create real records |
| `getTransferItemSignatures()` | Returns 2 hardcoded SIGNED | Call PEO to query real records |
| `getSignedTransferItemSignatures()` | Filters mock for SIGNED | Call PEO filtered query |
| `updateTransferItemSignatureStatus()` | Logs only | Call PEO to update signed_at |

### PEO Table (exists)
**Model**: `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts`
**Table**: `peo_employee_transfer_signatures`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `transfer_id` | UUID | FK to transfers |
| `profile_public_id` | INTEGER | Person to sign |
| `role` | ENUM | ADMIN \| EMPLOYEE |
| `agreement_type` | ENUM | ARBITRATION_AGREEMENT \| WSE_NOTICE_OF_PEO_RELATIONSHIP \| ENTITY_ASSIGNMENT_AGREEMENT |
| `agreement_id` | UUID | Document request ID |
| `signed_at` | DATE | NULL = pending, NOT NULL = signed |
| `organization_id` | INTEGER | Denormalized |

### Gap: No PEO Service Layer
The PEO repository has NO service methods or API endpoints for signatures. We must add them.

---

## Schema Mapping

| Backend Interface | PEO Table |
|-------------------|-----------|
| `transferItemId` → **change to `transferId`** | `transfer_id` |
| N/A | `profile_public_id` (must add) |
| N/A | `role` (must add - use EMPLOYEE) |
| `agreementType` | `agreement_type` |
| `agreementId` | `agreement_id` |
| `status` (PENDING/SIGNED) | `signed_at IS NULL` / `signed_at IS NOT NULL` |

---

## Decision: Use transferId

The backend mock incorrectly uses `transferItemId` but transfers are executed per `transfer_id`. The PEO table design is correct.

**Action**: Change backend interface from `transferItemId` to `transferId` to align with PEO.

This requires updating:
- The interface in `types.ts`
- The repository methods
- The 3 caller files (entity_transfer_service.ts, check_signatures_sanity_step.ts, attach_signed_documents_step.ts)

---

## Implementation Plan

### Part 1: PEO Service Layer (New)

#### 1.1 Add Signature Service Methods
**File**: `peo/src/services/entityTransfer/entityTransferService.ts`

Add methods:
```typescript
// Create signature records for a transfer
async createTransferSignatures(
  transferId: string,
  signatures: Array<{
    profilePublicId: number;
    role: SignatureRole;
    agreementType: AgreementType;
    agreementId: string;
  }>,
  transaction?: Transaction
): Promise<PeoEmployeeTransferSignature[]>

// Get all signatures for a transfer
async getTransferSignatures(
  transferId: string,
  transaction?: Transaction
): Promise<PeoEmployeeTransferSignature[]>

// Get only signed signatures (signed_at IS NOT NULL)
async getSignedTransferSignatures(
  transferId: string,
  transaction?: Transaction
): Promise<PeoEmployeeTransferSignature[]>

// Mark a signature as signed
async markSignatureSigned(
  agreementId: string,
  transaction?: Transaction
): Promise<void>

// Check if all signatures are complete
async areAllSignaturesComplete(
  transferId: string,
  transaction?: Transaction
): Promise<boolean>
```

#### 1.2 Add Signature Controller Endpoints
**File**: `peo/src/controllers/entityTransfer/entityTransferController.ts`

Add endpoints:
```
POST   /peo/entity-transfer/transfers/:transferId/signatures
GET    /peo/entity-transfer/transfers/:transferId/signatures
GET    /peo/entity-transfer/transfers/:transferId/signatures/signed
PATCH  /peo/entity-transfer/signatures/:agreementId/sign
GET    /peo/entity-transfer/transfers/:transferId/signatures/complete
```

#### 1.3 Add Signature DTOs
**File**: `peo/src/controllers/entityTransfer/entityTransferDto.ts`

Add Zod schemas for validation.

---

### Part 2: Backend Client Updates

#### 2.1 Add Signature Endpoints
**File**: `backend/services/peo/entity_transfer/entity_transfer_endpoints.ts`

Add endpoint definitions:
```typescript
createTransferSignatures: (transferId: string) => `/peo/entity-transfer/transfers/${transferId}/signatures`,
getTransferSignatures: (transferId: string) => `/peo/entity-transfer/transfers/${transferId}/signatures`,
getSignedTransferSignatures: (transferId: string) => `/peo/entity-transfer/transfers/${transferId}/signatures/signed`,
markSignatureSigned: (agreementId: string) => `/peo/entity-transfer/signatures/${agreementId}/sign`,
areAllSignaturesComplete: (transferId: string) => `/peo/entity-transfer/transfers/${transferId}/signatures/complete`,
```

#### 2.2 Add Client Service Methods
**File**: `backend/services/peo/entity_transfer/services/entity_transfer_client_service.ts`

Add methods to call PEO endpoints.

#### 2.3 Update Repository Methods
**File**: `backend/services/peo/entity_transfer/repositories/entity_transfer_repository.ts`

Replace mock implementations with calls to client service. Change method signatures from `transferItemId` to `transferId`.

---

## Files to Modify

### PEO Repository
1. `peo/src/services/entityTransfer/entityTransferService.ts` - Add signature methods
2. `peo/src/controllers/entityTransfer/entityTransferController.ts` - Add signature endpoints
3. `peo/src/controllers/entityTransfer/entityTransferDto.ts` - Add validation schemas

### Backend Repository
4. `backend/services/peo/entity_transfer/entity_transfer_endpoints.ts` - Add endpoints
5. `backend/services/peo/entity_transfer/services/entity_transfer_client_service.ts` - Add client methods
6. `backend/services/peo/entity_transfer/repositories/entity_transfer_repository.ts` - Replace mocks
7. `backend/services/peo/entity_transfer/types.ts` - Update interface if needed

### Callers (update to use transferId)
8. `backend/services/peo/entity_transfer/entity_transfer_service.ts` - Change `item.id` → `transfer.id`
9. `backend/services/peo/entity_transfer/steps/check_signatures_sanity_step.ts` - Change to use `context.request.transfer.id`
10. `backend/services/peo/entity_transfer/steps/attach_signed_documents_step.ts` - Change to use `context.request.transfer.id`

---

## Verification

1. **Unit tests**: Add tests for new PEO service methods
2. **Integration**: Test backend → PEO communication in Giger environment
3. **E2E**: Create transfer, verify signatures created, mark as signed, verify status change

---

## Dependencies

- PEO service must be deployed before backend can call it
- Feature flag may be needed for gradual rollout

---

_Created: 2026-01-28_
_Status: Plan ready for implementation_
