<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/done/PEOCM-819/                               ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)           ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                  ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# PEOCM-819: Fix HiBob HRIS sync overwriting Contract effectiveDate

## Problem Statement

The HiBob HRIS integration incorrectly overwrites the Contract `effectiveDate` (agreement start date) with HiBob's `startDate` field during sync updates. This causes:

- Agreement start dates manually set by operations to be overwritten on every HiBob sync
- Original start dates replaced with PEO start dates
- 142 Bitfarms employees affected
- Client relationship at risk

**Root Cause**: Multiple locations in the HRIS sync code set `effectiveDate` from HRIS-provided dates when they should NOT update this field at all.

## Acceptance Criteria

- [ ] HRIS sync no longer updates Contract `effectiveDate` or `effectivePlainDate`
- [ ] HRIS sync no longer updates WorkStatement `effectiveDate`
- [ ] Unit tests updated to reflect new behavior
- [ ] Manual agreement start dates persist after HiBob sync

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Remove effectiveDate from job_data_update_builder | backend | done |
| 02 | Remove effectiveDate from peo_hris_sync_service | backend | done |
| 03 | Update unit tests | backend | done |

## Branches

| Repo | Branch |
|------|--------|
| backend | `PEOCM-819-fix-hris-effective-date` |

## Technical Context

### Bug Locations

| # | File | Line(s) | Issue |
|---|------|---------|-------|
| 1 | `services/peo/integrations/hris_integration_update/builders/job_data_update_builder.ts` | 163 | Sets `effectiveDate` and `effectivePlainDate` on Contract from `peoStartDate` |
| 2 | `services/peo/integrations/hris_integration_update/builders/job_data_update_builder.ts` | 176 | Sets `effectiveDate` on WorkStatement from `contractStartDate` |
| 3 | `services/peo/peo_hris_sync_service.ts` | 170-171 | Sets `effectiveDate` and `effectivePlainDate` on Contract from `peoStartDate` |

### Data Flow

```
HiBob API
    │
    ▼
peo_hris_integration_service.ts (initial mapping - CORRECT)
    │ hireDate → startDate
    │ startDate → peoStartDate
    ▼
Domain Events
    │
    ▼
peo_hris_integration_update_job_data_processor.js
    │
    ▼
hris_integration_update_service.ts
    │
    ▼
job_data_hris_integration_update_use_case.ts
    │ Line 283-284: Extracts peoStartDate and contractStartDate
    │ Line 559: Calls buildContractUpdateData
    ▼
job_data_update_builder.ts
    │ Line 163: BUG - effectiveDate = peoStartDate (WRONG)
    │ Line 176: BUG - WorkStatement effectiveDate = contractStartDate
    ▼
Contract.update() - Agreement date OVERWRITTEN
```

### What Should NOT Be Changed

- **Compensation builders** - Uses `compensationEffectiveDate` (different field)
- **Transformers** - Only READ effectiveDate from HRIS data
- **Type definitions** - Just interfaces
- **Employment service** - Updates employment/compensation dates (not Contract)

## Implementation Approach

1. **Remove effectiveDate assignments** from Contract updates in HRIS sync
2. **Remove effectiveDate assignment** from WorkStatement updates in HRIS sync
3. **Update tests** that expect the buggy behavior to expect the correct behavior
4. **Keep initialEffectiveDate** updates (these are correct)

## Risks & Considerations

- Tests currently EXPECT the buggy behavior - they will fail until updated
- No feature flags exist to control this behavior
- No guards prevent overwriting manually set agreement dates
- Data fix for Bitfarms is separate from this code fix

## Testing Strategy

1. Update unit tests in `hris_integration_update_service.spec.ts` to expect:
   - Contract update does NOT include `effectiveDate` or `effectivePlainDate`
   - WorkStatement update does NOT include `effectiveDate`
   - `initialEffectiveDate` and `initialEffectivePlainDate` still work correctly

2. Manual verification:
   - Create contract with manual agreement start date
   - Trigger HiBob sync update
   - Verify agreement start date is NOT overwritten

## Validation Guide

This guide explains how to validate that the fix works correctly by comparing behavior in environments with and without the fix deployed.

### Overview

The fix prevents HRIS sync from overwriting Contract `effectiveDate` and `effectivePlainDate`. To validate:
1. Collect evidence BEFORE the fix (environment without fix)
2. Collect evidence AFTER the fix (environment with fix)
3. Compare the results

### Prerequisites

- Access to test environment with HiBob integration
- Test contract with:
  - Active HRIS integration (HiBob)
  - Manual agreement start date set (different from HiBob startDate)
  - Contract OID for reference
