<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-create-subtask-eexpr-12-2.md                       ║
║ TASK: EEXPR-12 (Epic)                                            ║
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

# Create Subtask EEXPR-12-2: [PEO] GET transfers by source entity endpoint

## Objective

Create the subtask folder and work items for EEXPR-12-2, which implements the PEO endpoint to retrieve transfers by source legal entity.

## Subtask Details

**ID:** EEXPR-12-2
**Title:** [PEO] GET transfers by source entity endpoint
**Repo:** peo
**Branch:** `EEXPR-12-2-get-transfers-by-source-entity`
**Depends On:** EEXPR-12-1

### Endpoint

```
GET /peo/entity-transfer/transfers/source/:sourceEntityPublicId
```

**Query Parameters:**
- `cursor` (string, optional) - Pagination cursor
- `limit` (number, optional, default: 100, max: 100)

### Response Structure (Raw Data)

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

### Key Implementation Points

1. **Employee name from peo_contracts** - Join with peo_contracts to get first_name, last_name
2. **deelContractId included** - For backend to lookup email
3. **profilePublicId in signatures** - UUID after EEXPR-12-1 migration
4. **Agreement pdfUrl** - Constructed from peo_files.persisted_path_pattern
5. **Cursor-based pagination** - For efficient large dataset handling

## Work Items for EEXPR-12-2

| ID | Name | Description |
|----|------|-------------|
| 01 | Add service method | `getTransfersBySourceEntity()` in EntityTransferService |
| 02 | Add validation schema | Zod schema for query params |
| 03 | Add controller endpoint | GET endpoint with cursor pagination |
| 04 | Add unit tests | Tests for service and controller |

## Implementation Steps

### Step 1: Create subtask folder structure

```
.ai/tasks/todo/EEXPR-12-2/
├── README.md
├── status.yaml
├── todo/
│   ├── 01-add-service-method.md
│   ├── 02-add-validation-schema.md
│   ├── 03-add-controller-endpoint.md
│   └── 04-add-unit-tests.md
├── in_progress/
├── done/
└── feedback/
```

### Step 2: Create README.md

Include:
- Endpoint specification
- Response structure
- Data sources for each field
- Join patterns (peo_contracts for employee name, peo_agreements/peo_files for agreement)
- Pagination approach
- Reference to parent epic EEXPR-12

### Step 3: Create status.yaml

```yaml
task: "EEXPR-12-2"
title: "[PEO] GET transfers by source entity endpoint"
parent: "EEXPR-12"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"

work_items:
  - id: "01"
    name: "Add service method"
    repo: peo
    status: todo
    file: "todo/01-add-service-method.md"
  - id: "02"
    name: "Add validation schema"
    repo: peo
    status: todo
    file: "todo/02-add-validation-schema.md"
  - id: "03"
    name: "Add controller endpoint"
    repo: peo
    status: todo
    file: "todo/03-add-controller-endpoint.md"
  - id: "04"
    name: "Add unit tests"
    repo: peo
    status: todo
    file: "todo/04-add-unit-tests.md"
```

### Step 4: Create work item files

**01-add-service-method.md:**
- File: `peo/src/services/entityTransfer/entityTransferService.ts`
- Method signature and implementation
- Sequelize query with joins:
  - `PeoEmployeeTransferItem` (items)
  - `PeoEmployeeTransferSignature` (signatures)
  - `PeoAgreement` → `PeoFileSubmission` → `PeoFile` (agreement pdfUrl)
  - `PeoContract` (employee name via base_contract_oid)
- Cursor-based pagination logic

**02-add-validation-schema.md:**
- File: `peo/src/controllers/entityTransfer/entityTransferDto.ts`
- Zod schema for cursor and limit

**03-add-controller-endpoint.md:**
- File: `peo/src/controllers/entityTransfer/entityTransferController.ts`
- `@Get('/transfers/source/:sourceEntityPublicId')` decorator
- Query parameter handling
- Response formatting

**04-add-unit-tests.md:**
- File: `peo/src/controllers/entityTransfer/entityTransferController.spec.ts`
- Test patterns from existing tests
- Mock service responses
- Test pagination, empty results, validation errors

## Key Files Reference

| File | Purpose |
|------|---------|
| `peo/src/services/entityTransfer/entityTransferService.ts` | Service layer |
| `peo/src/controllers/entityTransfer/entityTransferController.ts` | REST API |
| `peo/src/controllers/entityTransfer/entityTransferDto.ts` | Validation |
| `peo/src/models/entityTransfer/PeoEmployeeTransfer.ts` | Transfer model |
| `peo/src/models/entityTransfer/PeoEmployeeTransferItem.ts` | Item model |
| `peo/src/models/peoContract/peoContract.ts` | For employee name |
| `peo/src/models/peoAgreement/peoAgreement.ts` | Agreement model |

## Acceptance Criteria

- [ ] Subtask folder created at `.ai/tasks/todo/EEXPR-12-2/`
- [ ] README.md with complete context
- [ ] status.yaml with work items
- [ ] 4 work item files with detailed instructions
- [ ] References parent epic EEXPR-12
- [ ] References dependency on EEXPR-12-1

## Notes

- This endpoint returns RAW data - no profile/legal entity enrichment
- Backend (EEXPR-12-3) will do all enrichment
- Must wait for EEXPR-12-1 migration before using profilePublicId as UUID
