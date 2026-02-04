<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-44-1-peo-signatures.md                         ║
║ TASK: EEXPR-44                                                   ║
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
# Repository Context (EEXPR-44)
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

# PEO: Database, Models, Service & Endpoints

## Objective

Create the `peo_employee_transfer_item_signatures` table, model, service methods, and REST endpoints in the PEO microservice. Also modify the existing `peo_employee_transfer_signatures` table to remove item-level columns and add status tracking.

## Pre-Implementation

Before starting, run an exploration agent on the PEO repo to understand:
- Current `PeoEmployeeTransferSignature` model and migration
- Entity transfer service patterns
- Controller/DTO patterns for entity transfer
- `db.ts` model initialization pattern

## Implementation Steps

### Step 1: Database Migration - Modify existing signatures table

**File**: `peo/migrations/YYYYMMDDHHMMSS-modify_peo_employee_transfer_signatures_table__pre_release.js`

**Instructions**:
- Create enum `enum_peo_employee_transfer_signatures_status` with values (PENDING, SIGNED)
- Drop unique index on `(transfer_id, profile_public_id, agreement_type)`
- Remove columns: `agreement_type`, `agreement_id`
- Add column: `status` (ENUM using new type, NOT NULL, default PENDING)
- Create new unique index on `(transfer_id, profile_public_id, role)`
- Down migration: reverse all changes

### Step 1b: Remove agreementId from transfers table (all usages)

The `agreement_id` column on `peo_employee_transfers` is being removed — it belongs at the item-signature level (`peo_employee_transfer_item_signatures`), not the transfer level.

**IMPORTANT**: Before implementing, run an exploration agent to confirm all usages are still at the lines listed below. Code may shift as other steps are implemented.

#### 1b-i: Migration

**File**: `peo/migrations/YYYYMMDDHHMMSS-remove_agreement_id_from_peo_employee_transfers__pre_release.js` (new file)

- Remove column: `agreement_id`
- Down migration: re-add `agreement_id` (UUID, nullable)

#### 1b-ii: Model

**File**: `peo/src/models/entityTransfer/PeoEmployeeTransfer.ts`

- Remove field declaration: `declare agreementId: CreationOptional<string | null>;` (line ~19)
- Remove column definition block for `agreement_id` (lines ~87-92)

#### 1b-iii: Service

**File**: `peo/src/services/entityTransfer/entityTransferService.ts`

- Remove `agreementId?: string;` from `CreateTransferInput` interface (line ~18)
- Remove `agreementId: string | null;` from `TransferRecordResponse` interface (line ~70)
- Remove `agreementId: input.agreementId || null,` from `createTransfer()` (line ~106)
- Remove `'agreementId',` from `getTransferItemByIdWithTransfer()` attributes list (line ~193)
- Remove `agreementId: transfer.agreementId || null,` from `transformTransfer()` (line ~380)

#### 1b-iv: Controller

**File**: `peo/src/controllers/entityTransfer/entityTransferController.ts`

- Remove `agreementId: input.agreementId,` from the createTransfer call (line ~39)

#### 1b-v: DTO

**File**: `peo/src/controllers/entityTransfer/entityTransferDto.ts`

- Remove `agreementId: z.string().uuid().optional(),` from `CreateTransferSchema` (line ~32)

#### 1b-vi: Tests

**File**: `peo/src/controllers/entityTransfer/entityTransferController.spec.ts`

- Remove `agreementId: null,` from test mock data (line ~238)

#### NOT handled in Step 1b (removed separately in Steps 1 and 5):
- `PeoEmployeeTransferSignature.ts` — `agreementId` field (line ~20, ~81-86) — removed in Step 5
- `migrations/...-create_peo_employee_transfer_signatures_table__pre_release.js` — `agreement_id` column (lines ~97-102) — removed in Step 1

### Step 2: Database Migration - Create item signatures table

**File**: `peo/migrations/YYYYMMDDHHMMSS-create_peo_employee_transfer_item_signatures_table__pre_release.js`

**Instructions**:
Create table `peo_employee_transfer_item_signatures` with:
- `id` (UUID PK, default UUIDV4)
- `transfer_item_id` (UUID, NOT NULL, FK to `peo_employee_transfer_items.id`, CASCADE delete)
- `agreement_type` (ENUM: ARBITRATION_AGREEMENT, WSE_NOTICE_OF_PEO_RELATIONSHIP, NOT NULL)
- `agreement_id` (UUID, NOT NULL)
- `status` (ENUM: PENDING, SIGNED, NOT NULL, default PENDING)
- `signed_at` (TIMESTAMP, nullable)
- `created_at` (TIMESTAMP, NOT NULL)
- `updated_at` (TIMESTAMP, NOT NULL)

