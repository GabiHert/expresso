<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-update-transfer-resources-public-id.md            ║
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

# Update transfer_resources to return public_id

## Objective

Change the `getJobCodes()` method in `TransferResourcesService` to return `public_id` as the identifier instead of `code`, and remove the filter that excludes positions without a Prism code.

## Implementation Steps

### Step 1: Update getJobCodes() method

**File**: `backend/services/peo/entity_transfer/services/transfer_resources_service.ts`
**Lines**: 210-223

**Current code**:
```typescript
private async getJobCodes(legalEntityPublicId: string): Promise<ResourceOption[]> {
    const positions = await peoPositionService.getByFilters({
        deelLegalEntityPublicIds: [legalEntityPublicId],
    });

    if (!positions || !Array.isArray(positions)) {
        return [];
    }

    return positions
        .filter((pos) => pos.code)  // ❌ Filters out UW positions
        .map((pos) => ({
            id: pos.code,           // ❌ Uses code (null during UW)
            label: pos.title,
        }));
}
```

**Replace with**:
```typescript
private async getJobCodes(legalEntityPublicId: string): Promise<ResourceOption[]> {
    const positions = await peoPositionService.getByFilters({
        deelLegalEntityPublicIds: [legalEntityPublicId],
    });

    if (!positions || !Array.isArray(positions)) {
        return [];
    }

    return positions
        .filter((pos) => pos.publicId && pos.title)  // ✅ Only need publicId and title
        .map((pos) => ({
            id: pos.publicId,                         // ✅ Use public_id (always available)
            label: pos.title,
        }));
}
```

### Step 2: Verify PEO positions endpoint returns public_id

Check that the PEO service positions endpoint returns `publicId` field. If not, this may need to be added to the PEO service first.

**File to check**: `peo/src/controllers/peoPosition/PeoPositionController.ts`

### Step 3: Update any TypeScript types if needed

If `ResourceOption` or related types constrain the `id` field format, update them to accept UUIDs.

**File**: `backend/services/peo/entity_transfer/types.ts`

## Acceptance Criteria

- [ ] `getJobCodes()` returns `{id: public_id, label: title}` for all positions
- [ ] Positions without Prism code (in UW) are included in the response
- [ ] All returned positions have valid UUID `id` and non-empty `label`
- [ ] TypeScript compiles without errors

## Testing

```bash
# Call the transfer_resources endpoint for a legal entity with positions in UW
# Verify positions without Prism code are now included
# Verify id field contains UUID (public_id) not code
```

## Notes

- This change is independent of the database migration
- Can be deployed before or after PEO changes, but frontend must be updated to send UUID
- The `publicId` field should already exist in the PEO response - verify this
