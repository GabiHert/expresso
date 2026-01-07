<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 18-fix-entity-transfer-step-tests.md                  ║
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
repo: backend
---

# Fix Entity Transfer Step Tests - effectiveDate Type Mismatch

## Objective

Fix 55 failing tests across 4 test files. All failures have the same root cause: the Zod validation schemas expect `effectiveDate` to be a `Date` object, but test fixtures are providing strings or undefined.

## Root Cause

```
ZodError: [
  {
    "expected": "date",
    "code": "invalid_type",
    "path": ["request", "transfer", "effectiveDate"],
    "message": "Effective date is required"
  }
]
```

The validation schemas for entity transfer steps now require `effectiveDate` as a proper `Date` type, but test mocks/fixtures weren't updated to match.

## Affected Test Files

| File | Failing Tests |
|------|---------------|
| `services/peo/__tests__/entity_transfer/steps/create_contract_step.spec.ts` | 26 |
| `services/peo/__tests__/entity_transfer/steps/terminate_contract_step.spec.ts` | 14 |
| `services/peo/__tests__/entity_transfer/steps/update_new_contract_status_step.spec.ts` | 11 |
| `services/peo/entity_transfer/steps/entity_transfer_steps.spec.js` | 5 |

## Implementation Steps

### Step 1: Identify the Mock Context Factory

Find where the test context/fixtures are created. Look for:
- `createMockContext` or similar helper functions
- `beforeEach` blocks that set up the context
- Shared test fixtures

### Step 2: Update effectiveDate in Test Fixtures

The `request.transfer.effectiveDate` must be a `Date` object, not a string.

**Before (likely current state):**
```typescript
const mockContext = {
  request: {
    transfer: {
      effectiveDate: '2025-01-15',  // String - WRONG
      // or missing entirely
    }
  }
};
```

**After (correct):**
```typescript
const mockContext = {
  request: {
    transfer: {
      effectiveDate: new Date('2025-01-15'),  // Date object - CORRECT
    }
  }
};
```

### Step 3: Update Each Test File

For each affected test file:

1. **create_contract_step.spec.ts**
   - Find the mock context setup
   - Ensure `request.transfer.effectiveDate` is a `Date` object

2. **terminate_contract_step.spec.ts**
   - Same fix

3. **update_new_contract_status_step.spec.ts**
   - Same fix

4. **entity_transfer_steps.spec.js**
   - Same fix (note: this is a .js file, not .ts)

### Step 4: Run Tests to Verify

```bash
cd backend && npm test -- --testPathPattern="entity_transfer/steps" --verbose
```

## Acceptance Criteria

- [ ] All 55 previously failing tests pass
- [ ] No new test failures introduced
- [ ] Test fixtures use `new Date()` for effectiveDate

## Notes

- This is a test-only fix - no production code changes needed
- The root cause is that Zod schema validation was tightened to require Date type
- All 4 test files likely share a common mock factory that needs updating