Indexes:
- Index on `transfer_item_id`
- Unique index on `(transfer_item_id, agreement_type)`

### Step 3: New Model - PeoEmployeeTransferItemSignature

**File**: `peo/src/models/entityTransfer/PeoEmployeeTransferItemSignature.ts`

**Instructions**:
- Extends `BasePeoModel`
- Fields: id, transferItemId, agreementType, agreementId, status, signedAt, createdAt, updatedAt
- Table name: `peo_employee_transfer_item_signatures`
- Association: `belongsTo(PeoEmployeeTransferItem, { foreignKey: 'transferItemId', as: 'transferItem' })`
- Follow the same pattern as `PeoEmployeeTransferSignature.ts`

### Step 4: Update Types

**File**: `peo/src/models/entityTransfer/types.ts`

**Instructions**:
Add new enums:
```typescript
export enum TransferItemAgreementType {
    ARBITRATION_AGREEMENT = 'ARBITRATION_AGREEMENT',
    WSE_NOTICE_OF_PEO_RELATIONSHIP = 'WSE_NOTICE_OF_PEO_RELATIONSHIP',
}

export enum TransferItemSignatureStatus {
    PENDING = 'PENDING',
    SIGNED = 'SIGNED',
}

export enum SignatureStatus {
    PENDING = 'PENDING',
    SIGNED = 'SIGNED',
}
```

### Step 5: Update Existing Model

**File**: `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts`

**Instructions**:
- Remove `agreementType` and `agreementId` fields
- Add `status` field (SignatureStatus enum, default PENDING)
- Update unique index from `['transfer_id', 'profile_public_id', 'agreement_type']` to `['transfer_id', 'profile_public_id', 'role']`

### Step 5b: Update PEO service and DTO for transfer-level signature changes

Since Step 1 removes `agreement_type`/`agreement_id` columns and Step 5 removes the model fields, the service layer and DTO must also stop referencing these fields and start using the new `status` field.

**IMPORTANT**: Before implementing, run an exploration agent to confirm all usages are still at the lines listed below. Code may shift as other steps are implemented.

#### 5b-i: DTO

**File**: `peo/src/controllers/entityTransfer/entityTransferDto.ts`

- Remove `agreementType: z.nativeEnum(AgreementType),` from `CreateSignatureSchema` (line ~17)
- Remove `agreementId: z.string().uuid().optional().nullable(),` from `CreateSignatureSchema` (line ~18)

#### 5b-ii: Service

**File**: `peo/src/services/entityTransfer/entityTransferService.ts`

- Remove `agreementType: AgreementType;` from `CreateSignatureInput` interface (line ~17)
- Remove `agreementId?: string | null;` from `CreateSignatureInput` interface (line ~18)
- Remove `agreementType: sig.agreementType,` from `createSignatures()` bulkCreate (line ~351)
- Remove `agreementId: sig.agreementId || null,` from `createSignatures()` bulkCreate (line ~352)
- In `getTransferById()` signature attributes list (line ~197): remove `'agreementType'`, remove `'agreementId'`, add `'status'`
- In `transformSignature()` response (line ~494): remove `agreementType: sig.agreementType,`, add `status: sig.status,`

### Step 6: Update PeoEmployeeTransferItem Model

**File**: `peo/src/models/entityTransfer/PeoEmployeeTransferItem.ts`

**Instructions**:
- Add association: `hasMany(PeoEmployeeTransferItemSignature, { foreignKey: 'transferItemId', as: 'itemSignatures' })`

### Step 7: Update Index & DB Init

**Files**:
- `peo/src/models/entityTransfer/index.ts` - Add export for `PeoEmployeeTransferItemSignature`
- `peo/src/db.ts` - Add `initPeoEmployeeTransferItemSignatureModel` and `initPeoEmployeeTransferItemSignatureAssociation` to the Promise.all init block

### Step 8: Update existing service methods to include item signatures

**File**: `peo/src/services/entityTransfer/entityTransferService.ts`

**Instructions**:
Update 3 existing methods to eagerly load `itemSignatures` within each transfer item. No controller changes needed — the controller serializes whatever the service returns.

