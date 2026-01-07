<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 05-update-backend-types-validation.md                ║
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

# Update backend types and validation

## Objective

Update the backend type definitions and Joi validation to use `newPositionPublicId` (UUID) instead of `newJobCode` (string).

## Implementation Steps

### Step 1: Update types.ts

**File**: `backend/services/peo/entity_transfer/types.ts`

Update `PeoEmployeeTransferItem` interface:

```typescript
export interface PeoEmployeeTransferItem {
    id: string;
    transferId: string;
    basePeoContractOid: string;
    newBenefitGroupId: string;
    newPayrollSettingsId: string;
    newPtoPolicyId: string;
    newWorkLocationId: string;
    newPositionPublicId: string;  // Changed from newJobCode
    newTeamId?: number;
    status: TransferItemStatus;
    newContractOid?: string;
    resumeFromStep?: string;
    createdAt: Date;
    updatedAt: Date;
}
```

Update any other interfaces that reference `newJobCode`.

### Step 2: Update tech_ops.ts Joi validation

**File**: `backend/controllers/admin/peo/tech_ops.ts`

Find the entity transfer endpoint validation (around line 329):

```typescript
// CHANGE from:
// newJobCode: joi.string().min(1).max(64),

// TO:
newPositionPublicId: joi.string().uuid().required(),
```

Update both full payload and resume mode validation schemas.

### Step 3: Update request transformation

**File**: `backend/controllers/admin/peo/tech_ops.ts`

Update the code that transforms the request payload:

```typescript
// CHANGE from:
// newJobCode: body.newJobCode,

// TO:
newPositionPublicId: body.newPositionPublicId,
```

### Step 4: Update response mapping

**File**: `backend/controllers/admin/peo/tech_ops.ts`

Update the response to return `newPositionPublicId`:

```typescript
const response = {
    success: result.success,
    transferId,
    itemId,
    status: result.status,
    completedSteps: result.completedSteps,
    crossHireCompleted: result.crossHireCompleted,
    workLocationId: transferItem.newWorkLocationId,
    positionPublicId: transferItem.newPositionPublicId,  // Changed from jobCode
    // ... more fields
};
```

### Step 5: Update TransferContext

**File**: `backend/services/peo/entity_transfer/transfer_context.ts`

If `TransferContext` stores `newJobCode`, update it:

```typescript
// Update any references to newJobCode → newPositionPublicId
```

### Step 6: Update Zod validation schemas in steps

Search for Zod schemas that validate `newJobCode`:

```bash
grep -r "newJobCode" backend/services/peo/entity_transfer/steps/ --include="*.ts"
```

Update each to use `newPositionPublicId`:

```typescript
// CHANGE from:
// newJobCode: z.string({ message: 'New job code is required' }),

// TO:
newPositionPublicId: z.string().uuid({ message: 'New position public ID is required' }),
```

## Acceptance Criteria

- [ ] `PeoEmployeeTransferItem` interface uses `newPositionPublicId`
- [ ] Tech ops endpoint accepts `newPositionPublicId` (UUID)
- [ ] Joi validation updated for UUID format
- [ ] Request/response transformation updated
- [ ] TransferContext updated if applicable
- [ ] Zod schemas in steps updated
- [ ] TypeScript compiles without errors

## Testing

```bash
# Run TypeScript compilation
cd backend && npx tsc --noEmit

# Run tests
cd backend && npm test -- --grep "entity_transfer"

# Test API with new field
curl -X POST /admin/peo/tech_ops/entity_transfer \
  -H "Content-Type: application/json" \
  -d '{
    "newPositionPublicId": "550e8400-e29b-41d4-a716-446655440000",
    ...
  }'
```

## Notes

- This work item can be done in parallel with PEO changes
- All entity transfer steps will need updating (work items 06-09)
- Coordinate with frontend team for API change
