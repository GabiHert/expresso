# Entity Transfers Documentation

Entity transfers handle the process of moving employees between legal entities.

## Overview

Entity transfers are managed within the PEO module in the backend, not as a separate module.

## Documentation

| Document | Purpose |
|----------|---------|
| [deployments.md](deployments.md) | Production deployment history, cherry-pick PRs, rollback procedures |
| [test-data-cleanup.md](test-data-cleanup.md) | Guide for preparing anonymized test data for PrismHR validation |
| [e2e-testing-guide.md](e2e-testing-guide.md) | Step-by-step E2E testing on Giger environments |

## Key Files

| File | Purpose |
|------|---------|
| `tasks/peo/process_entity_transfers.js` | Background task processor |
| `.ai_docs/context/entity_transfers_tdd.md` | Technical design doc |

## Related Migrations

- `add_entity_transfer_digest_key.js`
- `add_entity_transfer_rollback_events.js`
- `add_deleted_entity_transfer_email_template.js`

## API Payload Fields

The entity transfer endpoint requires the following fields:

### Organization & Requester

| Field | Description | Database Source |
|-------|-------------|-----------------|
| `organizationId` | Deel organization ID (the company) | `public.organizations.id` |
| `requesterProfilePublicId` | Admin/requester initiating the transfer | `public.profiles.public_id` |

### Employee Being Transferred

| Field | Description | Database Source |
|-------|-------------|-----------------|
| `basePeoContractOid` | The employee's current PEO contract (employee number on PrismHR) | `peo.peo_contracts.deel_contract_oid` |

### Source & Destination Entities

| Field | Description | Database Source |
|-------|-------------|-----------------|
| `sourceLegalEntityPublicId` | Legal entity the employee is **leaving** | `public.legal_entities.public_id` |
| `destinationLegalEntityPublicId` | Legal entity the employee is **joining** | `public.legal_entities.public_id` |

### Transfer Details

| Field | Description | Database Source |
|-------|-------------|-----------------|
| `effectiveDate` | When the transfer takes effect | Input only (stored in transfer record) |
| `agreementId` | Reference to the entity assignment agreement | `public.agreements.public_id` |

### New Entity Configuration

| Field | Description | Database Source |
|-------|-------------|-----------------|
| `newPayrollSettingsId` | Payroll settings (pay frequency) in the new entity | `employment.employment_payroll_settings.id` |
| `newBenefitGroupId` | Benefit group ID in the destination entity | `peo.peo_benefit_groups.prism_group_id` |
| `newPtoPolicyId` | PTO/time-off policy in the destination entity (UUID) | `time_off.policies.uid` |
| `newWorkLocationId` | Work location in the destination entity (UUID) | `entity_work_locations.public_id` |
| `newPositionPublicId` | Position public ID in the destination entity (UUID) | `peo.peo_positions.public_id` |
| `newTeamId` | Team assignment in the new entity (optional) | `public.teams.id` |

> **Note**: The field `newJobCode` is deprecated. Use `newPositionPublicId` instead.

### Example Payload

```json
{
  "organizationId": 248967,
  "requesterProfilePublicId": "8a123893-ecfc-4a96-ac93-348e131c3e2c",
  "basePeoContractOid": "mdqzz6j",
  "sourceLegalEntityPublicId": "973397ff-e02d-4602-800c-a640c5cfd6e9",
  "destinationLegalEntityPublicId": "626c5332-7f5c-4afd-a5db-2de2d7787e75",
  "effectiveDate": "2026-01-27",
  "newPayrollSettingsId": "cmhky5pbc000301eogtj1fsdl",
  "newBenefitGroupId": "1",
  "newPtoPolicyId": "8e54b4e5-3106-44ec-88fb-f25a2ced2819",
  "newWorkLocationId": "80389a62-a2de-4106-b2c2-205a7e7667e1",
  "newPositionPublicId": "c896145a-beb1-42ab-882b-496152d31693",
  "newTeamId": 378936
}
```
