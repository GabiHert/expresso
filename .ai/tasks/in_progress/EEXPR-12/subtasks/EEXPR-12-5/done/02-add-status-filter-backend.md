<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-add-status-filter-backend.md                      ║
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
branch: EEXPR-12-5-status-filter
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Work Item 02: Add Status Filter to Backend Service

## Objective

Add support for status filter in the Backend service that proxies to PEO. Update both the public API endpoint and tech ops endpoint to accept status filter.

## Pre-Implementation

Ensure Work Item 01 (PEO changes) is completed and deployed first, as Backend depends on PEO accepting the status parameter.

## Implementation Steps

### Step 1: Update Types (types.ts)

**File**: `services/peo/entity_transfer/types.ts`

Add `statuses` to the options interface:

```typescript
export interface GetTransfersBySourceEntityOptions {
  cursor?: string;
  limit?: number;
  statuses?: TransferStatus[];
}
```

Ensure `TransferStatus` enum is exported if not already:

```typescript
export enum TransferStatus {
  DRAFT = 'DRAFT',
  PENDING_SIGNATURES = 'PENDING_SIGNATURES',
  SCHEDULED = 'SCHEDULED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  PARTIAL_FAILURE = 'PARTIAL_FAILURE',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}
```

### Step 2: Update Client Service (entity_transfer_client_service.ts)

**File**: `services/peo/entity_transfer_client_service.ts`

Update `getTransfersBySourceEntity` to include statuses in query params:

```typescript
async getTransfersBySourceEntity(
  sourceEntityPublicId: string,
  options: GetTransfersBySourceEntityOptions = {}
): Promise<TransfersBySourceResponse> {
  const params = new URLSearchParams();

  if (options.cursor) {
    params.append('cursor', options.cursor);
  }
  if (options.limit) {
    params.append('limit', options.limit.toString());
  }
  if (options.statuses?.length) {
    params.append('status', options.statuses.join(','));
  }

  const queryString = params.toString();
  const url = `/peo/entity-transfer/transfers/source/${sourceEntityPublicId}${queryString ? `?${queryString}` : ''}`;

  // ... rest of the method
}
```

### Step 3: Update Public API Endpoint (peo_integration/index.js)

**File**: `controllers/peo_integration/index.js`

Update the Joi schema for `/legal_entities/entity_transfer/:legalEntityId/transfers`:

```javascript
const {TransferStatus} = require('../../services/peo/entity_transfer/types');

// In the endpoint definition:
app.inputSchema({
    params: {
        legalEntityId: Joi.publicId(LegalEntity).resolve(false).required(),
    },
    query: Joi.object().keys({
        cursor: Joi.string().uuid().optional(),
        limit: Joi.number().integer().min(1).max(100).default(100),
        status: Joi.alternatives().try(
            Joi.array().items(Joi.string().valid(...Object.values(TransferStatus))),
            Joi.string()
        ).optional(),
    }),
}),
```

Update the handler to normalize and pass statuses:

```javascript
async (req, res) => {
    const {legalEntityId} = req.params;
    const {cursor, limit, status} = req.query;

    // Normalize status to array
    let statuses;
    if (status) {
        statuses = Array.isArray(status)
            ? status
            : status.split(',').map(s => s.trim());
    }

    try {
        const rawData = await entityTransferClientService.getTransfersBySourceEntity(
            legalEntityId,
            {cursor, limit, statuses}
        );
        const enrichedData = await transferEnrichmentService.enrichTransfers(rawData);
        return res.json(enrichedData);
    } catch (error) {
        // ... error handling
    }
}
```

### Step 4: Update Tech Ops Endpoint (if exists)

If there's a separate tech ops endpoint at `/admin/peo/tech_ops/entity_transfer/source/:sourceEntityPublicId`, apply the same status filter pattern.

Check `controllers/admin/peo/tech_ops/` for the endpoint.

### Step 5: Test the Changes

Run lint:
```bash
cd /Users/gabriel.herter/Documents/Projects/deel/backend
npm run lint
```

Test manually:

```bash
# Without status filter
curl "http://localhost:3000/peo_integration/legal_entities/{id}/transfers"

# Single status
curl "http://localhost:3000/peo_integration/legal_entities/{id}/transfers?status=DRAFT"

# Multiple statuses (comma-separated)
curl "http://localhost:3000/peo_integration/legal_entities/{id}/transfers?status=DRAFT,SCHEDULED"

# Multiple statuses (repeated param)
curl "http://localhost:3000/peo_integration/legal_entities/{id}/transfers?status=DRAFT&status=SCHEDULED"
```

## Post-Implementation

Run a code review agent to check for issues.

## Acceptance Criteria

- [ ] Types updated with statuses option
- [ ] Client service builds status query param correctly
- [ ] Public API endpoint validates status values
- [ ] Both comma-separated and repeated param formats work
- [ ] Invalid status values return 400 error
- [ ] Empty status returns all transfers
- [ ] Tech ops endpoint also supports status filter (if applicable)
- [ ] Lint passes

## Testing

1. Test with valid single status
2. Test with valid multiple statuses (comma-separated)
3. Test with valid multiple statuses (repeated param)
4. Test with invalid status value (should return 400)
5. Test with no status (should return all)

## Notes

- This depends on Work Item 01 being completed first
- The Joi validation allows both array and string formats
- String format is split by comma in the handler
- TransferStatus enum must match PEO service exactly
