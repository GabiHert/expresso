<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 10-test-cancel-rollback-in-giger.md                  ║
║ TASK: EEXPR-90                                                   ║
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
# Repository Context (EEXPR-90)
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: EEXPR-90-fix-rollback-null
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Test Cancel-Based Rollback in Giger Environment

## Objective

Deploy the refactored rollback to Giger and verify the fix works end-to-end.

## Pre-Implementation

Ensure work items 08 and 09 are complete and committed.

## Environment

- Giger sandbox: `dev-w268o9nc0f`
- Backend service deployed with latest changes

## Implementation Steps

### Step 1: Commit and Push Changes

```bash
cd /Users/gabriel.herter/Documents/Projects/deel/backend
git add .
git commit -m "EEXPR-90: refactor rollback to use cancelPEOContract instead of soft-delete"
git push origin EEXPR-90-fix-rollback-null
```

### Step 2: Deploy to Giger

Use Giger MCP to deploy latest commit:
```
mcp__giger__deploy_latest_commit(environment: "dev-w268o9nc0f", service: "backend")
```

### Step 3: Wait for Deployment

Check pod status until ready:
```
mcp__giger__k8s_get_pods(environment: "dev-w268o9nc0f")
```

Wait for `backend-main-*` pod to show `1/1 Running`.

### Step 4: Trigger Entity Transfer Test

Use the backend-manager MCP or curl to trigger an entity transfer that will fail and rollback:

```
POST /admin/peo/tech_ops/entity_transfer/test_transfer
{
    "organizationId": <org_id>,
    "requesterProfileId": <profile_id>,
    "sourceLegalEntityId": <source_entity>,
    "destinationLegalEntityId": <dest_entity>,
    "effectiveDate": "<future_date>",
    "peoContractId": <contract_id>,
    "newBenefitGroupId": "<benefit_group>",
    "newPayGroupId": <pay_group>,
    "newPtoPolicyId": "<pto_policy>",
    "newWorkLocationId": "<work_location>",
    "newJobCode": "<job_code>"
}
```

### Step 5: Verify Rollback Success

Check the response:
```json
{
    "success": true,  // or false with rollbackErrors
    "rollbackErrors": []  // should be empty
}
```

### Step 6: Verify Contract Status

Query the database to confirm the new contract has status `CANCELLED`:
```sql
SELECT id, oid, status, cancelled_at, note
FROM contracts
WHERE oid = '<new_contract_oid>';
```

Expected:
- `status` = 'cancelled'
- `cancelled_at` is set
- `note` contains "Entity transfer rollback"

### Step 7: Verify Employment Status

Check that employment was ended:
```sql
SELECT id, contract_oid, status
FROM employment.employments
WHERE contract_oid = '<new_contract_oid>';
```

Expected:
- `status` = 'ENDED'

### Step 8: Check Logs

Review Datadog logs for the rollback:
```
Query: @teamOwner:PEO entity transfer rollback cancelPEOContract
Time range: 1h
```

Verify log messages show:
- "Contract cancelled via cancelPEOContract"
- No FK constraint errors

## Post-Implementation

Document any issues found and update task README if needed.

## Acceptance Criteria

- [ ] Backend deployed with cancel-based rollback
- [ ] Entity transfer rollback completes without errors
- [ ] Contract status is `CANCELLED` (not deleted)
- [ ] Employment status is `ENDED`
- [ ] Logs show successful cancellation
- [ ] No FK constraint violations

## Testing

Manual testing in Giger environment as described above.

## Notes

- Keep test data IDs documented for reproducibility
- If `isCancellationAllowed` fails, the contract may be in ACTIVE status - investigate why
- PEO service cleanup via `ENTITY_TRANSFER_CONTRACT_ROLLBACK` event should still work
