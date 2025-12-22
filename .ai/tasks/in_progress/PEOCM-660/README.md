<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/in_progress/PEOCM-660/                      ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)          ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                 ║
║ 4. Work on ONE item at a time from todo/                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

# PEOCM-660: Entity Transfer Tables and Repository Implementation

## Problem Statement

The entity transfer flow moved employees between legal entities but used a fully mocked repository in the backend. All operations (create, update, fetch) logged but did not persist data. This blocked:
- Resuming failed transfers
- Inspecting transfer status
- Tracking transfer history
- Processing scheduled transfers automatically

## What is Entity Transfer?

Entity transfer moves employees between legal entities (companies) within the Deel platform. It involves:
- Moving an employee from one legal entity to another
- Updating benefit groups, payroll settings, PTO policies, work locations, job codes
- Creating a new contract in the destination entity
- Terminating the old contract
- Sharing compliance documents
- Transferring time-off balances

The process has 11 steps executed sequentially, with rollback support if any step fails.

## Acceptance Criteria

- [x] PEO database tables created (peo_employee_transfers, peo_employee_transfer_items, peo_employee_transfer_signatures)
- [x] Sequelize models with associations
- [x] EntityTransferService with CRUD operations
- [x] EntityTransferController with 6 REST endpoints
- [x] Backend EntityTransferRepository uses HTTP calls instead of mocks
- [x] Tech ops POST endpoint supports resume mode
- [x] 3 GET endpoints for inspecting transfers
- [ ] **End-to-end testing completed**
- [ ] **Code review approved**

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | PEO database migrations | peo | done |
| 02 | PEO Sequelize models | peo | done |
| 03 | PEO EntityTransferService | peo | done |
| 04 | PEO EntityTransferController | peo | done |
| 05 | Backend EntityTransferClientService | backend | done |
| 06 | Backend EntityTransferRepository update | backend | done |
| 07 | Backend tech ops GET endpoints | backend | done |
| 08 | Unit tests | backend, peo | done |
| 09 | End-to-end testing | backend, peo | todo |

## Branches

| Repo | Branch |
|------|--------|
| backend | `PEOCM-660-entity-transfer-tables` |
| peo | `PEOCM-660-entity-transfer-tables` |

## Technical Context

### Database Schema

Created 3 tables in PEO service:

1. **peo_employee_transfers** - Master table for batch transfer requests
   - Tracks organization, requester, source/destination entities
   - Status: DRAFT, SCHEDULED, PROCESSING, COMPLETED, FAILED, CANCELLED
   - Records effective date and agreement references

2. **peo_employee_transfer_items** - Individual employees within a batch
   - Links to parent transfer
   - Stores employee contract OID (base_contract_oid)
   - Destination config: benefit group, payroll settings, PTO policy, work location, job code, team
   - Tracks item status and resume point (resume_from_step)

3. **peo_employee_transfer_signatures** - Signature tracking
   - Tracks admin and employee agreement signatures
   - Links to transfer and profile
   - Records signature timestamps

### API Endpoints (PEO)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/peo/entity-transfer/transfers` | Create new transfer |
| GET | `/peo/entity-transfer/transfers/:id` | Get transfer by ID |
| GET | `/peo/entity-transfer/items/:id` | Get transfer item |
| GET | `/peo/entity-transfer/transfers/ready` | Get ready transfers |
| PATCH | `/peo/entity-transfer/transfers/:id/status` | Update transfer status |
| PATCH | `/peo/entity-transfer/items/:id` | Update transfer item |

### Backend Integration

- `EntityTransferClientService` - HTTP client for PEO endpoints
- `EntityTransferRepository` - Updated to use HTTP calls instead of mocks
- Tech ops endpoints forward PEO responses (transparent proxy)

## Implementation Approach

### Phase 1: PEO Service (Completed)
- Database migrations with proper enums, indexes, foreign keys
- Sequelize models with associations
- EntityTransferService with CRUD operations
- REST API controller with 6 endpoints

### Phase 2: Backend Service (Completed)
- Created EntityTransferClientService
- Updated EntityTransferRepository to use HTTP calls
- Added resume mode to tech ops POST endpoint
- Added 3 GET endpoints for inspecting transfers

### Phase 3: Testing (In Progress)
- Need end-to-end testing with real data
- Need to verify resume functionality works correctly

## Impact

| Before | After |
|--------|-------|
| No data persistence | Full persistence in PEO database |
| No resume capability | Failed transfers can resume from last step |
| No visibility | Tech ops can inspect any transfer/item |
| No scheduled processing | Ready transfers can be fetched automatically |

## Deployment Order

1. **PEO service first** - Migrations + endpoints must be available
2. **Backend second** - Depends on PEO endpoints

**Breaking change**: No - this is additive functionality

**Data migration**: Existing in-progress transfers (if any) won't have DB records - they'll need to be recreated

## Risks & Considerations

- Deployment order is critical (PEO before backend)
- Existing transfers without DB records will fail on resume
- Need to test with production-like data volumes

## Testing Strategy

1. **Unit tests** - All new code has tests (completed)
2. **Integration tests** - Test PEO endpoints with database
3. **End-to-end tests** - Full transfer flow with resume scenarios

## References

- [Entity Transfers README](../../../docs/backend/entity_transfers/README.md)
- [Entity Transfers Deployments](../../../docs/backend/entity_transfers/deployments.md)
- [Transfer Resources 404 Error Guide](../../../docs/backend/entity_transfers/transfer_resources_404_error.md)
