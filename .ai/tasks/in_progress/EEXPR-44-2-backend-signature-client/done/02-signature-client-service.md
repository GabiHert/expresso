<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-signature-client-service.md                        ║
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

# Add Signature Client Service Methods

## Objective

Add HTTP client methods to the entity transfer client service that call the PEO signature endpoints defined in WI-01.

## Pre-Implementation

Before starting, explore:
- `worktrees/EEXPR-44/backend/services/peo/entity_transfer/services/entity_transfer_client_service.ts` - Existing client patterns
- How HTTP calls to PEO are made (axios, fetch, internal HTTP client?)
- How responses are typed and mapped
- How errors from PEO are handled

**Dependency**: WI-01 (endpoint definitions) should be completed first.

## Implementation Steps

### Step 1: Add createTransferSignatures client method

**File**: `worktrees/EEXPR-44/backend/services/peo/entity_transfer/services/entity_transfer_client_service.ts`

**Instructions**:
```typescript
async createTransferSignatures(
  transferId: string,
  signatures: Array<{
    profilePublicId: number;
    role: string;
    agreementType: string;
    agreementId: string;
    organizationId: number;
  }>
): Promise<TransferItemSignature[]>
```
- POST to `endpoints.createTransferSignatures(transferId)`
- Send signatures array as request body
- Map PEO response to backend's `TransferItemSignature` type

### Step 2: Add getTransferSignatures client method

**Instructions**:
```typescript
async getTransferSignatures(transferId: string): Promise<TransferItemSignature[]>
```
- GET from `endpoints.getTransferSignatures(transferId)`
- Map `signed_at` to status (null → PENDING, not null → SIGNED)

### Step 3: Add getSignedTransferSignatures client method

**Instructions**:
```typescript
async getSignedTransferSignatures(transferId: string): Promise<TransferItemSignature[]>
```
- GET from `endpoints.getSignedTransferSignatures(transferId)`

### Step 4: Add markSignatureSigned client method

**Instructions**:
```typescript
async markSignatureSigned(agreementId: string): Promise<void>
```
- PATCH to `endpoints.markSignatureSigned(agreementId)`

### Step 5: Add areAllSignaturesComplete client method

**Instructions**:
```typescript
async areAllSignaturesComplete(transferId: string): Promise<boolean>
```
- GET from `endpoints.areAllSignaturesComplete(transferId)`
- Return the `complete` boolean from response

## Acceptance Criteria

- All 5 client methods implemented
- Response mapping from PEO format to backend types
- Error handling consistent with existing client patterns
- Status derivation: `signed_at IS NULL` → PENDING, `signed_at IS NOT NULL` → SIGNED

## Testing

- Unit test each method with mocked HTTP responses
- Test response mapping (PEO format → backend format)
- Test error handling for failed PEO calls

## Notes

- Key mapping: PEO returns `signed_at` (date or null), backend expects `status` (PENDING/SIGNED)
- Check how existing client methods handle auth headers for PEO calls
- Ensure proper error propagation (PEO errors should surface meaningful messages)
