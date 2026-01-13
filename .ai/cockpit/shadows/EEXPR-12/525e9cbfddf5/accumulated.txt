<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-add-endpoint-url.md                                ║
║ TASK: EEXPR-12-3                                                 ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: backend
---

# Add Endpoint URL: getTransfersBySourceEntity

## Objective

Add the PEO endpoint URL for retrieving transfers by source entity.

## Implementation Steps

### Step 1: Add endpoint to config

**File:** `backend/services/peo/endpoints/entity_transfer_endpoints.ts`

```typescript
export const entityTransferEndpoints = {
  // ... existing endpoints

  getTransfersBySourceEntity: (sourceEntityPublicId: string) =>
    `/peo/entity-transfer/transfers/source/${sourceEntityPublicId}`,
};
```

## Acceptance Criteria

- [ ] Endpoint URL function added
- [ ] Accepts sourceEntityPublicId parameter
- [ ] Returns properly formatted path
