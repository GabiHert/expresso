<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-add-controller-endpoint.md                         ║
║ TASK: EEXPR-12-4                                                 ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: backend
---

# Add Controller Endpoint: GET transfers

## Objective

Add the public API endpoint for retrieving transfers by legal entity.

## Implementation Steps

### Step 1: Add route to peo_integration controller

**File:** `backend/controllers/peo_integration/index.js`

Add after the existing `transfer_resources` endpoint (around line 1754):

```javascript
const { TransferListService } = require('../../services/peo/entity_transfer/services/transfer_list_service');

// GET /legal_entities/entity_transfer/:legalEntityId/transfers
app.get(
    '/legal_entities/entity_transfer/:legalEntityId/transfers',
    app.profileType([ROLES.CLIENT]),
    app.inputSchema({
        params: {
            legalEntityId: Joi.publicId(LegalEntity).resolve(false).required(),
        },
        query: {
            cursor: Joi.string().optional(),
            limit: Joi.number().integer().min(1).max(100).default(100),
        },
    }),
    validatePEOLegalEntityAccessMiddleware({LegalEntity, Organization: db.Organization}),
    async (req, res) => {
        const {legalEntityId} = req.params;
        const {cursor, limit} = req.query;
        const {organization} = req;

        try {
            log.info({
                message: '[PeoIntegration] Fetching entity transfers',
                legalEntityId,
                organizationId: organization.id,
                cursor,
                limit,
            });

            const transferListService = new TransferListService();
            const result = await transferListService.getTransfersByLegalEntity(
                legalEntityId,
                organization.id,
                { cursor, limit }
            );

            log.info({
                message: '[PeoIntegration] Successfully fetched entity transfers',
                legalEntityId,
                organizationId: organization.id,
                transferCount: result.data.length,
                hasMore: result.hasMore,
            });

            return res.json({
                success: true,
                ...result,
            });
        } catch (error) {
            log.error({
                message: '[PeoIntegration] Failed to fetch entity transfers',
                legalEntityId,
                organizationId: organization.id,
                error: error.message,
                stack: error.stack,
            });

            if (error.response?.status === 404) {
                return res.error(HTTP_CODES.not_found, 'Transfers not found');
            }

            return res.error(HTTP_CODES.internal, 'Failed to fetch transfers');
        }
    }
);
```

### Step 2: Verify middleware imports

Ensure these are imported at the top of the file:

```javascript
const {validatePEOLegalEntityAccessMiddleware} = require('../../middleware/peo/validate_peo_legal_entity');
const {LegalEntity} = require('../../models');
const Joi = require('joi');
const {ROLES} = require('../../constants/roles');
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/controllers/peo_integration/index.js` | Add route here |
| `backend/middleware/peo/validate_peo_legal_entity.js` | Auth middleware |

## Acceptance Criteria

- [ ] Route at `/legal_entities/entity_transfer/:legalEntityId/transfers`
- [ ] `app.profileType([ROLES.CLIENT])` middleware
- [ ] `app.inputSchema` validation for params/query
- [ ] `validatePEOLegalEntityAccessMiddleware` for auth
- [ ] Calls TransferListService
- [ ] Returns `{ success: true, data, cursor, hasMore }`
- [ ] Proper error handling
