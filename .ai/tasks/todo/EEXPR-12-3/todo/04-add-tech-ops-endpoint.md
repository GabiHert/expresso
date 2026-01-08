<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-add-tech-ops-endpoint.md                           ║
║ TASK: EEXPR-12-3                                                 ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: backend
---

# Add Tech Ops Endpoint: getTransfersBySourceEntity

## Objective

Add the tech ops controller endpoint that calls PEO and enriches the response.

## Implementation Steps

### Step 1: Add controller method

**File:** `backend/controllers/admin/peo/tech_ops.ts`

```javascript
const { entityTransferClientService } = require('../../../services/peo/entity_transfer_client_service');
const { transferEnrichmentService } = require('../../../services/peo/entity_transfer/helpers/transfer_enrichment_service');
const log = require('../../../utils/log');

/**
 * GET /admin/peo/tech_ops/entity_transfer/source/:sourceEntityPublicId
 *
 * Retrieves entity transfers by source legal entity with enriched data.
 */
async function getTransfersBySourceEntity(req, res) {
  const { sourceEntityPublicId } = req.params;
  const { cursor, limit } = req.query;

  try {
    log.info({
      message: '[TechOps] Fetching transfers by source entity',
      sourceEntityPublicId,
      cursor,
      limit,
    });

    // 1. Call PEO endpoint for raw data
    const rawResponse = await entityTransferClientService.getTransfersBySourceEntity(
      sourceEntityPublicId,
      {
        cursor,
        limit: limit ? parseInt(limit, 10) : 100,
      }
    );

    // 2. Enrich with backend data
    const enrichedTransfers = await transferEnrichmentService.enrichTransfers(
      rawResponse.transfers
    );

    log.info({
      message: '[TechOps] Successfully fetched and enriched transfers',
      sourceEntityPublicId,
      transferCount: enrichedTransfers.length,
      hasMore: rawResponse.hasMore,
    });

    // 3. Return enriched response
    return res.json({
      success: true,
      data: enrichedTransfers.map((transfer) => ({
        transfer,
        agreement: transfer.agreement,
      })),
      cursor: rawResponse.cursor,
      hasMore: rawResponse.hasMore,
    });
  } catch (error) {
    log.error({
      message: '[TechOps] Failed to fetch transfers by source entity',
      sourceEntityPublicId,
      error: error.message,
      stack: error.stack,
    });

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Source entity not found',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch transfers',
    });
  }
}

module.exports = {
  getTransfersBySourceEntity,
};
```

### Step 2: Add input validation

Add Joi validation for the endpoint:

```javascript
const Joi = require('joi');

const getTransfersBySourceEntitySchema = {
  params: {
    sourceEntityPublicId: Joi.string().uuid().required(),
  },
  query: {
    cursor: Joi.string().uuid().optional(),
    limit: Joi.number().integer().min(1).max(100).default(100),
  },
};
```

## Acceptance Criteria

- [ ] Controller method calls PEO client service
- [ ] Response enriched via enrichment service
- [ ] Proper logging for debugging
- [ ] Error handling for PEO failures
- [ ] Input validation for params/query
