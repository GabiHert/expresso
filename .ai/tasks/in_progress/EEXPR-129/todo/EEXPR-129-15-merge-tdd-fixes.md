<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-129-15-merge-tdd-fixes.md                      ║
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

# Dependencies
blocked_by: EEXPR-129-8, EEXPR-129-9, EEXPR-129-10, EEXPR-129-11, EEXPR-129-12, EEXPR-129-13, EEXPR-129-14
---

# Merge All Approved Fixes into TDD Document

## Objective

Take all approved fixes from phases 1-7 fix proposals and apply them to the TDD document, producing a fully updated and accurate version.

## Pre-Conditions

All fix proposal work items (EEXPR-129-8 through EEXPR-129-14) must be complete with user decisions recorded.

## Implementation Steps

### Step 1: Collect Approved Fixes

Read all 7 fix proposal documents:
- `.ai/docs/backend/entity_transfers/tdd-review/fixes/phase-1-fixes.md`
- `.ai/docs/backend/entity_transfers/tdd-review/fixes/phase-2-fixes.md`
- `.ai/docs/backend/entity_transfers/tdd-review/fixes/phase-3-fixes.md`
- `.ai/docs/backend/entity_transfers/tdd-review/fixes/phase-4-fixes.md`
- `.ai/docs/backend/entity_transfers/tdd-review/fixes/phase-5-fixes.md`
- `.ai/docs/backend/entity_transfers/tdd-review/fixes/phase-6-fixes.md`
- `.ai/docs/backend/entity_transfers/tdd-review/fixes/phase-7-fixes.md`

Extract only fixes marked as APPROVED or MODIFIED (skip REJECTED).

### Step 2: Organize by TDD Section

Group all approved fixes by their target TDD section to avoid conflicting edits and ensure coherent text flow.

### Step 3: Apply Fixes to TDD

Apply all approved corrections to produce the updated TDD document. For each fix:
- REPLACE: Swap old text with new text
- ADD: Insert new section/paragraph at specified location
- REMOVE: Delete obsolete text

### Step 4: Consistency Pass

Review the full updated TDD for:
- Internal consistency (no contradicting sections)
- Correct cross-references between sections
- Accurate step numbering throughout
- Consistent terminology

### Step 5: Write Updated TDD

Save the final updated TDD to `.ai/docs/backend/entity_transfers/entity-transfer-tdd-v2.md`

### Step 6: Create Change Summary

Create a summary document listing all changes applied:
- Total fixes applied vs rejected
- Sections with most changes
- Any remaining known gaps or future work items

## Acceptance Criteria

- All APPROVED fixes from phases 1-7 are applied to the TDD
- No REJECTED fixes are included
- MODIFIED fixes use the user's revised text
- TDD is internally consistent after all changes
- Change summary document created
- User has reviewed the final TDD

## Output

- `.ai/docs/backend/entity_transfers/entity-transfer-tdd-v2.md` (updated TDD)
- `.ai/docs/backend/entity_transfers/tdd-review/fixes/merge-summary.md` (change log)