**8a. `getReadyTransfers()`** (line ~94):
Add nested include for `PeoEmployeeTransferItemSignature` inside the `PeoEmployeeTransferItem` include:
```typescript
include: [{
    model: PeoEmployeeTransferItem,
    as: 'items',
    attributes: [...existing attributes...],
    include: [{
        model: PeoEmployeeTransferItemSignature,
        as: 'itemSignatures',
    }],
}],
```

**8b. `getTransferById()`** (line ~142):
Same change — add nested `itemSignatures` include inside the `PeoEmployeeTransferItem` include block (the one guarded by `if (includeItems)`):
```typescript
if (includeItems) {
    include.push({
        model: PeoEmployeeTransferItem,
        as: 'items',
        attributes: [...existing attributes...],
        include: [{
            model: PeoEmployeeTransferItemSignature,
            as: 'itemSignatures',
        }],
    });
}
```

**8c. `getTransferItemByIdWithTransfer()`** (line ~179):
This method loads a single item with its parent transfer (which itself includes all items). Add `itemSignatures` include in two places:
1. Top-level item include (the item being fetched)
2. Nested inside the transfer's items include

```typescript
return PeoEmployeeTransferItem.findByPk(id, {
    include: [
        {
            model: PeoEmployeeTransferItemSignature,
            as: 'itemSignatures',
        },
        {
            model: PeoEmployeeTransfer,
            as: 'transfer',
            attributes: [...existing attributes...],
            include: [{
                model: PeoEmployeeTransferItem,
                as: 'items',
                attributes: [...existing attributes...],
                include: [{
                    model: PeoEmployeeTransferItemSignature,
                    as: 'itemSignatures',
                }],
            }],
        },
    ],
    transaction,
    useMaster: !!transaction,
});
```

**Note**: `getTransferItemById()` (line ~172) does NOT need changes — it's a bare `findByPk` with no includes, and is not called by the backend client service.

### Step 9: New Service Methods

**File**: `peo/src/services/entityTransfer/entityTransferService.ts`

**Instructions**:
Add 4 methods:

| Method | Input | Action |
|--------|-------|--------|
| `createTransferItemSignatures()` | transferItemId, signatures[] | Bulk create with status=PENDING |
| `getTransferItemSignatures()` | transferItemId | findAll where transferItemId |
| `getSignedTransferItemSignatures()` | transferItemId | findAll where transferItemId AND status=SIGNED |
| `updateTransferItemSignatureStatus()` | agreementId, status | Update status + set signedAt if SIGNED |

### Step 10: Controller Endpoints

**File**: `peo/src/controllers/entityTransfer/entityTransferController.ts`

**Instructions**:
Add 4 endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/peo/entity-transfer/items/:transferItemId/signatures` | Create item signatures |
| GET | `/peo/entity-transfer/items/:transferItemId/signatures` | Get all item signatures |
| GET | `/peo/entity-transfer/items/:transferItemId/signatures/signed` | Get signed only |
| PATCH | `/peo/entity-transfer/signatures/:agreementId/status` | Update status |

### Step 11: DTO Validation

**File**: `peo/src/controllers/entityTransfer/entityTransferDto.ts`

**Instructions**:
Add Zod validation schemas for:
- `createTransferItemSignaturesDto` - validate POST body
- `updateSignatureStatusDto` - validate PATCH body
- Path param validation for transferItemId and agreementId

## Post-Implementation

After completing, run a code review agent to check for issues.

## Acceptance Criteria

- Both migrations run successfully on local/giger DB
- New model is properly initialized in db.ts
- Service methods perform correct Sequelize queries
- Controller endpoints respond correctly to HTTP requests
- DTO validation rejects invalid input
- Existing `peo_employee_transfer_signatures` table no longer has `agreement_type`/`agreement_id` columns

## Testing

1. Run migrations locally: `npx sequelize-cli db:migrate`
2. Verify table schema in DB
3. Test each endpoint with curl/Postman
4. Verify bulk create, findAll, filtered find, and update operations

## Notes

- **Shared file**: `PeoEmployeeTransfer.ts` is also modified by EEXPR-44-4 (effectiveDate nullable). If EEXPR-44-4 runs first, re-explore line numbers before executing Step 1b-ii.
- Follow existing patterns in `PeoEmployeeTransferSignature.ts` and `entityTransferService.ts`
- The `ENTITY_ASSIGNMENT_AGREEMENT` type stays in the transfer-level table only
- Agreement types for item-level are only: ARBITRATION_AGREEMENT, WSE_NOTICE_OF_PEO_RELATIONSHIP
