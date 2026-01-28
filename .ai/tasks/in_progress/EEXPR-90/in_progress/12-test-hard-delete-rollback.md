<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 12-test-hard-delete-rollback.md                      ║
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

# Test Hard Delete Rollback in Giger

## Objective

Deploy and test the hard delete rollback enhancement in Giger environment.

## Pre-Implementation

Ensure work item 11 is complete and committed.

## Environment

- Giger sandbox: `dev-w268o9nc0f`
- Backend service deployed with latest changes

## Implementation Steps

### Step 1: Commit and Push Changes

```bash
cd /Users/gabriel.herter/Documents/Projects/deel/backend
git add .
git commit -m "EEXPR-90: add hard delete after cancel in rollback"
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

### Step 4: Trigger Entity Transfer Test

Use curl to trigger an entity transfer that will fail and rollback:

```bash
curl --location 'https://api-dev-w268o9nc0f.giger.training/admin/peo/tech_ops/entity_transfer' \
--header 'Content-Type: application/json' \
--header 'x-auth-token: <token>' \
--data '{
    "organizationId": 191800,
    "requesterProfilePublicId": "fee7dc7b-7810-4482-bec0-fb5448c409dd",
    "sourceLegalEntityPublicId": "7774c188-7f5d-4e39-a0f1-3ccea7ecdb1a",
    "destinationLegalEntityPublicId": "e30ebfaa-8e50-4505-b3ce-185b7bbe6226",
    "effectiveDate": "2026-02-15",
    "basePeoContractOid": "3jrrp7r",
    "newBenefitGroupId": "3",
    "newPayrollSettingsId": "1f6742c3-d28b-408d-a900-699933d14098",
    "newPtoPolicyId": "00000000-0000-0000-0000-000000000000",
    "newWorkLocationId": "45bb079f-0323-4b67-99c0-1b4f70c1ec6f",
    "newPositionPublicId": "aeaf140c-80e7-49c3-9a49-025ef26f7e1a"
}'
```

### Step 5: Verify Rollback Success

Check the response:
- `rollbackErrors` should be empty
- `newContractOid` should be present (for audit)

### Step 6: Verify Contract is Hard Deleted

Query the database to confirm the new contract no longer exists:
```sql
SELECT id, oid, status, deleted_at
FROM contracts
WHERE oid = '<newContractOid from response>';
```

Expected:
- **If hard delete succeeded**: No rows returned (contract deleted)
- **If hard delete failed**: Row exists with status = 'cancelled'

### Step 7: Check Logs

Review Datadog logs for the rollback:
```
Query: @teamOwner:PEO CreateContractStep hard delete
Time range: 1h
```

Look for:
- `"[CreateContractStep] Contract hard deleted during rollback"` (success)
- OR `"[CreateContractStep] Hard delete failed, contract remains CANCELLED"` (fallback)

### Step 8: Verify Employment Status

If contract was created, check that employment was ended:
```sql
SELECT id, contract_oid, status
FROM employment.employments
WHERE contract_oid = '<newContractOid>';
```

Expected: `status` = 'ENDED' (or no row if employment was also cleaned up)

## Acceptance Criteria

- [ ] Backend deployed with hard delete rollback
- [ ] Entity transfer rollback completes without errors
- [ ] Contract is hard deleted OR remains CANCELLED (no FK errors)
- [ ] Employment is ENDED
- [ ] Logs show the deletion outcome
- [ ] `newContractOid` appears in API response

## Notes

- If hard delete consistently fails due to FK constraints, document which constraint is blocking
- Consider whether additional cleanup steps are needed before hard delete
