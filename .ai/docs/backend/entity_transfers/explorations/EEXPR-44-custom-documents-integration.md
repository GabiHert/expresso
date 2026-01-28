<!--
LAYER: DOMAIN
STATUS: Current
NAVIGATION:
  Parent: .ai/docs/backend/entity_transfers/README.md
  Related: PR #116580 (branch PEOCM-790)
  Index: .ai/INDEX.md
-->

# EEXPR-44: Custom Documents Integration for Entity Transfers

Starting point exploration for integrating Document Requests framework with entity transfers.

---

## Overview

- **What**: Integration of Document Requests framework to collect employee signatures on entity-specific compliance documents (Arbitration Agreement, WSE Notice of PEO Relationship) during PEO entity transfers
- **Why**: During entity transfers, employees must sign new legal agreements specific to the destination legal entity. The original PEOCM-767 approach (using getPEOData override) didn't work; Document Requests framework provides the solution.
- **When**: Reference this when implementing document signature collection for entity transfers

---

## PR #116580 Implementation Summary

**Branch**: `PEOCM-790`
**Status**: Open, ready for integration
**PR URL**: https://github.com/letsdeel/backend/pull/116580

### Files Added (New)

| File | Lines | Purpose |
|------|-------|---------|
| `services/peo/entity_transfer/services/transfer_document_service.ts` | 269 | Creates document requests via Documents microservice |
| `services/peo/entity_transfer/steps/check_signatures_sanity_step.ts` | 188 | Step 3 - Validates all signatures collected |
| `services/peo/entity_transfer/steps/attach_signed_documents_step.ts` | 648 | Step 10 - Attaches signed docs to new contract |
| `services/peo/entity_transfer/constants.ts` | 16 | Document template configuration |
| `services/peo/entity_transfer/events/listeners/entity_transfer_document_status_listener.ts` | 97 | JetStream consumer for signing events |
| `services/peo/entity_transfer/events/processors/entity_transfer_document_status_processor.ts` | 117 | Processes signing events |
| `jetstream_consumers/peo_entity_transfer_document_status.ts` | 40 | Consumer entrypoint |

### Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `controllers/admin/peo/tech_ops.ts` | +216 | Testing endpoints (marked "do not merge") |
| `services/peo/entity_transfer/entity_transfer_service.ts` | +154, -13 | Added setup() method, new steps |
| `services/peo/entity_transfer/repositories/entity_transfer_repository.ts` | +154, -1 | Signature tracking methods (MOCK DATA) |
| `services/peo/entity_transfer/types.ts` | +42 | New enums and interfaces |
| `services/peo/entity_transfer/transfer_context.ts` | +18 | attachedSignedDocuments result |
| `modules/documents/schemas/document_requests_schemas.ts` | +4 | PEO_ENTITY_TRANSFER feature setup |
| `modules/documents/services/document_request_service.ts` | +58, -1 | getDocumentRequest() method |

---

## Three-Phase Architecture

### Phase 1: Transfer Creation (Document Requirements Setup)

```
Entry: POST /peo-employee-transfers or POST /admin/peo/tech_ops/entity_transfer

1. Create transfer + transfer item
2. Call EntityTransferService.setup(transfer, item)
   - Resolve HRIS profile OID from contract
   - Call TransferDocumentService.createDocumentRequirements()
     - Generate externalId: {hrisOid}_{destEntityId}_{type}
     - Call documentRequestService.createRequestCustomTemplate()
       - featureSetupType: PEO_ENTITY_TRANSFER
       - globalTemplateId: PEO_ENTITY_TRANSFER_ARBITRATION_AGREEMENT
       - globalTemplateId: PEO_ENTITY_TRANSFER_WSE_NOTICE
   - Create signature tracking records
3. Set transfer status: PENDING_SIGNATURES
```

### Phase 2: Signature Collection (Async)

```
Employee Flow:
- Documents appear in worker compliance documents view
- GET /compliance-documents/document_requests

JetStream Consumer:
- Stream: documents
- Subject: documents.document-request-status-changed
- Durable: backend-peo-entity-transfer-document-status
- Filters: featureSetupType === PEO_ENTITY_TRANSFER
- Action: Update signature status to SIGNED

When all signatures collected: Transfer status -> SCHEDULED
```

