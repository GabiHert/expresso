<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK (SUBTASK)                                            ║
║ LOCATION: .ai/tasks/in_progress/EEXPR-12-2/                     ║
╠══════════════════════════════════════════════════════════════════╣
║ PARENT EPIC: EEXPR-12                                            ║
║ REPO: peo                                                        ║
║ BRANCH: EEXPR-12-2-get-transfers-by-source-entity               ║
║ DEPENDS ON: EEXPR-12-1                                           ║
╚══════════════════════════════════════════════════════════════════╝
-->

# EEXPR-12-2: [PEO] GET transfers by source entity endpoint

## Problem Statement

Backend needs to retrieve entity transfer data from PEO to build the tech ops endpoint. This subtask creates the PEO endpoint that returns **raw transfer data** (without enrichment) for a given source legal entity.

## Endpoint Specification

```
GET /peo/entity-transfer/transfers/source/:sourceEntityPublicId
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `sourceEntityPublicId` | UUID | Source legal entity public ID |

### Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `cursor` | string | null | - | Pagination cursor |
| `limit` | number | 100 | 100 | Results per page |

## Response Structure

```json
{
  "success": true,
  "data": {
    "transfers": [
      {
        "id": "uuid",
        "status": "DRAFT",
        "organizationId": 12345,
        "requesterProfilePublicId": "uuid",
        "sourceLegalEntityPublicId": "uuid",
        "destinationLegalEntityPublicId": "uuid",
        "effectiveDate": "2025-02-01",
        "items": [
          {
            "id": "uuid",
            "status": "PENDING",
            "baseContractOid": "EMP12345",
            "deelContractId": 123456,
            "employeeName": "John Doe",
            "benefitGroupId": "400",
            "payGroupId": "cuid...",
            "ptoPolicyId": "uuid",
            "workLocationId": "uuid",
            "positionPublicId": "uuid",
            "teamId": 12345,
            "newContractOid": null,
            "resumeFromStep": null
          }
        ],
        "signatures": [
          {
            "id": "uuid",
            "profilePublicId": "uuid",
            "role": "ADMIN",
            "agreementType": "ENTITY_ASSIGNMENT_AGREEMENT",
            "signedAt": null
          }
        ],
        "agreement": {
          "id": "uuid",
          "type": "ENTITY_ASSIGNMENT_AGREEMENT",
          "pdfUrl": "https://...",
          "createdAt": "2025-01-15T10:30:00Z"
        },
        "createdAt": "2025-01-15T10:30:00Z",
        "updatedAt": "2025-01-15T10:30:00Z"
      }
    ],
    "cursor": "next-cursor-value",
    "hasMore": true
  }
}
```

## Data Sources

| Field | Source Table | Join/Query |
|-------|--------------|------------|
| Transfer metadata | `peo_employee_transfers` | Direct |
| Items | `peo_employee_transfer_items` | FK: `transfer_id` |
| `employeeName` | `peo_contracts` | Join via `base_contract_oid` |
| `deelContractId` | `peo_contracts` | Join via `base_contract_oid` |
| Signatures | `peo_employee_transfer_signatures` | FK: `transfer_id` |
| `profilePublicId` | `peo_employee_transfer_signatures` | Direct (UUID after EEXPR-12-1) |
| Agreement | `peo_agreements` | FK: `agreement_id` |
| `pdfUrl` | `peo_files` | Via `peo_file_submissions` |

## Query Pattern

```typescript
const transfers = await PeoEmployeeTransfer.findAll({
  where: {
    sourceLegalEntityPublicId: sourceEntityPublicId,
    ...(cursor && { id: { [Op.gt]: cursor } }),
  },
  limit: limit + 1, // +1 to determine hasMore
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
      include: [
        {
          model: PeoFileSubmission,
          as: 'fileSubmission',
          include: [
            {
              model: PeoFile,
              as: 'file',
              attributes: ['persistedPathPattern'],
            },
          ],
        },
      ],
    },
  ],
});
```

## Pagination

### Cursor-Based Approach

1. Query `limit + 1` records
2. If `results.length > limit`:
   - `hasMore = true`
   - `cursor = results[limit - 1].id`
   - Return first `limit` results
3. Otherwise:
   - `hasMore = false`
   - `cursor = null`

### Why Cursor-Based?

- More efficient than offset for large datasets
- Consistent results when data changes between pages
- Better performance for deep pagination

## Acceptance Criteria

- [ ] Service method `getTransfersBySourceEntity()` implemented
- [ ] Zod validation schema for query params
- [ ] Controller endpoint with GET decorator
- [ ] Employee name joined from peo_contracts
- [ ] Agreement pdfUrl constructed from peo_files
- [ ] Cursor-based pagination working
- [ ] Unit tests for service and controller

## Work Items

| ID | Name | Status |
|----|------|--------|
| 01 | Add service method | todo |
| 02 | Add validation schema | todo |
| 03 | Add controller endpoint | todo |
| 04 | Add unit tests | todo |

## Technical Context

### Key Files

| File | Purpose |
|------|---------|
| `peo/src/services/entityTransfer/entityTransferService.ts` | Service layer |
| `peo/src/controllers/entityTransfer/entityTransferController.ts` | REST API |
| `peo/src/controllers/entityTransfer/entityTransferDto.ts` | Validation schemas |
| `peo/src/models/entityTransfer/PeoEmployeeTransfer.ts` | Transfer model |
| `peo/src/models/entityTransfer/PeoEmployeeTransferItem.ts` | Item model |
| `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts` | Signature model |
| `peo/src/models/peoContract/peoContract.ts` | Contract model |
| `peo/src/models/peoAgreement/peoAgreement.ts` | Agreement model |
| `peo/src/models/peoFile/peoFile.ts` | File model |

### Employee Name Lookup

The employee name comes from `peo_contracts` via `base_contract_oid`:

```sql
SELECT
  i.*,
  c.first_name,
  c.last_name,
  c.deel_contract_id
FROM peo.peo_employee_transfer_items i
JOIN peo.peo_contracts c ON i.base_contract_oid = c.contract_oid
```

### Agreement PDF URL

The PDF URL is constructed from `peo_files.persisted_path_pattern`:

```typescript
const pdfUrl = agreement?.fileSubmission?.file?.persistedPathPattern
  ? `${config.s3BaseUrl}/${agreement.fileSubmission.file.persistedPathPattern}`
  : null;
```

## Dependencies

### Depends On
- **EEXPR-12-1**: Migration must be deployed first (signatures.profile_public_id must be UUID)

### Required By
- **EEXPR-12-3**: Backend will call this endpoint to get raw transfer data

## Notes

- This endpoint returns **RAW data only** - no profile or legal entity enrichment
- Backend (EEXPR-12-3) will handle all enrichment from its own database
- The `profilePublicId` in signatures is now UUID (after EEXPR-12-1 migration)
- Use `useMaster: false` for read queries to use replica

## Parent Epic

[EEXPR-12: Endpoint to retrieve transfer details](../in_progress/EEXPR-12/README.md)