- Admin access to trigger HRIS syncs
- Database access to query Contract dates

### Step 1: Prepare Test Contract

1. Identify a test contract with:
   - Active HRIS integration (HiBob)
   - Manual agreement start date set (different from HiBob startDate)
   - Contract OID for reference

2. Record baseline data:
   ```sql
   SELECT 
     id,
     oid,
     "effectiveDate",
     "effectivePlainDate",
     "initialEffectiveDate",
     "initialEffectivePlainDate",
     "updatedAt"
   FROM "Contracts"
   WHERE oid = '<contract-oid>';
   ```

### Step 2: Collect Evidence in Environment WITHOUT Fix

#### A. Before Sync - Capture Current State

```sql
-- Get contract dates before sync
SELECT 
  id,
  oid,
  "effectiveDate" as effective_date_before,
  "effectivePlainDate" as effective_plain_date_before,
  "initialEffectiveDate" as initial_effective_date_before,
  "initialEffectivePlainDate" as initial_effective_plain_date_before,
  "updatedAt" as updated_at_before
FROM "Contracts"
WHERE oid = '<contract-oid>';
```

#### B. Trigger HRIS Sync

**Option 1: Via Testing Endpoint (RECOMMENDED)**

Use the HRIS integration testing endpoint to trigger a sync synchronously:

```bash
POST /admin/peo/automation-test/hris-integration/validate-and-trigger-updates?sync=true

Body: {
  "employees": [{
    "integrationId": "<integration-id>",
    "organizationId": <org-id>,
    "hrisIntegrationProviderId": "<provider-id>",
    "employeeFirstName": "...",
    "employeeLastName": "...",
    "employeeEmail": "...",
    // ... other employee data from HiBob
    "peoStartDate": "2024-01-15",  // HiBob startDate
    "startDate": "2023-06-01"      // HiBob hireDate
  }]
}
```

**Option 2: Clean Integration Data to Force Retry**

```bash
POST /admin/peo/tech_ops/hris_integration/clean_contract_data/<contract-oid>
```

This clears cached HRIS integration data, forcing the next sync to reprocess the employee.

**Option 3: Wait for Automatic Sync**

If scheduled syncs are enabled, wait for the next automatic sync.

#### C. After Sync - Capture Updated State

```sql
-- Get contract dates after sync
SELECT 
  id,
  oid,
  "effectiveDate" as effective_date_after,
  "effectivePlainDate" as effective_plain_date_after,
  "initialEffectiveDate" as initial_effective_date_after,
  "initialEffectivePlainDate" as initial_effective_plain_date_after,
  "updatedAt" as updated_at_after
FROM "Contracts"
WHERE oid = '<contract-oid>';
```

#### D. Analyze Logs

Search for log entries with prefix `[PEO HRIS INTEGRATION UPDATE] [JOB DATA]`:

**Expected Log Pattern (WITHOUT FIX - Bug Present):**
```
"[PEO HRIS INTEGRATION UPDATE] [JOB DATA] Built contract update data"
  contractUpdateDataKeys: ["name", "firstName", "lastName", "jobTitleName", "effectiveDate", "effectivePlainDate", "initialEffectiveDate", "initialEffectivePlainDate", "state"]
  updateFields: ["name", "firstName", "lastName", "jobTitleName", "effectiveDate", "effectivePlainDate", "initialEffectiveDate", "initialEffectivePlainDate", "state"]

"[PEO HRIS INTEGRATION UPDATE] [JOB DATA] Contract update eligible, executing update"
  updateFields: ["name", "firstName", "lastName", "jobTitleName", "effectiveDate", "effectivePlainDate", "initialEffectiveDate", "initialEffectivePlainDate", "state"]
```

#### E. Compare Results

**Expected Results (WITHOUT FIX - Bug Present):**
- `effectiveDate_before ≠ effectiveDate_after` → BUG CONFIRMED
- `effectivePlainDate_before ≠ effectivePlainDate_after` → BUG CONFIRMED
- Logs show `effectiveDate` and `effectivePlainDate` in `updateFields` → BUG CONFIRMED

### Step 3: Collect Evidence in Environment WITH Fix

Repeat the same steps as Step 2, but in environment with fix deployed.

**Expected Results (WITH FIX - Bug Fixed):**
- `effectiveDate_before = effectiveDate_after` → FIX WORKS ✅
- `effectivePlainDate_before = effectivePlainDate_after` → FIX WORKS ✅
- Logs show NO `effectiveDate` or `effectivePlainDate` in `updateFields` → FIX WORKS ✅
- `initialEffectiveDate` still updates correctly → CORRECT BEHAVIOR MAINTAINED ✅

