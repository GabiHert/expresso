<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-create-query-service.md                           ║
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
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: EEXPR-12
protected: false
---

# Work Item 04: Create EntityTransferQueryService

## Objective

Create a new service that combines fetching transfers from PEO and enriching them. This eliminates code duplication between tech_ops and peo_integration controllers.

## Problem

Both controllers have identical code:
```typescript
const rawData = await entityTransferClientService.getTransfersBySourceEntity(id, options);
const enrichedData = await transferEnrichmentService.enrichTransfers(rawData);
```

## Solution

Create `EntityTransferQueryService` that encapsulates this pattern.

## Implementation Steps

### Step 1: Create the new service

**File**: `services/peo/entity_transfer/services/entity_transfer_query_service.ts`

```typescript
import {GetTransfersBySourceEntityOptions} from '../types';
import {entityTransferClientService} from './entity_transfer_client_service';
import {transferEnrichmentService, EnrichedTransfersResponse} from './transfer_enrichment_service';

/**
 * Service for querying entity transfers with enrichment.
 * Combines PEO client calls with data enrichment in a single operation.
 */
class EntityTransferQueryService {
    /**
     * Get transfers by source entity with full enrichment.
     * Fetches raw data from PEO service and enriches with:
     * - Legal entity names and country codes
     * - Employee emails from Contract → Profile join
     * - Signature profile details (name, email, jobTitle)
     */
    async getEnrichedTransfersBySourceEntity(
        sourceEntityPublicId: string,
        options: GetTransfersBySourceEntityOptions = {}
    ): Promise<EnrichedTransfersResponse> {
        const rawData = await entityTransferClientService.getTransfersBySourceEntity(
            sourceEntityPublicId,
            options
        );
        return transferEnrichmentService.enrichTransfers(rawData);
    }
}

export const entityTransferQueryService = new EntityTransferQueryService();
```

### Step 2: Export from services index (if exists)

Check if there's an index.ts in the services folder and add the export.

### Step 3: Update peo_integration/index.js

**File**: `controllers/peo_integration/index.js`

```javascript
// Update import
const {entityTransferQueryService} = require('../../services/peo/entity_transfer/services/entity_transfer_query_service');

// Remove these imports (no longer needed directly):
// const {entityTransferClientService} = require('...');
// const {transferEnrichmentService} = require('...');

// Update handler
async (req, res) => {
    const {legalEntityId} = req.params;
    const {cursor, limit, status} = req.query;
    const {organization} = req;

    let statuses;
    if (status) {
        statuses = Array.isArray(status) ? status : status.split(',').map((s) => s.trim());
    }

    try {
        log.info({
            message: '[PeoIntegration] Fetching entity transfers by source entity',
            legalEntityId,
            organizationId: organization.id,
            cursor,
            limit,
            statuses,
        });

        // SIMPLIFIED: Single service call instead of two
        const enrichedData = await entityTransferQueryService.getEnrichedTransfersBySourceEntity(
            legalEntityId,
            {cursor, limit, statuses}
        );

        log.info({
            message: '[PeoIntegration] Successfully fetched entity transfers',
            legalEntityId,
            organizationId: organization.id,
            transferCount: enrichedData.transfers?.length || 0,
            hasMore: enrichedData.hasMore,
        });

        return res.json(enrichedData);
    } catch (error) {
        // ... error handling unchanged
    }
}
```

### Step 4: Update tech_ops.ts

**File**: `controllers/admin/peo/tech_ops.ts`

```typescript
// Update import
import {entityTransferQueryService} from '../../../services/peo/entity_transfer/services/entity_transfer_query_service';

// Remove these imports (no longer needed directly in this method):
// import {entityTransferClientService} from '...';
// import {transferEnrichmentService} from '...';
// NOTE: Keep if used by other methods in this file

// Update handler
async getTransfersBySourceEntity({params, query, res}) {
    const {sourceEntityPublicId} = params;
    const {cursor, limit, status} = query;

    let statuses: TransferStatus[] | undefined;
    if (status) {
        statuses = Array.isArray(status) ? status : status.split(',').map((s: string) => s.trim() as TransferStatus);
    }

    log.info('[TechOps] Getting entity transfers by source entity', {sourceEntityPublicId, cursor, limit, statuses});

    // SIMPLIFIED: Single service call instead of two
    const enrichedData = await entityTransferQueryService.getEnrichedTransfersBySourceEntity(
        sourceEntityPublicId,
        {cursor, limit, statuses}
    );

    return res.status(HTTP_CODES.ok).json({success: true, data: enrichedData});
}
```

### Step 5: Verify other usages

Check if `entityTransferClientService` and `transferEnrichmentService` are used elsewhere in tech_ops.ts. If so, keep those imports.

### Step 6: Run tests and lint

```bash
cd /Users/gabriel.herter/Documents/Projects/deel/backend
npm run lint
npm run build
```

## Acceptance Criteria

- [ ] New `entity_transfer_query_service.ts` created
- [ ] `peo_integration/index.js` uses the new service
- [ ] `tech_ops.ts` uses the new service
- [ ] No duplicate fetch+enrich code in controllers
- [ ] TypeScript compiles without errors
- [ ] Lint passes

## Benefits

1. **DRY**: Single source of truth for fetch+enrich logic
2. **Easier to extend**: Add caching, logging, metrics in one place
3. **Thinner controllers**: Controllers only handle HTTP concerns
4. **Easier to test**: Mock one service instead of two

## Notes

- Depends on work item 03 being completed first
- Keep `entityTransferClientService` and `transferEnrichmentService` imports in tech_ops.ts if used by other methods
