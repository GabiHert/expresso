<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-add-validation-schema.md                           ║
║ TASK: EEXPR-12-2                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                 ║
║ 2. Update status.yaml with new status                           ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml              ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: peo
---

# Add Validation Schema: GetTransfersBySourceEntity

## Objective

Add Zod validation schema for the GET transfers by source entity endpoint query parameters.

## Implementation Steps

### Step 1: Add query params schema

**File:** `peo/src/controllers/entityTransfer/entityTransferDto.ts`

```typescript
import { z } from 'zod';

// Query params for GET /transfers/source/:sourceEntityPublicId
export const getTransfersBySourceEntityQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 100))
    .pipe(z.number().int().min(1).max(100)),
});

export type GetTransfersBySourceEntityQuery = z.infer<typeof getTransfersBySourceEntityQuerySchema>;
```

### Step 2: Add path params schema

**File:** `peo/src/controllers/entityTransfer/entityTransferDto.ts`

```typescript
// Path params for GET /transfers/source/:sourceEntityPublicId
export const getTransfersBySourceEntityParamsSchema = z.object({
  sourceEntityPublicId: z.string().uuid(),
});

export type GetTransfersBySourceEntityParams = z.infer<typeof getTransfersBySourceEntityParamsSchema>;
```

### Step 3: Add response schema (optional, for documentation)

**File:** `peo/src/controllers/entityTransfer/entityTransferDto.ts`

```typescript
// Response schema for documentation/typing
export const transferItemSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  baseContractOid: z.string(),
  deelContractId: z.number().nullable(),
  employeeName: z.string(),
  benefitGroupId: z.string().nullable(),
  payGroupId: z.string().nullable(),
  ptoPolicyId: z.string().uuid().nullable(),
  workLocationId: z.string().uuid().nullable(),
  positionPublicId: z.string().uuid().nullable(),
  teamId: z.number().nullable(),
  newContractOid: z.string().nullable(),
  resumeFromStep: z.string().nullable(),
});

export const transferSignatureSchema = z.object({
  id: z.string().uuid(),
  profilePublicId: z.string().uuid(),
  role: z.string(),
  agreementType: z.string(),
  signedAt: z.date().nullable(),
});

export const transferAgreementSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  pdfUrl: z.string().url().nullable(),
  createdAt: z.date(),
});

export const transferRecordSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  organizationId: z.number(),
  requesterProfilePublicId: z.string().uuid(),
  sourceLegalEntityPublicId: z.string().uuid(),
  destinationLegalEntityPublicId: z.string().uuid(),
  effectiveDate: z.string(),
  items: z.array(transferItemSchema),
  signatures: z.array(transferSignatureSchema),
  agreement: transferAgreementSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const getTransfersBySourceEntityResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    transfers: z.array(transferRecordSchema),
    cursor: z.string().uuid().nullable(),
    hasMore: z.boolean(),
  }),
});
```

## Key Files

| File | Purpose |
|------|---------|
| `peo/src/controllers/entityTransfer/entityTransferDto.ts` | Validation schemas |

## Acceptance Criteria

- [ ] Query params schema validates `cursor` (optional UUID) and `limit` (optional, default 100, max 100)
- [ ] Path params schema validates `sourceEntityPublicId` (required UUID)
- [ ] Types exported for use in controller
- [ ] Limit transforms from string to number (query params come as strings)

## Notes

- Query parameters come as strings from Express, so `limit` needs transformation
- Use `.pipe()` to chain string transformation with number validation
- Response schema is optional but useful for documentation and type safety
