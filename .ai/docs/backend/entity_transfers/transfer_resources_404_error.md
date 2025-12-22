# Transfer Resources 404 Error Handling

**JIRA**: [PEOCM-792-3](https://letsdeel.atlassian.net/browse/PEOCM-792-3)
**Status**: Completed
**Date**: 2025-12-19

## Overview

The `/peo_integration/legal_entities/entity_transfer/:legalEntityPublicId/transfer_resources` endpoint can return 500 errors when the PEO service returns 404 responses for missing client records. This document explains the root cause and the fix implemented.

## Bug 1: 404 Error Handling in Position Service

### Problem

When a legal entity has no PEO clients, the endpoint returns 500 instead of 200 with empty arrays.

### Root Cause

The `peoPositionService` methods (`getByFilters()` and `getPositions()`) don't check HTTP status before validating response data:

1. `BasePEOService` configures axios with `validateStatus: (status) => status < 500`
2. This means 4xx responses don't throw - they return response objects
3. When PEO returns 404, `response.data` is an error object `{message: "..."}`, not an array
4. Code checks `!Array.isArray(response.data)` without checking `response.status` first
5. This incorrectly throws a 500 error instead of handling 404 gracefully

### Impact

- Frontend receives 500 errors for valid scenarios (entities without PEO clients)
- Entire request fails even when other resources (benefit groups, pay groups, etc.) are fetched successfully
- Inconsistent behavior: work locations handle 404 gracefully, positions don't

### Solution

Fixed both methods to:
1. Check `response.status === 404` before validating `response.data`
2. Return empty array `[]` on 404 instead of throwing
3. Use `this.log.warn()` for expected 404s (not `error()`)
4. Fix typo: "Unable to job details" -> "Unable to fetch job details"

**Pattern followed**: Same pattern as `work_location_service.ts:91-107`

```typescript
// Before (broken)
if (!Array.isArray(response.data)) {
  throw new Error('Invalid response');
}

// After (fixed)
if (response.status === 404) {
  this.log.warn('No positions found for client');
  return [];
}
if (!Array.isArray(response.data)) {
  throw new Error('Invalid response');
}
```

---

## Bug 2: Work Location Labels Using Wrong Data Source

### Problem

Work location labels use city/state or locationId instead of the proper name from the database.

### Root Cause

The `getWorkLocations()` method in `TransferResourcesService` was using:
- `city, state` format when available (e.g., "New York, NY")
- `locationId` as fallback (e.g., "HECTZO6BOK" - not user-friendly)

However, the `entity_work_locations` table has a `name` column (NOT NULL) with proper names like "NYC Headquarters Office" that should be used.

### Impact

- Poor UX: Users see technical IDs or city/state instead of proper names
- Inconsistent with other parts of the system that use proper names

### Solution

1. Added `fetchWorkLocationNames()` helper method:
   - Uses Sequelize ORM to batch fetch names from `entity_work_locations` table
   - Uses `Op.in` for performance (single database query for all locations)
   - Returns `Map<string, string>` for O(1) lookups

2. Modified `getWorkLocations()` to:
   - Fetch proper names from database using the helper method
   - Use `name` only - no fallback (returns empty string if name not found)
   - Single batch query per request (not individual queries)

**Pattern followed**: Same pattern as `work_location_service.ts:411-419`

```typescript
// Helper method
private async fetchWorkLocationNames(locationIds: string[]): Promise<Map<string, string>> {
  const workLocations = await EntityWorkLocation.findAll({
    where: { locationId: { [Op.in]: locationIds } },
    attributes: ['locationId', 'name'],
    useMaster: false,
  });
  return new Map(workLocations.map(wl => [wl.locationId, wl.name]));
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `services/peo/peo_position_service.ts` | Fixed `getByFilters()` and `getPositions()` to return `[]` on 404, fixed typo |
| `services/peo/entity_transfer/services/transfer_resources_service.ts` | Added `fetchWorkLocationNames()` helper, modified `getWorkLocations()` to use proper names |

## Test Files Created

| File | Coverage |
|------|----------|
| `services/peo/__tests__/peo_position_service.spec.ts` | Unit tests for 404 handling in both methods, success/error scenarios |
| `services/peo/entity_transfer/__tests__/transfer_resources_service.spec.ts` | Unit tests for work location name fetching, helper method, edge cases |

---

## Key Architectural Points

### Why 404 is Valid

- Not all legal entities have PEO clients (e.g., entities not yet onboarded to PEO)
- Missing client = no resources available, not an error condition
- Should return empty arrays, not throw errors

### Axios Configuration in BasePEOService

```typescript
validateStatus: (status) => status < 500
```

- 4xx responses don't throw exceptions
- Code must check `response.status` before validating `response.data`
- This is a common pattern across PEO service integrations

### Database Query Optimization

- Uses batch query with `Op.in` to fetch all work location names in a single database call
- Uses `Map<string, string>` for O(1) lookups instead of nested loops
- Uses replica database (`useMaster: false`) for read queries

---

## Acceptance Criteria (All Met)

### Bug 1 - 404 Error Handling
- [x] Legal entities with no PEO clients return 200 (not 500)
- [x] `jobCodes` array is empty `[]` when no positions exist
- [x] WARN level logs for expected 404 scenarios
- [x] NO ERROR level logs for expected 404 scenarios
- [x] Typo fixed: "Unable to job details" -> "Unable to fetch job details"

### Bug 2 - Work Location Labels
- [x] Work location labels show proper names from `entity_work_locations.name`
- [x] Empty string `""` returned when name not available (name only, no fallback)
- [x] Single batch database query per request (not individual queries)
- [x] Performance is acceptable with multiple work locations

### General
- [x] No 500 errors for expected scenarios
- [x] Response format unchanged (backward compatibility)
- [x] All unit tests pass
- [x] All linting errors fixed

---

## Commits

| Commit | Description |
|--------|-------------|
| `33fd193fa29` | Main fix commit (PEOCM-792-3) |
| `445953434e2` | Test fix commit |
| `3d6a091489d` | First lint fix commit |
| `b2df404d5f8` | Final lint fix commit |

---

## Related Documentation

- [Entity Transfers README](./README.md)
- [Deployments Guide](./deployments.md)

## Related Tasks

- [PEOCM-792](https://letsdeel.atlassian.net/browse/PEOCM-792) - Transfer Resources Endpoint (original implementation)
- [PEOCM-792-2](https://letsdeel.atlassian.net/browse/PEOCM-792-2) - Expose Transfer Resources for Frontend
