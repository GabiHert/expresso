<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 07-update-force-complete-underwriting-step.md        ║
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

# Update ForceCompleteUnderwritingStep for public_id

## Objective

Update `ForceCompleteUnderwritingStep` to use `newPositionPublicId` and lookup position title for creating/completing underwriting requests.

## Implementation Steps

### Step 1: Update Zod validation schema

**File**: `backend/services/peo/entity_transfer/steps/force_complete_underwriting_step.ts`

```typescript
// CHANGE from:
// newJobCode: z.string({ message: 'newJobCode is required' }),

// TO:
newPositionPublicId: z.string().uuid({ message: 'newPositionPublicId is required' }),
```

### Step 2: Add position lookup

Add logic to lookup position details from public_id:

```typescript
// Get position details for UW request
const position = await this.getPositionByPublicId(context.request.item.newPositionPublicId);

if (!position) {
    throw new Error(`Position not found: ${context.request.item.newPositionPublicId}`);
}

// Use position.title for UW request
const uwRequest = {
    resource: 'POSITION',
    description: position.title,  // Use title, not code
    externalEntityId: destinationLegalEntityId,
};
```

### Step 3: Update UW request creation/completion

If the step creates UW requests, ensure it uses position title:

```typescript
// When creating or finding UW request, match by title
const existingRequest = await this.findUnderwritingRequest({
    resource: 'POSITION',
    description: position.title,
    externalEntityId: destinationLegalEntityId,
});

if (!existingRequest) {
    // Create new UW request with position title
    await this.createUnderwritingRequest({
        resource: 'POSITION',
        description: position.title,
        externalEntityId: destinationLegalEntityId,
    });
}
```

### Step 4: Update references to newJobCode

Search and replace within the file:
- `newJobCode` → `newPositionPublicId`
- `context.request.item.newJobCode` → `context.request.item.newPositionPublicId`

### Step 5: Cache position data in context

To avoid repeated lookups, consider storing position data in the transfer context:

```typescript
// In step execute():
if (!context.positionData) {
    context.positionData = await this.getPositionByPublicId(
        context.request.item.newPositionPublicId
    );
}

// Use cached data
const positionTitle = context.positionData.title;
```

## Acceptance Criteria

- [ ] Zod schema validates `newPositionPublicId` as UUID
- [ ] Step looks up position by public_id
- [ ] Step uses position title for UW request operations
- [ ] UW requests are created/matched correctly
- [ ] TypeScript compiles without errors
- [ ] Unit tests updated and passing

## Testing

```typescript
// Test cases:
// 1. Position in UW - force complete should succeed
// 2. Position already approved - should skip gracefully
// 3. Invalid public_id - should throw error
// 4. UW request doesn't exist - should create one
```

## Notes

- Force complete is async - step halts and waits for resources
- Position title must match exactly with UW request description
- Consider PrismHR's 30-char description limit (truncation)
