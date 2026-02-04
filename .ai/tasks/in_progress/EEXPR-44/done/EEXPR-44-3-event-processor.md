<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-44-3-event-processor.md                        ║
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

# Backend: JetStream Event Processor — Resolve externalId via Documents API

## Objective

Wire up the `EntityTransferDocumentStatusProcessor` to resolve `externalId` to `agreementId` using the Documents microservice API (Option B), then call `updateTransferItemSignatureStatus()` to persist the signature status in PEO.

## Background

When an employee signs a transfer document, the Documents microservice publishes a JetStream event on `documents.document-request-status-changed`. The entity transfer processor receives this event but currently only logs it (TODO: PEOCM-660).

The event payload contains `externalId` (format: `{hrisProfileOid}_{destinationLegalEntityPublicId}_{agreementType}`), but the repository's `updateTransferItemSignatureStatus()` expects an `agreementId` (the `WorkerDocumentIndividualRequest.publicId`).

**Resolution approach (Option B)**: Query the Documents microservice using `documentRequestService.getDocumentRequest(PEO_ENTITY_TRANSFER, externalId)` — the response's `id` field is the `agreementId`.

This pattern is already used in `AttachSignedDocumentsStep`.

## Pre-Implementation

Before starting:
- Ensure EEXPR-44-1 (PEO) and EEXPR-44-2 (Backend client) are complete
- Run an exploration agent to review:
  - `modules/documents/services/document_request_service.ts` — `getDocumentRequest()` method
  - `services/peo/entity_transfer/steps/attach_signed_documents_step.ts` — reference pattern
  - `services/peo/entity_transfer/events/processors/entity_transfer_document_status_processor.ts` — current TODO

## Implementation Steps

### Step 1: Inject DocumentRequestService into the processor

**File**: `services/peo/entity_transfer/events/processors/entity_transfer_document_status_processor.ts`

**Instructions**:
The processor needs access to `DocumentRequestService` and `EntityTransferRepository`. Update the constructor to accept and store these dependencies.

Reference how the listener creates the processor in:
`services/peo/entity_transfer/events/listeners/entity_transfer_document_status_listener.ts`

The listener's `messageHandler()` creates the processor — it needs to pass the service and repository instances.

### Step 2: Implement externalId → agreementId resolution

**File**: `services/peo/entity_transfer/events/processors/entity_transfer_document_status_processor.ts`

**Instructions**:
Replace the TODO block in `processMessage()` when `status === 'COMPLETED'`:

```typescript
// 1. Query Documents microservice to get the document request by externalId
const response = await this.documentRequestService.getDocumentRequest(
    DocumentRequestFeatureSetupEnum.PEO_ENTITY_TRANSFER,
    externalId
);

if (!response?.data?.id) {
    this._log.error({
        message: '[EntityTransferDocumentStatusProcessor] Document request not found for externalId',
        externalId,
    });
    throw new Error(`Document request not found for externalId: ${externalId}`);
}

const agreementId = response.data.id; // publicId = agreementId

// 2. Update signature status in PEO via repository
await this.repository.updateTransferItemSignatureStatus(
    agreementId,
    TransferItemSignatureStatus.SIGNED
);

this._log.info({
    message: '[EntityTransferDocumentStatusProcessor] Signature status updated',
    externalId,
    agreementId,
    status: 'SIGNED',
});
```

### Step 3: Update the listener to pass dependencies

**File**: `services/peo/entity_transfer/events/listeners/entity_transfer_document_status_listener.ts`

**Instructions**:
Update the listener constructor and `messageHandler()` to:
1. Accept/store `DocumentRequestService` and `EntityTransferRepository` instances
2. Pass them to the processor constructor

Follow the pattern of how the termination listener passes its `resignationRequestsService` via the `modules` option.

### Step 4: Verify listener registration

**Instructions**:
Check where `EntityTransferDocumentStatusListener` is instantiated and registered. Ensure the new dependencies (`DocumentRequestService`, `EntityTransferRepository`) are available at the registration point and passed correctly.

Search for where listeners are registered:
- `services/peo/entity_transfer/` or `modules/` directories
- Look for `new EntityTransferDocumentStatusListener(` or `.listen()` calls

## Post-Implementation

After completing, run a code review agent to check for issues.

## Acceptance Criteria

- Processor resolves externalId to agreementId via Documents API
- Processor calls `updateTransferItemSignatureStatus(agreementId, SIGNED)` on COMPLETED events
- Processor throws and retries if Documents API returns no result
- Non-PEO_ENTITY_TRANSFER events are still skipped
- PENDING events are still logged without action
- Error handling preserves retry behavior (max 5 retries, 10s ack wait)

## Testing

1. Mock Documents API response and verify agreementId extraction
2. Verify processor calls repository with correct agreementId
3. Verify error handling when Documents API returns no data
4. Verify retry behavior on transient failures
5. E2E: Sign document in Documents service -> event published -> processor updates PEO signature status

## Notes

- **Dependencies**: Requires EEXPR-44-1 (PEO endpoints) and EEXPR-44-2 (backend client) to be complete
- **HTTP dependency during event processing**: If Documents service is down, the event will fail and retry (max 5 retries). This is acceptable given the retry mechanism.
- **Reference pattern**: `AttachSignedDocumentsStep` already uses `documentRequestService.getDocumentRequest()` with the same externalId format
- **Key files**:
  - `modules/documents/services/document_request_service.ts` — `getDocumentRequest()` method
  - `modules/documents/schemas/document_requests_schemas.ts` — `DocumentRequestFeatureSetupEnum.PEO_ENTITY_TRANSFER`
  - `services/peo/entity_transfer/services/transfer_document_service.ts` — `generateExternalId()` static method
