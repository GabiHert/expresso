<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 08-update-sanity-check-resources-step.md             ║
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

# Update SanityCheckResourcesExist for public_id

## Objective

Update `SanityCheckResourcesExistStep` to verify position has a Prism code by looking up the position by `public_id` and checking that `code` is NOT NULL.

## Context

This is the **LAST safety check before the point of no return** (CrossHireStep). It verifies that the position exists in PrismHR and has a valid code, especially important after ForceCompleteUnderwriting.

## Implementation Steps

### Step 1: Update Zod validation schema

**File**: `backend/services/peo/entity_transfer/steps/sanity_check_resources_exist_step.ts`

```typescript
// CHANGE from:
// newJobCode: z.string({ message: 'newJobCode is required' }),

// TO:
newPositionPublicId: z.string().uuid({ message: 'newPositionPublicId is required' }),
```

### Step 2: Update checkResourcesExist method

**Current code** (lines 160-186):
```typescript
private async checkResourcesExist(workLocationId: string, jobCode: string): Promise<ResourceVerificationResult> {
    const workLocation = await peoWorkLocationService.getPEOWorkLocationByEntityWorkLocationId(workLocationId);
    const positions = (await peoPositionService.getByFilters({jobCode})) as Array<{id: number; code: string; title: string}>;

    const positionReady = Array.isArray(positions) && positions.length > 0;
    // ...
}
```

**Replace with**:
```typescript
private async checkResourcesExist(workLocationId: string, positionPublicId: string): Promise<ResourceVerificationResult> {
    const workLocation = await peoWorkLocationService.getPEOWorkLocationByEntityWorkLocationId(workLocationId);

    // Lookup position by public_id instead of code
    const position = await peoPositionService.getByPublicId(positionPublicId);

    const workLocationReady = workLocation !== null;
    // Position is ready only if it exists AND has a Prism code
    const positionReady = position !== null && position.code !== null;

    const missingResources: string[] = [];

    if (!workLocationReady) {
        missingResources.push(`Work Location (id: ${workLocationId})`);
    }

    if (!position) {
        missingResources.push(`Position (publicId: ${positionPublicId}) - not found`);
    } else if (!position.code) {
        missingResources.push(`Position (publicId: ${positionPublicId}, title: ${position.title}) - awaiting Prism code (still in underwriting)`);
    }

    return {
        workLocationReady,
        positionReady,
        missingResources,
        // Store resolved code for later steps
        resolvedPositionCode: position?.code ?? null,
    };
}
```

### Step 3: Update method caller

Update where `checkResourcesExist` is called:

```typescript
// CHANGE from:
// const result = await this.checkResourcesExist(workLocationId, item.newJobCode);

// TO:
const result = await this.checkResourcesExist(workLocationId, item.newPositionPublicId);
```

### Step 4: Store resolved code in context

Store the resolved Prism code for use in CreateContractStep:

```typescript
// After verification succeeds, store the code
if (result.positionReady && result.resolvedPositionCode) {
    context.resolvedPositionCode = result.resolvedPositionCode;
}
```

### Step 5: Update error messages

Ensure error messages reference `positionPublicId` not `jobCode`:

```typescript
if (!result.positionReady) {
    throw new EntityTransferError(
        `Position not ready for transfer. Public ID: ${item.newPositionPublicId}. ` +
        `Missing resources: ${result.missingResources.join(', ')}`
    );
}
```

## Acceptance Criteria

- [ ] Zod schema validates `newPositionPublicId` as UUID
- [ ] Step looks up position by public_id
- [ ] Step verifies position has Prism code (code is NOT NULL)
- [ ] Clear error messages for: position not found, position in UW
- [ ] Resolved code stored in context for CreateContractStep
- [ ] TypeScript compiles without errors
- [ ] Unit tests updated and passing

## Testing

```typescript
// Test cases:
// 1. Position with code - should pass
// 2. Position without code (in UW) - should fail with clear message
// 3. Position not found - should fail
// 4. Work location not found - should fail
// 5. Both missing - should report both
```

## Notes

- This is a CRITICAL safety check before point of no return
- Must verify position.code is NOT NULL, not just that position exists
- Store resolved code to avoid another lookup in CreateContractStep
- Clear error messages help debugging failed transfers
