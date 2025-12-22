<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-update-code-use-entity-transfer.md                 ║
║ TASK: PEOCM-820                                                   ║
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

# Update code to use EntityTransfer origin

## Objective

Update `create_contract_step.ts` to use `PeoContractOrigin.EntityTransfer` instead of the placeholder `PeoContractOrigin.Hibob`, and remove the TODO comments that reference PEOCM-660.

## Pre-Implementation

Before starting, ensure:
- The database migration (work item 01) has been deployed
- The enum value `'entity_transfer'` exists in the database
- You understand the context of where this origin is used

## Implementation Steps

### Step 1: Update origin value

**File**: `backend/services/peo/entity_transfer/steps/create_contract_step.ts`

**Location**: Lines 356-359

**Instructions**:
1. Remove the TODO comments (lines 356-358)
2. Change `origin: PeoContractOrigin.Hibob` to `origin: PeoContractOrigin.EntityTransfer`

**Before**:
```typescript
            // TODO: PEOCM-660 - Update to PeoContractOrigin.EntityTransfer once enum value added to database
            // Current: Using PeoContractOrigin.Hibob as placeholder
            // Future: origin: PeoContractOrigin.EntityTransfer
            origin: PeoContractOrigin.Hibob,
```

**After**:
```typescript
            origin: PeoContractOrigin.EntityTransfer,
```

### Step 2: Check for other references

**File**: `backend/services/peo/__tests__/entity_transfer/steps/create_contract_step.spec.ts`

**Instructions**:
1. Search for any references to `PeoContractOrigin.Hibob` in tests
2. Update test expectations if they assert on the origin being `Hibob`
3. Update any test data that uses `Hibob` as the origin for entity transfers

### Step 3: Verify imports

**File**: `backend/services/peo/entity_transfer/steps/create_contract_step.ts`

**Instructions**:
1. Verify `PeoContractOrigin` is imported from `'../../schemas'` (already present at line 7)
2. Ensure `EntityTransfer` is available in the enum (already defined in schemas.ts)

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [x] TODO comments removed from `create_contract_step.ts` (lines 356-358)
- [x] Origin changed from `PeoContractOrigin.Hibob` to `PeoContractOrigin.EntityTransfer`
- [x] Tests updated if they reference the old `Hibob` origin
- [x] No other references to `Hibob` origin for entity transfers remain
- [x] Code compiles without errors
- [x] All tests pass

## Testing

1. **Unit tests**: Run tests for `create_contract_step.spec.ts`
2. **Integration tests**: Verify entity transfer contracts are created with correct origin
3. **Manual verification**: Create an entity transfer and verify the contract has `origin: 'entity_transfer'` in the database

## Notes

- This change depends on work item 01 (database migration) being deployed first
- The enum value `EntityTransfer: 'entity_transfer'` already exists in the TypeScript enum
- This is a simple find-and-replace operation with comment removal
- No other code changes should be needed as the enum value is already defined

## Implementation Notes

✅ **Completed**: Code updated in `backend/services/peo/entity_transfer/steps/create_contract_step.ts`
- Removed TODO comments (lines 356-358)
- Changed `origin: PeoContractOrigin.Hibob` to `origin: PeoContractOrigin.EntityTransfer`
- No linter errors
- Imports verified - `PeoContractOrigin` already imported from `'../../schemas'`

