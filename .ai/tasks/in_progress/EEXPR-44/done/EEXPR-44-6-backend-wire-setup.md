<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-44-6-backend-wire-setup.md                     ║
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

# Backend: Wire Document Setup into Transfer Creation

## Objective

Wire the document requirement creation and item-level signature tracking into the `createEntityTransfer()` flow. Split into two phases for clean rollback:

- **Pre-transfer** (before PEO API call): Create document requirements via Documents microservice. If this fails, the transfer is NOT created — clean state, no rollback needed.
- **Post-transfer** (after PEO API call): Create item signatures via PEO. Requires `item.id` which is only assigned after PEO creates the transfer.

## Context

The `setup()` method in `entity_transfer_service.ts:159-244` is defined but **never called**. It does 4 things in sequence:
1. Fetch contract details via `peoContractService.getContractDetailsFromPEOService(basePeoContractOid)`
2. Resolve HRIS profile OID from the contract's `HrisProfileId`
3. Create document requirements via `transferDocumentService.createDocumentRequirements()` — calls Documents microservice
4. Create item signatures via `repository.createTransferItemSignatures(item.id, signatureRecords)` — needs `item.id`

Steps 1-3 do NOT need `item.id`. Only step 4 needs it. This is why we split:
- Steps 1-3 → **pre-transfer** (new method `prepareDocumentRequirements`)
- Step 4 → **post-transfer** (new method `createItemSignaturesFromDocuments`)

### Current createEntityTransfer() flow (create_transfer_service.ts:83-184):
```
1. Calculate effective date                          ← line 104
2. Sanity checks                                     ← line 122
3. Create underwriting requests                      ← line 130
4. Resolve employee profiles                         ← line 137
5. Build transfer-level signatures                   ← line 139
   ──── NEW: Pre-transfer document setup ────        ← INSERT HERE
6. Call PEO API (createTransfer)                     ← line 141
   ──── NEW: Post-transfer signature creation ────   ← INSERT HERE
7. Build success response                            ← line 165
```

### Matching key between phases:
- Request contracts use `basePeoContractOid` (field on `CreateTransferContract`)
- PEO response items use `baseContractOid` (field on `TransferItemApiResponse`)
- These hold the **same value** (PrismHR employee number) — see `create_transfer_service.ts:148`
- Use a `Map<string, DocumentRequirementResult[]>` keyed by this value

## Pre-Implementation

Before starting:
- Ensure EEXPR-44-1 (PEO) and EEXPR-44-2 (Backend client) are complete
- Run an exploration agent to confirm:
  - `setup()` in `entity_transfer_service.ts` (lines ~159-244) — understand its 4 steps
  - `createDocumentRequirements()` in `transfer_document_service.ts` (lines ~127-174) — params and return type
  - `createEntityTransfer()` in `create_transfer_service.ts` (lines ~83-184) — insertion points
  - `CreateDocumentRequirementsParams` interface — required fields
  - `DocumentRequirementResult` interface — what it returns

## Implementation Steps

### Step 1: Add `prepareDocumentRequirements()` to EntityTransferService

**File**: `services/peo/entity_transfer/entity_transfer_service.ts`

Add a new public method that extracts steps 1-3 of `setup()`:

