<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: DOMAIN                                                    ║
║ STATUS: Living log - Append completed tasks here                ║
╠══════════════════════════════════════════════════════════════════╣
║ This file tracks all completed tasks for historical reference.   ║
║ Use /task-done to automatically append entries.                  ║
╚══════════════════════════════════════════════════════════════════╝
-->

# Completed Tasks Log

## Format

```
## YYYY-MM-DD: JIRA-XXX - Title

**Repos affected**: repo1, repo2
**Summary**: Brief description of what was done
**Key changes**:
- Change 1
- Change 2

**Documentation created**: (if any)
- [Doc name](./path/to/doc.md)
```

---

<!-- Completed tasks will be appended below -->

## 2025-12-19: PEOCM-792-3 - Fix Transfer Resources Endpoint Bugs

**Repos affected**: backend
**JIRA**: [PEOCM-792-3](https://letsdeel.atlassian.net/browse/PEOCM-792-3)

**Summary**: Fixed two bugs in the transfer resources endpoint (`/peo_integration/legal_entities/entity_transfer/:legalEntityPublicId/transfer_resources`) that caused 500 errors and poor UX.

**Bug 1 - 404 Error Handling in Position Service**:
- Problem: When a legal entity has no PEO clients, endpoint returns 500 instead of 200 with empty arrays
- Root cause: `peoPositionService` methods don't check HTTP status before validating response data. BasePEOService uses `validateStatus: (status) => status < 500`, so 4xx responses don't throw but return error objects
- Fix: Check `response.status === 404` before validating `response.data`, return empty array `[]` on 404
- Pattern followed: Same as `work_location_service.ts:91-107`

**Bug 2 - Work Location Labels Using Wrong Data Source**:
- Problem: Work location labels show city/state or locationId instead of proper names
- Root cause: `getWorkLocations()` was using city/state format or locationId fallback instead of `entity_work_locations.name`
- Fix: Added `fetchWorkLocationNames()` helper using Sequelize ORM batch query with `Op.in`, returns proper names from database
- Pattern followed: Same as `work_location_service.ts:411-419`

**Files modified**:
- `services/peo/peo_position_service.ts` - Fixed `getByFilters()` and `getPositions()` to return `[]` on 404, fixed typo
- `services/peo/entity_transfer/services/transfer_resources_service.ts` - Added `fetchWorkLocationNames()` helper, modified `getWorkLocations()` to use proper names

**Tests created**:
- `services/peo/__tests__/peo_position_service.spec.ts`
- `services/peo/entity_transfer/__tests__/transfer_resources_service.spec.ts`

**Commits**:
- `33fd193fa29` - Main fix commit
- `445953434e2` - Test fix commit
- `3d6a091489d` - First lint fix commit
- `b2df404d5f8` - Final lint fix commit

**Learnings**:
- BasePEOService axios config `validateStatus: (status) => status < 500` means 4xx responses don't throw - must check `response.status` before validating `response.data`
- Use batch queries with `Op.in` for performance when fetching related data
- 404 is valid for entities without PEO clients - should return empty arrays, not errors

**Documentation created**:
- [Transfer Resources 404 Error Guide](./backend/entity_transfers/transfer_resources_404_error.md)

---

## 2025-12-18: PEO HRIS Integration Documentation

**Repos affected**: peo, backend
**Type**: Documentation

**Summary**: Created comprehensive documentation for PEO HRIS Integration feature, covering the system for synchronizing employee data from HRIS providers (BambooHR, Hibob, Workday) into PEO contracts.

**Key changes**:
- Documented HRIS integration service architecture
- Documented employee data mapping and transformation
- Documented event-driven update processing
- Documented domain-specific update events (Job Data, Compensation, Demographic, Bank Info, Termination)

**Documentation created**:
- [HRIS Integration README](./peo/hris_integration/README.md)
- [Testing Endpoints Guide](./peo/hris_integration/testing_endpoints.md)
- [HiBob Testing Guide](./peo/hris_integration/hibob_testing_guide.md)
- [Module Overview](./peo/hris_integration/module_overview.md)

**Learnings**:
- HRIS integration uses event-driven architecture with NATS for async processing
- Change detection via MD5 hash comparison prevents unnecessary processing
- Domain-specific events enable granular contract updates
- Two-tier consumer architecture (main update consumer + domain-based consumer) enables efficient processing

---

## 2025-12-18: PEOCM-792-2 - Expose Transfer Resources Endpoint for Frontend

**Repos affected**: backend
**JIRA**: [PEOCM-792-2](https://letsdeel.atlassian.net/browse/PEOCM-792-2)

**Summary**: Added client-facing endpoint under `/peo_integration/legal_entities/entity_transfer/:legalEntityPublicId/transfer_resources` that exposes transfer resources (benefit groups, work locations, PTO policies, etc.) for entity transfer destination selection.

**Key changes**:
- Added new endpoint in `controllers/peo_integration/index.js`
- Uses `app.profileType([ROLES.CLIENT])` for authentication
- Validates legal entity access using `validatePEOLegalEntityAccessMiddleware`
- Reuses existing `TransferResourcesService.getTransferResources()`

**Learnings**:
- Authorization Pattern: `validatePEOLegalEntityAccessMiddleware` pattern used across PEO integration endpoints
- Endpoint Structure: `/peo_integration/` for client-facing endpoints vs `/admin/peo/` for tech ops

---

## 2025-12-18: Entity Transfer - Production Deployment

**Repos affected**: backend, peo
**Epic**: PEOCM-661

**Summary**: Deployed complete Entity Transfer feature to production via sequential cherry-pick strategy. System enables employees to move between legal entities while preserving contracts, documents, time-off entitlements, and I-9 data.

**Key changes**:
- Backend CP #1: [PR #118330](https://github.com/letsdeel/backend/pull/118330) - Core Entity Transfer (8 PRs)
- Backend CP #2: [PR #118331](https://github.com/letsdeel/backend/pull/118331) - Transfer Resources (1 PR)
- PEO CP #1: [PR #1578](https://github.com/letsdeel/peo/pull/1578) - Core Support (3 PRs)
- PEO CP #2: [PR #1579](https://github.com/letsdeel/peo/pull/1579) - Internal Queries (1 PR)

**Documentation created**:
- [Deployments History](./backend/entity_transfers/deployments.md)

**Learnings**:
- Sequential CP strategy mitigates risk for large features
- Step-based architecture enables granular debugging and rollback
- NATS outbox pattern provides reliable async rollback
- Resume capability critical for long-running transfers dependent on external services

---

## 2025-12-18: PEOCM-792 - Transfer Resources Endpoint - Fix Work Locations

**Repos affected**: backend, peo
**JIRA**: [PEOCM-792](https://letsdeel.atlassian.net/browse/PEOCM-792)

**Summary**: Added `getInternal` query parameter support to PEO work locations endpoint. When `getInternal=true`, returns work locations from local `peo_work_locations` table instead of PrismHR API.

**Key changes**:
- Backend: Fixed to pass `getInternal=true` and use numeric legalEntityId for work locations request
- PEO: Added `getWorkLocationsByClientDeelEntityId()` method and updated controller to route based on `getInternal` parameter

**PRs**:
- backend: https://github.com/letsdeel/backend/pull/117089
- peo: https://github.com/letsdeel/peo/pull/1564

**Learnings**:
- PEO work locations use deelEntityId → peo_clients.id → peo_work_locations.client_id mapping
- Backend uses `useMaster: false` pattern for read-only queries to reduce DB load

---

## 2025-12-17: PEOCM-661-5 - Change basePeoContractId to basePeoContractOid

**Repos affected**: backend, peo
**PRs**: [backend#117822](https://github.com/letsdeel/backend/pull/117822), [peo#1572](https://github.com/letsdeel/peo/pull/1572)

**Summary**: Refactored entity transfer API to use `basePeoContractOid` (peo_contracts.deel_contract_oid string) instead of `basePeoContractId` (peo_contracts.id integer). This improves API design by using stable public identifiers instead of internal database IDs.

**Key changes**:
- Backend: Updated types, validation, service, and tests to use `basePeoContractOid` (string)
- Backend: Added defensive handling for 204 responses from PEO service
- PEO: Removed `/by-id/:peoContractId` endpoint and `getPeoContractByInternalId()` method

**Learnings**:
- PEO's `@OnNull(404)` decorator can return 204 in practice - always handle both status codes defensively
- When changing API parameters from internal IDs to public identifiers, verify the identifier format with actual database values
