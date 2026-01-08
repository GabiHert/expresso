<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-create-subtask-eexpr-12-4.md                       ║
║ TASK: EEXPR-12 (Epic)                                            ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                 ║
║ 2. Update status.yaml with new status                           ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml              ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: backend
---

# Create Subtask EEXPR-12-4: [BE] Public API endpoint for transfers

## Objective

Create the subtask folder and work items for EEXPR-12-4, which exposes the entity transfer endpoint to the public API (client-facing) following the same pattern as `/legal_entities/entity_transfer/:legalEntityId/transfer_resources`.

## Subtask Details

**ID:** EEXPR-12-4
**Title:** [BE] Public API endpoint for transfers
**Repo:** backend
**Branch:** `EEXPR-12-4-public-api-transfers`
**Depends On:** EEXPR-12-3

### Endpoint

```
GET /peo_integration/legal_entities/entity_transfer/:legalEntityId/transfers
```

**Query Parameters:**
- `cursor` (string, optional) - Pagination cursor
- `limit` (number, optional, default: 100, max: 100)

### Response Structure

Same as the tech ops endpoint (EEXPR-12-3) - enriched transfer data.

### Pattern Reference

Based on existing endpoint implementation:
- **File:** `backend/controllers/peo_integration/index.js`
- **Route:** `/legal_entities/entity_transfer/:legalEntityId/transfer_resources`
- **Lines:** 1696-1754

### Key Implementation Points

1. **Route registration** in `backend/controllers/peo_integration/index.js`
2. **Auth middleware:**
   - `app.profileType([ROLES.CLIENT])` - Ensures user has CLIENT role
   - `app.inputSchema({...})` - Validates legalEntityId with Joi.publicId
   - `validatePEOLegalEntityAccessMiddleware` - Validates PEO legal entity access
3. **Service call** to enrichment service created in EEXPR-12-3
4. **Response formatting** - Same enriched format

## Work Items for EEXPR-12-4

| ID | Name | Description |
|----|------|-------------|
| 01 | Add transfers service method | Method in transfer service to get enriched transfers |
| 02 | Add controller endpoint | GET endpoint in peo_integration controller |
| 03 | Add unit tests | Tests for endpoint auth and response |

## Implementation Steps

### Step 1: Create subtask folder structure

```
.ai/tasks/todo/EEXPR-12-4/
├── README.md
├── status.yaml
├── todo/
│   ├── 01-add-service-method.md
│   ├── 02-add-controller-endpoint.md
│   └── 03-add-unit-tests.md
├── in_progress/
├── done/
└── feedback/
```

### Step 2: Create README.md

Include:
- Endpoint specification
- Auth middleware requirements
- Pattern reference to transfer_resources endpoint
- Reference to EEXPR-12-3 enrichment service
- Reference to parent epic EEXPR-12

### Step 3: Create status.yaml

```yaml
task: "EEXPR-12-4"
title: "[BE] Public API endpoint for transfers"
parent: "EEXPR-12"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"

work_items:
  - id: "01"
    name: "Add transfers service method"
    repo: backend
    status: todo
    file: "todo/01-add-service-method.md"
  - id: "02"
    name: "Add controller endpoint"
    repo: backend
    status: todo
    file: "todo/02-add-controller-endpoint.md"
  - id: "03"
    name: "Add unit tests"
    repo: backend
    status: todo
    file: "todo/03-add-unit-tests.md"
```

### Step 4: Create work item files

**01-add-service-method.md:**
- File: `backend/services/peo/entity_transfer/services/transfer_list_service.ts` (NEW)
- Extends `BasePEOService`
- Method: `getTransfersByLegalEntity(legalEntityPublicId: string, organizationId: number, options?: {cursor?: string, limit?: number})`
- Internally uses the PEO client + enrichment from EEXPR-12-3
- Returns `TransferListResponse` with enriched data

**02-add-controller-endpoint.md:**
- File: `backend/controllers/peo_integration/index.js`
- Route: `app.get('/legal_entities/entity_transfer/:legalEntityId/transfers', ...)`
- Middleware stack:
  ```javascript
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
  ```
- Handler calls `TransferListService.getTransfersByLegalEntity()`

**03-add-unit-tests.md:**
- Test file: `backend/controllers/peo_integration/__tests__/entity_transfer_transfers.test.js`
- Test cases:
  - Returns 401 if not authenticated
  - Returns 403 if no CLIENT role
  - Returns 403 if legal entity not owned by org
  - Returns 403 if org has no PEO application
  - Returns transfers with enriched data
  - Handles pagination correctly
  - Returns empty array if no transfers

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/controllers/peo_integration/index.js` | Controller - add new route |
| `backend/middleware/peo/validate_peo_legal_entity.js` | Auth middleware (already exists) |
| `backend/services/peo/entity_transfer/services/transfer_list_service.ts` | New service |
| `backend/services/peo/entity_transfer_client_service.ts` | PEO HTTP client |
| `backend/services/peo/entity_transfer/helpers/transfer_enrichment_service.ts` | Enrichment (from EEXPR-12-3) |

## Pattern Code Reference

From existing `transfer_resources` endpoint:

```javascript
// Route registration pattern (lines 1696-1754)
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

        try {
            log.info({
                message: '[PeoIntegration] Fetching transfer resources',
                legalEntityId,
                organizationId: organization.id,
            });

            const transferResourcesService = new TransferResourcesService();
            const resources = await transferResourcesService.getTransferResources(legalEntityId, organization.id);

            return res.json(resources);
        } catch (error) {
            // error handling
        }
    }
);
```

## Acceptance Criteria

- [ ] Subtask folder created at `.ai/tasks/todo/EEXPR-12-4/`
- [ ] README.md with complete context
- [ ] status.yaml with work items
- [ ] 3 work item files with detailed instructions
- [ ] References parent epic EEXPR-12
- [ ] References dependency on EEXPR-12-3

## Notes

- This subtask depends on EEXPR-12-3 (enrichment service)
- Uses same auth pattern as transfer_resources endpoint
- Client-facing endpoint - ensure proper error handling
- Validates legal entity belongs to user's organization
- Validates organization has PEO application status APPROVED or IN_PROGRESS