### Phase 3: Transfer Execution (15 Steps)

```
Step 1:  CrossHireSanityCheck
Step 2:  TerminationSanityCheck
Step 3:  CheckSignaturesSanity        <-- NEW (validates all SIGNED)
Step 4:  CheckUnderwritingRequestStatus
Step 5:  ForceCompleteUnderwriting
Step 6:  SanityCheckResourcesExist
Step 7:  CreateContract
Step 8:  ShareComplianceDocuments     (excludes entity-specific)
Step 9:  CopyI9Data
Step 10: AttachSignedDocuments        <-- NEW (attaches signed docs)
Step 11: UpdateTimeOffEmployment
Step 12: AssignPtoPolicy
Step 13: CrossHire                    <-- POINT OF NO RETURN
Step 14: UpdateNewContractStatus
Step 15: TerminateContract
```

---

## Key Services

### TransferDocumentService

**Location**: `services/peo/entity_transfer/services/transfer_document_service.ts`

**Purpose**: Creates document requests via Documents microservice

**Key Method**: `createDocumentRequirements(params)`

```typescript
interface CreateDocumentRequirementsParams {
  organizationId: number;
  hrisProfileId: number;
  hrisProfileOid: string;
  sourceContractId: number;
  destinationLegalEntityPublicId: string;
  transaction?: Transaction;
}

interface DocumentRequirementResult {
  agreementType: TransferItemAgreementType;
  documentRequestId: string;
  globalTemplateId: string;
  externalId: string;
}
```

**ExternalId Format**: `{hrisProfileOid}_{destinationLegalEntityPublicId}_{agreementType}`

Example: `HRP-123456_550e8400-e29b-41d4-a716-446655440000_ARBITRATION_AGREEMENT`

### AttachSignedDocumentsStep

**Location**: `services/peo/entity_transfer/steps/attach_signed_documents_step.ts`

**Purpose**: Fetches signed documents from Documents microservice and creates PeoFileSubmission

**Flow**:
1. Get signed signatures from repository
2. For each signature:
   - Build externalId using same format as TransferDocumentService
   - Fetch document from Documents microservice
   - Extract signed PDF S3 key from documentSubmissions
   - Find ContractRequirement on new contract by title
   - Copy file to PEO file submission path
   - Create PeoFile and PeoFileSubmission

**Key Method for TechOps Testing**: `attachSignedDocumentsFromDocumentRequests(params)`

### JetStream Document Status Processor (TODO: PEOCM-660)

