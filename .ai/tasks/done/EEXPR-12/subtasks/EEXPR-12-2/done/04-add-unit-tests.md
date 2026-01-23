<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-add-unit-tests.md                                  ║
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

# Add Unit Tests: GET transfers by source entity

## Objective

Add comprehensive unit tests for the service method and controller endpoint.

## Implementation Steps

### Step 1: Add service tests

**File:** `peo/src/services/entityTransfer/entityTransferService.spec.ts`

```typescript
import { EntityTransferService } from './entityTransferService';
import { PeoEmployeeTransfer } from '../../models/entityTransfer/PeoEmployeeTransfer';

jest.mock('../../models/entityTransfer/PeoEmployeeTransfer');

describe('EntityTransferService', () => {
  let service: EntityTransferService;

  beforeEach(() => {
    service = new EntityTransferService();
    jest.clearAllMocks();
  });

  describe('getTransfersBySourceEntity', () => {
    const sourceEntityPublicId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return transfers for source entity', async () => {
      const mockTransfers = [
        createMockTransfer('transfer-1'),
        createMockTransfer('transfer-2'),
      ];

      (PeoEmployeeTransfer.findAll as jest.Mock).mockResolvedValue(mockTransfers);

      const result = await service.getTransfersBySourceEntity(sourceEntityPublicId);

      expect(PeoEmployeeTransfer.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sourceLegalEntityPublicId: sourceEntityPublicId },
          limit: 101, // 100 + 1 for hasMore check
          order: [['id', 'ASC']],
        })
      );

      expect(result.transfers).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeNull();
    });

    it('should return hasMore=true when more results exist', async () => {
      const mockTransfers = Array.from({ length: 101 }, (_, i) =>
        createMockTransfer(`transfer-${i}`)
      );

      (PeoEmployeeTransfer.findAll as jest.Mock).mockResolvedValue(mockTransfers);

      const result = await service.getTransfersBySourceEntity(sourceEntityPublicId, {
        limit: 100,
      });

      expect(result.transfers).toHaveLength(100);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe('transfer-99');
    });

    it('should apply cursor filter', async () => {
      const cursor = 'prev-transfer-id';
      (PeoEmployeeTransfer.findAll as jest.Mock).mockResolvedValue([]);

      await service.getTransfersBySourceEntity(sourceEntityPublicId, { cursor });

      expect(PeoEmployeeTransfer.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sourceLegalEntityPublicId: sourceEntityPublicId,
            id: { [Op.gt]: cursor },
          },
        })
      );
    });

    it('should respect limit parameter', async () => {
      (PeoEmployeeTransfer.findAll as jest.Mock).mockResolvedValue([]);

      await service.getTransfersBySourceEntity(sourceEntityPublicId, { limit: 50 });

      expect(PeoEmployeeTransfer.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 51, // 50 + 1
        })
      );
    });

    it('should cap limit at 100', async () => {
      (PeoEmployeeTransfer.findAll as jest.Mock).mockResolvedValue([]);

      await service.getTransfersBySourceEntity(sourceEntityPublicId, { limit: 200 });

      expect(PeoEmployeeTransfer.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 101, // 100 + 1 (capped)
        })
      );
    });

    it('should return empty array when no transfers found', async () => {
      (PeoEmployeeTransfer.findAll as jest.Mock).mockResolvedValue([]);

      const result = await service.getTransfersBySourceEntity(sourceEntityPublicId);

      expect(result.transfers).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeNull();
    });

    it('should transform employee name from peoContract', async () => {
      const mockTransfer = createMockTransfer('transfer-1', {
        items: [
          {
            id: 'item-1',
            peoContract: {
              firstName: 'John',
              lastName: 'Doe',
              deelContractId: 12345,
            },
          },
        ],
      });

      (PeoEmployeeTransfer.findAll as jest.Mock).mockResolvedValue([mockTransfer]);

      const result = await service.getTransfersBySourceEntity(sourceEntityPublicId);

      expect(result.transfers[0].items[0].employeeName).toBe('John Doe');
      expect(result.transfers[0].items[0].deelContractId).toBe(12345);
    });

    it('should handle missing peoContract gracefully', async () => {
      const mockTransfer = createMockTransfer('transfer-1', {
        items: [{ id: 'item-1', peoContract: null }],
      });

      (PeoEmployeeTransfer.findAll as jest.Mock).mockResolvedValue([mockTransfer]);

      const result = await service.getTransfersBySourceEntity(sourceEntityPublicId);

      expect(result.transfers[0].items[0].employeeName).toBe('');
      expect(result.transfers[0].items[0].deelContractId).toBeNull();
    });

    it('should construct pdfUrl from persistedPathPattern', async () => {
      const mockTransfer = createMockTransfer('transfer-1', {
        agreement: {
          id: 'agreement-1',
          type: 'ENTITY_ASSIGNMENT_AGREEMENT',
          fileSubmission: {
            file: {
              persistedPathPattern: 'agreements/2025/01/document.pdf',
            },
          },
        },
      });

      (PeoEmployeeTransfer.findAll as jest.Mock).mockResolvedValue([mockTransfer]);

      const result = await service.getTransfersBySourceEntity(sourceEntityPublicId);

      expect(result.transfers[0].agreement.pdfUrl).toContain(
        'agreements/2025/01/document.pdf'
      );
    });
  });
});

// Helper function
function createMockTransfer(id: string, overrides: Partial<any> = {}) {
  return {
    id,
    status: 'DRAFT',
    organizationId: 12345,
    requesterProfilePublicId: 'profile-uuid',
    sourceLegalEntityPublicId: 'source-uuid',
    destinationLegalEntityPublicId: 'dest-uuid',
    effectiveDate: '2025-02-01',
    items: [],
    signatures: [],
    agreement: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

### Step 2: Add controller tests

**File:** `peo/src/controllers/entityTransfer/entityTransferController.spec.ts`

```typescript
import request from 'supertest';
import { app } from '../../app';
import { EntityTransferService } from '../../services/entityTransfer/entityTransferService';

