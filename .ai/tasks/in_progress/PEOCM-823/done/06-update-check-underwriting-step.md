<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 06-update-check-underwriting-step.md                 ║
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

# Update CheckUnderwritingStep for public_id

## Objective

Update `CheckUnderwritingRequestStatusStep` to use `newPositionPublicId` and check if the position needs underwriting approval by looking up whether the position has a Prism code.

## Implementation Steps

### Step 1: Update Zod validation schema

**File**: `backend/services/peo/entity_transfer/steps/check_underwriting_request_status_step.ts`

```typescript
// CHANGE from:
// newJobCode: z.string({ message: 'newJobCode is required' }),

// TO:
newPositionPublicId: z.string().uuid({ message: 'newPositionPublicId is required' }),
```

### Step 2: Add position lookup logic

The step needs to lookup the position by `public_id` to:
1. Get the position `title` (for UW request matching)
2. Check if `code` is NULL (indicates position needs UW approval)

Add a helper method or update existing logic:

```typescript
private async getPositionByPublicId(publicId: string): Promise<{
    publicId: string;
    code: string | null;
    title: string;
} | null> {
    // Call PEO service to get position by public_id
    const position = await peoPositionService.getByPublicId(publicId);
    return position;
}

private async checkPositionNeedsUnderwriting(publicId: string): Promise<boolean> {
    const position = await this.getPositionByPublicId(publicId);
    if (!position) {
        throw new Error(`Position not found: ${publicId}`);
    }
    // Position needs UW if code is NULL
    return position.code === null;
}
```

### Step 3: Update underwriting check logic

Update the step to use position title for UW request matching:

```typescript
// Get position details
const position = await this.getPositionByPublicId(context.request.item.newPositionPublicId);

// Use position.title for UW request matching (not the code)
const uwRequests = await this.getUnderwritingRequests({
    externalEntityId: destinationLegalEntityId,
    resource: 'POSITION',
    description: position.title,  // Match by title, not code
});
```

### Step 4: Update any references to newJobCode

Search and replace within the file:
- `newJobCode` → `newPositionPublicId`
- `context.request.item.newJobCode` → `context.request.item.newPositionPublicId`

### Step 5: Add PEO position service method (if needed)

If `peoPositionService.getByPublicId()` doesn't exist, add it:

**File**: `backend/services/peo/peo_position_service.ts`

```typescript
async getByPublicId(publicId: string): Promise<Position | null> {
    const response = await this.client.get(`/positions/${publicId}`);
    return response.data;
}
```

## Acceptance Criteria

- [ ] Zod schema validates `newPositionPublicId` as UUID
- [ ] Step looks up position by public_id
- [ ] Step uses position title for UW request matching
- [ ] Step correctly identifies positions needing UW (code is NULL)
- [ ] TypeScript compiles without errors
- [ ] Unit tests updated and passing

## Testing

```typescript
// Test cases:
// 1. Position with code (already approved) - should not need UW
// 2. Position without code (in UW) - should need UW
// 3. Invalid public_id - should throw error
```

## Notes

- May need to add a new PEO endpoint to get position by public_id
- The UW check compares position title against `prism_resource_requests.description`
- Consider caching position data in TransferContext to avoid repeated lookups
