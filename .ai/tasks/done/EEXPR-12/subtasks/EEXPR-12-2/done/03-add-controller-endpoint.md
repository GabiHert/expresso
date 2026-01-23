<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-add-controller-endpoint.md                         ║
║ TASK: EEXPR-12-2                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                 ║
║ 2. Update status.yaml with new status                           ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml              ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: peo
---

# Add Controller Endpoint: GET transfers by source entity

## Objective

Add the REST API endpoint to retrieve transfers by source legal entity with pagination.

## Implementation Steps

### Step 1: Add controller method

**File:** `peo/src/controllers/entityTransfer/entityTransferController.ts`

```typescript
import { Controller, Get, Param, Query } from '@nestjs/common';
import { EntityTransferService } from '../../services/entityTransfer/entityTransferService';
import {
  getTransfersBySourceEntityQuerySchema,
  getTransfersBySourceEntityParamsSchema,
  GetTransfersBySourceEntityQuery,
  GetTransfersBySourceEntityParams,
} from './entityTransferDto';
import { ZodValidationPipe } from '../../pipes/zodValidation.pipe';

@Controller('entity-transfer')
export class EntityTransferController {
  constructor(private readonly entityTransferService: EntityTransferService) {}

  @Get('transfers/source/:sourceEntityPublicId')
  async getTransfersBySourceEntity(
    @Param(new ZodValidationPipe(getTransfersBySourceEntityParamsSchema))
    params: GetTransfersBySourceEntityParams,
    @Query(new ZodValidationPipe(getTransfersBySourceEntityQuerySchema))
    query: GetTransfersBySourceEntityQuery
  ) {
    const { sourceEntityPublicId } = params;
    const { cursor, limit } = query;

    const result = await this.entityTransferService.getTransfersBySourceEntity(
      sourceEntityPublicId,
      { cursor, limit }
    );

    return {
      success: true,
      data: result,
    };
  }
}
```

### Step 2: Alternative - Express-style controller (if not using NestJS)

If the PEO service uses Express-style controllers:

**File:** `peo/src/controllers/entityTransfer/entityTransferController.ts`

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { EntityTransferService } from '../../services/entityTransfer/entityTransferService';
import {
  getTransfersBySourceEntityQuerySchema,
  getTransfersBySourceEntityParamsSchema,
} from './entityTransferDto';

const router = Router();
const entityTransferService = new EntityTransferService();

router.get(
  '/transfers/source/:sourceEntityPublicId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate params
      const paramsResult = getTransfersBySourceEntityParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid path parameters',
          details: paramsResult.error.issues,
        });
      }

      // Validate query
      const queryResult = getTransfersBySourceEntityQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: queryResult.error.issues,
        });
      }

      const { sourceEntityPublicId } = paramsResult.data;
      const { cursor, limit } = queryResult.data;

      const result = await entityTransferService.getTransfersBySourceEntity(
        sourceEntityPublicId,
        { cursor, limit }
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

### Step 3: Register route (if using Express)

**File:** `peo/src/routes/index.ts` or equivalent

```typescript
import entityTransferRoutes from '../controllers/entityTransfer/entityTransferController';

// Register entity transfer routes
app.use('/peo/entity-transfer', entityTransferRoutes);
```

### Step 4: Add error handling

Ensure proper error responses:

```typescript
// In error handler middleware
if (error instanceof ZodError) {
  return res.status(400).json({
    success: false,
    error: 'Validation error',
    details: error.issues,
  });
}

// Not found
if (error.name === 'NotFoundError') {
  return res.status(404).json({
    success: false,
    error: error.message,
  });
}
```

## Key Files

| File | Purpose |
|------|---------|
| `peo/src/controllers/entityTransfer/entityTransferController.ts` | Controller |
| `peo/src/routes/index.ts` | Route registration |
| `peo/src/controllers/entityTransfer/entityTransferDto.ts` | Validation schemas |

## Acceptance Criteria

- [ ] GET endpoint at `/transfers/source/:sourceEntityPublicId`
- [ ] Path params validated (sourceEntityPublicId must be UUID)
- [ ] Query params validated (cursor optional UUID, limit optional 1-100)
- [ ] Service method called with validated params
- [ ] Response wrapped in `{ success: true, data: {...} }`
- [ ] Proper error handling for validation failures

## Notes

- Check existing controller patterns in the PEO codebase
- May need to adjust based on whether PEO uses NestJS or Express
- Ensure the route is registered under the correct prefix
