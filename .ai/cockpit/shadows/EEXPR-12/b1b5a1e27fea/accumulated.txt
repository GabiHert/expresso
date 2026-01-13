<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK (SUBTASK)                                            ║
║ LOCATION: .ai/tasks/todo/EEXPR-12-3/                            ║
╠══════════════════════════════════════════════════════════════════╣
║ PARENT EPIC: EEXPR-12                                            ║
║ REPO: backend                                                    ║
║ BRANCH: EEXPR-12-3-tech-ops-transfer-enrichment                 ║
║ DEPENDS ON: EEXPR-12-1, EEXPR-12-2                              ║
╚══════════════════════════════════════════════════════════════════╝
-->

# EEXPR-12-3: [BE] Tech ops endpoint with enrichment

## Problem Statement

The PEO endpoint (EEXPR-12-2) returns raw transfer data with IDs only. The backend needs to enrich this data with human-readable information (names, emails, legal entity details) from its own database before exposing it to tech ops.

## Endpoint Specification

```
GET /admin/peo/tech_ops/entity_transfer/source/:sourceEntityPublicId
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

### Authentication

- Admin auth required
- Role: `ROLES.admin` (tech ops)

## Enrichment Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Backend Tech Ops Endpoint                                       │
│                                                                 │
│ 1. Call PEO endpoint → Get raw transfer data                   │
│                                                                 │
│ 2. Collect IDs from raw data:                                  │
│    - sourceLegalEntityPublicId, destinationLegalEntityPublicId │
│    - deelContractId (from items)                               │
│    - profilePublicId (from signatures)                         │
│                                                                 │
│ 3. Batch fetch enrichment data (parallel):                     │
│    ┌─────────────────────────────────────────────────────────┐ │
│    │ Promise.all([                                           │ │
│    │   fetchLegalEntities([...legalEntityIds]),              │ │
│    │   fetchContractEmails([...contractIds]),                │ │
│    │   fetchProfiles([...profileIds]),                       │ │
│    │ ])                                                      │ │
│    └─────────────────────────────────────────────────────────┘ │
│                                                                 │
│ 4. Enrich with O(1) Map lookups                                │
│                                                                 │
│ 5. Return enriched response                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Enrichment Responsibilities

| Data | Source | Backend Table | Query Pattern |
|------|--------|---------------|---------------|
| Employee email | Contract → Profile | `contract` + `profile` | Join on `contractor_id` |
| Signature name | Profile | `profile` | `findAll({ publicId: [...] })` |
| Signature email | Profile | `profile` | Same as above |
| Signature jobTitle | Profile | `profile` | Same as above |
| Legal entity name | LegalEntities | `LegalEntities` | `findAll({ publicId: [...] })` |
| Legal entity country | LegalEntities.address | `LegalEntities` | `address->>'country'` |

## SQL Patterns

### Employee Email (via Contract → Profile)

```javascript
const contracts = await Contract.findAll({
  where: { id: { [Op.in]: contractIds } },
  include: [{ model: Profile, as: 'Contractor', attributes: ['email'] }],
  useMaster: false,
});
const emailMap = new Map(contracts.map(c => [c.id, c.Contractor?.email]));
```

### Signature Profiles

```javascript
const profiles = await Profile.findAll({
  where: { publicId: { [Op.in]: profilePublicIds } },
  attributes: ['publicId', 'firstName', 'lastName', 'email', 'jobTitle'],
  useMaster: false,
});
const profileMap = new Map(profiles.map(p => [p.publicId, p]));
```

### Legal Entities

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

- [ ] PEO endpoint URL added to endpoints config
- [ ] Client service method calls PEO endpoint
- [ ] Enrichment service with batch methods created
- [ ] Tech ops endpoint returns enriched data
- [ ] Route registered with admin auth middleware
- [ ] Integration tests verify enrichment
- [ ] No N+1 queries (all enrichment uses Op.in pattern)

## Work Items

| ID | Name | Status |
|----|------|--------|
| 01 | Add endpoint URL | todo |
| 02 | Add client service method | todo |
| 03 | Create enrichment service | todo |
| 04 | Add tech ops endpoint | todo |
| 05 | Add route registration | todo |
| 06 | Add integration tests | todo |

## Technical Context

### Key Files

| File | Purpose |
|------|---------|
| `backend/services/peo/endpoints/entity_transfer_endpoints.ts` | Endpoint URLs |
| `backend/services/peo/entity_transfer_client_service.ts` | PEO HTTP client |
| `backend/services/peo/entity_transfer/helpers/transfer_enrichment_service.ts` | Enrichment (NEW) |
| `backend/controllers/admin/peo/tech_ops.ts` | Tech ops controller |
| `backend/models/profile.js` | Profile model |
| `backend/models/contract.js` | Contract model |
| `backend/models/legal_entity.js` | Legal entity model |

### Reference Patterns

| File | Pattern |
|------|---------|
| `backend/services/ems/decorator.js` | Batch enrichment with Maps |
| `backend/services/organizations/common/twofa_enrichment_service.js` | Enrichment service structure |

## Dependencies

### Depends On
- **EEXPR-12-1**: Migration for UUID profile_public_id (signatures)
- **EEXPR-12-2**: PEO endpoint returning raw transfer data

### Required By
- **EEXPR-12-4**: Public API endpoint will reuse enrichment service

## Notes

- All enrichment uses backend's own database - NO calls back to PEO
- Use `useMaster: false` for read queries to use replica
- Profile lookup uses `publicId` (UUID) after EEXPR-12-1 migration
- Maximum batch size considerations for very large transfers

## Parent Epic

[EEXPR-12: Endpoint to retrieve transfer details](../in_progress/EEXPR-12/README.md)