**Expected Log Pattern (WITH FIX - Bug Fixed):**
```
"[PEO HRIS INTEGRATION UPDATE] [JOB DATA] Built contract update data"
  contractUpdateDataKeys: ["name", "firstName", "lastName", "jobTitleName", "initialEffectiveDate", "initialEffectivePlainDate", "state"]
  (Note: NO effectiveDate or effectivePlainDate in the array)

"[PEO HRIS INTEGRATION UPDATE] [JOB DATA] Contract update eligible, executing update"
  updateFields: ["name", "firstName", "lastName", "jobTitleName", "initialEffectiveDate", "initialEffectivePlainDate", "state"]
  (Note: NO effectiveDate or effectivePlainDate in the array)
```

### Step 4: Database Query for Bulk Validation

To check multiple contracts affected by a client (e.g., Bitfarms with 142 employees):

```sql
-- Find contracts that might have been affected
SELECT 
  c.id,
  c.oid,
  c."effectiveDate",
  c."effectivePlainDate",
  c."initialEffectiveDate",
  c."initialEffectivePlainDate",
  c."updatedAt",
  hpi."hrisIntegrationProviderId"
FROM "Contracts" c
JOIN "HrisProfiles" hp ON hp.id = c."hrisProfileId"
JOIN "HrisProfileIntegrations" hpi ON hpi."hrisProfileId" = hp.id
WHERE hpi."hrisIntegrationProviderId" = <provider-id>
  AND c."effectiveDate" IS NOT NULL
ORDER BY c."updatedAt" DESC;
```

### Step 5: Check HRIS Integration Data Cache

The system uses MD5 hash comparison for change detection. Check the cached data:

```sql
-- Check cached HRIS integration data (for change detection)
SELECT 
  hpi."hris_integration_provider_id",
  hpi."json_hash",
  hpi."json_data"->>'peoStartDate' as hibob_peo_start_date,
  hpi."json_data"->>'startDate' as hibob_hire_date,
  hpi."updated_at"
FROM "peo_contract_hris_integration_data" hpi
JOIN "peo_contracts" pc ON pc.id = hpi."peo_contract_id"
JOIN "Contracts" c ON c.id = pc."contract_id"
WHERE c.oid = '<contract-oid>';
```

### Important Notes

1. **WorkStatement `effectivePlainDate` is intentionally kept**: The fix removed `effectiveDate` from Contract updates, but `effectivePlainDate` on WorkStatement is still updated (intentional, used for business logic). This is correct behavior.

2. **Two sync paths exist**:
   - `job_data_update_builder.ts` (domain-specific updates) - FIXED ✅
   - `peo_hris_sync_service.ts` (alternative sync path) - FIXED ✅
   - Both paths need validation

3. **Hash-based change detection**: If you clean the integration data using the `clean_contract_data` endpoint, the next sync will reprocess the employee.

4. **Testing endpoint**: The `/admin/peo/automation-test/hris-integration/validate-and-trigger-updates` endpoint is the most reliable way to trigger syncs for validation, especially with `sync=true` for synchronous processing.

### Validation Checklist

**Environment WITHOUT fix:**
- [ ] Capture Contract `effectiveDate` before sync
- [ ] Trigger HRIS sync
- [ ] Capture Contract `effectiveDate` after sync
- [ ] Verify `effectiveDate` changed (bug confirmed)
- [ ] Check logs show `effectiveDate` in `updateFields`

**Environment WITH fix:**
- [ ] Capture Contract `effectiveDate` before sync
- [ ] Trigger HRIS sync
- [ ] Capture Contract `effectiveDate` after sync
- [ ] Verify `effectiveDate` unchanged (fix confirmed)
- [ ] Check logs show NO `effectiveDate` in `updateFields`
- [ ] Verify `initialEffectiveDate` still updates correctly

### Related Documentation

- [HRIS Integration README](.ai/docs/peo/hris_integration/README.md)
- [HRIS Integration Testing Endpoints](.ai/docs/peo/hris_integration/testing_endpoints.md)
- [HRIS Integration Module Overview](.ai/docs/peo/hris_integration/module_overview.md)
- [Investigation Report](.ai/docs/peo/hris_integration/INVESTIGATION_REPORT_HiBob_Date_Mapping_Issue.md)

## Workspace

Worktree: `worktrees/PEOCM-819/`

## References

- Investigation Report: `.ai/docs/peo/hris_integration/INVESTIGATION_REPORT_HiBob_Date_Mapping_Issue.md`
- JIRA: https://letsdeel.atlassian.net/browse/PEOCM-819
