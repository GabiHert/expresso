<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-add-service-method.md                              ║
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

# Add Service Method: getTransfersBySourceEntity

## Objective

Add a service method to retrieve transfers by source legal entity with cursor-based pagination.

## Implementation Steps

### Step 1: Add interface types

**File:** `peo/src/services/entityTransfer/entityTransferService.ts`

Add types for the response:

```typescript
interface TransferItem {
  id: string;
  status: string;
  baseContractOid: string;
  deelContractId: number;
  employeeName: string;
  benefitGroupId: string | null;
  payGroupId: string | null;
  ptoPolicyId: string | null;
  workLocationId: string | null;
  positionPublicId: string | null;
  teamId: number | null;
  newContractOid: string | null;
  resumeFromStep: string | null;
}

interface TransferSignature {
  id: string;
  profilePublicId: string;
  role: string;
  agreementType: string;
  signedAt: Date | null;
}

interface TransferAgreement {
  id: string;
  type: string;
  pdfUrl: string | null;
  createdAt: Date;
}

interface TransferRecord {
  id: string;
  status: string;
  organizationId: number;
  requesterProfilePublicId: string;
  sourceLegalEntityPublicId: string;
  destinationLegalEntityPublicId: string;
  effectiveDate: string;
  items: TransferItem[];
  signatures: TransferSignature[];
  agreement: TransferAgreement | null;
  createdAt: Date;
  updatedAt: Date;
}

interface GetTransfersBySourceEntityResponse {
  transfers: TransferRecord[];
  cursor: string | null;
  hasMore: boolean;
}

interface GetTransfersBySourceEntityOptions {
  cursor?: string;
  limit?: number;
}
```

### Step 2: Add service method

**File:** `peo/src/services/entityTransfer/entityTransferService.ts`

```typescript
async getTransfersBySourceEntity(
  sourceEntityPublicId: string,
  options: GetTransfersBySourceEntityOptions = {}
): Promise<GetTransfersBySourceEntityResponse> {
  const { cursor, limit = 100 } = options;
  const queryLimit = Math.min(limit, 100);

  const whereClause: WhereOptions = {
    sourceLegalEntityPublicId: sourceEntityPublicId,
  };

  if (cursor) {
    whereClause.id = { [Op.gt]: cursor };
  }

  const transfers = await PeoEmployeeTransfer.findAll({
    where: whereClause,
    limit: queryLimit + 1, // +1 to determine hasMore
    order: [['id', 'ASC']],
    include: [
      {
        model: PeoEmployeeTransferItem,
        as: 'items',
        include: [
          {
            model: PeoContract,
            as: 'peoContract',
            attributes: ['firstName', 'lastName', 'deelContractId'],
            required: false,
          },
        ],
      },
      {
        model: PeoEmployeeTransferSignature,
        as: 'signatures',
      },
      {
        model: PeoAgreement,
        as: 'agreement',
        required: false,
        include: [
          {
            model: PeoFileSubmission,
            as: 'fileSubmission',
            required: false,
            include: [
              {
                model: PeoFile,
                as: 'file',
                attributes: ['persistedPathPattern'],
                required: false,
              },
            ],
          },
        ],
      },
    ],
    useMaster: false,
  });

  // Determine pagination
  const hasMore = transfers.length > queryLimit;
  const results = hasMore ? transfers.slice(0, queryLimit) : transfers;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  // Transform to response format
  const transformedTransfers = results.map((transfer) => this.transformTransfer(transfer));

  return {
    transfers: transformedTransfers,
    cursor: nextCursor,
    hasMore,
  };
}

private transformTransfer(transfer: PeoEmployeeTransfer): TransferRecord {
  return {
    id: transfer.id,
    status: transfer.status,
    organizationId: transfer.organizationId,
    requesterProfilePublicId: transfer.requesterProfilePublicId,
    sourceLegalEntityPublicId: transfer.sourceLegalEntityPublicId,
    destinationLegalEntityPublicId: transfer.destinationLegalEntityPublicId,
    effectiveDate: transfer.effectiveDate,
    items: transfer.items?.map((item) => this.transformItem(item)) || [],
    signatures: transfer.signatures?.map((sig) => this.transformSignature(sig)) || [],
    agreement: transfer.agreement ? this.transformAgreement(transfer.agreement) : null,
    createdAt: transfer.createdAt,
    updatedAt: transfer.updatedAt,
  };
}

private transformItem(item: PeoEmployeeTransferItem): TransferItem {
  const peoContract = item.peoContract;
  const employeeName = peoContract
    ? `${peoContract.firstName} ${peoContract.lastName}`.trim()
    : '';

  return {
    id: item.id,
    status: item.status,
    baseContractOid: item.baseContractOid,
    deelContractId: peoContract?.deelContractId || null,
    employeeName,
    benefitGroupId: item.benefitGroupId,
    payGroupId: item.payGroupId,
    ptoPolicyId: item.ptoPolicyId,
    workLocationId: item.workLocationId,
    positionPublicId: item.positionPublicId,
    teamId: item.teamId,
    newContractOid: item.newContractOid,
    resumeFromStep: item.resumeFromStep,
  };
}

private transformSignature(sig: PeoEmployeeTransferSignature): TransferSignature {
  return {
    id: sig.id,
    profilePublicId: sig.profilePublicId,
    role: sig.role,
    agreementType: sig.agreementType,
    signedAt: sig.signedAt,
  };
}

private transformAgreement(agreement: PeoAgreement): TransferAgreement {
  const persistedPath = agreement.fileSubmission?.file?.persistedPathPattern;
  const pdfUrl = persistedPath
    ? `${config.s3.baseUrl}/${persistedPath}`
    : null;

  return {
    id: agreement.id,
    type: agreement.type,
    pdfUrl,
    createdAt: agreement.createdAt,
  };
}
```

