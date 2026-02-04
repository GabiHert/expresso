<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-44-7-backend-fix-create-response.md             ║
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

# Backend: Fix Create Transfer Response (itemSignatures + Remove Duplicate Signatures)

## Objective

Fix two issues in the `POST /admin/peo/tech_ops/entity_transfer/create` response:

1. **Empty itemSignatures**: Item signatures are created in the DB (Phase 2) but the response is built from the Phase 1 result which has `itemSignatures: []`. The response should include the actual created item signatures.

2. **Duplicate signatures**: The response has `transfer.signatures` AND a top-level `signatures` field with identical data. Remove the top-level duplicate, keeping only `transfer.signatures`.

## Pre-Implementation

Before starting, run an exploration agent on `create_transfer_service.ts` and `types.ts` to confirm current line numbers.

## Implementation Steps

### Step 1: Modify `createItemSignaturesForTransfer()` to return signatures

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`
**Current** (lines ~343-359): Returns `void`, iterates items and creates signatures but discards return values.

**Change**:
- Change return type from `Promise<void>` to `Promise<Map<string, TransferItemSignatureApiResponse[]>>`
- Collect the return value from `createItemSignaturesFromDocuments()` for each item
- Return a `Map<string, TransferItemSignatureApiResponse[]>` keyed by `item.id`

```typescript
private async createItemSignaturesForTransfer(
    result: TransferApiResponse,
    documentRequirementsByContract: Map<string, DocumentRequirementResult[]>,
): Promise<Map<string, TransferItemSignatureApiResponse[]>> {
    const signaturesByItem = new Map<string, TransferItemSignatureApiResponse[]>();
    for (const item of result.items || []) {
        const docReqs = documentRequirementsByContract.get(item.baseContractOid);
        if (docReqs && docReqs.length > 0) {
            const signatures = await this.entityTransferService.createItemSignaturesFromDocuments(
                item.id,
                docReqs,
            );
            signaturesByItem.set(item.id, signatures);
        }
    }
    return signaturesByItem;
}
```

### Step 2: Inject item signatures into result before building response

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts`
**Current** (lines ~131-162): Calls `createItemSignaturesForTransfer()` without using return, then calls `buildSuccessResponse(result, ...)`.

**Change**: Capture the returned map and inject into `result.items`:

```typescript
const signaturesByItem = await this.createItemSignaturesForTransfer(result, documentRequirementsByContract);

// Inject item signatures into result
for (const item of result.items || []) {
    item.itemSignatures = signaturesByItem.get(item.id) ?? [];
}
```

### Step 3: Remove duplicate top-level `signatures` from response

**File**: `services/peo/entity_transfer/types.ts` (lines ~29-51)

Remove the `signatures` field from `CreateTransferSuccess` interface:

```typescript
// BEFORE
export interface CreateTransferSuccess {
    success: true;
    transfer: TransferApiResponse & { ... };
    signatures: SignatureApiResponse[];      // <-- REMOVE THIS
    underwritingRequestIds: string[];
    missingResources: MissingResource[];
}

// AFTER
export interface CreateTransferSuccess {
    success: true;
    transfer: TransferApiResponse & { ... };
    underwritingRequestIds: string[];
    missingResources: MissingResource[];
}
```

### Step 4: Remove `signatures` from `buildSuccessResponse()`

**File**: `services/peo/entity_transfer/services/create_transfer_service.ts` (lines ~377-387)

Remove the `signatures: result.signatures ?? []` line from the return object:

```typescript
// BEFORE
return {
    success: true,
    transfer: { ...result, sourceLegalEntityName, destinationLegalEntityName },
    signatures: result.signatures ?? [],    // <-- REMOVE THIS
    underwritingRequestIds: uwRequestIds,
    missingResources,
};

// AFTER
return {
    success: true,
    transfer: { ...result, sourceLegalEntityName, destinationLegalEntityName },
    underwritingRequestIds: uwRequestIds,
    missingResources,
};
```

### Step 5: Verify types align

Check that `TransferItemSignatureApiResponse` (returned by `createItemSignaturesFromDocuments`) matches the type expected in `TransferItemApiResponse.itemSignatures`. If not, add a mapping step in Step 2.

**File**: `services/peo/entity_transfer/types.ts`
- `TransferItemApiResponse.itemSignatures` type (lines ~155-172)
- `TransferItemSignatureApiResponse` type (lines ~233-242)

## Post-Implementation

After completing, run a code review agent to check for issues. Verify no other code references `response.signatures` (the removed top-level field).

## Acceptance Criteria

- `POST /create` response includes populated `itemSignatures` per item (ARBITRATION_AGREEMENT + WSE_NOTICE)
- `POST /create` response has NO top-level `signatures` field
- Transfer-level signatures accessible ONLY via `transfer.signatures`
- No TypeScript compilation errors
- Existing functionality unaffected

## Testing

1. Deploy to Giger environment
2. Run create transfer E2E test (see `.ai/docs/backend/entity_transfers/e2e-testing-guide.md`)
3. Verify response includes `itemSignatures` with agreement types
4. Verify no top-level `signatures` in response
5. Verify `transfer.signatures` still contains ADMIN + EMPLOYEE entries

## Notes

- `createItemSignaturesFromDocuments()` in `entity_transfer_service.ts` already returns `PeoEmployeeTransferItemSignature[]` — the data is available, just not captured by the caller.
- The top-level `signatures` field is only consumed by the `/admin/peo/tech_ops/entity_transfer/create` endpoint — no other backend services reference it.
- Two hardcoded document templates are always created: Arbitration Agreement and WSE Notice of PEO Relationship.
