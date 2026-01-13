<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 05-add-route-registration.md                          ║
║ TASK: EEXPR-12-3                                                 ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: backend
---

# Add Route Registration: entity_transfer/source

## Objective

Register the tech ops route with proper authentication and authorization middleware.

## Implementation Steps

### Step 1: Add route to tech_ops controller

**File:** `backend/controllers/admin/peo/tech_ops.ts`

```javascript
const express = require('express');
const router = express.Router();
const { ROLES } = require('../../../constants/roles');
const { adminAuth, permittedRoles } = require('../../../middleware/admin_auth');
const { inputSchema } = require('../../../middleware/validation');
const Joi = require('joi');

const { getTransfersBySourceEntity } = require('./entity_transfer_handlers');

// Input validation schema
const getTransfersBySourceEntitySchema = {
  params: {
    sourceEntityPublicId: Joi.string().uuid().required(),
  },
  query: {
    cursor: Joi.string().uuid().optional(),
    limit: Joi.number().integer().min(1).max(100).default(100),
  },
};

// Route registration
router.get(
  '/entity_transfer/source/:sourceEntityPublicId',
  adminAuth,
  permittedRoles([ROLES.admin]),
  inputSchema(getTransfersBySourceEntitySchema),
  getTransfersBySourceEntity
);

module.exports = router;
```

### Step 2: Verify route prefix

The tech_ops routes are typically mounted at `/admin/peo/tech_ops`, so the full path will be:

```
GET /admin/peo/tech_ops/entity_transfer/source/:sourceEntityPublicId
```

Verify in `backend/controllers/admin/index.js` or equivalent:

```javascript
app.use('/admin/peo/tech_ops', require('./peo/tech_ops'));
```

## Acceptance Criteria

- [ ] Route registered at `/entity_transfer/source/:sourceEntityPublicId`
- [ ] `adminAuth` middleware applied
- [ ] `permittedRoles([ROLES.admin])` authorization
- [ ] Input validation via `inputSchema`
- [ ] Route accessible at full path `/admin/peo/tech_ops/entity_transfer/source/:id`
