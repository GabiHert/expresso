<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-create-unified-controller.md                       ║
║ TASK: EEXPR-12-7                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ GIT CONTEXT:                                                     ║
║   Repo: backend                                                  ║
║   Path: /Users/gabriel.herter/Documents/Projects/deel/backend    ║
║   Branch: EEXPR-12-7-unified-entity-transfers                    ║
║                                                                  ║
║ BEFORE GIT OPERATIONS:                                           ║
║   cd /Users/gabriel.herter/Documents/Projects/deel/backend       ║
║   git rev-parse --show-toplevel                                  ║
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
repo: "backend"
repo_path: "/Users/gabriel.herter/Documents/Projects/deel/backend"
branch: "EEXPR-12-7-unified-entity-transfers"
protected: false
---

# Create Unified Entity Transfers Controller

## Objective

Create a controller that exposes the `GET /admin/peo/tech_ops/entity_transfer/unified` endpoint with proper validation, query parameter parsing, and error handling.

## Pre-Implementation

Before starting, explore existing patterns in `backend/controllers/`:
- How controllers are structured (decorators, middleware)
- Joi validation patterns for query parameters
- Permission middleware usage
- Response formatting patterns

Look at similar tech_ops controllers for reference.

## Implementation Steps

### Step 1: Create Controller Directory

**Directory**: `backend/controllers/entity_transfers/`

Create the directory if it doesn't exist.

### Step 2: Create Controller File

**File**: `backend/controllers/entity_transfers/unified_entity_transfers_controller.js`

**Implementation**:

```javascript
const {unifiedEntityTransferService} = require('../../services/entity_transfers');
const {HTTP_CODES} = require('../../constants/http_codes');

/**
 * GET /admin/peo/tech_ops/entity_transfer/unified
 *
 * Unified endpoint that aggregates entity transfers from EOR and PEO services.
 * Returns {eor: [...], peo: [...]} with separate status filters.
 */
module.exports = {
    /**
     * @route GET /admin/peo/tech_ops/entity_transfer/unified
     * @middleware permissions('admin:contracts.read')
     * @query {string} [types=eor,peo] - Comma-separated types to fetch
     * @query {string} [sourceLegalEntityPublicId] - Required when types includes 'peo'
     * @query {number} [organizationId] - Required when types includes 'eor'
     * @query {string} [eorStatus] - Comma-separated EOR status filter
     * @query {string} [peoStatus] - Comma-separated PEO status filter
     */
    getUnifiedEntityTransfers: {
        method: 'GET',
        path: '/admin/peo/tech_ops/entity_transfer/unified',
        middleware: ['permissions:admin:contracts.read'],
        validation: {
            query: {
                types: {
                    type: 'string',
                    optional: true,
                    default: 'eor,peo',
                },
                sourceLegalEntityPublicId: {
                    type: 'string',
                    uuid: true,
                    optional: true,
                },
                organizationId: {
                    type: 'number',
                    integer: true,
                    positive: true,
                    optional: true,
                },
                eorStatus: {
                    type: 'string',
                    optional: true,
                },
                peoStatus: {
                    type: 'string',
                    optional: true,
                },
            },
        },
        handler: async ({query, res}) => {
            const {
                types,
                sourceLegalEntityPublicId,
                organizationId,
                eorStatus,
                peoStatus,
            } = query;

            // Parse comma-separated values
            const typeArray = types.split(',').map(t => t.trim().toLowerCase());
            const eorStatusArray = eorStatus
                ? eorStatus.split(',').map(s => s.trim())
                : undefined;
            const peoStatusArray = peoStatus
                ? peoStatus.split(',').map(s => s.trim())
                : undefined;

            // Validation: PEO requires sourceLegalEntityPublicId
            if (typeArray.includes('peo') && !sourceLegalEntityPublicId) {
                return res.status(HTTP_CODES.bad_request).json({
                    success: false,
                    message: 'sourceLegalEntityPublicId is required when types includes peo',
                });
            }

            // Validation: EOR requires organizationId
            if (typeArray.includes('eor') && !organizationId) {
                return res.status(HTTP_CODES.bad_request).json({
                    success: false,
                    message: 'organizationId is required when types includes eor',
                });
            }

            try {
                const response = await unifiedEntityTransferService.getUnifiedTransfers({
                    types: typeArray,
                    sourceLegalEntityPublicId,
                    organizationId,
                    eorStatus: eorStatusArray,
                    peoStatus: peoStatusArray,
                });

                return res.status(HTTP_CODES.ok).json({
                    success: true,
                    data: response,
                });
            } catch (error) {
                return res.status(HTTP_CODES.internal_server_error).json({
                    success: false,
                    message: error.message || 'Failed to fetch unified transfers',
                });
            }
        },
    },
};
```

### Step 3: Register Controller Route

Find where tech_ops routes are registered and add the new controller.

**Likely location**: `backend/routes/admin/peo/tech_ops/` or similar

Look for existing entity_transfer routes and add the unified endpoint alongside them.

**Example registration** (adjust based on actual pattern):

```javascript
// In the routes file
const unifiedController = require('../../../../controllers/entity_transfers/unified_entity_transfers_controller');

// Register the route
router.get(
    '/entity_transfer/unified',
    permissions('admin:contracts.read'),
    joiValidation(unifiedController.getUnifiedEntityTransfers.validation),
    unifiedController.getUnifiedEntityTransfers.handler
);
```

### Step 4: Verify Route Registration

Ensure the route is properly registered by:
1. Starting the backend server
2. Checking that the endpoint appears in the route list
3. Testing with a simple curl command

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Controller file created at `backend/controllers/entity_transfers/unified_entity_transfers_controller.js`
- [ ] Route registered at `GET /admin/peo/tech_ops/entity_transfer/unified`
- [ ] Query parameter validation implemented
- [ ] Validation: returns 400 if PEO requested without `sourceLegalEntityPublicId`
- [ ] Validation: returns 400 if EOR requested without `organizationId`
- [ ] Comma-separated values properly parsed for types and status filters
- [ ] Response format: `{success: true, data: {eor, peo, errors?}}`
- [ ] Error handling returns appropriate HTTP status codes

## Testing

Test the endpoint manually:

```bash
# Test with both types
curl -X GET 'http://localhost:3000/admin/peo/tech_ops/entity_transfer/unified?types=eor,peo&sourceLegalEntityPublicId=UUID&organizationId=123' \
  -H 'Authorization: Bearer TOKEN'

# Test validation - missing sourceLegalEntityPublicId for PEO
curl -X GET 'http://localhost:3000/admin/peo/tech_ops/entity_transfer/unified?types=peo' \
  -H 'Authorization: Bearer TOKEN'
# Should return 400

# Test with status filters
curl -X GET 'http://localhost:3000/admin/peo/tech_ops/entity_transfer/unified?types=eor,peo&sourceLegalEntityPublicId=UUID&organizationId=123&eorStatus=AWAITING_SIGNATURE&peoStatus=DRAFT,SCHEDULED' \
  -H 'Authorization: Bearer TOKEN'
```

## Notes

- The controller structure may need adjustment based on the actual backend patterns used
- Permission `admin:contracts.read` may need to be verified or adjusted
- The exact route registration pattern depends on the existing routing setup
