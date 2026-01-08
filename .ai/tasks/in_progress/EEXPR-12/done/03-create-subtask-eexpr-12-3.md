<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-create-subtask-eexpr-12-3.md                       ║
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
repo: backend
---

# Create Subtask EEXPR-12-3: [BE] Tech ops endpoint with enrichment

## Objective

Create the subtask folder and work items for EEXPR-12-3, which implements the Backend tech ops endpoint with data enrichment.

## Subtask Details

**ID:** EEXPR-12-3
**Title:** [BE] Tech ops endpoint with enrichment
**Repo:** backend
**Branch:** `EEXPR-12-3-tech-ops-transfer-enrichment`
**Depends On:** EEXPR-12-1, EEXPR-12-2

### Endpoint

```
GET /admin/peo/tech_ops/entity_transfer/source/:sourceEntityPublicId
```

**Query Parameters:**
- `cursor` (string, optional) - Pagination cursor
- `limit` (number, optional, default: 100, max: 100)

### Response Structure (Final Enriched)

See parent epic EEXPR-12 README for complete response format.

### Enrichment Responsibilities

Backend enriches the following from its own database:

| Data | Source | Query Pattern |
|------|--------|---------------|
| Employee email | `Contract → Profile.email` | `Contract.findAll({ include: Profile })` |
| Signature name | `Profile.firstName + lastName` | `Profile.findAll({ where: { publicId } })` |
| Signature email | `Profile.email` | Same as above |
| Signature jobTitle | `Profile.jobTitle` | Same as above |
| Legal entity name | `LegalEntities.name` | `LegalEntity.findAll({ where: { publicId } })` |
| Legal entity country | `LegalEntities.address->>'country'` | Same as above |

### Enrichment Pattern

Use established patterns from codebase:

```typescript
// 1. Collect all IDs for batch fetching
const legalEntityIds = new Set<string>();
const contractIds = new Set<number>();
const profilePublicIds = new Set<string>();

// 2. Batch fetch all enrichment data in parallel
const [legalEntityMap, contractEmailMap, profileMap] = await Promise.all([
  this.fetchLegalEntities(Array.from(legalEntityIds)),
  this.fetchContractEmails(Array.from(contractIds)),
  this.fetchProfiles(Array.from(profilePublicIds)),
]);

// 3. Enrich with O(1) lookups
transfers.forEach(transfer => {
  transfer.sourceLegalEntity = legalEntityMap.get(transfer.sourceLegalEntityPublicId);
  // ... more enrichment
});
```

## Work Items for EEXPR-12-3

| ID | Name | Description |
|----|------|-------------|
| 01 | Add endpoint URL | Add to entity_transfer_endpoints.ts |
| 02 | Add client service method | Method to call PEO endpoint |
| 03 | Create enrichment service | TransferEnrichmentService with batch methods |
| 04 | Add tech ops endpoint | Controller endpoint with enrichment |
| 05 | Add route registration | Register route with auth middleware |
| 06 | Add integration tests | Tests for endpoint and enrichment |

## Implementation Steps

### Step 1: Create subtask folder structure

```
.ai/tasks/todo/EEXPR-12-3/
├── README.md
├── status.yaml
├── todo/
│   ├── 01-add-endpoint-url.md
│   ├── 02-add-client-service-method.md
│   ├── 03-create-enrichment-service.md
│   ├── 04-add-tech-ops-endpoint.md
│   ├── 05-add-route-registration.md
│   └── 06-add-integration-tests.md
├── in_progress/
├── done/
└── feedback/
```

### Step 2: Create README.md

Include:
- Endpoint specification
- Enrichment responsibilities
- Batch query patterns
- Reference to established patterns in codebase
- Reference to parent epic EEXPR-12

### Step 3: Create status.yaml

```yaml
task: "EEXPR-12-3"
title: "[BE] Tech ops endpoint with enrichment"
parent: "EEXPR-12"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"

work_items:
  - id: "01"
    name: "Add endpoint URL"
    repo: backend
    status: todo
    file: "todo/01-add-endpoint-url.md"
  - id: "02"
    name: "Add client service method"
    repo: backend
    status: todo
    file: "todo/02-add-client-service-method.md"
  - id: "03"
    name: "Create enrichment service"
    repo: backend
    status: todo
    file: "todo/03-create-enrichment-service.md"
  - id: "04"
    name: "Add tech ops endpoint"
    repo: backend
    status: todo
    file: "todo/04-add-tech-ops-endpoint.md"
  - id: "05"
    name: "Add route registration"
    repo: backend
    status: todo
    file: "todo/05-add-route-registration.md"
  - id: "06"
    name: "Add integration tests"
    repo: backend
    status: todo
    file: "todo/06-add-integration-tests.md"
```

