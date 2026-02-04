<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-signature-service-methods.md                       ║
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

# Add Signature Service Methods

## Objective

Add 5 service methods to the PEO entity transfer service that interact with the `peo_employee_transfer_signatures` table via the existing Sequelize model.

## Pre-Implementation

Before starting, explore:
- `peo/src/services/entityTransfer/entityTransferService.ts` - Existing service patterns
- `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts` - The model to use
- Other service methods in the same file for convention reference

## Implementation Steps

### Step 1: Add createTransferSignatures method

**File**: `peo/src/services/entityTransfer/entityTransferService.ts`

**Instructions**:
Add a method that creates multiple signature records for a transfer:
```typescript
async createTransferSignatures(
  transferId: string,
  signatures: Array<{
    profilePublicId: number;
    role: SignatureRole;
    agreementType: AgreementType;
    agreementId: string;
    organizationId: number;
  }>,
  transaction?: Transaction
): Promise<PeoEmployeeTransferSignature[]>
```
- Use `PeoEmployeeTransferSignature.bulkCreate()` or iterate with `.create()`
- Set `transfer_id`, `profile_public_id`, `role`, `agreement_type`, `agreement_id`, `organization_id`
- Leave `signed_at` as NULL (pending)

### Step 2: Add getTransferSignatures method

**Instructions**:
```typescript
async getTransferSignatures(
  transferId: string,
  transaction?: Transaction
): Promise<PeoEmployeeTransferSignature[]>
```
- Query `PeoEmployeeTransferSignature.findAll({ where: { transfer_id: transferId } })`

### Step 3: Add getSignedTransferSignatures method

**Instructions**:
```typescript
async getSignedTransferSignatures(
  transferId: string,
  transaction?: Transaction
): Promise<PeoEmployeeTransferSignature[]>
```
- Query with `where: { transfer_id: transferId, signed_at: { [Op.ne]: null } }`

### Step 4: Add markSignatureSigned method

**Instructions**:
```typescript
async markSignatureSigned(
  agreementId: string,
  transaction?: Transaction
): Promise<void>
```
- Update `PeoEmployeeTransferSignature` where `agreement_id = agreementId`
- Set `signed_at` to current date

### Step 5: Add areAllSignaturesComplete method

**Instructions**:
```typescript
async areAllSignaturesComplete(
  transferId: string,
  transaction?: Transaction
): Promise<boolean>
```
- Count total signatures for transfer
- Count unsigned (signed_at IS NULL)
- Return `unsignedCount === 0 && totalCount > 0`

## Acceptance Criteria

- All 5 methods implemented
- Methods use proper Sequelize queries against PeoEmployeeTransferSignature model
- Transaction support on all methods
- Follow existing service method patterns in the file

## Testing

- Unit test each method with mocked Sequelize model
- Test createTransferSignatures with multiple signatures
- Test areAllSignaturesComplete returns false when some unsigned
- Test areAllSignaturesComplete returns true when all signed
- Test edge case: areAllSignaturesComplete returns false when no signatures exist

## Notes

- The model uses snake_case columns (transfer_id, signed_at) but Sequelize may map to camelCase depending on config
- Check if the existing service uses dependency injection or direct model imports