```typescript
/**
 * Pre-transfer phase: Resolves contract data and creates document requirements
 * in the Documents microservice.
 *
 * Call this BEFORE creating the PEO transfer. If it fails, the transfer
 * should not be created — no rollback needed.
 *
 * @param basePeoContractOid - PrismHR employee number (deel_contract_oid)
 * @param organizationId - Organization ID
 * @param destinationLegalEntityPublicId - Destination legal entity UUID
 * @returns Document requirements with document request IDs for signature tracking
 */
async prepareDocumentRequirements(
    basePeoContractOid: string,
    organizationId: number,
    destinationLegalEntityPublicId: string,
): Promise<DocumentRequirementResult[]> {
    this.log.info({
        message: '[EntityTransferService] Preparing document requirements',
        basePeoContractOid,
        organizationId,
        destinationLegalEntityPublicId,
    });

    // 1. Fetch the contract to get HrisProfileId
    const peoContractDetails = await peoContractService.getContractDetailsFromPEOService(basePeoContractOid);

    if (!peoContractDetails?.peoContract) {
        throw new Error(`PEO contract not found for deel_contract_oid: ${basePeoContractOid}`);
    }

    const contract = await peoContractService.getContractById({
        deelContractId: peoContractDetails.peoContract.deelContractId,
        addPEOData: false,
        additionalAttributes: ['id', 'HrisProfileId', 'organizationId'],
    });

    if (!contract) {
        throw new Error(
            `Contract not found for deelContractId: ${peoContractDetails.peoContract.deelContractId} (deel_contract_oid: ${basePeoContractOid})`
        );
    }

    // 2. Resolve the HRIS profile OID
    const hrisProfile = await this.db.HrisProfile.findFirst({
        where: { id: contract.HrisProfileId },
        attributes: ['id', 'oid'],
    });

    if (!hrisProfile) {
        throw new Error(`HRIS profile not found for HrisProfileId: ${contract.HrisProfileId}`);
    }

    // 3. Create document requirements in Documents microservice
    const documentRequirements = await this.transferDocumentService.createDocumentRequirements({
        organizationId: contract.organizationId,
        hrisProfileId: hrisProfile.id,
        hrisProfileOid: hrisProfile.oid,
        sourceContractId: contract.id,
        destinationLegalEntityPublicId,
    });

    this.log.info({
        message: '[EntityTransferService] Document requirements prepared',
        basePeoContractOid,
        documentCount: documentRequirements.length,
        documentRequestIds: documentRequirements.map((d) => d.documentRequestId),
    });

    return documentRequirements;
}
```

**Note**: This method intentionally does NOT catch errors. Errors propagate to `createEntityTransfer()` which handles them via `TransferCreationError`.

### Step 2: Add `createItemSignaturesFromDocuments()` to EntityTransferService

**File**: `services/peo/entity_transfer/entity_transfer_service.ts`

Add a new public method that extracts step 4 of `setup()`:

```typescript
/**
 * Post-transfer phase: Creates item-level signature tracking records from
 * pre-prepared document requirements.
 *
 * Call this AFTER the PEO transfer is created and item IDs are assigned.
 *
 * @param transferItemId - The PEO transfer item ID (assigned by PEO createTransfer)
 * @param documentRequirements - Document requirements from prepareDocumentRequirements()
 * @returns Created signature tracking records
 */
async createItemSignaturesFromDocuments(
    transferItemId: string,
    documentRequirements: DocumentRequirementResult[],
): Promise<PeoEmployeeTransferItemSignature[]> {
    const signatureRecords = documentRequirements.map((doc) => ({
        agreementType: doc.agreementType,
        agreementId: doc.documentRequestId,
    }));

    const signatures = await this.repository.createTransferItemSignatures(transferItemId, signatureRecords);

    this.log.info({
        message: '[EntityTransferService] Item signatures created from document requirements',
        transferItemId,
        signatureCount: signatures.length,
    });

    return signatures;
}
```

### Step 3: Wire pre-transfer phase into createEntityTransfer()

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

**IMPORTANT**: Before implementing, run an exploration agent to confirm exact line numbers. They may shift if EEXPR-44-5 has been implemented.

Insert between `buildSignatures()` (line ~139) and `entityTransferClientService.createTransfer()` (line ~141):

```typescript
// Pre-transfer: Create document requirements for each contract
// If Documents service fails here, the transfer is not created — clean state
const documentRequirementsByContract = new Map<string, DocumentRequirementResult[]>();
for (const contract of contracts) {
    const docReqs = await this.entityTransferService.prepareDocumentRequirements(
        contract.basePeoContractOid,
        organizationId,
        destinationLegalEntityPublicId,
    );
    documentRequirementsByContract.set(contract.basePeoContractOid, docReqs);
}

this.log.info({
    message: '[CreateTransferService] Document requirements prepared for all contracts',
    contractCount: contracts.length,
    totalDocuments: Array.from(documentRequirementsByContract.values()).flat().length,
});
```

**Error handling**: If `prepareDocumentRequirements()` throws, the error propagates to the existing `catch` block (line ~173). Since PEO `createTransfer` hasn't been called yet, no transfer exists — clean state.

### Step 4: Wire post-transfer phase into createEntityTransfer()

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

Insert between the PEO success log (line ~163) and `buildSuccessResponse()` (line ~165):

