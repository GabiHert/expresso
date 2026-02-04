<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-signature-endpoint-definitions.md                  ║
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

# Add PEO Signature Endpoint Definitions

## Objective

Add endpoint URL definitions for the 5 PEO signature endpoints so the backend client service can call them.

## Pre-Implementation

Before starting, explore:
- `worktrees/EEXPR-44/backend/services/peo/entity_transfer/entity_transfer_endpoints.ts` - Existing endpoint patterns

## Implementation Steps

### Step 1: Add endpoint definitions

**File**: `worktrees/EEXPR-44/backend/services/peo/entity_transfer/entity_transfer_endpoints.ts`

**Instructions**:
Add 5 endpoint definitions following the existing pattern:

```typescript
createTransferSignatures: (transferId: string) =>
  `/peo/entity-transfer/transfers/${transferId}/signatures`,

getTransferSignatures: (transferId: string) =>
  `/peo/entity-transfer/transfers/${transferId}/signatures`,

getSignedTransferSignatures: (transferId: string) =>
  `/peo/entity-transfer/transfers/${transferId}/signatures/signed`,

markSignatureSigned: (agreementId: string) =>
  `/peo/entity-transfer/signatures/${agreementId}/sign`,

areAllSignaturesComplete: (transferId: string) =>
  `/peo/entity-transfer/transfers/${transferId}/signatures/complete`,
```

## Acceptance Criteria

- All 5 endpoint definitions added
- URL patterns match the PEO controller routes from EEXPR-44-1
- Follow existing naming and structure conventions in the file

## Testing

- Verify endpoint functions return correct URL strings
- Verify URLs match PEO controller routes

## Notes

- These endpoints must match exactly what was implemented in EEXPR-44-1 (PEO controller)
- The URL prefix `/peo/entity-transfer/` should match the PEO service's route configuration
