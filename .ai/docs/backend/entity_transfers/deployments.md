# Entity Transfer Deployments

Production deployment history for the Entity Transfer feature across backend and PEO microservice.

---

## December 2025 - Initial Production Deployment

**Date**: December 18, 2025  
**Epic**: PEOCM-661  
**Strategy**: Sequential Cherry-Pick  
**Status**: ✅ Complete

### Deployment Overview

Deployed complete Entity Transfer system using two-stage cherry-pick strategy across both repositories. This enables employees to transfer between legal entities while preserving all data and compliance requirements.

---

## Backend Repository

### CP #1: Core Entity Transfer Functionality
**PR**: [#118330](https://github.com/letsdeel/backend/pull/118330)  
**Branch**: `PEOCM-661-cp-master`  
**Base**: `master`  
**Included**: 8 PRs

| PR | JIRA | Commit | Description |
|----|------|--------|-------------|
| #111020 | PEOCM-661 | `abbe62a189d` | Core implementation with 11-step processor, 332 tests |
| #116480 | PEOCM-789 | `9470523f318` | Time-off integration, resume capability, EMS sync |
| #116801 | PEOCM-661 | `d8f314ebacf` | Zod validation refactor for cross-hire sanity check |
| #117234 | PEOCM-661-2 | `995349818a4` | Fix contract creation job code |
| #117222 | PEOCM-805 | `8d7d699f6ca` | Refactor TimeOff service, fix rollback transaction |
| #117387 | PEOCM-661-3 | `f7113b9db7a` | Remove redundant prismEmployeeId handling |
| #117428 | PEOCM-661-4 | `568a507b99b` | Add CopyI9DataStep, UpdateNewContractStatusStep |
| #117822 | PEOCM-661-5 | `1019e65e000` | Handle basePeoContractOid, enable permissions |

**Skipped**: PEOCM-661-cr (#114788) - Refactoring PR with merge conflicts; subsequent PRs already incorporated changes

### CP #2: Transfer Resources Service
**PR**: [#118331](https://github.com/letsdeel/backend/pull/118331)  
**Branch**: `PEOCM-792-cp-master`  
**Base**: `PEOCM-661-cp-master` → `master`  
**Included**: 1 PR

| PR | JIRA | Commit | Description |
|----|------|--------|-------------|
| #117089 | PEOCM-792 | `079b32f07f5` | Fix transfer-resources endpoint (benefit groups, work locations) |

---

## PEO Microservice

### CP #1: Core Entity Transfer Support
**PR**: [#1578](https://github.com/letsdeel/peo/pull/1578)  
**Branch**: `PEOCM-661-cp-master`  
**Base**: `master`  
**Included**: 3 PRs

| PR | JIRA | Commit | Description |
|----|------|--------|-------------|
| #1487 | PEOCM-661 | `98ad1dad` | Rollback handlers, document sharing, work location endpoints |
| #1568 | PEOCM-661-2 | `9a186a28` | Fix excludeAgreementTypes filtering → excludeRequirementIds |
| #1572 | PEOCM-661-5 | `e5de6cdf` | Minor test fix for tax documents |

### CP #2: Internal Query Optimizations
**PR**: [#1579](https://github.com/letsdeel/peo/pull/1579)  
**Branch**: `PEOCM-792-cp-master`  
**Base**: `PEOCM-661-cp-master` → `master`  
**Included**: 1 PR

| PR | JIRA | Commit | Description |
|----|------|--------|-------------|
| #1564 | PEOCM-792 | `66674492` | getInternal for work locations, skipPrismSync for benefit groups |

---

## Deployment Order

```
┌─────────────────────┐
│  1. PEO CP #1       │  Enables backend integration points
│     PR #1578        │  (Rollback handlers, endpoints)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Backend CP #1   │  Activates entity transfer feature
│     PR #118330      │  (Transfer processor, all steps)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. PEO CP #2       │  Performance optimizations
│     PR #1579        │  (Internal queries)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  4. Backend CP #2   │  Resource discovery
│     PR #118331      │  (Transfer resources endpoint)
└─────────────────────┘
```

**Rationale**: Backend depends on PEO endpoints. Core functionality deployed first, performance features second.

---

## Architecture

### 11 Transfer Steps

1. **Sanity Check Resources Exist** - Validate source contract and PEO contract
2. **Termination Sanity Check** - Verify termination preconditions
3. **Cross-Hire Sanity Check** - Validate destination entity resources
4. **Create Contract** - Create new Deel contract
5. **Cross-Hire** - Import to destination PrismHR entity
6. **Terminate Contract** - Terminate old contract (PrismHR + Deel)
7. **Share Compliance Documents** - Copy required documents with filtering
8. **Update Time-Off Employment** - Transfer PTO entitlements and dates
9. **Check Underwriting Status** - Monitor underwriting completion
10. **Force Complete Underwriting** - Auto-complete if ready
11. **Update Contract Status** - Activate based on effective date

### Key Components

**Backend**:
- `services/peo/entity_transfer/entity_transfer_service.ts` - Main orchestrator
- `services/peo/entity_transfer/entity_transfer_processor.ts` - Cron processor
- `services/peo/entity_transfer/transfer_step_executor.ts` - Step execution engine
- `services/peo/entity_transfer/steps/` - 11 individual step implementations
- `services/peo/entity_transfer/repositories/` - Data access layer

**PEO**:
- `src/modules/transactional-outbox/handlers/EntityTransferRollbackHandler.ts` - Rollback event handler
- `src/services/peoDocuments/peoDocumentService.ts` - Document sharing logic
- `src/services/peoWorkLocation/peoWorkLocationService.ts` - Work location queries
- `src/controllers/peoDocument/PeoDocumentController.ts` - Document endpoints
- `src/controllers/workLocation/WorkLocationController.ts` - Work location endpoints

### Integration Points

```
Backend → PEO Endpoints:
  • POST /peo/contract/sync-contract-with-prism (cross-hire)
  • POST /peo/contract/terminate (termination)
  • POST /peo/documents/share-compliance-documents (documents)
  • GET /peo/work-location/by-entity-work-location-id/:id (work location)
  • GET /admin/peo/tech_ops/transfer-resources (resources)

Backend → Time-Off Service:
  • POST /internal/employment/transfer-entitlements (PTO transfer)

Backend → EMS:
  • Employment materialization and status checks

PEO → NATS:
  • ENTITY_TRANSFER_CONTRACT_ROLLBACK (delete contracts)
  • ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK (delete documents)
```

---

## Features Deployed

### Core Functionality
✅ Step-based transfer processor with transaction boundaries  
✅ Automatic rollback on failure via transactional outbox  
✅ Resume capability when EMS employment not ready  
✅ Idempotent operations for safe retries  
✅ Comprehensive logging and error handling  

### Business Features
✅ Cross-hire to new PrismHR entity  
✅ Contract termination in old entity  
✅ Compliance document sharing with filtering  
✅ Time-off entitlement transfer  
✅ I-9 data copying (Section 1 & 2)  
✅ Contract status automation based on effective date  
✅ Underwriting auto-completion  

### Infrastructure
✅ 332 backend unit tests  
✅ 48 PEO rollback handler tests  
✅ 624 lines of PEO document service tests  
✅ NATS outbox event handling  
✅ Transaction management  
✅ Background cron processor  

---

## Testing & Validation

### Automated Testing
- ✅ 332 backend unit tests (all passing)
- ✅ 48 PEO rollback tests (all passing)
- ✅ Integration tests for full transfer flows
- ✅ Rollback scenario tests
- ✅ Resume capability tests

### Manual Testing Performed
- ✅ Entity transfer creation via tech_ops endpoint
- ✅ Cross-hire verification in PrismHR
- ✅ Document sharing with filter validation
- ✅ Time-off entitlement transfer confirmation
- ✅ Rollback mechanism on simulated failures
- ✅ Resume from various halted states
- ✅ I-9 data preservation verification
- ✅ Contract status updates validation
- ✅ Underwriting auto-completion

---

## Monitoring & Observability

### Key Metrics to Track
- Transfer success rate (target: >95%)
- Average transfer duration
- Step completion distribution
- Rollback invocation frequency
- Resume frequency and reasons
- Time-off transfer success rate
- EMS materialization delays

### Logs to Monitor
**Backend**:
- `entity_transfer_service.ts` - Transfer orchestration
- `transfer_step_executor.ts` - Step-by-step execution
- Individual step logs for debugging

**PEO**:
- `EntityTransferRollbackHandler.ts` - Rollback processing
- `peoDocumentService.ts` - Document sharing operations
- `peoWorkLocationService.ts` - Work location queries

**NATS**:
- Outbox event processing
- Handler execution status
- Retry attempts

### Alerts Configured
- Failed transfers (after all retries exhausted)
- Rollback failures
- EMS employment not ready for >24 hours
- Time-off service timeouts
- Document sharing SQL errors
- PrismHR API failures

---

## Rollback Procedures

### Level 1: Feature Flag (Fastest - Minutes)
Disable feature without code changes:

```typescript
// Backend: services/peo/peo_feature_flags.ts
ENTITY_TRANSFER_ENABLED: false

// PEO: src/config/FeatureFlag.service.ts
ENTITY_TRANSFER_ENABLED: false
```

### Level 2: Endpoint Disable (Fast - Minutes)
Comment out routes and redeploy:

**Backend**: `controllers/admin/peo/tech_ops.ts`  
**PEO**: Individual controllers (peoDocument, workLocation)

### Level 3: Git Revert (Complete - Hours)
Full code rollback:

```bash
# Backend
cd backend
git revert -m 1 <cp2-merge-sha>  # Revert CP #2 first
git revert -m 1 <cp1-merge-sha>  # Then revert CP #1
git push origin master

# PEO
cd peo
git revert -m 1 <cp2-merge-sha>
git revert -m 1 <cp1-merge-sha>
git push origin master
```

**Important**: Revert in reverse order (CP #2 before CP #1) due to dependencies.

---

## Database Changes

### Backend Migrations
- `20251126094409-add_entity_transfer_rollback_events.js`
  - Added outbox event types: `ENTITY_TRANSFER_CONTRACT_ROLLBACK`, `ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK`

### PEO Migrations
- No new migrations (uses existing tables)
- Leverages transactional outbox pattern

---

## Known Issues & Limitations

### Current Limitations
1. **EMS Dependency**: Transfers halt if EMS employment not ready; requires cron retry
2. **Manual Testing Required**: No automated E2E tests across all services yet
3. **Performance**: Large document sets may slow down sharing step
4. **Monitoring Gaps**: No centralized dashboard for transfer metrics yet

### Planned Improvements
- PEOCM-661-6: Benefit group ID migration
- Frontend UI for entity transfers (currently API-only)
- Enhanced monitoring dashboard
- Performance optimizations for document sharing
- E2E integration test suite

---

## Post-Deployment Actions

### Immediate (Day 1)
- ✅ Monitor logs for errors
- ✅ Verify first production transfer
- ✅ Check metric dashboards
- ✅ Confirm rollback mechanism standby

### Short-term (Week 1)
- [ ] Analyze transfer success rates
- [ ] Review performance metrics
- [ ] Identify optimization opportunities
- [ ] Gather user feedback

### Long-term (Month 1)
- [ ] Evaluate feature adoption
- [ ] Plan enhancements based on usage patterns
- [ ] Update documentation with learnings
- [ ] Optimize based on production data

---

## Related Documentation

### Internal Docs
- [Entity Transfers README](./../backend/entity_transfers/README.md) - API payloads and overview
- [Test Data Cleanup](./../backend/entity_transfers/test-data-cleanup.md) - Test data preparation
- [Completed Tasks](./../_completed_tasks.md) - Full deployment entry

### External Resources
- [Technical Design Doc](https://docs.google.com/document/d/1li3kBanE-iGXxj-COGkY5tIyfFnpXZ5xbeNhajOD8Pw/edit?tab=t.0#heading=h.nxjl5qqlh8l2)
- [Implementation Guide](https://wiki.deel.network/en/deel-workspace/engineering/teams/PEO/Domains/EntityTransfer)

### GitHub PRs
- Backend: [#118330](https://github.com/letsdeel/backend/pull/118330), [#118331](https://github.com/letsdeel/backend/pull/118331)
- PEO: [#1578](https://github.com/letsdeel/peo/pull/1578), [#1579](https://github.com/letsdeel/peo/pull/1579)

---

_Last Updated: December 18, 2025_  
_Maintained By: PEO Team_
