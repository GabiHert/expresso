<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-fix-create-transfer-master-read.md                 ║
║ TASK: EEXPR-94                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
# Repository Context
repo: peo
repo_path: /Users/gabriel.herter/Documents/Projects/deel/peo
branch: EEXPR-94-fix-replication-lag
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/peo
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Fix createTransfer to Use Master Read

## Objective

Ensure that after `createTransfer` writes to the database, the subsequent read to return the transfer with items uses the master database instead of a replica, preventing replication lag issues.

## Pre-Implementation

The exploration has already been done. Key findings:
- Bug location: `src/services/entityTransfer/entityTransferService.ts:139`
- The `getTransferById` method uses `useMaster: !!transaction` which is `false` when no transaction is passed

## Implementation Steps

### Step 1: Add useMaster parameter to getTransferById

**File**: `src/services/entityTransfer/entityTransferService.ts`

**Instructions**:
1. Modify the `getTransferById` method signature to accept an optional `useMaster` parameter
2. Change the method from:
```typescript
async getTransferById(id: string, includeItems = true, transaction?: Transaction): Promise<PeoEmployeeTransfer | null> {
```
To:
```typescript
async getTransferById(id: string, includeItems = true, transaction?: Transaction, useMaster?: boolean): Promise<PeoEmployeeTransfer | null> {
```

3. Update the `findByPk` call to use the new parameter:
```typescript
return PeoEmployeeTransfer.findByPk(id, {
    include,
    transaction,
    useMaster: useMaster ?? !!transaction, // Use passed value, or fallback to transaction-based logic
});
```

### Step 2: Update createTransfer to pass useMaster: true

**File**: `src/services/entityTransfer/entityTransferService.ts`

**Instructions**:
1. In the `createTransfer` method, update the return statement (line 139) from:
```typescript
return this.getTransferById(transfer.id, true, transaction) as Promise<PeoEmployeeTransfer>;
```
To:
```typescript
return this.getTransferById(transfer.id, true, transaction, true) as Promise<PeoEmployeeTransfer>;
```

This ensures the read after write always uses the master database.

## Post-Implementation

1. Run the entity transfer unit tests:
   ```bash
   cd /Users/gabriel.herter/Documents/Projects/deel/peo
   npm test -- --grep "EntityTransferService"
   ```

2. Review changes for any other callers of `getTransferById` that might need updating

## Acceptance Criteria

- [ ] `getTransferById` accepts optional `useMaster` parameter
- [ ] `createTransfer` passes `useMaster: true` when calling `getTransferById`
- [ ] Default behavior for other callers is unchanged (still uses transaction-based logic)
- [ ] Unit tests pass

## Testing

1. **Unit tests**: Run existing entity transfer service tests
2. **Manual test**: After deployment, execute 5+ entity transfers and verify no replication lag errors

## Notes

- This is a minimal, targeted fix that only affects the read-after-write scenario in `createTransfer`
- Other callers of `getTransferById` are unaffected as the parameter is optional with sensible default
