<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-fix-null-to-undefined.md                          ║
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

# Fix null to undefined in CreateContractStep rollback

## Objective

Change the `newContractOid: null` to `newContractOid: undefined` in the rollback method to prevent Zod validation errors when the PEO service receives the PATCH request.

## Pre-Implementation

The exploration has already been completed. Key findings:

- **File**: `services/peo/entity_transfer/steps/create_contract_step.ts`
- **Line**: 625 (approximate - verify in actual file)
- **Current code**: `{newContractOid: null}`
- **Expected code**: `{newContractOid: undefined}`

## Implementation Steps

### Step 1: Locate the exact line

**File**: `services/peo/entity_transfer/steps/create_contract_step.ts`

Search for the rollback method and find the `updateTransferItem` call that passes `{newContractOid: null}`.

### Step 2: Make the change

Change:
```typescript
await this.entityTransferRepository.updateTransferItem(
  context.request.item.id,
  {newContractOid: null},
  transaction
);
```

To:
```typescript
await this.entityTransferRepository.updateTransferItem(
  context.request.item.id,
  {newContractOid: undefined},
  transaction
);
```

### Step 3: Verify TypeScript compiles

Run:
```bash
cd /Users/gabriel.herter/Documents/Projects/deel/backend
npm run build
```

Ensure no type errors are introduced.

## Post-Implementation

Run a code review agent to verify the change is correct and doesn't introduce any issues.

## Acceptance Criteria

- [ ] `newContractOid: null` changed to `newContractOid: undefined`
- [ ] TypeScript compiles without errors
- [ ] No other references to `null` in similar contexts that need updating

## Testing

- Unit tests in work item 02
- Manual verification that rollback no longer fails with validation error

## Notes

- The change is semantically correct: `undefined` means "don't include this field in the update"
- `null` would mean "explicitly set this field to null" which the PEO service schema doesn't allow
