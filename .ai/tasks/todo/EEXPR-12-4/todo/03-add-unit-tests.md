<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-add-unit-tests.md                                  ║
║ TASK: EEXPR-12-4                                                 ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: backend
---

# Add Unit Tests: Public API Entity Transfers

## Objective

Add comprehensive tests for the public API endpoint.

## Implementation Steps

### Step 1: Add controller tests

**File:** `backend/controllers/peo_integration/__tests__/entity_transfer_transfers.test.js`

```javascript
const request = require('supertest');
const app = require('../../../app');
const { TransferListService } = require('../../../services/peo/entity_transfer/services/transfer_list_service');
const db = require('../../../models');

jest.mock('../../../services/peo/entity_transfer/services/transfer_list_service');
jest.mock('../../../models');

describe('GET /peo_integration/legal_entities/entity_transfer/:legalEntityId/transfers', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const mockOrganization = { id: 12345 };
  const mockLegalEntity = { id: 1, publicId: validUuid, OrganizationId: 12345 };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock legal entity lookup
    db.LegalEntity.findFirst.mockResolvedValue(mockLegalEntity);

    // Mock PEO application check
    db.Organization.getPeoApplication.mockResolvedValue({ status: 'APPROVED' });
  });

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      await request(app)
        .get(`/peo_integration/legal_entities/entity_transfer/${validUuid}/transfers`)
        .expect(401);
    });

    it('should return 403 if user does not have CLIENT role', async () => {
      await request(app)
        .get(`/peo_integration/legal_entities/entity_transfer/${validUuid}/transfers`)
        .set('Authorization', 'Bearer admin-only-token') // token without CLIENT role
        .expect(403);
    });
  });

  describe('Authorization', () => {
    it('should return 403 if legal entity not found for organization', async () => {
      db.LegalEntity.findFirst.mockResolvedValue(null);

      await request(app)
        .get(`/peo_integration/legal_entities/entity_transfer/${validUuid}/transfers`)
        .set('Authorization', 'Bearer client-token')
        .expect(403);
    });

    it('should return 403 if organization has no PEO application', async () => {
      db.Organization.getPeoApplication.mockResolvedValue(null);

      await request(app)
        .get(`/peo_integration/legal_entities/entity_transfer/${validUuid}/transfers`)
        .set('Authorization', 'Bearer client-token')
        .expect(403);
    });

    it('should return 403 if PEO application not APPROVED or IN_PROGRESS', async () => {
      db.Organization.getPeoApplication.mockResolvedValue({ status: 'REJECTED' });

      await request(app)
        .get(`/peo_integration/legal_entities/entity_transfer/${validUuid}/transfers`)
        .set('Authorization', 'Bearer client-token')
        .expect(403);
    });
  });

  describe('Validation', () => {
    it('should return 400 for invalid UUID', async () => {
      await request(app)
        .get('/peo_integration/legal_entities/entity_transfer/invalid-uuid/transfers')
        .set('Authorization', 'Bearer client-token')
        .expect(400);
    });

    it('should return 400 for limit > 100', async () => {
      await request(app)
        .get(`/peo_integration/legal_entities/entity_transfer/${validUuid}/transfers`)
        .query({ limit: 150 })
        .set('Authorization', 'Bearer client-token')
        .expect(400);
    });

    it('should return 400 for limit < 1', async () => {
      await request(app)
        .get(`/peo_integration/legal_entities/entity_transfer/${validUuid}/transfers`)
        .query({ limit: 0 })
        .set('Authorization', 'Bearer client-token')
        .expect(400);
    });
  });

  describe('Success cases', () => {
    it('should return enriched transfers', async () => {
      const mockResponse = {
        data: [{ transfer: { id: 'transfer-1' }, agreement: null }],
        cursor: null,
        hasMore: false,
      };

      TransferListService.prototype.getTransfersByLegalEntity.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get(`/peo_integration/legal_entities/entity_transfer/${validUuid}/transfers`)
        .set('Authorization', 'Bearer client-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        ...mockResponse,
      });

      expect(TransferListService.prototype.getTransfersByLegalEntity).toHaveBeenCalledWith(
        validUuid,
        mockOrganization.id,
        { cursor: undefined, limit: 100 }
      );
    });

    it('should pass pagination params to service', async () => {
      TransferListService.prototype.getTransfersByLegalEntity.mockResolvedValue({
        data: [],
        cursor: null,
        hasMore: false,
      });

      await request(app)
        .get(`/peo_integration/legal_entities/entity_transfer/${validUuid}/transfers`)
        .query({ cursor: 'abc123', limit: 50 })
        .set('Authorization', 'Bearer client-token')
        .expect(200);

      expect(TransferListService.prototype.getTransfersByLegalEntity).toHaveBeenCalledWith(
        validUuid,
        mockOrganization.id,
        { cursor: 'abc123', limit: 50 }
      );
    });

    it('should return empty array when no transfers found', async () => {
      TransferListService.prototype.getTransfersByLegalEntity.mockResolvedValue({
        data: [],
        cursor: null,
        hasMore: false,
      });

      const response = await request(app)
        .get(`/peo_integration/legal_entities/entity_transfer/${validUuid}/transfers`)
        .set('Authorization', 'Bearer client-token')
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.hasMore).toBe(false);
    });

    it('should return pagination info when more results exist', async () => {
      TransferListService.prototype.getTransfersByLegalEntity.mockResolvedValue({
        data: [{ transfer: { id: 'transfer-1' } }],
        cursor: 'next-cursor',
        hasMore: true,
      });

      const response = await request(app)
        .get(`/peo_integration/legal_entities/entity_transfer/${validUuid}/transfers`)
        .set('Authorization', 'Bearer client-token')
        .expect(200);

      expect(response.body.cursor).toBe('next-cursor');
      expect(response.body.hasMore).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should return 500 on service error', async () => {
      TransferListService.prototype.getTransfersByLegalEntity.mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .get(`/peo_integration/legal_entities/entity_transfer/${validUuid}/transfers`)
        .set('Authorization', 'Bearer client-token')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
```

