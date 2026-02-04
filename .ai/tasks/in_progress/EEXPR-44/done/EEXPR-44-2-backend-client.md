<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-44-2-backend-client.md                         ║
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

# Backend: Client Integration & Mock Replacement

## Objective

Replace the 4 mock repository methods in `EntityTransferRepository` with real HTTP calls to the PEO microservice. Add endpoint definitions, client service methods, and wire up the event processor.

## Pre-Implementation

Before starting:
- Ensure EEXPR-44-1 (PEO work item) is complete and PEO endpoints are deployed
- Run an exploration agent to understand current mock methods and their callers

Key callers to understand:
- `entity_transfer_service.ts` setup() calls `createTransferItemSignatures()`
- `check_signatures_sanity_step.ts` calls `getTransferItemSignatures()`
- `attach_signed_documents_step.ts` calls `getSignedTransferItemSignatures()`
- `entity_transfer_document_status_processor.ts` calls `updateTransferItemSignatureStatus()`

## Implementation Steps

### Step 1: Add Endpoint Definitions

**File**: `services/peo/endpoints/entity_transfer_endpoints.ts` (or wherever PEOEndpoints is defined)

**Instructions**:
Add these endpoint URL builders to the PEOEndpoints object:
```typescript
createTransferItemSignatures: (transferItemId: string) =>
    `/peo/entity-transfer/items/${transferItemId}/signatures`,
getTransferItemSignatures: (transferItemId: string) =>
    `/peo/entity-transfer/items/${transferItemId}/signatures`,
getSignedTransferItemSignatures: (transferItemId: string) =>
    `/peo/entity-transfer/items/${transferItemId}/signatures/signed`,
updateTransferItemSignatureStatus: (agreementId: string) =>
    `/peo/entity-transfer/signatures/${agreementId}/status`,
```

### Step 2: Add Client Service Methods

**File**: `services/peo/entity_transfer/services/entity_transfer_client_service.ts`

**Instructions**:
Add 4 methods following the existing `BasePEOService` pattern:

1. **`createTransferItemSignatures()`**
   - POST to `PEOEndpoints.createTransferItemSignatures(transferItemId)`
   - Body: `{ signatures: Array<{ agreementType, agreementId }> }`
   - Returns: `PeoEmployeeTransferItemSignature[]`

2. **`getTransferItemSignatures()`**
   - GET from `PEOEndpoints.getTransferItemSignatures(transferItemId)`
   - Returns: `PeoEmployeeTransferItemSignature[]`

3. **`getSignedTransferItemSignatures()`**
   - GET from `PEOEndpoints.getSignedTransferItemSignatures(transferItemId)`
   - Returns: `PeoEmployeeTransferItemSignature[]`

4. **`updateTransferItemSignatureStatus()`**
   - PATCH to `PEOEndpoints.updateTransferItemSignatureStatus(agreementId)`
   - Body: `{ status: TransferItemSignatureStatus }`
   - Returns: `void`

### Step 3: Add API Response Types

**File**: `services/peo/entity_transfer/types.ts`

**Instructions**:
Add API response type for item signatures if not already present:
```typescript
export interface TransferItemSignatureApiResponse {
    id: string;
    transferItemId: string;
    agreementType: TransferItemAgreementType;
    agreementId: string;
    status: TransferItemSignatureStatus;
    signedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
```

Update `TransferItemApiResponse` to include nested signatures:
```typescript
// Add to existing TransferItemApiResponse:
itemSignatures?: TransferItemSignatureApiResponse[];
```

### Step 3b: Update Ready Transfers Mapping

**File**: `services/peo/entity_transfer/repositories/entity_transfer_repository.ts`

**Instructions**:
Update `mapApiResponseToItem()` to map the nested `itemSignatures` array from the `/transfers/ready` response. The PEO `/transfers/ready` endpoint now returns items with their signatures eagerly loaded, so the backend mapper needs to handle this nested data.

Add to the mapped item:
```typescript
itemSignatures: (response.itemSignatures || []).map(s => this.mapApiResponseToItemSignature(s)),
```

Also update `PeoEmployeeTransferItem` type in `types.ts` to include an optional `itemSignatures` field.

### Step 4: Replace Mock Repository Methods

**File**: `services/peo/entity_transfer/repositories/entity_transfer_repository.ts`

**Instructions**:
Replace all 4 mock methods with calls to the client service:

1. **`createTransferItemSignatures()`** - Replace mock array with `entityTransferClientService.createTransferItemSignatures()` call + mapper
2. **`getTransferItemSignatures()`** - Replace hardcoded SIGNED array with `entityTransferClientService.getTransferItemSignatures()` call + mapper
3. **`getSignedTransferItemSignatures()`** - Replace filter on mock data with `entityTransferClientService.getSignedTransferItemSignatures()` call + mapper
4. **`updateTransferItemSignatureStatus()`** - Replace log-only with `entityTransferClientService.updateTransferItemSignatureStatus()` call

