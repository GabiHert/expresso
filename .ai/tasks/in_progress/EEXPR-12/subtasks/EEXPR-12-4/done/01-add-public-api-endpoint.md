# Work Item 01: Add Public API Endpoint

## Objective

Add a new client-facing endpoint to the `peo_integration` controller for retrieving entity transfers by source legal entity.

## Endpoint

```
GET /peo_integration/legal_entities/entity_transfer/:legalEntityId/transfers
```

## Implementation Steps

### Step 1: Add Imports

At the top of `controllers/peo_integration/index.js`, add:

```javascript
const {entityTransferClientService} = require('../../../services/peo/entity_transfer_client_service');
const {transferEnrichmentService} = require('../../../services/peo/entity_transfer/services/transfer_enrichment_service');
```

### Step 2: Add Endpoint

Add the endpoint BEFORE the `return {routeName: 'peo_integration'};` statement, after the `transfer_resources` endpoint (around line 1754):

```javascript
/**
 * Get entity transfers by source legal entity.
 *
 * Returns enriched transfer data including:
 * - Source/destination legal entity names and country codes
 * - Employee emails from Contract → Profile join
 * - Signature profile details (name, email, jobTitle)
 *
 * @endpoint GET /peo_integration/legal_entities/entity_transfer/:legalEntityId/transfers
 * @access CLIENT
 */
app.get(
    '/legal_entities/entity_transfer/:legalEntityId/transfers',
    app.profileType([ROLES.CLIENT]),
    app.inputSchema({
        params: {
            legalEntityId: Joi.publicId(LegalEntity).resolve(false).required(),
        },
        query: Joi.object().keys({
            cursor: Joi.string().uuid().optional(),
            limit: Joi.number().integer().min(1).max(100).default(100),
        }),
    }),
    validatePEOLegalEntityAccessMiddleware({LegalEntity, Organization: db.Organization}),
    async (req, res) => {
        const {legalEntityId} = req.params;
        const {cursor, limit} = req.query;
        const {organization} = req;

        try {
            log.info({
                message: '[PeoIntegration] Fetching entity transfers by source entity',
                legalEntityId,
                organizationId: organization.id,
                cursor,
                limit,
            });

            const rawData = await entityTransferClientService.getTransfersBySourceEntity(legalEntityId, {cursor, limit});
            const enrichedData = await transferEnrichmentService.enrichTransfers(rawData);

            log.info({
                message: '[PeoIntegration] Successfully fetched entity transfers',
                legalEntityId,
                organizationId: organization.id,
                transferCount: enrichedData.transfers?.length || 0,
                hasMore: enrichedData.hasMore,
            });

            return res.json(enrichedData);
        } catch (error) {
            log.error({
                message: '[PeoIntegration] Error fetching entity transfers',
                legalEntityId,
                organizationId: organization?.id,
                error: error.message,
                stack: error.stack,
            });

            if (error instanceof HttpError) {
                return res.status(error.statusCode).json({
                    message: error.message,
                });
            }

            return res.status(HTTP_CODES.internal_server_error).json({
                message: 'An error occurred while fetching entity transfers',
            });
        }
    }
);
```

## Acceptance Criteria

- [ ] Endpoint responds to `GET /peo_integration/legal_entities/entity_transfer/:legalEntityId/transfers`
- [ ] Validates `legalEntityId` as UUID
- [ ] Requires CLIENT role
- [ ] Validates PEO legal entity access via middleware
- [ ] Supports optional `cursor` and `limit` query parameters
- [ ] Returns enriched transfer data with legal entity names, employee emails, and signature profiles
- [ ] Proper error handling with appropriate HTTP status codes
- [ ] Logging follows existing patterns

## Testing

```bash
# Test the endpoint
curl --location 'https://api-dev-w268o9nc0f.giger.training/peo_integration/legal_entities/entity_transfer/a5a39253-a714-4551-94e5-69dbd59474dc/transfers?limit=10' \
--header 'Authorization: Bearer <token>'
```
