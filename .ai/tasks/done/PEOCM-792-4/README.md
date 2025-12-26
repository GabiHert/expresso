<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/done/PEOCM-792-4/                           ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)          ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                 ║
║ 4. Work on ONE item at a time from todo/                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

# PEOCM-792-4: Filter positions without code in transfer_resources

## Problem Statement

The `getJobCodes()` method in `TransferResourcesService` was returning positions with undefined `id` fields when positions didn't have a Prism code. This caused:

- Invalid API responses with empty `id` fields
- Frontend errors when trying to use job codes without valid identifiers
- Positions from underwriting (not yet synced with Prism) appearing in the list without proper codes

**Root Cause**: The code attempted to use `pos.code || pos.jobCode` as a fallback, but:
- `pos.jobCode` doesn't exist on the position object
- `pos.jobTitle` also doesn't exist
- Positions without Prism codes should be filtered out entirely

## Acceptance Criteria

- [x] Positions without `code` are filtered out
- [x] All returned jobCodes have valid `id` field
- [x] Labels display position `title`
- [x] TypeScript compiles without errors

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | filter-positions-without-code | backend | done |

## Branches

| Repo | Branch |
|------|--------|
| backend | `PEOCM-792-4-filter-positions-without-code` |

## Technical Context

### Current Implementation

**File**: `backend/services/peo/entity_transfer/services/transfer_resources_service.ts`

**Before (Buggy Code)**:
```typescript
return positions.map((pos) => ({
    id: pos.code || pos.jobCode,  // ❌ pos.jobCode doesn't exist
    label: pos.title || pos.jobTitle || pos.code,  // ❌ pos.jobTitle doesn't exist
}));
```

**After (Fixed Code)**:
```typescript
return positions
    .filter((pos) => pos.code)  // ✅ Filter out positions without code
    .map((pos) => ({
        id: pos.code,  // ✅ Only positions with code reach here
        label: pos.title,  // ✅ Use correct field name
    }));
```

### API Endpoint

**Endpoint**: `GET /peo_integration/legal_entities/entity_transfer/:legalEntityPublicId/transfer_resources`

**Response Structure**:
```typescript
{
  benefitGroups: ResourceOption[];
  employmentPayrollSettings: ResourceOption[];
  ptoPolicies: ResourceOption[];
  workLocations: ResourceOption[];
  jobCodes: ResourceOption[];  // ← Fixed in this task
  teams: ResourceOption[];
}
```

### Position Data Source

Positions are fetched from PEO service via `peoPositionService.getByFilters()`, which calls the PEO microservice endpoint. Positions without Prism codes are typically from underwriting and haven't been synced with Prism yet.

## Implementation Approach

1. **Filter positions** - Only include positions that have a `code` field
2. **Simplify mapping** - Remove non-existent field references (`jobCode`, `jobTitle`)
3. **Use correct field** - Use `pos.title` for labels

## Risks & Considerations

- **Underwriting positions**: Positions without Prism codes won't appear until synced with Prism (intentional)
- **No breaking changes**: This is a bug fix that improves data quality
- **Frontend impact**: Frontend will no longer receive invalid job codes with empty IDs

## Testing Strategy

1. **Manual testing**: Call the endpoint and verify all `jobCodes` have valid `id` fields
2. **Edge cases**: Test with legal entities that have:
   - Only positions with codes
   - Only positions without codes
   - Mixed positions

## Workspace

Worktree: `worktrees/PEOCM-792-4/`

## References

- JIRA: https://letsdeel.atlassian.net/browse/PEOCM-792-4
- Related: PEOCM-792 (original transfer resources endpoint)
- Related: PEOCM-792-2 (expose endpoint for frontend)
- Related: PEOCM-792-3 (fix 404 errors and work location labels)

