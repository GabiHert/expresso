<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-7-public-api-endpoint.md                     ║
║ TASK: EEXPR-13                                                   ║
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
# Repository Context (EEXPR-13)
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: EEXPR-13-entity-transfer-post
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Public API POST Endpoint

## Objective

Create the public API POST endpoint for entity transfer creation. This mirrors the tech ops endpoint but is accessible to client admins.

**Endpoint**: `POST /peo_integration/legal_entities/entity_transfer`

## Pre-Implementation

Before starting:
1. Complete EEXPR-13-6 (tech ops endpoint) first - we'll reuse its logic
2. Explore: `backend/controllers/peo_integration/index.js` for existing patterns

## Implementation Steps

### Step 1: Identify the shared logic

The orchestration logic from EEXPR-13-6 should be extracted into a shared service function:

**File**: `backend/services/peo/entity_transfer/services/create_transfer_service.ts`

```typescript
async function createEntityTransfer(
  payload: CreateEntityTransferRequest,
  context: { requesterProfileId: string; organizationId: number }
): Promise<CreateEntityTransferResponse>
```

This function contains the full orchestration flow:
1. Calculate effective date
2. Run sanity checks
3. Create UW requests
4. Create transfer with signatures
5. Enrich response

### Step 2: Refactor tech ops endpoint

Update the tech ops endpoint to use the shared service:

```typescript
router.post('/entity_transfer/create', adminAuth, async (req, res) => {
  const result = await createEntityTransferService.createEntityTransfer(
    req.body,
    {
      requesterProfileId: req.user.profilePublicId,
      organizationId: req.body.organizationId,
    }
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.status(201).json(result.data);
});
```

### Step 3: Add public API endpoint

**File**: `backend/controllers/peo_integration/index.js`

Add new route:

```javascript
router.post(
  '/legal_entities/entity_transfer',
  authenticate,
  hasOrganizationAccess,
  async (req, res) => {
    try {
      // Validate user has admin access to organization
      const { organizationId } = req.body;
      if (!req.user.hasAdminAccessTo(organizationId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      const result = await createEntityTransferService.createEntityTransfer(
        req.body,
        {
          requesterProfileId: req.user.profilePublicId,
          organizationId,
        }
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result.data);
    } catch (error) {
      log.error({ message: 'Failed to create entity transfer', error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);
```

### Step 4: Add authorization checks

The public API needs additional checks:
- User must be admin for the organization
- User must have access to both source and destination legal entities
- Requester profile must match authenticated user

```javascript
// Verify user is admin
const isAdmin = await organizationService.isUserAdmin(req.user.id, organizationId);
if (!isAdmin) {
  return res.status(403).json({ success: false, error: 'Admin access required' });
}

// Verify access to legal entities
const hasSourceAccess = await legalEntityService.userHasAccess(
  req.user.id,
  req.body.sourceLegalEntityPublicId
);
const hasDestAccess = await legalEntityService.userHasAccess(
  req.user.id,
  req.body.destinationLegalEntityPublicId
);

if (!hasSourceAccess || !hasDestAccess) {
  return res.status(403).json({ success: false, error: 'Legal entity access denied' });
}
```

### Step 5: Add request logging

Add audit logging for the public API:

```javascript
log.info({
  message: 'Entity transfer creation requested',
  userId: req.user.id,
  organizationId,
  sourceLegalEntity: req.body.sourceLegalEntityPublicId,
  destinationLegalEntity: req.body.destinationLegalEntityPublicId,
  contractCount: req.body.contracts.length,
});
```

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Endpoint accessible via public API route
- [ ] Same payload format as tech ops endpoint
- [ ] Authorization checks (admin access, legal entity access)
- [ ] Reuses shared orchestration logic
- [ ] Proper error responses (400, 403, 500)
- [ ] Audit logging for requests
- [ ] 201 response on success

## Testing

1. Authorized admin creates transfer successfully
2. Non-admin user gets 403
3. User without legal entity access gets 403
4. Invalid payload returns 400 with validation errors
5. Same sanity check behavior as tech ops endpoint

## Notes

- This endpoint is for client-facing admin portal
- Different auth middleware than tech ops (user JWT vs internal auth)
- Reference existing endpoints in peo_integration/index.js for patterns
- CRITICAL: This work item depends on EEXPR-13-6 being completed first