### Step 2: Add service tests

**File:** `backend/services/peo/entity_transfer/services/transfer_list_service.test.js`

```javascript
const { TransferListService } = require('./transfer_list_service');
const { entityTransferClientService } = require('../../entity_transfer_client_service');
const { transferEnrichmentService } = require('../helpers/transfer_enrichment_service');

jest.mock('../../entity_transfer_client_service');
jest.mock('../helpers/transfer_enrichment_service');

describe('TransferListService', () => {
  let service;

  beforeEach(() => {
    service = new TransferListService();
    jest.clearAllMocks();
  });

  describe('getTransfersByLegalEntity', () => {
    it('should call PEO client and enrichment service', async () => {
      const mockRawResponse = {
        transfers: [{ id: 'transfer-1' }],
        cursor: null,
        hasMore: false,
      };
      const mockEnrichedTransfers = [
        { id: 'transfer-1', agreement: null },
      ];

      entityTransferClientService.getTransfersBySourceEntity.mockResolvedValue(mockRawResponse);
      transferEnrichmentService.enrichTransfers.mockResolvedValue(mockEnrichedTransfers);

      const result = await service.getTransfersByLegalEntity('entity-id', 12345);

      expect(entityTransferClientService.getTransfersBySourceEntity).toHaveBeenCalledWith(
        'entity-id',
        { cursor: undefined, limit: 100 }
      );
      expect(transferEnrichmentService.enrichTransfers).toHaveBeenCalledWith(
        mockRawResponse.transfers
      );
      expect(result.data).toHaveLength(1);
    });

    it('should pass pagination options', async () => {
      entityTransferClientService.getTransfersBySourceEntity.mockResolvedValue({
        transfers: [],
        cursor: null,
        hasMore: false,
      });
      transferEnrichmentService.enrichTransfers.mockResolvedValue([]);

      await service.getTransfersByLegalEntity('entity-id', 12345, {
        cursor: 'abc',
        limit: 50,
      });

      expect(entityTransferClientService.getTransfersBySourceEntity).toHaveBeenCalledWith(
        'entity-id',
        { cursor: 'abc', limit: 50 }
      );
    });
  });
});
```

## Acceptance Criteria

- [ ] Controller tests for auth (401, 403)
- [ ] Controller tests for validation (400)
- [ ] Controller tests for success cases
- [ ] Controller tests for error handling
- [ ] Service tests for PEO client + enrichment integration
- [ ] All tests pass: `npm test -- entity_transfer_transfers`
