<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-129-12-phase5-fixes.md                         ║
║ TASK: EEXPR-129                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                 ║
║ 2. Update status.yaml with new status                           ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml              ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
# Repository Context (EEXPR-129)
repo: docs
repo_path: /Users/gabriel.herter/Documents/Projects/deel
protected: false
---

# Phase 5 Fixes: Signatures & Documents Flow

## Objective

Review the 18 findings from Phase 5 (Signatures & Documents Flow), produce a concrete fix proposal document with the exact TDD text corrections, and present to the user for approval/rejection of each fix.

## Source Report

`.ai/docs/backend/entity_transfers/tdd-review/phase-5-signatures-documents.md`

## Findings to Address (18)

Covers: 3-phase signature architecture (Document Requests + JetStream), transfer-level vs item-level signatures, global templates, async processing, new pipeline steps (CheckSignaturesSanity, AttachSignedDocuments), agreement generation obsolescence, and ExternalId pattern.

## Implementation Steps

### Step 1: Read Phase 5 Report

Read the full Phase 5 findings report to understand each finding in detail.

### Step 2: For Each Finding, Draft Fix

For each of the 18 findings, produce:
- **TDD Section**: Which TDD section is affected
- **Current TDD Text**: The exact text that needs changing
- **Proposed New Text**: The corrected text reflecting actual implementation
- **Action**: `REPLACE`, `ADD`, or `REMOVE`
- **Rationale**: Brief explanation

### Step 3: Write Fix Proposal Document

Create `.ai/docs/backend/entity_transfers/tdd-review/fixes/phase-5-fixes.md`

### Step 4: Present to User

Display fix proposals for approval.

### Step 5: Record Decisions

Update with user's decisions (APPROVED / REJECTED / MODIFIED).

## Acceptance Criteria

- Fix proposal document created with all 18 findings addressed
- Each fix has clear before/after text
- User has reviewed and marked each fix
- Decisions recorded

## Output

`.ai/docs/backend/entity_transfers/tdd-review/fixes/phase-5-fixes.md`
