# Entity Transfers Documentation

Entity transfers handle the process of moving employees between legal entities.

## Overview

Entity transfers are managed within the PEO module in the backend, not as a separate module.

## Documentation

| Document | Purpose |
|----------|---------|
| [deployments.md](deployments.md) | Production deployment history, cherry-pick PRs, rollback procedures |
| [test-data-cleanup.md](test-data-cleanup.md) | Guide for preparing anonymized test data for PrismHR validation |

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
| `newBenefitGroupId` | Benefit group ID in the destination entity | `peo.peo_benefit_groups.id` |
| `newPtoPolicyId` | PTO/time-off policy in the destination entity | `peo.prism_hr_pto_policies.id` |
| `newWorkLocationId` | Work location in the destination entity | `peo.work_locations.id` |
| `newJobCode` | Position/job code in the destination entity | `peo.peo_positions.code` |
| `newTeamId` | Team assignment in the new entity (optional) | `public.teams.id` |

### Example Payload

```json
{
  "organizationId": 106252,
  "requesterProfilePublicId": "bfad0491-eca1-4857-ac9a-7e30002a44d4",
  "basePeoContractOid": "EMP12345",
  "sourceLegalEntityPublicId": "13c44a93-cf52-4dd3-a1ba-cf8e8404cd10",
  "destinationLegalEntityPublicId": "6569739c-33d5-4897-82f5-5284d2b17e71",
  "effectiveDate": "2025-12-17",
  "agreementId": "AGR-TEST-0E31823D",
  "newPayrollSettingsId": "cmj1mkiml01to01cngrnz3z1h",
  "newBenefitGroupId": "1",
  "newPtoPolicyId": "7422d56a-a372-46c5-adbd-9463d16d58cb",
  "newWorkLocationId": "1eb08af5-4ce9-4fb1-8ddd-ab8ae5bb23c6",
  "newJobCode": "SRCONSULARC",
  "newTeamId": 205923
}
```