### Step 3: Add model associations (if not present)

Verify these associations exist in the models:

**PeoEmployeeTransfer:**
```typescript
PeoEmployeeTransfer.hasMany(PeoEmployeeTransferItem, { as: 'items', foreignKey: 'transferId' });
PeoEmployeeTransfer.hasMany(PeoEmployeeTransferSignature, { as: 'signatures', foreignKey: 'transferId' });
PeoEmployeeTransfer.belongsTo(PeoAgreement, { as: 'agreement', foreignKey: 'agreementId' });
```

**PeoEmployeeTransferItem:**
```typescript
PeoEmployeeTransferItem.belongsTo(PeoContract, { as: 'peoContract', foreignKey: 'baseContractOid', targetKey: 'contractOid' });
```

**PeoAgreement:**
```typescript
PeoAgreement.hasOne(PeoFileSubmission, { as: 'fileSubmission', foreignKey: 'agreementId' });
```

**PeoFileSubmission:**
```typescript
PeoFileSubmission.belongsTo(PeoFile, { as: 'file', foreignKey: 'fileId' });
```

## Key Files

| File | Purpose |
|------|---------|
| `peo/src/services/entityTransfer/entityTransferService.ts` | Service implementation |
| `peo/src/models/entityTransfer/PeoEmployeeTransfer.ts` | Transfer model |
| `peo/src/models/entityTransfer/PeoEmployeeTransferItem.ts` | Item model |
| `peo/src/models/peoContract/peoContract.ts` | Contract model |

## Acceptance Criteria

- [ ] `getTransfersBySourceEntity()` method added
- [ ] Interface types defined
- [ ] Cursor-based pagination implemented
- [ ] Employee name joined from peo_contracts
- [ ] Agreement pdfUrl constructed from peo_files
- [ ] `useMaster: false` for read queries
- [ ] Transform methods for clean response structure

## Notes

- The `queryLimit + 1` pattern allows us to determine `hasMore` without an extra count query
- Use `required: false` on includes to handle missing related records
- The `peoContract` association uses `baseContractOid` → `contractOid` (not ID)
