<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-signature-dtos.md                                  ║
║ TASK: EEXPR-44-1                                                 ║
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
repo: peo
repo_path: /Users/gabriel.herter/Documents/Projects/deel/peo
branch: EEXPR-44
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/peo
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Add Signature DTOs

## Objective

Add Zod validation schemas for the signature endpoints' request and response payloads.

## Pre-Implementation

Before starting, explore:
- `peo/src/controllers/entityTransfer/entityTransferDto.ts` - Existing DTO patterns
- How Zod schemas are structured and used in existing DTOs
- Enum types for `role` and `agreement_type`

## Implementation Steps

### Step 1: Add CreateTransferSignaturesDto

**File**: `peo/src/controllers/entityTransfer/entityTransferDto.ts`

**Instructions**:
```typescript
// Request body for POST /transfers/:transferId/signatures
const CreateTransferSignaturesDto = z.object({
  signatures: z.array(z.object({
    profilePublicId: z.number().int(),
    role: z.enum(['ADMIN', 'EMPLOYEE']),
    agreementType: z.enum([
      'ARBITRATION_AGREEMENT',
      'WSE_NOTICE_OF_PEO_RELATIONSHIP',
      'ENTITY_ASSIGNMENT_AGREEMENT'
    ]),
    agreementId: z.string().uuid(),
    organizationId: z.number().int(),
  })),
});
```

### Step 2: Add TransferIdParamDto

**Instructions**:
```typescript
// Path param validation
const TransferIdParamDto = z.object({
  transferId: z.string().uuid(),
});
```

### Step 3: Add AgreementIdParamDto

**Instructions**:
```typescript
// Path param for sign endpoint
const AgreementIdParamDto = z.object({
  agreementId: z.string().uuid(),
});
```

### Step 4: Add SignatureResponseDto (optional)

**Instructions**:
If the existing patterns include response DTOs, add:
```typescript
const SignatureResponseDto = z.object({
  id: z.string().uuid(),
  transferId: z.string().uuid(),
  profilePublicId: z.number(),
  role: z.enum(['ADMIN', 'EMPLOYEE']),
  agreementType: z.enum([...]),
  agreementId: z.string().uuid(),
  signedAt: z.date().nullable(),
  organizationId: z.number(),
});
```

### Step 5: Export all schemas

**Instructions**:
- Export all DTOs following existing export patterns
- Export inferred types if the codebase uses `z.infer<typeof Schema>`

## Acceptance Criteria

- All request body schemas validate correctly
- Path parameter schemas validate UUIDs
- Enum values match the database model exactly
- Follows existing DTO patterns in the same file

## Testing

- Test validation accepts valid payloads
- Test validation rejects missing required fields
- Test validation rejects invalid enum values
- Test UUID validation on path params

## Notes

- Check if the existing DTOs use Zod or another validation library (the plan assumes Zod)
- Ensure enum values match exactly with the Sequelize model enums
- If the codebase uses a different validation approach, adapt accordingly