### Step 4: Create work item files

**01-add-endpoint-url.md:**
- File: `backend/services/peo/endpoints/entity_transfer_endpoints.ts`
- Add: `getTransfersBySourceEntity: (sourceEntityPublicId) => \`/peo/entity-transfer/transfers/source/${sourceEntityPublicId}\``

**02-add-client-service-method.md:**
- File: `backend/services/peo/entity_transfer_client_service.ts`
- Method: `getTransfersBySourceEntity(sourceEntityPublicId, options)`
- Return type: `PeoApiResponse<RawTransferResponse>`

**03-create-enrichment-service.md:**
- File: `backend/services/peo/entity_transfer/helpers/transfer_enrichment_service.ts` (NEW)
- Methods:
  - `enrichItemsWithEmail(items)` - Batch fetch emails via Contract → Profile
  - `enrichSignaturesWithProfiles(signatures)` - Batch fetch profiles by publicId
  - `enrichLegalEntities(publicIds)` - Batch fetch legal entities
  - `enrichTransfers(rawTransfers)` - Main method using Promise.all
- Use Op.in pattern for all batch queries
- Return Maps for O(1) lookup

**04-add-tech-ops-endpoint.md:**
- File: `backend/controllers/admin/peo/tech_ops.ts`
- Method: `getTransfersBySourceEntity(req, res)`
- Flow:
  1. Call PEO endpoint via client service
  2. Enrich via enrichment service
  3. Return enriched response

**05-add-route-registration.md:**
- File: `backend/controllers/admin/peo/tech_ops.ts`
- Route: `router.get('/entity_transfer/source/:sourceEntityPublicId', ...)`
- Middleware: `adminAuth`, `permittedRoles([ROLES.admin])`

**06-add-integration-tests.md:**
- Test endpoint returns enriched data
- Test batch enrichment works correctly
- Test error handling (PEO unavailable, etc.)
- Mock PEO responses

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/services/peo/endpoints/entity_transfer_endpoints.ts` | Endpoint URLs |
| `backend/services/peo/entity_transfer_client_service.ts` | PEO HTTP client |
| `backend/controllers/admin/peo/tech_ops.ts` | Tech ops controller |
| `backend/models/profile.js` | Profile model |
| `backend/models/contract.js` | Contract model |
| `backend/models/legal_entity.js` | Legal entity model |
| `backend/services/ems/decorator.js` | Reference: batch enrichment pattern |
| `backend/services/organizations/common/twofa_enrichment_service.js` | Reference: enrichment service |

## Enrichment SQL Patterns

**Employee Email:**
```javascript
const contracts = await Contract.findAll({
  where: { id: { [Op.in]: contractIds } },
  include: [{ model: Profile, as: 'Contractor', attributes: ['email'] }],
  useMaster: false,
});
const emailMap = new Map(contracts.map(c => [c.id, c.Contractor?.email]));
```

**Signature Profiles:**
```javascript
const profiles = await Profile.findAll({
  where: { publicId: { [Op.in]: profilePublicIds } },
  attributes: ['publicId', 'firstName', 'lastName', 'email', 'jobTitle'],
  useMaster: false,
});
const profileMap = new Map(profiles.map(p => [p.publicId, p]));
```

**Legal Entities:**
```javascript
const entities = await LegalEntity.findAll({
  where: { publicId: { [Op.in]: legalEntityPublicIds } },
  attributes: ['publicId', 'name', 'address'],
  useMaster: false,
});
const entityMap = new Map(entities.map(e => [e.publicId, {
  publicId: e.publicId,
  legalName: e.name,
  countryCode: e.address?.country || null,
}]));
```

## Acceptance Criteria

- [ ] Subtask folder created at `.ai/tasks/todo/EEXPR-12-3/`
- [ ] README.md with complete context
- [ ] status.yaml with work items
- [ ] 6 work item files with detailed instructions
- [ ] References parent epic EEXPR-12
- [ ] References dependencies on EEXPR-12-1 and EEXPR-12-2

## Notes

- This task depends on both EEXPR-12-1 (migration) and EEXPR-12-2 (PEO endpoint)
- All enrichment uses backend's own database - no calls back to PEO
- Use established batch patterns to avoid N+1 queries
- Profile lookup uses publicId (UUID) after EEXPR-12-1 migration