Add a private mapper method:
```typescript
private mapApiResponseToItemSignature(response: TransferItemSignatureApiResponse): PeoEmployeeTransferItemSignature {
    return {
        id: response.id,
        transferItemId: response.transferItemId,
        agreementType: response.agreementType as TransferItemAgreementType,
        agreementId: response.agreementId,
        status: response.status as TransferItemSignatureStatus,
        signedAt: response.signedAt ? new Date(response.signedAt) : undefined,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
    };
}
```

**Note**: Event processor wiring moved to separate work item EEXPR-44-3.

### Step 5: Remove transfer-level agreementId from Backend

Corresponding to EEXPR-44-1 Step 1b (PEO side), remove all transfer-level `agreementId` references from the backend. Item-signature-level `agreementId` must be kept.

**IMPORTANT**: Before implementing, run an exploration agent to confirm all usages are still at the lines listed below. Code may shift as other steps are implemented.

#### 5a: Types

**File**: `services/peo/entity_transfer/types.ts`

- Remove `agreementId: string;` from `PeoEmployeeTransfer` interface (line ~28)
- Remove `agreementId?: string;` from `CreateTransferApiRequest` (line ~118)
- Remove `agreementId: string | null;` from `TransferApiResponse` (line ~147)
- Remove `agreementId: string | null;` from `TransfersBySourceEntityRecord` (line ~272)
- Remove `agreementType: AgreementType;` from `CreateSignatureInput` (line ~223) — transfer-level, no longer accepted by PEO
- Remove `agreementId?: string | null;` from `CreateSignatureInput` (line ~223) — transfer-level, no longer accepted by PEO
- **KEEP** `agreementId` in `PeoEmployeeTransferItemSignature` (line ~331) — item-signature level

#### 5b: Repository

**File**: `services/peo/entity_transfer/repositories/entity_transfer_repository.ts`

- Remove `agreementId: response.agreementId || undefined,` from `mapApiResponseToTransfer()` (line ~192)
- **KEEP** all `agreementId` in signature-related methods (lines ~232, ~248, ~289, ~299) — item-signature level

#### 5c: Enrichment Service

**File**: `services/peo/entity_transfer/services/transfer_enrichment_service.ts`

- Remove `agreementId: string | null;` from response interface (line ~56)
- Remove `agreementId: transfer.agreementId,` from enriched response (line ~223)

#### 5d: Tests

**File**: `services/peo/entity_transfer/__tests__/entity_transfer_repository.spec.ts`

All 5 occurrences are **TRANSFER-LEVEL** — remove all:
- Line ~43: `agreementId` in `mockApiResponse: TransferApiResponse[]` (loadReadyTransfers test)
- Line ~134: `agreementId` in `mockApiResponse: TransferApiResponse` (loadTransferWithItems test)
- Line ~253: `agreementId` in nested `transfer` object within `TransferItemApiResponse`
- Line ~323: `agreementId` in `request: CreateTransferApiRequest` (createTransfer test)
- Line ~345: `agreementId` in `mockApiResponse: TransferApiResponse` (createTransfer response)

#### 5e: Transfer-level signature creation

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

After EEXPR-44-1 Step 5b removes `agreementType`/`agreementId` from the PEO DTO and service, the backend must stop sending these fields when creating transfer-level signatures.

- In `buildSignatures()` (line ~366-370): remove `agreementType: AgreementType.ENTITY_ASSIGNMENT_AGREEMENT,` and `agreementId: null,` from the build function
- The `CreateSignatureInput` type changes are covered in Step 5a above

After this change, `buildSignatures()` will only produce `{ profilePublicId, role }` per signature, matching what PEO now expects.

#### DO NOT REMOVE (item-signature level — these stay):
- `attach_signed_documents_step.ts` — all `agreementId` usages (document request tracking)
- `entity_transfer_service.ts` — `agreementId: doc.documentRequestId` (line ~209) and `agreementId: null` (line ~611)
- `transfer_context.ts` — `agreementId` in StepResults (line ~152)

## Post-Implementation

After completing, run a code review agent to check for issues.

## Acceptance Criteria

- No mock/hardcoded data remains in repository methods
- All 4 repository methods make HTTP calls to PEO
- Response mapping correctly converts API responses to domain types
- No caller changes needed (repository interface unchanged)

## Testing

1. Verify client service methods call correct endpoints
2. Verify repository methods return PEO data instead of mocks
3. Test with real PEO service (requires EEXPR-44-1 deployed)
4. Test event processor receives JetStream event and updates status
5. E2E: Create transfer -> verify signatures created in PEO DB -> mark signed -> verify check_signatures_sanity_step passes

## Notes

- **Dependency**: EEXPR-44-1 (PEO) must be deployed before this can be tested end-to-end
- The repository interface stays the same - callers don't need changes
- `_transaction` parameters remain unused (kept for interface compatibility, suppressed by eslint-disable)
- ExternalId format for event processing: `{hrisProfileOid}_{destinationLegalEntityPublicId}_{agreementType}`
