<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-filter-positions-without-code.md                  ║
║ TASK: PEOCM-792-4                                               ║
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

# Filter Positions Without Code

## Objective

Filter out positions that don't have a Prism code in the `getJobCodes()` method to prevent returning positions with undefined `id` fields.

## Implementation Steps

### Step 1: Modify getJobCodes method

**File**: `backend/services/peo/entity_transfer/services/transfer_resources_service.ts`
**Lines**: 265-268

**Current code**:
```typescript
return positions.map((pos) => ({
    id: pos.code || pos.jobCode,
    label: pos.title || pos.jobTitle || pos.code,
}));
```

**Replace with**:
```typescript
return positions
    .filter((pos) => pos.code)
    .map((pos) => ({
        id: pos.code,
        label: pos.title,
    }));
```

### Step 2: Verify the change

Test the endpoint to confirm:
1. No positions with empty `id` are returned
2. Positions with valid codes are still returned correctly

## Acceptance Criteria

- [x] Positions without `code` are filtered out
- [x] All returned jobCodes have valid `id` field
- [x] Labels display position `title`
- [x] TypeScript compiles without errors

## Testing

```bash
# Call the transfer_resources endpoint for a legal entity
# Verify all jobCodes in response have valid id fields
```

## Notes

- `pos.jobCode` never existed on the position object - it was a bug
- `pos.jobTitle` also doesn't exist - use `pos.title` instead
- This is a quick fix; positions in underwriting won't appear until synced with Prism

