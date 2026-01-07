<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 09-end-to-end-testing.md                             ║
║ TASK: PEOCM-660                                                  ║
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
repo: backend, peo
---

# End-to-End Testing for Entity Transfer Tables

## Objective

Verify that the entity transfer persistence layer works correctly with real data. This includes testing the full flow from creating a transfer to resuming a failed transfer.

## Pre-Implementation

Before starting, ensure:
- [ ] Both services are running locally (PEO on port X, backend on port 3000)
- [ ] Database migrations have been applied
- [ ] Test organization and legal entities exist

## Test Scenarios

### Scenario 1: Create New Transfer

**Steps**:
1. Call POST `/admin/peo/tech_ops/entity_transfer/test_transfer` with full payload
2. Verify transfer is created in `peo_employee_transfers` table
3. Verify transfer item is created in `peo_employee_transfer_items` table
4. Verify response contains transfer and item IDs

**Expected**:
- HTTP 200 response
- Transfer record with status PROCESSING or COMPLETED
- Transfer item with all destination config stored

### Scenario 2: Resume Failed Transfer

**Steps**:
1. Create a transfer that fails at a specific step (e.g., step 5)
2. Verify `resume_from_step` is set correctly on the transfer item
3. Call POST with only `transferItemId` (resume mode)
4. Verify transfer resumes from the correct step

**Expected**:
- Resume mode accepts only `transferItemId`
- Processing starts from `resume_from_step`, not step 1
- Final status is COMPLETED if all steps succeed

### Scenario 3: Get Transfer by ID

**Steps**:
1. Create a transfer
2. Call GET `/admin/peo/tech_ops/entity_transfer/:id`
3. Verify response includes transfer details and all items

**Expected**:
- HTTP 200 response
- Full transfer object with items array
- Item details include destination config

### Scenario 4: Get Transfer Item by ID

**Steps**:
1. Create a transfer with an item
2. Call GET `/admin/peo/tech_ops/entity_transfer/item/:id`
3. Verify response includes item and parent transfer

**Expected**:
- HTTP 200 response
- Full item object with parent transfer info
- Status and resume_from_step are accurate

### Scenario 5: Get Ready Transfers

**Steps**:
1. Create multiple transfers with different statuses and effective dates
2. Call GET `/admin/peo/tech_ops/entity_transfer/ready`
3. Verify only SCHEDULED transfers with effective_date <= today are returned

**Expected**:
- HTTP 200 response
- Only transfers matching criteria returned
- Correct count in response

## Test Data Requirements

Need the following in the database:
- Organization with PEO enabled
- Source legal entity with employees
- Destination legal entity with:
  - Benefit groups
  - Pay groups
  - PTO policies
  - Work locations
  - Job codes

**Reference**: See [test-data-cleanup.md](../../../docs/backend/entity_transfers/test-data-cleanup.md) for test data setup.

## Acceptance Criteria

- [ ] Create transfer persists data correctly
- [ ] Resume mode works from failed step
- [ ] GET endpoints return correct data
- [ ] Error responses are properly forwarded
- [ ] No 500 errors for valid scenarios
- [ ] Database constraints are enforced

## Testing Commands

```bash
# Start PEO service
cd peo && npm run dev

# Start backend service
cd backend && npm run dev

# Run specific test
curl -X POST http://localhost:3000/admin/peo/tech_ops/entity_transfer/test_transfer \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

## Notes

- Deployment order matters: PEO must be deployed before backend
- Test with production-like data volumes to catch performance issues
- Check logs for any warnings or errors during processing