jest.mock('../../services/entityTransfer/entityTransferService');

describe('EntityTransferController', () => {
  describe('GET /peo/entity-transfer/transfers/source/:sourceEntityPublicId', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return 200 with transfers', async () => {
      const mockResponse = {
        transfers: [{ id: 'transfer-1', status: 'DRAFT' }],
        cursor: null,
        hasMore: false,
      };

      (EntityTransferService.prototype.getTransfersBySourceEntity as jest.Mock)
        .mockResolvedValue(mockResponse);

      const response = await request(app)
        .get(`/peo/entity-transfer/transfers/source/${validUuid}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResponse,
      });
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/peo/entity-transfer/transfers/source/invalid-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should pass cursor query param to service', async () => {
      const cursor = 'abc123';
      (EntityTransferService.prototype.getTransfersBySourceEntity as jest.Mock)
        .mockResolvedValue({ transfers: [], cursor: null, hasMore: false });

      await request(app)
        .get(`/peo/entity-transfer/transfers/source/${validUuid}`)
        .query({ cursor })
        .expect(200);

      expect(EntityTransferService.prototype.getTransfersBySourceEntity)
        .toHaveBeenCalledWith(validUuid, expect.objectContaining({ cursor }));
    });

    it('should pass limit query param to service', async () => {
      (EntityTransferService.prototype.getTransfersBySourceEntity as jest.Mock)
        .mockResolvedValue({ transfers: [], cursor: null, hasMore: false });

      await request(app)
        .get(`/peo/entity-transfer/transfers/source/${validUuid}`)
        .query({ limit: '50' })
        .expect(200);

      expect(EntityTransferService.prototype.getTransfersBySourceEntity)
        .toHaveBeenCalledWith(validUuid, expect.objectContaining({ limit: 50 }));
    });

    it('should return 400 for limit > 100', async () => {
      const response = await request(app)
        .get(`/peo/entity-transfer/transfers/source/${validUuid}`)
        .query({ limit: '150' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for limit < 1', async () => {
      const response = await request(app)
        .get(`/peo/entity-transfer/transfers/source/${validUuid}`)
        .query({ limit: '0' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should use default limit of 100 when not provided', async () => {
      (EntityTransferService.prototype.getTransfersBySourceEntity as jest.Mock)
        .mockResolvedValue({ transfers: [], cursor: null, hasMore: false });

      await request(app)
        .get(`/peo/entity-transfer/transfers/source/${validUuid}`)
        .expect(200);

      expect(EntityTransferService.prototype.getTransfersBySourceEntity)
        .toHaveBeenCalledWith(validUuid, expect.objectContaining({ limit: 100 }));
    });

    it('should return empty transfers array when none found', async () => {
      (EntityTransferService.prototype.getTransfersBySourceEntity as jest.Mock)
        .mockResolvedValue({ transfers: [], cursor: null, hasMore: false });

      const response = await request(app)
        .get(`/peo/entity-transfer/transfers/source/${validUuid}`)
        .expect(200);

      expect(response.body.data.transfers).toEqual([]);
      expect(response.body.data.hasMore).toBe(false);
    });

    it('should handle service errors', async () => {
      (EntityTransferService.prototype.getTransfersBySourceEntity as jest.Mock)
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/peo/entity-transfer/transfers/source/${validUuid}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
```

### Step 3: Add validation schema tests

**File:** `peo/src/controllers/entityTransfer/entityTransferDto.spec.ts`

```typescript
import {
  getTransfersBySourceEntityQuerySchema,
  getTransfersBySourceEntityParamsSchema,
} from './entityTransferDto';

describe('entityTransferDto', () => {
  describe('getTransfersBySourceEntityParamsSchema', () => {
    it('should accept valid UUID', () => {
      const result = getTransfersBySourceEntityParamsSchema.safeParse({
        sourceEntityPublicId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = getTransfersBySourceEntityParamsSchema.safeParse({
        sourceEntityPublicId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing sourceEntityPublicId', () => {
      const result = getTransfersBySourceEntityParamsSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('getTransfersBySourceEntityQuerySchema', () => {
    it('should accept empty query', () => {
      const result = getTransfersBySourceEntityQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data.limit).toBe(100); // default
    });

    it('should accept valid cursor', () => {
      const result = getTransfersBySourceEntityQuerySchema.safeParse({
        cursor: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('should transform limit string to number', () => {
      const result = getTransfersBySourceEntityQuerySchema.safeParse({
        limit: '50',
      });
      expect(result.success).toBe(true);
      expect(result.data.limit).toBe(50);
    });

    it('should reject limit > 100', () => {
      const result = getTransfersBySourceEntityQuerySchema.safeParse({
        limit: '150',
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit < 1', () => {
      const result = getTransfersBySourceEntityQuerySchema.safeParse({
        limit: '0',
      });
      expect(result.success).toBe(false);
    });
  });
});
```

## Key Files

| File | Purpose |
|------|---------|
| `peo/src/services/entityTransfer/entityTransferService.spec.ts` | Service tests |
| `peo/src/controllers/entityTransfer/entityTransferController.spec.ts` | Controller tests |
| `peo/src/controllers/entityTransfer/entityTransferDto.spec.ts` | Schema tests |

## Acceptance Criteria

- [ ] Service tests cover: pagination, cursor, limit, empty results, transforms
- [ ] Controller tests cover: valid requests, invalid UUIDs, query params, errors
- [ ] Schema tests cover: validation rules, transformations, defaults
- [ ] All tests pass: `npm test -- entityTransfer`

## Notes

- Adjust test patterns to match existing test conventions in the PEO codebase
- Use `jest.mock()` for model and service dependencies
- Use `supertest` for controller integration tests
