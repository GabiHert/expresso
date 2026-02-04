<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-update-unit-tests.md                               ║
║ TASK: PEOCM-819                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
---

repo: backend
---

# Update unit tests

## Objective

Update unit tests that expect the buggy behavior to expect the correct behavior (no `effectiveDate` updates from HRIS sync).

## Implementation Steps

### Step 1: Update hris_integration_update_service.spec.ts

**File**: `backend/services/peo/__tests__/integrations/hris_integration_update/hris_integration_update_service.spec.ts`

**Lines 1890-1922** - Update the Contract.update expectation:

```typescript
// BEFORE (buggy expectation):
expect(dbMock.Contract.update).toHaveBeenCalledWith(
    {
        name: ...,
        firstName: ...,
        lastName: ...,
        jobTitleName: ...,
        effectiveDate: payload.peoStartDate,      // REMOVE THIS
        effectivePlainDate: payload.peoStartDate, // REMOVE THIS
        initialEffectiveDate: payload.startDate,
        initialEffectivePlainDate: payload.startDate,
        state: 'CA',
    },
    ...
);

// AFTER (correct expectation):
expect(dbMock.Contract.update).toHaveBeenCalledWith(
    {
        name: ...,
        firstName: ...,
        lastName: ...,
        jobTitleName: ...,
        // effectiveDate and effectivePlainDate REMOVED
        initialEffectiveDate: payload.startDate,
        initialEffectivePlainDate: payload.startDate,
        state: 'CA',
    },
    ...
);
```

### Step 2: Update WorkStatement test expectations

**Lines 2004-2006** - Update the WorkStatement.update expectation:

```typescript
// BEFORE:
expect(dbMock.WorkStatement.update).toHaveBeenCalledWith(
    {
        effectiveDate: payload.startDate,           // REMOVE THIS
        effectivePlainDate: payload.peoStartDate,   // CHECK IF NEEDED
        jobTitleName: payload.jobs[0].jobTitle,
    },
    ...
);

// AFTER:
expect(dbMock.WorkStatement.update).toHaveBeenCalledWith(
    {
        // effectiveDate REMOVED
        // effectivePlainDate - check if still needed for WorkStatement
        jobTitleName: payload.jobs[0].jobTitle,
    },
    ...
);
```

### Step 3: Search for other affected tests

```bash
grep -rn "effectiveDate.*peoStartDate\|peoStartDate.*effectiveDate" backend/services/peo/__tests__/
```

Update any other tests that expect `effectiveDate = peoStartDate` pattern.

### Step 4: Add negative test case

Add a test that explicitly verifies `effectiveDate` is NOT included in Contract updates:

```typescript
it('should NOT update effectiveDate from HRIS sync', async () => {
    // ... setup ...

    const updateCall = dbMock.Contract.update.mock.calls[0][0];
    expect(updateCall).not.toHaveProperty('effectiveDate');
    expect(updateCall).not.toHaveProperty('effectivePlainDate');
});
```

## Acceptance Criteria

- [x] All tests in `hris_integration_update_service.spec.ts` pass
- [x] Tests no longer expect `effectiveDate` in Contract updates
- [x] Tests no longer expect `effectiveDate` in WorkStatement updates
- [x] New negative test case verifies effectiveDate is not set
- [ ] Full test suite passes: `npm run test`

## Testing

Run the full test suite:
```bash
cd backend && npm run test
```

Run specific HRIS tests:
```bash
cd backend && npm run test -- --grep "hris_integration"
```

## Notes

- Tests currently codify the bug - they EXPECT the wrong behavior
- This is why tests will fail after Work Items 01 and 02 until this item is done
- Consider doing all 3 work items in a single commit to avoid broken test state

