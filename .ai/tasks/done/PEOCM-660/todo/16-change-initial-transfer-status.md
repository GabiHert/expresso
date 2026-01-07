<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 16-change-initial-transfer-status.md                  ║
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
repo: peo
---

# Change Initial Transfer Status from DRAFT to PENDING_SIGNATURES

## Objective

Modify the EntityTransferService to create transfers with `PENDING_SIGNATURES` status instead of `DRAFT`. This aligns with the expected workflow where transfers should immediately enter the signature collection phase upon creation.

## Background

Currently, transfers are created with `DRAFT` status (hardcoded in `entityTransferService.ts:48`). The business requirement is that transfers should start as `PENDING_SIGNATURES` since the transfer creation implies the admin has already reviewed and approved the transfer request.

## Implementation Steps

### Step 1: Update EntityTransferService

**File**: `peo/src/services/entityTransfer/entityTransferService.ts`
**Line**: 48

**Change**:
```typescript
// From:
status: TransferStatus.DRAFT,

// To:
status: TransferStatus.PENDING_SIGNATURES,
```

### Step 2: Update Database Migration Default (Optional)

**File**: `peo/migrations/20251217172700-create_peo_employee_transfers_table.js`
**Line**: 74

Consider whether the database default should also change:
```javascript
// From:
defaultValue: 'DRAFT',

// To:
defaultValue: 'PENDING_SIGNATURES',
```

**Note**: This may require a new migration if the original has already been applied in production.

### Step 3: Update Model Default (Optional)

**File**: `peo/src/models/entityTransfer/PeoEmployeeTransfer.ts`
**Lines**: 74-80

```typescript
// From:
defaultValue: TransferStatus.DRAFT,

// To:
defaultValue: TransferStatus.PENDING_SIGNATURES,
```

### Step 4: Update Unit Tests

Update any tests that assert the initial status is `DRAFT` to expect `PENDING_SIGNATURES` instead.

Search for tests with:
```bash
grep -r "DRAFT" peo/src --include="*.test.ts" --include="*.spec.ts"
```

## Acceptance Criteria

- [ ] New transfers are created with `PENDING_SIGNATURES` status
- [ ] EntityTransferService explicitly sets the new status
- [ ] Unit tests pass with updated expectations
- [ ] Database default is consistent with service logic

## Testing

```bash
# Run unit tests
cd peo && npm test -- --grep "EntityTransfer"

# Manual test via API
curl -X POST http://localhost:3000/admin/peo/tech_ops/entity_transfer/test_transfer \
  -H "Content-Type: application/json" \
  -d '{ ... }'

# Verify in database
SELECT id, status FROM peo.peo_employee_transfers ORDER BY created_at DESC LIMIT 1;
# Expected: PENDING_SIGNATURES
```

## Notes

- Coordinate with frontend if there's any UI that depends on `DRAFT` status
- This change affects the transfer lifecycle - ensure downstream processes handle `PENDING_SIGNATURES` correctly
- Consider if existing `DRAFT` transfers in the database need migration
