<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-129-8-phase1-fixes.md                          ║
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

# Phase 1 Fixes: State Machines & Lifecycle

## Objective

Review the 10 findings from Phase 1 (State Machines & Lifecycle), produce a concrete fix proposal document with the exact TDD text corrections, and present to the user for approval/rejection of each fix.

## Source Report

`.ai/docs/backend/entity_transfers/tdd-review/phase-1-state-machines-lifecycle.md`

## Findings to Address (10)

| # | Category | Finding | Severity |
|---|----------|---------|----------|
| 1 | Incorrect | Initial status is PENDING_SIGNATURES, not DRAFT | Medium |
| 2 | Incorrect | PENDING_SIGNATURES → SCHEDULED is manual, not automatic | High |
| 3 | Incorrect | Effective date is provided by caller, not auto-calculated | High |
| 4 | Incorrect | Batch limit is 100, not 50 | Low |
| 5 | Incorrect | Step count is 13, not 11 (CopyI9DataStep and UpdateNewContractStatusStep added) | High |
| 6 | Incorrect | Point of No Return is step 11, not step 10 | Medium |
| 7 | Missing | SignatureRole, AgreementType, StepType enums not documented | Low |
| 8 | Missing | Manual PATCH endpoint for status transitions not documented | Medium |
| 9 | Obsolete | DRAFT status described in lifecycle but not used in creation flow | Medium |
| 10 | Obsolete | EffectiveDateService auto-calculation described but deprecated | High |

## Implementation Steps

### Step 1: Read Phase 1 Report

Read the full Phase 1 findings report to understand each finding in detail.

### Step 2: For Each Finding, Draft Fix

For each of the 10 findings, produce:
- **TDD Section**: Which TDD section is affected
- **Current TDD Text**: The exact text that needs changing (quote from findings report)
- **Proposed New Text**: The corrected text reflecting actual implementation
- **Action**: `REPLACE` (swap text), `ADD` (new section/paragraph), or `REMOVE` (delete obsolete text)
- **Rationale**: Brief explanation of why this change is needed

### Step 3: Write Fix Proposal Document

Create `.ai/docs/backend/entity_transfers/tdd-review/fixes/phase-1-fixes.md` with all proposed corrections.

### Step 4: Present to User

Display the fix proposals to the user for approval. The user will accept, reject, or modify each proposed fix.

### Step 5: Record Decisions

Update the fix proposal document with the user's decisions (APPROVED / REJECTED / MODIFIED) for each fix.

## Acceptance Criteria

- Fix proposal document created with all 10 findings addressed
- Each fix has clear before/after text
- User has reviewed and marked each fix as approved/rejected/modified
- Decisions recorded in the fix proposal document

## Output

`.ai/docs/backend/entity_transfers/tdd-review/fixes/phase-1-fixes.md`