**Location (in PR #116580)**:
- `services/peo/entity_transfer/events/processors/entity_transfer_document_status_processor.ts`
- `services/peo/entity_transfer/events/listeners/entity_transfer_document_status_listener.ts`
- `jetstream_consumers/peo_entity_transfer_document_status.ts`

**Purpose**: Listen for document signing events and update signature records in PEO.

#### Event Configuration

| Setting | Value |
|---------|-------|
| Stream | `documents` |
| Subject | `documents.document-request-status-changed` |
| Consumer | `backend-peo-entity-transfer-document-status` |
| Filter | `featureSetupType === PEO_ENTITY_TRANSFER` |

#### Event Payload Format

```typescript
// Event received from Documents microservice
{
  data: {
    externalId: "HRP-123456_entity-uuid_ARBITRATION_AGREEMENT",
    status: "COMPLETED",  // or other statuses
    signature: { ... },
    fileId: "...",
    featureSetupType: "PEO_ENTITY_TRANSFER"
  }
}
```

#### Required Implementation (Currently TODO)

The processor skeleton exists in PR #116580 but the business logic is not implemented:

```typescript
async processMessage() {
    const {externalId, status, featureSetupType} = this.data.params;

    // 1. Filter: Only handle PEO_ENTITY_TRANSFER events
    if (featureSetupType !== 'PEO_ENTITY_TRANSFER') {
        return; // Ignore other document types
    }

    // 2. Only care about COMPLETED status
    if (status !== 'COMPLETED') {
        return;
    }

    // 3. Parse externalId to extract components
    // Format: {hrisProfileOid}_{destinationLegalEntityPublicId}_{agreementType}
    const [hrisProfileOid, entityId, agreementType] = externalId.split('_');

    // 4. Find the signature record in PEO
    // Call PEO service to find signature by:
    //   - profile_public_id (derived from hrisProfileOid)
    //   - agreement_type (from agreementType)
    //   - transfer that matches the entity

    // 5. Update signature record
    // Set signed_at = NOW()

    // 6. Check if ALL signatures for the transfer are complete
    // Query: SELECT * FROM peo_employee_transfer_signatures
    //        WHERE transfer_id = ? AND signed_at IS NULL
    // If count === 0, all signatures are collected

    // 7. If all signed, update transfer status
    // PENDING_SIGNATURES -> SCHEDULED
}
```

#### Reference Implementation (Existing Pattern)

The **termination module** has a similar processor that listens to the same event stream:

**Files**:
- `modules/termination/events/listeners/document_request_status_change_listener.js`
- `modules/termination/events/processors/document_request_status_change_processor.js`

**Key Pattern**:
```javascript
// document_request_status_change_processor.js
async processMessage() {
    const {externalId, status, signature, fileId, featureSetupType} = this.data.params;

    if (status === 'COMPLETED' &&
        featureSetupType === DocumentRequestFeatureSetupEnum.OFFBOARDING_RESIGNATION_LETTER) {

        // Find record by externalId
        const detail = await this.db.HrisTerminationDetails.findFirst({
            where: {publicId: externalId},
        });

        // Call service to handle signing
        await this.resignationRequestsService.resignationTemplateSigned({
            terminationId: detail.id,
            signature,
            fileId,
        });
    }
}
```

#### Base Classes

| Class | Location | Purpose |
|-------|----------|---------|
| `BaseNatsEventListener` | `modules/core/nats/base_nats_event_listener.js` | Subscribes to NATS, handles retries |
| `BaseNatsEventProcessor` | `modules/core/nats/base_nats_event_processor.js` | Base for message processing |

#### Implementation Checklist

- [x] Consumer entrypoint file (in PR)
- [x] Listener class extending BaseNatsEventListener (in PR)
- [x] Processor class extending BaseNatsEventProcessor (in PR)
- [ ] Parse externalId and extract components
- [ ] Call PEO service to find signature record
- [ ] Update `signed_at` timestamp in PEO
- [ ] Check if all transfer signatures are complete
- [ ] Update transfer status to SCHEDULED when all signed

---

## Integration Points

### 1. Tech Ops Endpoint Integration

**Location**: `controllers/admin/peo/tech_ops.ts:handleFullPayloadMode()`

**Current Flow**:
```
create transfer -> create item -> execute transfer
```

**Required Change**:
```
create transfer -> create item -> call setup() -> return (no execution)
```

Execution should be triggered separately after signatures collected.

### 2. Public Endpoint Integration (EEXPR-13)

**Location**: `controllers/entity_transfers/index.ts` (new POST endpoint)

**Required Flow**:
```
POST /peo-employee-transfers
  -> Create transfer + items
  -> For each item: call EntityTransferService.setup()
  -> Set status: PENDING_SIGNATURES
  -> Return transfer details with document request info
```

---

## Document Request Configuration

### Feature Setup Type

```typescript
enum DocumentRequestFeatureSetupEnum {
  PEO_ENTITY_TRANSFER = 'PEO_ENTITY_TRANSFER',
  // ... other types
}
```

### Global Templates

```typescript
enum GlobalTemplateType {
  PEO_ENTITY_TRANSFER_ARBITRATION_AGREEMENT = 'PEO_ENTITY_TRANSFER_ARBITRATION_AGREEMENT',
  PEO_ENTITY_TRANSFER_WSE_NOTICE = 'PEO_ENTITY_TRANSFER_WSE_NOTICE',
}
```

### Template Constants

```typescript
// services/peo/entity_transfer/constants.ts
export const ENTITY_TRANSFER_DOCUMENT_TEMPLATES = {
  arbitrationAgreement: {
    name: 'Arbitration agreement',
    requirementTitle: 'Arbitration agreement',
    globalTemplateId: GlobalTemplateType.PEO_ENTITY_TRANSFER_ARBITRATION_AGREEMENT,
  },
  wseNotice: {
    name: 'WSE notice of PEO relationship',
    requirementTitle: 'WSE notice of PEO relationship',
    globalTemplateId: GlobalTemplateType.PEO_ENTITY_TRANSFER_WSE_NOTICE,
  },
};
```

---

## Types Added

### Agreement Types

```typescript
enum TransferItemAgreementType {
  ARBITRATION_AGREEMENT = 'ARBITRATION_AGREEMENT',
  WSE_NOTICE_OF_PEO_RELATIONSHIP = 'WSE_NOTICE_OF_PEO_RELATIONSHIP',
}
```

### Signature Status

```typescript
enum TransferItemSignatureStatus {
  PENDING = 'PENDING',
  SIGNED = 'SIGNED',
}
```

### Signature Record (Backend PR Mock)

```typescript
interface PeoEmployeeTransferItemSignature {
  id: string;
  transferItemId: string;
  agreementType: TransferItemAgreementType;
  agreementId: string;
  status: TransferItemSignatureStatus;
  signedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## PEO Signature Table (Already Exists)

**Finding**: The PEO repository already has a signature tracking table. No new migration needed.

### Table: `peo_employee_transfer_signatures`

**Migration**: `peo/migrations/20251217172702-create_peo_employee_transfer_signatures_table__pre_release.js`

**Model**: `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts`

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | INTEGER | FK to organization (denormalized) |
| `transfer_id` | UUID | FK to `peo_employee_transfers.id` (CASCADE delete) |
| `profile_public_id` | INTEGER | Person required to sign |
| `role` | ENUM | `ADMIN` \| `EMPLOYEE` |
| `agreement_type` | ENUM | `ARBITRATION_AGREEMENT` \| `WSE_NOTICE_OF_PEO_RELATIONSHIP` \| `ENTITY_ASSIGNMENT_AGREEMENT` |
| `agreement_id` | UUID (nullable) | FK to document being signed |
| `signed_at` | DATE (nullable) | When signature was collected |
| `created_at` | DATE | Record creation |
| `updated_at` | DATE | Last update |

### PEO Types

```typescript
// peo/src/models/entityTransfer/types.ts
enum SignatureRole {
    ADMIN = 'ADMIN',
    EMPLOYEE = 'EMPLOYEE',
}

enum AgreementType {
    ARBITRATION_AGREEMENT = 'ARBITRATION_AGREEMENT',
    WSE_NOTICE_OF_PEO_RELATIONSHIP = 'WSE_NOTICE_OF_PEO_RELATIONSHIP',
    ENTITY_ASSIGNMENT_AGREEMENT = 'ENTITY_ASSIGNMENT_AGREEMENT',  // Extra type
}
```

### Schema Mismatch with Backend PR

| Aspect | PEO Table (Real) | Backend PR Mock |
|--------|------------------|-----------------|
| FK Reference | `transfer_id` (links to transfer) | `transferItemId` (links to item) |
| Person ID | `profile_public_id` | hrisProfileId |
| Role Support | Has `role` field (ADMIN/EMPLOYEE) | No role field |
| Agreement Types | 3 types (includes ENTITY_ASSIGNMENT_AGREEMENT) | 2 types |
| Status Field | No status field (uses `signed_at` null check) | Has `status` enum |

### Implication

The backend repository mock implementation needs to be replaced with actual calls to PEO service to create/query/update signature records in this existing table.

---

## Remaining Work

### Done in PR

- [x] Document Requests framework integration
- [x] TransferDocumentService for creating requirements
- [x] CheckSignaturesSanityStep for validation
- [x] AttachSignedDocumentsStep for attaching signed docs
- [x] JetStream consumer for signature events
- [x] Types and interfaces for signature tracking

### Needs Attention (Before Merge)

- [ ] Repository methods return MOCK DATA - need to call PEO service (table exists!)
- [ ] Tech ops testing endpoints marked "do not merge" - remove
- [ ] Feature flag middleware commented out with "TEST, DO NOT MERGE" - restore
- [ ] TODO logs in AttachSignedDocumentsStep - remove
- [ ] Signature status update not implemented in processor (TODO: PEOCM-660)
- [ ] Align Backend interface with PEO table schema (see Schema Mismatch section)

### Not Yet Done

- [ ] Integration with tech ops endpoint (call setup() on creation)
- [ ] Integration with public endpoint (EEXPR-13)
- [x] ~~Database table for peo_employee_transfer_item_signatures~~ - **EXISTS in PEO as `peo_employee_transfer_signatures`**
- [ ] Document Request renaming (Diego Rodrigues working on it)

---

## Dependencies

### PR #116580 depends on

- Documents microservice global templates being configured
- Feature flag: `documentsListWorkerViewForPEOEmployees`
- EEXPR-13 for public endpoint implementation

### EEXPR-44 depends on

- EEXPR-13 (new public entity transfers endpoint)
- Documents microservice having PEO_ENTITY_TRANSFER templates
- ~~Database migration for peo_employee_transfer_item_signatures table~~ - **Not needed, PEO table exists**

---

## Key Considerations

### Mock Data Warning

All repository signature methods currently return mock data that always shows signatures as SIGNED. Production needs to call PEO service to use the existing `peo_employee_transfer_signatures` table.

**Affected Methods**:
- `createTransferItemSignatures()` - Returns mock signatures with PENDING status
- `getTransferItemSignatures()` - Returns mock signatures with SIGNED status
- `getSignedTransferItemSignatures()` - Filters for SIGNED (from mock)
- `updateTransferItemSignatureStatus()` - Logs only, no persistence

**Resolution**: Replace mock implementations with PEO service calls. Note the schema differences:
- Use `transfer_id` instead of `transferItemId`
- Use `profile_public_id` instead of hrisProfileId
- Add `role` field (EMPLOYEE for worker signatures)
- Check `signed_at IS NOT NULL` instead of `status = 'SIGNED'`

### ExternalId Format

The externalId uses profile OID + entity + type, NOT transferItemId. This allows finding documents even if transfer item changes or is recreated.

### Skip Flag for Tech Ops

The PR adds `skipDocumentSteps` flag to bypass document steps during tech ops execution:

```typescript
// In tech_ops.ts
transferItem.skipDocumentSteps = true;
```

Both CheckSignaturesSanityStep and AttachSignedDocumentsStep check this flag and skip if true.

### Two-Phase Rollback

AttachSignedDocumentsStep rollback relies on ShareComplianceDocumentsStep to delete all file submissions for new contract. The actual deletion happens via outbox event.

---

## Testing Endpoints (Do Not Merge)

The PR includes two testing endpoints that should be removed before merge:

### POST /admin/peo/tech_ops/entity_transfer/create_doc_requirements

Creates document requirements for a given contract and destination entity.

**Request**:
```json
{
  "basePeoContractOid": "CONTRACT_OID",
  "destinationLegalEntityPublicId": "UUID"
}
```

### POST /admin/peo/tech_ops/entity_transfer/copy_signed_documents

Attaches signed documents from Documents microservice to destination contract.

**Request**:
```json
{
  "baseContractOid": "CONTRACT_OID",
  "futureContractOid": "CONTRACT_OID"
}
```

---

## Related Documentation

- [Entity Transfers README](../README.md)
- [Entity Transfers Deployments](../deployments.md)
- [PR #116580](https://github.com/letsdeel/backend/pull/116580)

### PEO Repository Files

- `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts` - Signature model
- `peo/src/models/entityTransfer/types.ts` - SignatureRole, AgreementType enums
- `peo/migrations/20251217172702-create_peo_employee_transfer_signatures_table__pre_release.js` - Migration

### JetStream Reference Files (Backend)

- `modules/termination/events/listeners/document_request_status_change_listener.js` - Reference listener implementation
- `modules/termination/events/processors/document_request_status_change_processor.js` - Reference processor implementation
- `modules/core/nats/base_nats_event_listener.js` - Base listener class
- `modules/core/nats/base_nats_event_processor.js` - Base processor class
- `modules/peo/events/listeners/entity_address/peo_entity_address_creation_listener.ts` - TypeScript listener example

---

_Created: 2026-01-27_
_Last Updated: 2026-01-27 (added JetStream processor implementation details)_
