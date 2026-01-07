<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 09-update-create-contract-step.md                    ║
║ TASK: PEOCM-823                                                  ║
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
repo: backend
---

# Update CreateContractStep to resolve public_id → code

## Objective

Update `CreateContractStep` to resolve `newPositionPublicId` to the Prism position code before sending to contract creation. The code should already be cached in context from SanityCheckResourcesExistStep.

## Implementation Steps

### Step 1: Update Zod validation schema

**File**: `backend/services/peo/entity_transfer/steps/create_contract_step.ts`

```typescript
// CHANGE from:
// newJobCode: z.string({ message: 'New job code is required' }),

// TO:
newPositionPublicId: z.string().uuid({ message: 'New position public ID is required' }),
```

### Step 2: Get resolved code from context or lookup

Use the code cached by SanityCheckResourcesExistStep, or lookup if not cached:

```typescript
// Get resolved position code (cached from SanityCheckResourcesExistStep)
let positionCode = context.resolvedPositionCode;

if (!positionCode) {
    // Fallback: lookup position by public_id
    const position = await peoPositionService.getByPublicId(
        context.request.item.newPositionPublicId
    );

    if (!position) {
        throw new Error(`Position not found: ${context.request.item.newPositionPublicId}`);
    }

    if (!position.code) {
        throw new Error(
            `Position ${context.request.item.newPositionPublicId} does not have a Prism code. ` +
            `This should have been caught by SanityCheckResourcesExistStep.`
        );
    }

    positionCode = position.code;
}
```

### Step 3: Update contract creation payload

**Current code** (around lines 238-240):
```typescript
peopleFirstPayload: {
    validatedData: {
        jobCode: context.request.item.newJobCode,
    },
},
```

**Replace with**:
```typescript
peopleFirstPayload: {
    validatedData: {
        jobCode: positionCode,  // Use resolved code, not public_id
    },
},
```

### Step 4: Update contract details

**Current code** (around line 374):
```typescript
jobCode: item.newJobCode,
```

**Replace with**:
```typescript
jobCode: positionCode,  // Use resolved code
```

### Step 5: Add TransferContext type update

**File**: `backend/services/peo/entity_transfer/transfer_context.ts`

Add the resolved code field:

```typescript
export interface TransferContext {
    // ... existing fields
    resolvedPositionCode?: string;  // Cached from SanityCheckResourcesExistStep
}
```

### Step 6: Update any logging/debugging

Update log messages to include both public_id and resolved code:

```typescript
logger.info('Creating contract', {
    positionPublicId: context.request.item.newPositionPublicId,
    resolvedPositionCode: positionCode,
    // ... other fields
});
```

## Acceptance Criteria

- [ ] Zod schema validates `newPositionPublicId` as UUID
- [ ] Step resolves public_id → code before contract creation
- [ ] Prism receives the position code, not the public_id
- [ ] Uses cached code from context when available
- [ ] Falls back to lookup if not cached
- [ ] Clear error if position code is missing
- [ ] TypeScript compiles without errors
- [ ] Unit tests updated and passing

## Testing

```typescript
// Test cases:
// 1. Code cached in context - should use cached value
// 2. Code not cached - should lookup and use
// 3. Position without code - should throw clear error
// 4. Contract creation succeeds with resolved code
```

## Notes

- Prism expects the position CODE (e.g., "SDM"), not the public_id UUID
- SanityCheckResourcesExistStep should always cache the code before this step runs
- The fallback lookup is a safety net, not the expected path
- Log both public_id and resolved code for debugging
