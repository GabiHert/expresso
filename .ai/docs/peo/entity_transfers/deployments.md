# PEO Entity Transfer Deployments

Production deployment history for Entity Transfer support in the PEO microservice.

---

## December 2025 - Initial Production Deployment

**Date**: December 18, 2025  
**Epic**: PEOCM-661  
**Strategy**: Sequential Cherry-Pick  
**Status**: ✅ Complete

### Deployment Overview

Deployed entity transfer support endpoints and rollback handlers using two-stage cherry-pick strategy. These components enable the backend service to orchestrate complete employee transfers between legal entities.

---

## Cherry-Pick Deployments

### CP #1: Core Entity Transfer Support
**PR**: [#1578](https://github.com/letsdeel/peo/pull/1578)  
**Branch**: `PEOCM-661-cp-master`  
**Base**: `master`  
**Included**: 3 PRs

| PR | JIRA | Commit | Description |
|----|------|--------|-------------|
| #1487 | PEOCM-661 | `98ad1dad` | Core: Rollback handlers, document sharing, work location endpoints |
| #1568 | PEOCM-661-2 | `9a186a28` | Fix: Refactor to use excludeRequirementIds instead of excludeAgreementTypes |
| #1572 | PEOCM-661-5 | `e5de6cdf` | Fix: Minor tax document test fix |

#### Key Changes (PR #1487)

**Rollback Handlers** (48 tests):
- `EntityTransferRollbackHandler.ts` - Processes NATS outbox events
- `ENTITY_TRANSFER_CONTRACT_ROLLBACK` - Deletes PEO contracts
- `ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK` - Deletes shared documents
- Idempotent deletion (safe to retry)
- Comprehensive error handling

**Document Sharing** (624 lines of tests):
- `POST /peo/documents/share-compliance-documents`
- Copy compliance documents from old contract to new
- Filter by `excludeRequirementIds` array
- SQL-based implementation with `sequelize.escape()`
- Performance optimized with JOINs

**Work Location Endpoints**:
- `GET /peo/work-location/by-entity-work-location-id/:entityWorkLocationId`
- Fetch work location by entity UUID for validation

**Contract Enhancements**:
- Accept `previousPrismEmployeeId` in contract creation
- `deleteContract()` method for idempotent deletion
- `deleteFileSubmissionsByContractId()` for cleanup

**Transactional Outbox Integration**:
- Integrated handlers into OutboxService
- NATS JetStream consumption
- Transaction-safe event publishing

#### Fix: Document Filtering (PR #1568)

**Problem**: Original implementation used `includeAgreementTypes`/`excludeAgreementTypes` with hardcoded ContractRequirement ID mapping.

**Solution**:
- Changed to `excludeRequirementIds` array (numeric IDs)
- Backend does the AgreementType → ContractRequirement ID lookup
- SQL query filters by `contract_requirement_id` directly
- More flexible, environment-agnostic

**Before**:
```typescript
{
  excludeAgreementTypes: ['TYPE_A', 'TYPE_B']
  // PEO had to map: TYPE_A → ID 123, TYPE_B → ID 456
}
```

**After**:
```typescript
{
  excludeRequirementIds: [123, 456]
  // Backend looks up IDs, PEO filters directly
}
```

#### Files Modified (CP #1)

**New Files** (2):
- `src/modules/transactional-outbox/handlers/EntityTransferRollbackHandler.ts`
- `src/modules/transactional-outbox/handlers/EntityTransferRollbackHandler.spec.ts`

**Modified Files** (13):
- `src/app.ts`
- `src/config/FeatureFlag.service.ts`
- `src/controllers/peoContract/peoContractController.ts`
- `src/controllers/peoDocument/PeoDocumentController.ts`
- `src/controllers/workLocation/WorkLocationController.ts`
- `src/fixtures/outboxEvent.ts`
- `src/fixtures/peoFileSumission.ts`
- `src/models/BaseAssociations.ts`
- `src/models/outboxEvent/outboxEventDto.ts`
- `src/dto/peoFileSubmission/peoFileSubmissionDto.ts`
- `src/modules/transactional-outbox/services/OutboxService.ts`
- `src/modules/transactional-outbox/services/OutboxService.spec.ts`
- `src/services/peoContract/peoContractService.ts`
- `src/services/peoDocuments/peoDocumentService.ts`
- `src/services/peoWorkLocation/peoWorkLocationService.ts`

---

### CP #2: Internal Query Optimizations
**PR**: [#1579](https://github.com/letsdeel/peo/pull/1579)  
**Branch**: `PEOCM-792-cp-master`  
**Base**: `PEOCM-661-cp-master` → `master`  
**Included**: 1 PR

| PR | JIRA | Commit | Description |
|----|------|--------|-------------|
| #1564 | PEOCM-792 | `66674492` | Add getInternal support for work locations, skipPrismSync for benefit groups |

#### Key Changes (PR #1564)

**Work Location Internal Query**:
- `GET /peo/work-location/deel-entity/:deelEntityId?getInternal=true`
- New query parameter: `getInternal`
  - `true` → Returns from local `peo_work_locations` table (fast)
  - `false` (default) → Fetches from PrismHR API (slower, current)
- Enables faster queries during entity transfers
- Reduces external API calls

**Implementation**:
```typescript
// New service method
async getWorkLocationsByClientDeelEntityId(deelEntityId: number) {
  return this.peoWorkLocationRepository.findAll({
    where: {
      clientDeelEntityId: deelEntityId,
      isActive: true
    }
  });
}

// Controller routing
if (req.query.getInternal === 'true') {
  return peoWorkLocationService.getWorkLocationsByClientDeelEntityId(deelEntityId);
} else {
  return peoWorkLocationService.getWorkLocationsByDeelEntity(deelEntityId); // PrismHR
}
```

**Benefit Group Skip Sync**:
- `GET /peo/benefit-group/:groupId?skipPrismSync=true`
- New query parameter: `skipPrismSync`
  - `true` → Skip PrismHR synchronization
  - `false` (default) → Normal sync behavior
- Useful for read-only operations during transfers
- Improves performance by avoiding external calls

#### Files Modified (CP #2)

**Modified Files** (5):
- `src/controllers/benefitGroup/benefitGroupController.ts`
- `src/controllers/workLocation/WorkLocationController.ts`
- `src/services/benefitGroup/benefitGroupService.ts`
- `src/services/peoWorkLocation/peoWorkLocationService.ts`
- `src/services/peoWorkLocation/peoWorkLocationService.spec.ts`

---

## Deployment Coordination

### Deployment Order with Backend

```
Step 1: PEO CP #1
  ├─ Enables rollback handlers (backend needs these)
  ├─ Enables document sharing endpoint
  └─ Enables work location endpoints
     │
     ▼
Step 2: Backend CP #1
  ├─ Activates entity transfer feature
  └─ Calls PEO endpoints deployed in Step 1
     │
     ▼
Step 3: PEO CP #2
  ├─ Optimizes work location queries
  └─ Adds skipPrismSync for benefit groups
     │
     ▼
Step 4: Backend CP #2
  └─ Uses optimized PEO queries from Step 3
```

**Critical**: PEO CP #1 must deploy before Backend CP #1, as backend depends on PEO endpoints.

---

## Architecture

### Rollback Event Flow

```
Backend Transfer Fails
         │
         ▼
Backend publishes outbox event
         │
         ▼
PEO OutboxEvent table (via transaction)
         │
         ▼
NATS JetStream (via CDC)
         │
         ▼
PEO OutboxService consumer
         │
         ▼
EntityTransferRollbackHandler.handle()
         │
         ├─ ENTITY_TRANSFER_CONTRACT_ROLLBACK
         │  └─ deleteContract(deelContractId)
         │
         └─ ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK
            └─ deleteFileSubmissions(deelContractId)
```

### Integration Endpoints

```typescript
// Called by Backend during entity transfer

// Step 5: Cross-hire to new entity
POST /peo/contract/sync-contract-with-prism
{
  contractId: "uuid",
  previousPrismEmployeeId: "EMP123" // New field
}

// Step 6: Terminate old contract
POST /peo/contract/terminate
{
  contractId: "uuid",
  terminationDate: "2025-12-17"
}

// Step 7: Share compliance documents
POST /peo/documents/share-compliance-documents
{
  sourceDeelContractId: "uuid",
  targetDeelContractId: "uuid",
  excludeRequirementIds: [123, 456] // Changed from agreement types
}

// Step 3: Validate work location
GET /peo/work-location/by-entity-work-location-id/:entityWorkLocationId

// Pre-transfer: Get available work locations (optimized)
GET /peo/work-location/deel-entity/:deelEntityId?getInternal=true

// Pre-transfer: Get benefit groups (optimized)
GET /peo/benefit-group/:groupId?skipPrismSync=true
```

---

## Testing & Validation

### Unit Tests
- ✅ 48 rollback handler test cases
  - Contract rollback scenarios
  - File submission rollback scenarios
  - Idempotent deletion
  - Error handling
- ✅ 624 lines of document service tests
  - Document sharing logic
  - Filtering by requirement IDs
  - SQL injection prevention
  - Edge cases
- ✅ Work location service tests
  - getInternal flag behavior
  - Active filtering

### Integration Tests
- ✅ End-to-end rollback event flow via NATS
- ✅ Document sharing with various filters
- ✅ Work location queries (internal vs PrismHR)
- ✅ Benefit group queries with skipPrismSync

### Manual Testing Performed
- ✅ Share compliance documents between contracts
- ✅ Verify excludeRequirementIds filtering
- ✅ Test rollback events delete correct records
- ✅ Validate work location endpoint with UUID
- ✅ Test getInternal returns local data only
- ✅ Confirm skipPrismSync skips API calls
- ✅ Verify SQL injection prevention
- ✅ Test idempotent deletion (multiple attempts)

---

## Monitoring & Observability

### Key Metrics
- Document sharing success rate
- Rollback event processing success rate
- Work location query performance (internal vs PrismHR)
- Benefit group query performance (with/without sync)
- NATS outbox processing latency

### Logs to Monitor
- `EntityTransferRollbackHandler` - Rollback execution and results
- `peoDocumentService` - Document sharing operations and SQL queries
- `peoWorkLocationService` - Work location query routing
- `OutboxService` - NATS event processing
- NATS consumer errors

### Alerts
- Failed rollback event processing
- Document sharing SQL errors (syntax, timeout)
- Work location endpoint failures
- Benefit group endpoint failures
- NATS consumer lag >1000 messages
- Outbox event processing delays >5 minutes

---

## Rollback Procedures

### Level 1: Feature Flag (Fastest - Minutes)
```typescript
// src/config/FeatureFlag.service.ts
ENTITY_TRANSFER_ENABLED: false
```

### Level 2: Disable Rollback Handlers (Fast - Minutes)
```typescript
// src/modules/transactional-outbox/services/OutboxService.ts
// Comment out handler registration:
// this.registerHandler(new EntityTransferRollbackHandler(...));
```

### Level 3: Disable Endpoints (Fast - Minutes)
Comment out routes in:
- `src/controllers/peoDocument/PeoDocumentController.ts`
- `src/controllers/workLocation/WorkLocationController.ts`

Redeploy PEO service.

### Level 4: Git Revert (Complete - Hours)
```bash
cd peo
git revert -m 1 <cp2-merge-sha>  # Revert CP #2 first
git revert -m 1 <cp1-merge-sha>  # Then revert CP #1
git push origin master
```

---

## Database Impact

### Outbox Event Types
Added to support entity transfer rollbacks:
- `ENTITY_TRANSFER_CONTRACT_ROLLBACK`
- `ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK`

Consumed by `EntityTransferRollbackHandler` via NATS JetStream.

### Performance Considerations

**Document Sharing Query**:
- SQL query with JOINs on `peo_file_submissions`, `peo_agreements`, `contract_requirements`
- Indexed by: `contract_id`, `contract_requirement_id`
- Uses `sequelize.escape()` for SQL injection safety
- Performance tested with contracts having 50+ documents

**Work Location Internal Query**:
- Direct table query on `peo_work_locations`
- Indexed by: `clientDeelEntityId`, `isActive`
- ~10-50x faster than PrismHR API call
- Ideal for bulk operations (entity transfer resource discovery)

---

## Known Issues & Limitations

### Current Limitations
1. **Document Sharing Performance**: Large document sets (100+) may take >5 seconds
2. **Rollback Async Nature**: Rollback happens via NATS, not immediate (eventual consistency)
3. **SQL-Based Filtering**: Document filtering uses raw SQL, harder to maintain than ORM

### Future Improvements
- Batch document sharing for better performance
- Enhanced rollback retry logic with exponential backoff
- Monitoring dashboard for entity transfer operations
- Audit logging for all entity transfer operations
- Migration from raw SQL to Sequelize ORM queries

---

## Post-Deployment Actions

### Immediate (Day 1)
- ✅ Monitor NATS consumer lag
- ✅ Verify rollback handler registration
- ✅ Check first document sharing operation
- ✅ Validate work location endpoint responses

### Short-term (Week 1)
- [ ] Analyze rollback event frequency and reasons
- [ ] Review document sharing performance
- [ ] Monitor getInternal usage vs PrismHR calls
- [ ] Identify optimization opportunities

### Long-term (Month 1)
- [ ] Evaluate rollback success rates
- [ ] Optimize slow document sharing queries
- [ ] Consider caching for work locations
- [ ] Plan batch operations for high-volume transfers

---

## Related Documentation

### Internal Docs
- [PEO Entity Transfers README](./README.md) - Component overview
- [Backend Entity Transfers](../../backend/entity_transfers/) - Backend orchestration
- [Completed Tasks](../../_completed_tasks.md) - Full deployment entry

### External Resources
- [Technical Design Doc](https://docs.google.com/document/d/1li3kBanE-iGXxj-COGkY5tIyfFnpXZ5xbeNhajOD8Pw/edit?tab=t.0#heading=h.nxjl5qqlh8l2)
- [Implementation Guide](https://wiki.deel.network/en/deel-workspace/engineering/teams/PEO/Domains/EntityTransfer)

### GitHub PRs
- [#1578](https://github.com/letsdeel/peo/pull/1578) - Core entity transfer support
- [#1579](https://github.com/letsdeel/peo/pull/1579) - Internal query optimizations

---

_Last Updated: December 18, 2025_  
_Maintained By: PEO Team_
