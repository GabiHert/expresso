# Entity Transfer - PEO Microservice

PEO microservice support for Entity Transfer feature.

## Overview

The PEO microservice provides critical endpoints and rollback handlers for the Entity Transfer feature orchestrated by the backend service.

## Documentation

| Document | Purpose |
|----------|---------|
| [deployments.md](deployments.md) | PEO deployment history, rollback handlers, endpoints |

## Key Components

### Rollback Handlers
**Location**: `src/modules/transactional-outbox/handlers/EntityTransferRollbackHandler.ts`

Handles NATS outbox events for entity transfer rollbacks:
- `ENTITY_TRANSFER_CONTRACT_ROLLBACK` - Deletes PEO contracts on transfer failure
- `ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK` - Deletes shared documents on transfer failure

**Tests**: 48 comprehensive test cases

### Document Sharing Service
**Location**: `src/services/peoDocuments/peoDocumentService.ts`

- **Method**: `shareComplianceDocuments()`
- **Purpose**: Copy compliance documents from old contract to new contract
- **Filtering**: Supports `excludeRequirementIds` to exclude specific document types
- **Implementation**: SQL-based for performance with `sequelize.escape()` for safety

**Tests**: 624 lines of unit tests

### Work Location Endpoints
**Controller**: `src/controllers/workLocation/WorkLocationController.ts`  
**Service**: `src/services/peoWorkLocation/peoWorkLocationService.ts`

#### GET `/peo/work-location/by-entity-work-location-id/:entityWorkLocationId`
Fetch work location by entity work location UUID (used during transfer validation).

#### GET `/peo/work-location/deel-entity/:deelEntityId?getInternal=true`
Query parameter `getInternal`:
- `true` - Returns work locations from local `peo_work_locations` table (fast)
- `false` (default) - Fetches from PrismHR API (slower, always current)

### PEO Contract Enhancements
**Service**: `src/services/peoContract/peoContractService.ts`

- Accept `previousPrismEmployeeId` in contract creation for cross-hire support
- `deleteContract()` method for idempotent deletion during rollbacks
- `deleteFileSubmissionsByContractId()` for cleanup during rollbacks

## Integration with Backend

The backend entity transfer orchestrator calls these PEO endpoints:

```
Backend → PEO:
  POST /peo/contract/sync-contract-with-prism     (cross-hire)
  POST /peo/contract/terminate                     (termination)
  POST /peo/documents/share-compliance-documents   (documents)
  GET  /peo/work-location/by-entity-work-location-id/:id
  GET  /peo/work-location/deel-entity/:deelEntityId?getInternal=true

PEO → NATS:
  Outbox Event: ENTITY_TRANSFER_CONTRACT_ROLLBACK
  Outbox Event: ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK
```

## Files Modified by Entity Transfer

### New Files (2)
- `src/modules/transactional-outbox/handlers/EntityTransferRollbackHandler.ts`
- `src/modules/transactional-outbox/handlers/EntityTransferRollbackHandler.spec.ts`

### Modified Files (15)
- `src/app.ts`
- `src/config/FeatureFlag.service.ts`
- `src/controllers/peoContract/peoContractController.ts`
- `src/controllers/peoDocument/PeoDocumentController.ts`
- `src/controllers/workLocation/WorkLocationController.ts`
- `src/controllers/benefitGroup/benefitGroupController.ts`
- `src/fixtures/outboxEvent.ts`
- `src/fixtures/peoFileSumission.ts`
- `src/models/BaseAssociations.ts`
- `src/models/outboxEvent/outboxEventDto.ts`
- `src/dto/peoFileSubmission/peoFileSubmissionDto.ts`
- `src/modules/transactional-outbox/services/OutboxService.ts`
- `src/services/peoContract/peoContractService.ts`
- `src/services/peoDocuments/peoDocumentService.ts`
- `src/services/peoWorkLocation/peoWorkLocationService.ts`
- `src/services/benefitGroup/benefitGroupService.ts`

## Related Documentation

- **Backend Entity Transfers**: [../../backend/entity_transfers/](../../backend/entity_transfers/)
- **Completed Tasks**: [../../_completed_tasks.md](../../_completed_tasks.md)
- **PEO Service Overview**: [../README.md](../README.md)
