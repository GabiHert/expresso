<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-5-peo-client-methods.md                      ║
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

# PEO Client Methods for Transfer Creation

## Objective

Add methods to the entity transfer client service to call the PEO endpoints for creating transfers and signatures.

## Pre-Implementation

Before starting, explore:
- `backend/services/peo/entity_transfer/entity_transfer_client_service.ts` - Existing client service
- `backend/services/peo/endpoints/entity_transfer_endpoints.ts` - Endpoint definitions

## Implementation Steps

### Step 1: Add endpoint definition

**File**: `backend/services/peo/endpoints/entity_transfer_endpoints.ts`

Add the new signatures endpoint:

```typescript
export const ENTITY_TRANSFER_ENDPOINTS = {
  // existing endpoints...
  CREATE_TRANSFER: '/peo/entity-transfer/transfers',
  CREATE_SIGNATURES: '/peo/entity-transfer/transfers/:transferId/signatures',
  // ... other endpoints
};
```

### Step 2: Define types

**File**: `backend/services/peo/entity_transfer/entity_transfer_client_service.ts`

Add types for request/response:

```typescript
interface CreateTransferRequest {
  organizationId: number;
  requesterProfilePublicId: string;
  sourceLegalEntityPublicId: string;
  destinationLegalEntityPublicId: string;
  effectiveDate: string;
  agreementId?: string;
  items: Array<{
    baseContractOid: string;
    newBenefitPrismGroupId: string;
    newEmploymentPayrollSettingId: string;
    newPtoPolicyId: string;
    newWorkLocationId: string;
    newPositionPublicId: string;
    newTeamId?: number;
  }>;
}

interface CreateTransferResponse {
  success: boolean;
  data: {
    id: string;
    status: string;
    // ... other fields
  };
}

interface CreateSignaturesRequest {
  signatures: Array<{
    profilePublicId: string;
    role: 'ADMIN' | 'EMPLOYEE';
    agreementType: string;
    agreementId?: string | null;
  }>;
}

interface CreateSignaturesResponse {
  success: boolean;
  data: Array<{
    id: string;
    profilePublicId: string;
    role: string;
    agreementType: string;
    signedAt: string | null;
  }>;
}
```

### Step 3: Add createTransfer method

```typescript
async createTransfer(request: CreateTransferRequest): Promise<CreateTransferResponse> {
  const url = `${this.baseUrl}${ENTITY_TRANSFER_ENDPOINTS.CREATE_TRANSFER}`;

  const response = await this.httpClient.post(url, request);

  if (!response.success) {
    throw new Error(`Failed to create transfer: ${response.error}`);
  }

  return response;
}
```

### Step 4: Add createSignatures method

```typescript
async createSignatures(
  transferId: string,
  request: CreateSignaturesRequest
): Promise<CreateSignaturesResponse> {
  const url = `${this.baseUrl}${ENTITY_TRANSFER_ENDPOINTS.CREATE_SIGNATURES}`
    .replace(':transferId', transferId);

  const response = await this.httpClient.post(url, request);

  if (!response.success) {
    throw new Error(`Failed to create signatures: ${response.error}`);
  }

  return response;
}
```

### Step 5: Add combined method (convenience)

```typescript
async createTransferWithSignatures(
  transferRequest: CreateTransferRequest,
  signatures: CreateSignaturesRequest['signatures']
): Promise<{
  transfer: CreateTransferResponse['data'];
  signatures: CreateSignaturesResponse['data'];
}> {
  // 1. Create transfer
  const transferResponse = await this.createTransfer(transferRequest);

  try {
    // 2. Create signatures
    const signaturesResponse = await this.createSignatures(
      transferResponse.data.id,
      { signatures }
    );

    return {
      transfer: transferResponse.data,
      signatures: signaturesResponse.data,
    };
  } catch (error) {
    // Log error but don't fail - transfer was created
    log.error({
      message: 'Failed to create signatures for transfer',
      transferId: transferResponse.data.id,
      error: error.message
    });

    return {
      transfer: transferResponse.data,
      signatures: [],
    };
  }
}
```

### Step 6: Add error handling

Add specific error types for different failure scenarios:
- Transfer creation failed
- Signatures creation failed (transfer exists but signatures don't)
- Network errors

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] `createTransfer()` method calls PEO POST /transfers endpoint
- [ ] `createSignatures()` method calls PEO POST /transfers/:id/signatures endpoint
- [ ] `createTransferWithSignatures()` convenience method exists
- [ ] Proper error handling for failed requests
- [ ] Types defined for request/response objects
- [ ] Endpoint URL defined in endpoints file

## Testing

1. Unit test createTransfer with mocked HTTP client
2. Unit test createSignatures with mocked HTTP client
3. Unit test combined method with successful responses
4. Unit test combined method when signatures fail (transfer should still return)

## Notes

- The combined method handles partial failure gracefully
- Backend already has HTTP client setup for PEO calls - reuse existing patterns
- Reference existing methods in the client service for patterns
