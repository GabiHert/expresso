<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-update-callers-transfer-id.md                      ║
║ TASK: EEXPR-44-2                                                 ║
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
# Repository Context
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: EEXPR-44
protected: false
worktree: /Users/gabriel.herter/Documents/Projects/deel/worktrees/EEXPR-44/backend

# Git Safety Reminder
# Before any git operation, use git -C flag:
#   git -C /Users/gabriel.herter/Documents/Projects/deel/worktrees/EEXPR-44/backend <command>
#   NEVER use cd to change to the worktree directory
---

# Update Callers to Use transferId

## Objective

Update the 3 files that call signature repository methods to pass `transferId` (from the transfer object) instead of `transferItemId` (from the item object).

## Pre-Implementation

Before starting, explore:
- `worktrees/EEXPR-44/backend/services/peo/entity_transfer/entity_transfer_service.ts`
- `worktrees/EEXPR-44/backend/services/peo/entity_transfer/steps/check_signatures_sanity_step.ts`
- `worktrees/EEXPR-44/backend/services/peo/entity_transfer/steps/attach_signed_documents_step.ts`
- Find where these files call the repository signature methods and what they currently pass

**Dependency**: WI-03 (types + repository update) should be completed first.

## Implementation Steps

### Step 1: Update entity_transfer_service.ts

**File**: `worktrees/EEXPR-44/backend/services/peo/entity_transfer/entity_transfer_service.ts`

**Instructions**:
- Find calls to signature repository methods
- Change from passing `item.id` (transferItemId) to `transfer.id` (transferId)
- The transfer object should be available in the calling context

### Step 2: Update check_signatures_sanity_step.ts

**File**: `worktrees/EEXPR-44/backend/services/peo/entity_transfer/steps/check_signatures_sanity_step.ts`

**Instructions**:
- Find calls to signature repository methods
- Change to use `context.request.transfer.id` or equivalent
- Verify the step context has access to the transfer object

### Step 3: Update attach_signed_documents_step.ts

**File**: `worktrees/EEXPR-44/backend/services/peo/entity_transfer/steps/attach_signed_documents_step.ts`

**Instructions**:
- Find calls to signature repository methods
- Change to use `context.request.transfer.id` or equivalent
- Verify the step context has access to the transfer object

### Step 4: Verify no remaining references to transferItemId

**Instructions**:
- Search the entire entity_transfer directory for `transferItemId`
- Ensure no remaining references exist (except possibly in comments explaining the migration)
- Run TypeScript compiler to verify type consistency

## Acceptance Criteria

- All 3 caller files updated to pass `transferId`
- No remaining `transferItemId` references in signature-related code
- TypeScript compiles without errors
- The correct transfer ID is being passed (transfer-level, not item-level)

## Testing

- Verify callers pass correct transfer ID
- Run TypeScript compilation
- Integration test: full transfer flow uses correct IDs

## Notes

- This is the final work item - after this, the entire mock replacement is complete
- The key change is conceptual: signatures belong to a **transfer**, not a transfer **item**
- After completing this, the full chain is: caller → repository → client service → PEO endpoint → PEO service → database
