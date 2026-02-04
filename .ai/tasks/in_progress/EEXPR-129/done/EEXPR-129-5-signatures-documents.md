<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-129-5-signatures-documents.md                 ║
║ TASK: EEXPR-129                                                 ║
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
# Repository Context (EEXPR-129)
repo: backend, peo
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend, /Users/gabriel.herter/Documents/Projects/deel/peo
branch: N/A (documentation review)
protected: false
---

# Phase 5: Signatures & Documents Flow

## Objective

Compare the TDD's signature model and document handling against the actual implementation, particularly the major rework from EEXPR-44 (custom documents integration with Document Requests framework and JetStream async flow).

## TDD Sections Under Review

1. **Signature Collection** in lifecycle (Phase 2: PENDING_SIGNATURES)
2. **Transfer-level signatures** (`peo_employee_transfer_signatures` table)
3. **Item-level signatures** (`peo_employee_transfer_item_signatures` table)
4. **Agreement generation** (Entity Assignment Agreement, preview vs permanent PDF)
5. **Sign endpoint** behavior
6. **Open Question #1**: Entity-specific document signing (Arbitration Agreement, WSE Notice)

## Pre-Implementation

Before starting, launch an **exploration agent** to:
- Read `.ai/docs/backend/entity_transfers/explorations/EEXPR-44-custom-documents-integration.md`
- Find signature-related services in `backend/services/peo/entity_transfer/`
- Find the Document Requests framework integration
- Check JetStream processor/consumer code
- Look at `peo/src/models/entityTransfer/` for signature models
- Read EEXPR-44-1 and EEXPR-44-2 task docs for PEO signature service

## Implementation Steps

### Step 1: Map the actual signature architecture

EEXPR-44 introduced a 3-phase architecture:
- Phase 1: Transfer creation with document setup
- Phase 2: Async signature collection via JetStream
- Phase 3: Transfer execution

Compare this against the TDD's simpler model of "admin and employees sign → SCHEDULED".

### Step 2: Review transfer-level vs item-level signatures

The TDD has both `peo_employee_transfer_signatures` and `peo_employee_transfer_item_signatures`. Verify:
- Are both still used?
- What's the relationship? (Admin signs at transfer level, employees sign at item level?)
- What are the actual agreement types? (TDD lists: ARBITRATION_AGREEMENT, WSE_NOTICE_OF_PEO_RELATIONSHIP, ENTITY_ASSIGNMENT_AGREEMENT)

### Step 3: Review Document Requests framework integration

This is NOT in the TDD at all. Document:
- How documents are created and sent to signers
- TransferDocumentService implementation
- AttachSignedDocumentsStep flow
- JetStream event handling

### Step 4: Review agreement generation

TDD describes preview vs permanent PDF. Verify:
- Is this still the model?
- How are agreements generated now?
- Is the 15-minute expiry for preview PDFs still accurate?

### Step 5: Check Open Question #1 resolution

TDD's Open Question #1 asks about entity-specific document signing. EEXPR-44 implemented the answer. Document what was implemented vs what was asked.

### Step 6: Document findings

Focus on what the TDD is missing about the document/signature architecture.

## Acceptance Criteria

- [ ] Actual signature architecture mapped (transfer-level vs item-level)
- [ ] Document Requests framework integration documented
- [ ] JetStream async flow documented (missing from TDD entirely)
- [ ] Agreement types and generation process verified
- [ ] Open Question #1 resolution documented
- [ ] Findings report created

## Notes

- This is likely the phase with the MOST discrepancies since EEXPR-44 was a major architectural addition
- The 3-phase architecture from EEXPR-44 fundamentally changes how signatures work
- JetStream async processing is not mentioned anywhere in the TDD
- The Document Requests framework is a cross-cutting concern that may affect other TDD sections
