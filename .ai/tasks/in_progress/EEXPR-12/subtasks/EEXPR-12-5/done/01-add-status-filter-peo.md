<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-add-status-filter-peo.md                          ║
║ TASK: EEXPR-12-5                                                ║
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
# Repository Context
repo: peo
repo_path: /Users/gabriel.herter/Documents/Projects/deel/peo
branch: EEXPR-12-5-status-filter
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/peo
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Work Item 01: Add Status Filter to PEO Service

## Objective

Add support for filtering entity transfers by status array in the PEO service. The endpoint should accept a comma-separated list of statuses and filter results accordingly.

## Pre-Implementation

Run an exploration agent to understand the current structure of:
- `src/controllers/entityTransfer/entityTransferDto.ts`
- `src/services/entityTransfer/entityTransferService.ts`
- `src/controllers/entityTransfer/entityTransferController.ts`

## Implementation Steps

### Step 1: Update Zod Schema (entityTransferDto.ts)

**File**: `src/controllers/entityTransfer/entityTransferDto.ts`

Add status parameter to the query schema for `getTransfersBySource`:

```typescript
import { TransferStatus } from '../../models/entityTransfer/types';

// In the query schema:
status: z.string()
  .optional()
  .transform((val) => val?.split(',').map(s => s.trim() as TransferStatus))
  .refine(
    (arr) => !arr || arr.every(s => Object.values(TransferStatus).includes(s)),
    { message: 'Invalid transfer status value' }
  )
```

### Step 2: Update Service Interface (entityTransferService.ts)

**File**: `src/services/entityTransfer/entityTransferService.ts`

1. Add `statuses` to the options interface:

```typescript
interface GetTransfersBySourceOptions {
  cursor?: string;
  limit?: number;
  statuses?: TransferStatus[];
}
```

2. Add filtering to the WHERE clause in `getTransfersBySource`:

```typescript
const where: WhereOptions = {
  sourceLegalEntityPublicId: sourceEntityPublicId,
};

if (options.statuses?.length) {
  where.status = { [Op.in]: options.statuses };
}
```

3. Ensure `Op` is imported from sequelize if not already.

### Step 3: Update Controller (entityTransferController.ts)

**File**: `src/controllers/entityTransfer/entityTransferController.ts`

Pass the parsed statuses from the DTO to the service method:

```typescript
const result = await entityTransferService.getTransfersBySource(
  sourceEntityPublicId,
  {
    cursor,
    limit,
    statuses: status, // status is already transformed to array by Zod
  }
);
```

### Step 4: Test the Changes

Run the existing tests to ensure nothing is broken:

```bash
cd /Users/gabriel.herter/Documents/Projects/deel/peo
npm run test -- --grep "entityTransfer"
```

Manually test the endpoint:

```bash
# Without status filter (should return all)
curl "http://localhost:3001/peo/entity-transfer/transfers/source/{id}"

# With single status
curl "http://localhost:3001/peo/entity-transfer/transfers/source/{id}?status=DRAFT"

# With multiple statuses
curl "http://localhost:3001/peo/entity-transfer/transfers/source/{id}?status=DRAFT,SCHEDULED"
```

## Post-Implementation

Run a code review agent to check for issues.

## Acceptance Criteria

- [ ] Zod schema validates status parameter
- [ ] Invalid status values return 400 error
- [ ] Service filters by status array when provided
- [ ] Empty status returns all transfers
- [ ] Comma-separated statuses are parsed correctly
- [ ] Existing tests still pass

## Testing

1. Unit test the Zod transform for status parsing
2. Unit test the service with various status combinations
3. Integration test the endpoint with status filter

## Notes

- TransferStatus enum should already exist in the codebase
- Ensure the transform handles edge cases like trailing commas or spaces
- The `Op.in` operator requires sequelize import