```typescript
// Post-transfer: Create item signatures using pre-prepared document requirements
// Match: request contract.basePeoContractOid → response item.baseContractOid
for (const item of result.items) {
    const docReqs = documentRequirementsByContract.get(item.baseContractOid);
    if (docReqs && docReqs.length > 0) {
        await this.entityTransferService.createItemSignaturesFromDocuments(item.id, docReqs);
    }
}

this.log.info({
    message: '[CreateTransferService] Item signatures created for all transfer items',
    transferId: result.id,
    itemCount: result.items.length,
});
```

### Step 5: Add import for DocumentRequirementResult

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`

Add import at the top:
```typescript
import {DocumentRequirementResult} from './transfer_document_service';
```

### Step 6: Deprecate setup() method

**File**: `services/peo/entity_transfer/entity_transfer_service.ts`

Replace the existing JSDoc comment on `setup()` (lines ~143-158) with:

```typescript
/**
 * @deprecated Use prepareDocumentRequirements() + createItemSignaturesFromDocuments() instead.
 *
 * This monolithic method is kept for reference but is no longer called.
 * The two-phase approach (pre-transfer + post-transfer) provides clean rollback:
 * - prepareDocumentRequirements(): Steps 1-3 (before PEO transfer creation)
 * - createItemSignaturesFromDocuments(): Step 4 (after PEO assigns item IDs)
 */
```

## Post-Implementation

After completing, run a code review agent to check for:
- `prepareDocumentRequirements()` correctly replicates steps 1-3 of `setup()`
- `createItemSignaturesFromDocuments()` correctly replicates step 4 of `setup()`
- The pre-transfer phase is inserted BEFORE `entityTransferClientService.createTransfer()`
- The post-transfer phase is inserted AFTER the PEO API response
- Error propagation works correctly (pre-transfer errors prevent transfer creation)
- No TypeScript compilation errors

## Acceptance Criteria

- Document requirements are created via Documents microservice BEFORE the PEO transfer
- Item signatures are created via PEO AFTER the transfer (using item IDs from PEO response)
- If Documents service fails, the transfer is NOT created (clean rollback)
- Each contract's document requirements are correctly matched to its PEO item via `basePeoContractOid` ↔ `baseContractOid`
- Two new methods exist on `EntityTransferService`: `prepareDocumentRequirements()` and `createItemSignaturesFromDocuments()`
- Existing `setup()` is deprecated but not deleted (kept for reference)
- No TypeScript compilation errors

## Testing

1. Verify TypeScript compilation passes: `npx tsc --noEmit`
2. Unit test `prepareDocumentRequirements()` — mock peoContractService, db.HrisProfile, transferDocumentService
3. Unit test `createItemSignaturesFromDocuments()` — mock repository.createTransferItemSignatures
4. Integration test: Create transfer → verify document requirements created → verify item signatures created
5. Failure test: Mock Documents service failure → verify transfer NOT created
6. Failure test: Mock PEO signature creation failure → verify error propagated

## Dependencies

- **EEXPR-44-1** (PEO endpoints) — must be complete for `createTransferItemSignatures` endpoint to exist
- **EEXPR-44-2** (Backend client/mock replacement) — should be complete so `repository.createTransferItemSignatures()` makes real HTTP calls instead of returning mocks
- Independent of EEXPR-44-3, EEXPR-44-4, EEXPR-44-5

### Chain 1 updated order:
```
EEXPR-44-1 → EEXPR-44-2 → EEXPR-44-6 → EEXPR-44-3
```

## Notes

- **No type mapping needed**: The new methods use primitive types (`string`, `number`) as parameters, avoiding the API response ↔ domain type mismatch between `TransferApiResponse` and `PeoEmployeeTransfer`.
- **setup() kept for reference**: The original monolithic method is deprecated but not deleted. It can be removed in a future cleanup.
- **Per-contract sequential processing**: Document requirements are created one contract at a time (sequential loop). This matches the pattern of `resolveEmployeeProfiles()` above it. If performance becomes a concern, this can be parallelized with `Promise.all` later.
- **Shared file with EEXPR-44-5**: Both this work item and EEXPR-44-5 modify `create_transfer_service.ts`. If EEXPR-44-5 runs first, re-explore line numbers before implementing Steps 3-4.
