<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-13-e2e-test-giger.md                        ║
║ TASK: EEXPR-13                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                 ║
║ 2. Update status.yaml with new status                           ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml              ║
║ 5. Update task README with any learnings                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
# Repository Context (EEXPR-13)
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/worktrees/EEXPR-13/backend
branch: EEXPR-13-entity-transfer-post
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/worktrees/EEXPR-13/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# E2E Test on Giger (EEXPR-12)

## Objective

Test the complete entity transfer flow on the Giger environment (EEXPR-12: `dev-w268o9nc0f`) to verify that:
1. UW requests are created with Prism codes (not UUIDs)
2. `CheckUnderwritingRequestStatus` finds them by Prism code
3. The full transfer pipeline works end-to-end

## Pre-Implementation

**Depends on**: EEXPR-13-11 and EEXPR-13-12 must be committed and deployed to Giger.

### Setup Steps

1. **Deploy to Giger**: Push the branch with EEXPR-13-11 and EEXPR-13-12 changes, then deploy to EEXPR-12 environment via Giger MCP
2. **Prepare API access**: Use Deel API MCP (`deel-api`) switched to GIGER environment with a valid admin token
3. **Prepare SQL access**: Use SQL MCP (`sql-query`) connected to the Giger environment database

## Implementation Steps

### Step 1: Prepare test data via SQL MCP

**Tool**: `mcp__sql-query__query_database`

Find resources that have existing UW requests (to test the flow with real data):

```sql
-- Find work locations with UW requests in UNDER_REVIEW status
SELECT prr.id, prr.public_id, prr.description, prr.resource, prr.status,
       prr.legal_entity_id
FROM peo.prism_resource_requests prr
WHERE prr.status = 'UNDER_REVIEW'
  AND prr.resource IN ('WORK_LOCATION', 'POSITION')
ORDER BY prr.created_at DESC
LIMIT 20;
```

```sql
-- Find a valid source contract for transfer testing
-- Need: organization with multiple legal entities, active PEO contract
SELECT c.oid, c.organization_id, c.deel_legal_entity_id,
       c.status, le.name as entity_name
FROM public.contracts c
JOIN public.legal_entities le ON le.id = c.deel_legal_entity_id
WHERE c.type = 'peo_employee'
  AND c.status = 'active'
  AND c.organization_id IN (
    SELECT organization_id FROM public.contracts
    WHERE type = 'peo_employee'
    GROUP BY organization_id
    HAVING COUNT(DISTINCT deel_legal_entity_id) > 1
  )
LIMIT 10;
```

### Step 2: Create a transfer with missing resources via Deel API MCP

**Tool**: `mcp__deel-api__deel_execute`

1. Switch to GIGER environment: `deel_switch_env` to GIGER
2. Set admin token variable: `deel_set_variable` with fresh token
3. Execute the Create Entity Transfer request with:
   - A valid source contract OID
   - A destination legal entity where work location/position DON'T exist
   - This should trigger UW request creation

### Step 3: Verify UW requests have Prism codes via SQL MCP

**Tool**: `mcp__sql-query__query_database`

After creating the transfer, verify the UW request descriptions:

```sql
-- Check the most recently created UW requests
SELECT prr.id, prr.public_id, prr.description, prr.resource,
       prr.status, prr.created_at, prr.legal_entity_id
FROM peo.prism_resource_requests prr
ORDER BY prr.created_at DESC
LIMIT 5;
```

**Expected**: The `description` field should contain a Prism code (e.g., `"CA"` for work location, `"DEV-001"` for position) NOT a UUID.

### Step 4: Execute the transfer via tech-ops endpoint

**Tool**: `mcp__deel-api__deel_execute`

Call the tech-ops entity transfer execution endpoint to simulate the cron job for the specific transfer item:
- This triggers the 13-step pipeline
- Step 3 (CheckUnderwritingRequestStatus) should find UW requests by Prism code
- Step 4 (ForceCompleteUnderwriting) should handle pending UW requests

### Step 5: Verify Step 3 found UW requests by Prism code

**Tool**: `mcp__sql-query__query_database`

Check the transfer item status and step results:

```sql
-- Check transfer item status
SELECT eti.id, eti.public_id, eti.status, eti.resume_from_step,
       eti.completed_steps, eti.created_at
FROM peo.entity_transfer_items eti
ORDER BY eti.created_at DESC
LIMIT 5;
```

**Expected**:
- If UW requests were UNDER_REVIEW: Item should be `WAITING_FOR_RESOURCES` (ForceComplete ran and halted)
- If UW requests were APPROVED: Item should progress further through pipeline
- In both cases: Step 3 should NOT log "UUID fallback" messages (check pod logs if available)

### Step 6: (Optional) Check pod logs for UUID fallback absence

**Tool**: `mcp__giger__k8s_get_pod_logs`

Check backend pod logs to confirm no "UUID fallback" log messages appear during the transfer execution. Search for:
- `"No work location UW request found by prism code - trying UUID fallback"` should NOT appear
- `"CheckUnderwritingRequestStatus"` messages should show successful Prism code search

## Post-Implementation

Document test results in this file under "Test Results" section.

## Acceptance Criteria

- [ ] Transfer created successfully with missing resources
- [ ] UW request `description` field contains Prism code (verified via SQL)
- [ ] Transfer execution finds UW requests by Prism code (no UUID fallback)
- [ ] No "UUID fallback" log messages in pod logs
- [ ] Full pipeline progression as expected (WAITING_FOR_RESOURCES or further)

## Test Results

_Fill in after execution:_

| Test | Result | Notes |
|------|--------|-------|
| Transfer creation | | |
| UW description = Prism code | | |
| Step 3 finds by Prism code | | |
| No UUID fallback logs | | |
| Pipeline status correct | | |

## Notes

- Giger environment: EEXPR-12 (`dev-w268o9nc0f`)
- Test organizations have `peoTestOrganizations` feature flag - OpsWorkbench tasks are NOT created
- ForceCompleteUnderwriting may throw "Workbench task not found" for test orgs - this is expected
- If the Giger environment is paused, resume it via `mcp__giger__resume_environment`
- If the admin token expires during testing, request a fresh one from the user
