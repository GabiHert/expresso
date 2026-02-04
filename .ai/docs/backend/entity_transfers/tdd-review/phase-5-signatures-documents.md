# Phase 5 Findings: Signatures & Documents Flow

**Task**: EEXPR-129 | **Date**: 2026-02-04 | **Status**: Complete

---

## Summary

The TDD's signature and document model is **fundamentally outdated**. The TDD describes a simple "admin and employees sign → SCHEDULED" model, but the actual implementation has evolved in two stages:

1. **Current production (13 steps)**: Transfer-level signature table exists but has no creation/update endpoints in the PEO controller, no signature steps in the pipeline, and the PENDING_SIGNATURES → SCHEDULED transition is a manual PATCH API call.

2. **EEXPR-44 (15 steps, PR #116580, not yet merged)**: Introduces a 3-phase architecture with Document Requests framework integration, JetStream async event handling, item-level signature tracking, and two new pipeline steps (CheckSignaturesSanityStep, AttachSignedDocumentsStep). This is the most significant architectural change since the TDD was written.

The TDD does not mention the Document Requests framework, JetStream, item-level signatures, or the 3-phase architecture at all.

---

## 1. Signature Architecture

### Verdict: FUNDAMENTALLY DIFFERENT

**TDD describes**:
> Admin and employees sign Entity Assignment Agreements. Employees sign Notice of PEO Relationship documents. Once all signatures collected → SCHEDULED.

This implies a synchronous, simple signature collection model.

**Actual — Current Production (13 steps)**:
- `peo_employee_transfer_signatures` table exists (transfer-level)
- No signature creation or update endpoints in PEO controller
- No signature validation steps in the execution pipeline
- Transition from `PENDING_SIGNATURES` → `SCHEDULED` is a manual `PATCH /transfers/:id/status` API call (not automatic)
- ShareComplianceDocumentsStep explicitly EXCLUDES entity-specific agreements (Arbitration Agreement, WSE Notice)

**Actual — EEXPR-44 Architecture (15 steps, not yet merged)**:

Three-phase architecture:

| Phase | Name | Description |
|-------|------|-------------|
| 1 | Transfer Creation | Create transfer + items, create document requirements via Documents microservice, set status PENDING_SIGNATURES |
| 2 | Signature Collection | Async — employee signs in compliance documents view, JetStream consumer updates signature status, auto-transition to SCHEDULED when all signed |
| 3 | Transfer Execution | 15-step pipeline including CheckSignaturesSanityStep (Step 3) and AttachSignedDocumentsStep (Step 10) |

---

## 2. Transfer-Level vs Item-Level Signatures

### Verdict: TDD IS INCOMPLETE

**TDD implies**: Single-level signatures (transfer-level, admin + employees sign per transfer)

**Actual — Two Levels**:

#### Transfer-Level Signatures (Current Production)

**Table**: `peo_employee_transfer_signatures`

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | Signature record |
| organization_id | INTEGER | Denormalized |
| transfer_id | UUID FK | Parent transfer (CASCADE) |
| profile_public_id | UUID | Person who must sign |
| role | ENUM | `ADMIN` \| `EMPLOYEE` |
| agreement_type | ENUM | 3 types (see below) |
| agreement_id | UUID (nullable) | FK to document |
| signed_at | DATE (nullable) | When collected |

**Unique constraint**: `(transfer_id, profile_public_id, agreement_type)`

**Model**: `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts`

This tracks WHO needs to sign WHAT at the transfer level. The `signed_at` null check determines if signed.

#### Item-Level Signatures (EEXPR-44 — Not Yet Merged)

**Table**: `peo_employee_transfer_item_signatures`

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | Signature record |
| transfer_item_id | UUID FK | Parent transfer item (CASCADE) |
| agreement_type | ENUM | `ARBITRATION_AGREEMENT` \| `WSE_NOTICE_OF_PEO_RELATIONSHIP` |
| agreement_id | UUID | Document request ID from Documents microservice |
| status | ENUM | `PENDING` \| `SIGNED` |
| signed_at | TIMESTAMP (nullable) | When signature collected |

**Unique constraint**: `(transfer_item_id, agreement_type)`

This tracks per-employee-per-item document signing status, linked to the Documents microservice via `agreement_id`.

#### Schema Mismatch Between Levels

| Aspect | Transfer-Level (PEO) | Item-Level (EEXPR-44 Backend) |
|--------|----------------------|-------------------------------|
| FK Reference | `transfer_id` (transfer) | `transfer_item_id` (item) |
| Person ID | `profile_public_id` | Not stored (derived from item's contract) |
| Role Support | Has `role` field (ADMIN/EMPLOYEE) | No role field |
| Agreement Types | 3 types (includes ENTITY_ASSIGNMENT_AGREEMENT) | 2 types (no ENTITY_ASSIGNMENT_AGREEMENT) |
| Status Tracking | `signed_at IS NULL` check | Explicit `status` enum (PENDING/SIGNED) |

**Note**: The EEXPR-44 exploration doc flags this as a known issue — the backend repository mock implementation needs to be replaced with actual PEO service calls, reconciling these schema differences.

---

## 3. Agreement Types

### Verdict: PARTIALLY ACCURATE

**TDD lists 3 agreement types**:
1. ARBITRATION_AGREEMENT
2. WSE_NOTICE_OF_PEO_RELATIONSHIP
3. ENTITY_ASSIGNMENT_AGREEMENT

**Actual PEO enum** (`peo/src/models/entityTransfer/types.ts`):
```typescript
enum AgreementType {
    ARBITRATION_AGREEMENT = 'ARBITRATION_AGREEMENT',
    WSE_NOTICE_OF_PEO_RELATIONSHIP = 'WSE_NOTICE_OF_PEO_RELATIONSHIP',
    ENTITY_ASSIGNMENT_AGREEMENT = 'ENTITY_ASSIGNMENT_AGREEMENT',
}
```

The enum matches. However:

**Actual Backend EEXPR-44 enum** (`backend/services/peo/entity_transfer/types.ts`):
```typescript
enum TransferItemAgreementType {
    ARBITRATION_AGREEMENT = 'ARBITRATION_AGREEMENT',
    WSE_NOTICE_OF_PEO_RELATIONSHIP = 'WSE_NOTICE_OF_PEO_RELATIONSHIP',
}
```

Only 2 types in the backend. `ENTITY_ASSIGNMENT_AGREEMENT` has `agreementId = NULL` in the transfer-level signature table — it has no associated document request or document to sign via the Documents framework.

**What TDD doesn't say**:
- Only ARBITRATION_AGREEMENT and WSE_NOTICE_OF_PEO_RELATIONSHIP have actual documents that employees sign
- ENTITY_ASSIGNMENT_AGREEMENT exists as a transfer-level signature type but has no document generation
- The backend Document Requests integration only creates 2 document types, not 3

---

## 4. Document Requests Framework Integration

### Verdict: COMPLETELY MISSING FROM TDD

The TDD makes no mention of the Document Requests framework. EEXPR-44 introduces this as the core mechanism for document handling.

#### How It Works

**TransferDocumentService** (`backend/services/peo/entity_transfer/services/transfer_document_service.ts`)

**Main method**: `createDocumentRequirements(params)`

```typescript
interface CreateDocumentRequirementsParams {
    organizationId: number;
    hrisProfileId: number;
    hrisProfileOid: string;
    sourceContractId: number;
    destinationLegalEntityPublicId: string;
    transaction?: Transaction;
}
```

**For each employee, creates 2 document requests**:

| Document | Global Template ID |
|----------|--------------------|
| Arbitration Agreement | `PEO_ENTITY_TRANSFER_ARBITRATION_AGREEMENT` |
| WSE Notice of PEO Relationship | `PEO_ENTITY_TRANSFER_WSE_NOTICE` |

**Request to Documents microservice**:
```typescript
{
    requestToEntityExternalId: hrisProfileOid,
    requestToEntityType: DocumentRequestEntityType.HRIS_PROFILE,
    documentTemplateId: globalTemplateId,
    templateGroup: 'GLOBAL_TEMPLATE',
    requestMetadata: [
        { propKey: 'CONTRACT_ID', value: sourceContractId },
        { propKey: 'HRIS_PROFILE_ID', value: hrisProfileId },
        { propKey: 'LEGAL_ENTITY_ID', value: destinationLegalEntityPublicId }
    ],
    action: DocumentRequestAction.SIGN,
    organizationId: organizationId
}
```

**Feature setup type**: `PEO_ENTITY_TRANSFER`

#### ExternalId Pattern

Deterministic ID format:
```
{hrisProfileOid}_{destinationLegalEntityPublicId}_{agreementType}
```
Example: `HRP-123456_550e8400-e29b-41d4-a716-446655440000_ARBITRATION_AGREEMENT`

This allows reconstruction without storing in the transfer database and survives item recreation.

#### Document Templates

```typescript
const ENTITY_TRANSFER_DOCUMENT_TEMPLATES = {
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

## 5. JetStream Async Flow

### Verdict: COMPLETELY MISSING FROM TDD

The TDD does not mention JetStream, NATS, or any async event processing. EEXPR-44 adds a full JetStream consumer pipeline.

#### Event Configuration

| Setting | Value |
|---------|-------|
| Stream | `documents` |
| Subject | `documents.document-request-status-changed` |
| Consumer | `backend-peo-entity-transfer-document-status` |
| Filter | `featureSetupType === PEO_ENTITY_TRANSFER` |
| Max Retries | 5 |
| Ack Wait | 10 seconds |

#### Files

| File | Purpose |
|------|---------|
| `events/listeners/entity_transfer_document_status_listener.ts` | JetStream consumer listener |
| `events/processors/entity_transfer_document_status_processor.ts` | Event processing logic |
| `jetstream_consumers/peo_entity_transfer_document_status.ts` | Consumer entrypoint |

#### Event Payload

```typescript
interface DocumentRequestStatusChangedPayload {
    data: {
        externalId: string;     // {hrisOid}_{entityId}_{agreementType}
        status: string;         // 'PENDING' | 'COMPLETED'
        featureSetupType: string; // Must be 'PEO_ENTITY_TRANSFER'
        signedAt?: string;
        signature?: string;
    };
}
```

#### Processing Flow

```
Employee signs document in compliance view
  → Documents microservice publishes event
  → JetStream consumer receives event
  → Filter: featureSetupType === PEO_ENTITY_TRANSFER
  → On status === 'COMPLETED':
    1. Call documentRequestService.getDocumentRequest() to get agreementId
    2. Call repository.updateTransferItemSignatureStatus(agreementId, SIGNED)
    3. Update signed_at timestamp
  → When all signatures SIGNED → Transfer status → SCHEDULED
```

#### Implementation Status

The processor skeleton exists in PR #116580 but the business logic for checking if all signatures are complete and auto-transitioning to SCHEDULED is marked TODO. The reference pattern is from the termination module's `document_request_status_change_processor.js`.

---

## 6. New Pipeline Steps (EEXPR-44)

### Verdict: MISSING FROM TDD

EEXPR-44 adds 2 new steps, bringing the pipeline from 13 to 15 steps.

#### CheckSignaturesSanityStep (New Step 3)

**Type**: DATABASE (read-only)

**Purpose**: Validates all required signatures are SIGNED before execution proceeds.

**Logic**:
1. If `skipDocumentSteps === true` (tech ops flag) → skip
2. Query `repository.getTransferItemSignatures(itemId)`
3. If no signatures → warn and continue (mock data scenario, TODO: make hard requirement)
4. If any signature has `status === PENDING` → fail with error listing pending agreement types
5. If all `SIGNED` → continue

**Error format**:
```
Transfer cannot proceed: N required signature(s) are still pending.
Missing signatures for: [ARBITRATION_AGREEMENT, WSE_NOTICE_OF_PEO_RELATIONSHIP].
Please ensure the employee has signed all required documents before executing the transfer.
```

#### AttachSignedDocumentsStep (New Step 10)

**Type**: EXTERNAL

**Purpose**: Fetches signed documents from Documents microservice and creates PeoFileSubmission records on the new contract.

**Flow**:
1. Get signed signatures from PEO: `repository.getSignedTransferItemSignatures(itemId)`
2. For each signature:
   - Build externalId using same format as TransferDocumentService
   - Fetch document from Documents microservice: `documentRequestService.getDocumentRequest()`
   - Extract signed PDF S3 key from `documentSubmissions[0].files[0].s3Key`
   - Map agreement type to ContractRequirement title
   - Query PEO for matching ContractRequirement on new contract
   - Copy file from Documents S3 to PEO S3 path: `copyObject(sourceKey, targetKey)`
   - Create PEOFile with proper S3 path pattern
   - Create PEOFileSubmission linked to requirement
3. Track all attachments in `stepResults.attachedSignedDocuments`

**Rollback**: Deferred — relies on ShareComplianceDocumentsStep's rollback to delete all file submissions for the new contract via outbox event.

#### Updated 15-Step Pipeline (EEXPR-44)

| # | Step Name | Status |
|---|-----------|--------|
| 1 | CrossHireSanityCheckStep | Same |
| 2 | TerminationSanityCheckStep | Same |
| **3** | **CheckSignaturesSanityStep** | **NEW** |
| 4 | CheckUnderwritingRequestStatusStep | Shifted +1 |
| 5 | ForceCompleteUnderwritingStep | Shifted +1 |
| 6 | SanityCheckResourcesExistStep | Shifted +1 |
| 7 | CreateContractStep | Shifted +1 |
| 8 | ShareComplianceDocumentsStep | Shifted +1 |
| 9 | CopyI9DataStep | Shifted +1 |
| **10** | **AttachSignedDocumentsStep** | **NEW** |
| 11 | UpdateTimeOffEmploymentStep | Shifted +2 |
| 12 | AssignPtoPolicyStep | Shifted +2 |
| 13 | CrossHireStep (PONR) | Shifted +2 |
| 14 | UpdateNewContractStatusStep | Shifted +2 |
| 15 | TerminateContractStep | Shifted +2 |

**PONR**: Moves from Step 11 (current) → Step 13 (EEXPR-44).

---

## 7. Agreement Generation (Preview vs Permanent PDF)

### Verdict: OBSOLETE

**TDD describes**: Preview PDF with 15-minute expiry, then permanent PDF after signing.

**Actual**:
- No preview/permanent PDF distinction exists in the implementation
- EEXPR-44 uses the Document Requests framework with global templates
- The Documents microservice handles PDF generation internally
- AttachSignedDocumentsStep copies the final signed PDF from the Documents S3 bucket to the PEO S3 bucket
- No 15-minute expiry mechanism exists anywhere in the code

The TDD's preview/permanent model appears to have been designed but never implemented. The Document Requests framework provides a different approach entirely.

---

## 8. Sign Endpoint

### Verdict: DOES NOT EXIST (as TDD describes)

**TDD describes**: `PUT /peo-employee-transfers/{id}/sign` endpoint

**Actual**:
- No sign endpoint exists in the PEO controller (confirmed in Phase 4)
- No sign endpoint exists in the backend tech ops controller
- Signature collection is handled entirely through the Documents microservice and JetStream events (EEXPR-44)
- The employee signs via the standard compliance documents view (`/compliance-documents/document_requests`), not a transfer-specific endpoint

---

## 9. Open Question #1 Resolution

### Verdict: RESOLVED BY EEXPR-44

**TDD's Open Question #1**: "How should entity-specific document signing (Arbitration Agreement, WSE Notice of PEO Relationship) be handled during entity transfers?"

**EEXPR-44's Answer**:
1. During transfer creation, create Document Requests via the Documents microservice using global templates specific to entity transfers
2. Documents appear in the employee's compliance documents view
3. Employee signs through the standard Document Requests UI (not a transfer-specific flow)
4. JetStream consumer listens for completion events and updates signature status
5. When all signatures collected, transfer transitions to SCHEDULED
6. During execution, AttachSignedDocumentsStep copies signed documents to the new contract

**What the original PEOCM-767 approach proposed** (per exploration doc): Using `getPEOData` override to inject documents — this didn't work.

**What EEXPR-44 implemented**: Document Requests framework with `PEO_ENTITY_TRANSFER` feature setup type and global templates. This is a cleaner separation of concerns.

---

## 10. Document Exclusion in ShareComplianceDocumentsStep

### Verdict: MISSING FROM TDD

**TDD does not mention**: Which documents are excluded during compliance document sharing.

**Actual** (ShareComplianceDocumentsStep):
```typescript
excludeAgreementTypes: [
    AgreementType.ARBITRATION_AGREEMENT,
    AgreementType.WSE_NOTICE_OF_PEO_RELATIONSHIP
]
```

These entity-specific agreements are excluded because they must be re-signed for the destination legal entity. The TDD should document this exclusion logic and explain why these types require new signatures while other compliance documents are portable.

---

## 11. skipDocumentSteps Flag

### Verdict: MISSING FROM TDD

EEXPR-44 introduces a `skipDocumentSteps` boolean flag on the transfer item:

```typescript
transferItem.skipDocumentSteps = true;
```

Set by the tech ops controller for testing purposes. Both CheckSignaturesSanityStep and AttachSignedDocumentsStep check this flag and skip their logic if true. This allows tech ops to execute transfers without requiring signatures.

---

## 12. Mock Data Warning

### Verdict: IMPLEMENTATION INCOMPLETE

The EEXPR-44 backend repository signature methods currently return **mock data**:

- `createTransferItemSignatures()` — returns mock with PENDING status
- `getTransferItemSignatures()` — returns mock with SIGNED status
- `getSignedTransferItemSignatures()` — filters mock for SIGNED
- `updateTransferItemSignatureStatus()` — logs only, no persistence

These need to be replaced with actual PEO service calls before the PR can be merged. The PEO `peo_employee_transfer_signatures` table already exists, but the schema doesn't match the backend mock interface (see Section 2 schema mismatch).

---

## Findings Summary

| # | Category | Finding | Severity |
|---|----------|---------|----------|
| 1 | **Incorrect** | TDD describes synchronous "sign → SCHEDULED" model; actual is async 3-phase architecture with Document Requests + JetStream | Critical |
| 2 | **Incorrect** | TDD implies automatic PENDING_SIGNATURES → SCHEDULED transition; actual is manual PATCH API call (auto-transition planned in EEXPR-44 JetStream but not yet complete) | High |
| 3 | **Incorrect** | TDD describes `PUT /sign` endpoint; this does not exist — signing happens through Documents microservice compliance view | High |
| 4 | **Incorrect** | TDD describes preview PDF with 15-minute expiry; no such mechanism exists — Document Requests handles PDF generation | Medium |
| 5 | **Missing** | Document Requests framework integration not documented (TransferDocumentService, global templates, feature setup type PEO_ENTITY_TRANSFER) | Critical |
| 6 | **Missing** | JetStream async event handling not documented (stream, subject, consumer, processor) | Critical |
| 7 | **Missing** | Item-level signatures table (`peo_employee_transfer_item_signatures`) not documented | High |
| 8 | **Missing** | CheckSignaturesSanityStep (new Step 3 in EEXPR-44) not documented | High |
| 9 | **Missing** | AttachSignedDocumentsStep (new Step 10 in EEXPR-44) not documented | High |
| 10 | **Missing** | 15-step pipeline (EEXPR-44) vs 11 in TDD (or 13 current production) | High |
| 11 | **Missing** | ExternalId pattern for document tracking (`{hrisOid}_{entityId}_{type}`) | Medium |
| 12 | **Missing** | Document exclusion logic in ShareComplianceDocumentsStep (excludes Arbitration, WSE Notice) | Medium |
| 13 | **Missing** | skipDocumentSteps flag for tech ops testing bypass | Low |
| 14 | **Missing** | Schema mismatch between transfer-level and item-level signature tables | Medium |
| 15 | **Missing** | ENTITY_ASSIGNMENT_AGREEMENT has no associated document (agreementId = NULL) | Low |
| 16 | **Obsolete** | Preview vs permanent PDF model described but never implemented | Medium |
| 17 | **Resolved** | Open Question #1 (entity-specific document signing) answered by EEXPR-44's Document Requests integration | Info |
| 18 | **Incomplete** | EEXPR-44 backend repository signature methods use mock data; needs PEO service integration before merge | Info |
