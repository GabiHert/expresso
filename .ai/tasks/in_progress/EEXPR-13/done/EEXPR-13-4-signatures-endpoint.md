<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-4-signatures-endpoint.md                     ║
║ TASK: EEXPR-13                                                   ║
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
# Repository Context (EEXPR-13)
repo: peo
repo_path: /Users/gabriel.herter/Documents/Projects/deel/peo
branch: EEXPR-13-entity-transfer-post
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/peo
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Signatures Creation Endpoint

## Objective

Create a new endpoint in PEO to create signature records for an entity transfer.

**Endpoint**: `POST /peo/entity-transfer/transfers/:id/signatures`

## Pre-Implementation

Before starting, explore:
- `peo/src/controllers/entityTransfer/entityTransferController.ts` - Existing controller
- `peo/src/services/entityTransfer/entityTransferService.ts` - Existing service
- `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts` - Signature model

## Implementation Steps

### Step 1: Define the DTO

**File**: `peo/src/controllers/entityTransfer/entityTransferDto.ts`

Add new schema:

```typescript
export const CreateSignaturesSchema = z.object({
  signatures: z.array(z.object({
    profilePublicId: z.string().uuid(),
    role: z.enum(['ADMIN', 'EMPLOYEE']),
    agreementType: z.enum([
      'ARBITRATION_AGREEMENT',
      'WSE_NOTICE_OF_PEO_RELATIONSHIP',
      'ENTITY_ASSIGNMENT_AGREEMENT'
    ]),
    agreementId: z.string().uuid().optional().nullable(),
  })),
});
```

### Step 2: Add service method

**File**: `peo/src/services/entityTransfer/entityTransferService.ts`

Add method:

```typescript
async createSignatures(
  transferId: string,
  signatures: Array<{
    profilePublicId: string;
    role: 'ADMIN' | 'EMPLOYEE';
    agreementType: string;
    agreementId?: string | null;
  }>,
  transaction?: Transaction
): Promise<PeoEmployeeTransferSignature[]> {
  // 1. Verify transfer exists
  const transfer = await this.getTransferById(transferId, false, transaction);
  if (!transfer) {
    throw new Error(`Transfer not found: ${transferId}`);
  }

  // 2. Create signature records
  const createdSignatures = await PeoEmployeeTransferSignature.bulkCreate(
    signatures.map(sig => ({
      id: uuidv4(),
      organizationId: transfer.organizationId,
      transferId,
      profilePublicId: sig.profilePublicId,
      role: sig.role,
      agreementType: sig.agreementType,
      agreementId: sig.agreementId || null,
      signedAt: null,
    })),
    { transaction }
  );

  return createdSignatures;
}
```

### Step 3: Add controller endpoint

**File**: `peo/src/controllers/entityTransfer/entityTransferController.ts`

Add new endpoint:

```typescript
@Post('/transfers/:id/signatures')
async createSignatures(
  @Param('id') transferId: string,
  @Body() body: unknown
) {
  const validation = CreateSignaturesSchema.safeParse(body);
  if (!validation.success) {
    throw new HttpError(StatusCodes.BAD_REQUEST, `Validation error: ${validation.error.message}`);
  }

  log.info({ message: 'Creating transfer signatures', transferId, count: validation.data.signatures.length });

  const signatures = await this.entityTransferService.createSignatures(
    transferId,
    validation.data.signatures
  );

  return {
    success: true,
    data: signatures.map(sig => ({
      id: sig.id,
      profilePublicId: sig.profilePublicId,
      role: sig.role,
      agreementType: sig.agreementType,
      signedAt: sig.signedAt,
    })),
  };
}
```

### Step 4: Handle unique constraint

The signatures table has a unique constraint on `(transfer_id, profile_public_id, agreement_type)`.

Add error handling for duplicate signatures:

```typescript
try {
  // bulkCreate logic
} catch (error) {
  if (error.name === 'SequelizeUniqueConstraintError') {
    throw new HttpError(StatusCodes.CONFLICT, 'Duplicate signature already exists');
  }
  throw error;
}
```

### Step 5: Add imports

Ensure all necessary imports are added:
- `PeoEmployeeTransferSignature` model
- `uuidv4` from uuid
- `CreateSignaturesSchema` in controller

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Endpoint accepts POST request with signatures array
- [ ] Creates signature records with correct organization_id from transfer
- [ ] Returns created signature records
- [ ] Validates UUID format for profilePublicId
- [ ] Validates role enum (ADMIN, EMPLOYEE)
- [ ] Validates agreementType enum
- [ ] Handles duplicate signature error gracefully
- [ ] Verifies transfer exists before creating signatures

## Testing

1. Create signatures for valid transfer
2. Attempt to create signatures for non-existent transfer (404)
3. Attempt to create duplicate signatures (409)
4. Validation errors (invalid UUID, invalid role, etc.)

## Notes

- The endpoint path follows REST conventions: `/transfers/:id/signatures`
- Agreement type `ENTITY_ASSIGNMENT_AGREEMENT` is used for entity transfers
- `signedAt` is always NULL when creating - updated when employee signs
- Unique constraint: same person can sign multiple agreement types, but not the same type twice
