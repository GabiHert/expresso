<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-update-types-replace-mocks.md                      ║
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

# Update Types and Replace Repository Mocks

## Objective

1. Update the interface in `types.ts` to use `transferId` instead of `transferItemId`
2. Replace the 4 mock implementations in `entity_transfer_repository.ts` with calls to the client service from WI-02

## Pre-Implementation

Before starting, explore:
- `worktrees/EEXPR-44/backend/services/peo/entity_transfer/types.ts` - Current interface definitions
- `worktrees/EEXPR-44/backend/services/peo/entity_transfer/repositories/entity_transfer_repository.ts` - Mock methods to replace

**Dependencies**: WI-01 and WI-02 (endpoints + client service) should be completed first.

## Implementation Steps

### Step 1: Update types.ts interface

**File**: `worktrees/EEXPR-44/backend/services/peo/entity_transfer/types.ts`

**Instructions**:
- Find the signature-related interface/type
- Change `transferItemId` to `transferId` everywhere
- Update any related type definitions

### Step 2: Replace createTransferItemSignatures mock

**File**: `worktrees/EEXPR-44/backend/services/peo/entity_transfer/repositories/entity_transfer_repository.ts`

**Instructions**:
- Remove the mock implementation that returns hardcoded PENDING signatures
- Replace with call to `clientService.createTransferSignatures(transferId, ...)`
- Update method signature from `transferItemId` to `transferId`

### Step 3: Replace getTransferItemSignatures mock

**Instructions**:
- Remove the mock that returns 2 hardcoded SIGNED signatures
- Replace with call to `clientService.getTransferSignatures(transferId)`
- Update method signature from `transferItemId` to `transferId`

### Step 4: Replace getSignedTransferItemSignatures mock

**Instructions**:
- Remove the mock filter logic
- Replace with call to `clientService.getSignedTransferSignatures(transferId)`
- Update method signature from `transferItemId` to `transferId`

### Step 5: Replace updateTransferItemSignatureStatus mock

**Instructions**:
- Remove the log-only implementation
- Replace with call to `clientService.markSignatureSigned(agreementId)`

### Step 6: Inject client service dependency

**Instructions**:
- Ensure the repository has access to the client service
- Follow existing dependency injection patterns in the repository
- The client service from WI-02 must be importable/injectable

## Acceptance Criteria

- All 4 mock methods replaced with real client service calls
- No hardcoded/mock signature data remains
- `transferItemId` fully replaced with `transferId` in types and repository
- Client service properly injected into repository
- TypeScript compiles without errors

## Testing

- Verify no mock data is returned
- Unit test repository methods with mocked client service
- Verify type changes compile cleanly

## Notes

- This is the core work item - the "replace mocks" part of the task name
- After this, WI-04 will update the callers to pass `transferId` instead of `transferItemId`
- Be careful with the method names: they might stay as `createTransferItemSignatures` or be renamed - follow the existing naming convention
