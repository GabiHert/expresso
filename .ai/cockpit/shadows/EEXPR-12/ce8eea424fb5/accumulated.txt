<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK (SUBTASK)                                            ║
║ LOCATION: .ai/tasks/todo/EEXPR-12-4/                            ║
╠══════════════════════════════════════════════════════════════════╣
║ PARENT EPIC: EEXPR-12                                            ║
║ REPO: backend                                                    ║
║ BRANCH: EEXPR-12-4-public-api-transfers                         ║
║ DEPENDS ON: EEXPR-12-3                                           ║
╚══════════════════════════════════════════════════════════════════╝
-->

# EEXPR-12-4: [BE] Public API endpoint for transfers

## Problem Statement

The tech ops endpoint (EEXPR-12-3) is for internal admin use. We also need a client-facing public API endpoint that allows organization clients to view their entity transfers, following the same pattern as the existing `transfer_resources` endpoint.

## Endpoint Specification

```
GET /peo_integration/legal_entities/entity_transfer/:legalEntityId/transfers
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `legalEntityId` | UUID | Legal entity public ID |

### Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `cursor` | string | null | - | Pagination cursor |
| `limit` | number | 100 | 100 | Results per page |

### Authentication & Authorization

| Middleware | Purpose |
|------------|---------|
| `app.profileType([ROLES.CLIENT])` | Ensures user has CLIENT role |
| `app.inputSchema({...})` | Validates params/query with Joi |
| `validatePEOLegalEntityAccessMiddleware` | Validates legal entity access |

### Authorization Checks

The `validatePEOLegalEntityAccessMiddleware` validates:
1. Legal entity belongs to user's organization
2. Organization has PEO application with status `APPROVED` or `IN_PROGRESS`

## Pattern Reference

This endpoint follows the same pattern as:
- **File:** `backend/controllers/peo_integration/index.js`
- **Route:** `/legal_entities/entity_transfer/:legalEntityId/transfer_resources`
- **Lines:** 1696-1754

### Pattern Code

```javascript
app.get(
    '/legal_entities/entity_transfer/:legalEntityId/transfer_resources',
    app.profileType([ROLES.CLIENT]),
    app.inputSchema({
        params: {
            legalEntityId: Joi.publicId(LegalEntity).resolve(false).required(),
        },
    }),
    validatePEOLegalEntityAccessMiddleware({LegalEntity, Organization: db.Organization}),
    async (req, res) => {
        const {legalEntityId} = req.params;
        const {organization} = req;
        // ... handler
    }
);
```

## Response Structure

Same enriched response as EEXPR-12-3 tech ops endpoint - see epic EEXPR-12 README.

## Acceptance Criteria

- [ ] Service method using PEO client + enrichment service
- [ ] Controller endpoint with CLIENT role auth
- [ ] `validatePEOLegalEntityAccessMiddleware` applied
- [ ] Input validation for params/query
- [ ] Unit tests for auth and response

## Work Items

| ID | Name | Status |
|----|------|--------|
| 01 | Add transfers service method | todo |
| 02 | Add controller endpoint | todo |
| 03 | Add unit tests | todo |

## Technical Context

### Key Files

| File | Purpose |
|------|---------|
| `backend/controllers/peo_integration/index.js` | Controller - add new route |
| `backend/middleware/peo/validate_peo_legal_entity.js` | Auth middleware (exists) |
| `backend/services/peo/entity_transfer/services/transfer_list_service.ts` | Service (NEW) |
| `backend/services/peo/entity_transfer_client_service.ts` | PEO HTTP client |
| `backend/services/peo/entity_transfer/helpers/transfer_enrichment_service.ts` | Enrichment |

### Middleware Details

**validatePEOLegalEntityAccessMiddleware** (existing):
```javascript
const validatePEOLegalEntityAccessMiddleware = ({LegalEntity, Organization}) => async (req, res, next) => {
    const {legalEntityId} = req.params;
    const {organization} = req;

    const legalEntity = await LegalEntity.findFirst({
        where: {
            OrganizationId: organization.id,
            publicId: legalEntityId,
        },
    });

    const peoOrganization = await Organization.getPeoApplication(organization.id);
    const hasPeoApplication = ['APPROVED', 'IN_PROGRESS'].includes(peoOrganization?.status);

    if (!legalEntity || !hasPeoApplication) {
        return res.error(HTTP_CODES.forbidden, 'PEO legal entity not found for user');
    }

    return next();
};
```

## Dependencies

### Depends On
- **EEXPR-12-3**: Enrichment service must be implemented first

## Notes

- This is a **client-facing** endpoint - ensure proper error messages
- Uses the same enrichment service as tech ops (EEXPR-12-3)
- Legal entity ID comes from path, not query (different from tech ops)
- Authorization ensures clients can only see their own organization's transfers

## Parent Epic

[EEXPR-12: Endpoint to retrieve transfer details](../in_progress/EEXPR-12/README.md)
