<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 10-update-entity-transfer-client-service.md          ║
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

# Update EntityTransferClientService for public_id

## Objective

Update `EntityTransferClientService` to send `newPositionPublicId` instead of `newJobCode` when creating transfers in the PEO service.

## Implementation Steps

### Step 1: Update service method parameters

**File**: `backend/services/peo/entity_transfer/services/entity_transfer_client_service.ts`

Update the interface/type for creating transfers:

```typescript
interface CreateTransferItemPayload {
    baseContractOid: string;
    newBenefitPrismGroupId: string;
    newEmploymentPayrollSettingId: string;
    newPtoPolicyId: string;
    newWorkLocationId: string;
    newPositionPublicId: string;  // Changed from newJobCode
    newTeamId?: number;
}
```

### Step 2: Update HTTP request payload

Update the method that sends the create transfer request to PEO:

```typescript
async createTransfer(payload: CreateTransferPayload): Promise<TransferResponse> {
    const items = payload.items.map(item => ({
        baseContractOid: item.baseContractOid,
        newBenefitPrismGroupId: item.newBenefitPrismGroupId,
        newEmploymentPayrollSettingId: item.newEmploymentPayrollSettingId,
        newPtoPolicyId: item.newPtoPolicyId,
        newWorkLocationId: item.newWorkLocationId,
        newPositionPublicId: item.newPositionPublicId,  // Changed from newJobCode
        newTeamId: item.newTeamId,
    }));

    const response = await this.client.post('/entity-transfer/transfers', {
        ...payload,
        items,
    });

    return response.data;
}
```

### Step 3: Update any response mapping

If the service maps PEO responses back to backend types:

```typescript
// Map PEO response to backend type
const mappedItem: PeoEmployeeTransferItem = {
    // ... other fields
    newPositionPublicId: peoItem.newPositionPublicId,  // Changed from newJobCode
};
```

### Step 4: Update repository if applicable

**File**: `backend/services/peo/entity_transfer/repositories/entity_transfer_repository.ts`

If the repository layer handles field mapping:

```typescript
// Update any field mapping
// newJobCode → newPositionPublicId
```

### Step 5: Search for any remaining references

```bash
# Find any remaining references to newJobCode in entity transfer files
grep -r "newJobCode" backend/services/peo/entity_transfer/ --include="*.ts"
```

Update all remaining references.

## Acceptance Criteria

- [ ] CreateTransferItemPayload uses `newPositionPublicId`
- [ ] HTTP requests to PEO send `newPositionPublicId`
- [ ] Response mapping uses `newPositionPublicId`
- [ ] No remaining references to `newJobCode` in entity transfer code
- [ ] TypeScript compiles without errors
- [ ] Integration with PEO service works correctly

## Testing

```bash
# Test creating a transfer with the new field
curl -X POST /admin/peo/tech_ops/entity_transfer \
  -H "Content-Type: application/json" \
  -d '{
    "newPositionPublicId": "550e8400-e29b-41d4-a716-446655440000",
    ...
  }'

# Verify PEO receives the correct field name
# Check PEO service logs for incoming request
```

## Notes

- This is the final work item for backend changes
- Depends on PEO changes being deployed first (work items 02-04)
- Coordinate deployment: PEO first, then backend
- Consider feature flag if gradual rollout is needed
