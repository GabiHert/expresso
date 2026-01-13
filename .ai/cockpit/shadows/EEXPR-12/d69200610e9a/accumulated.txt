<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-add-service-method.md                              ║
║ TASK: EEXPR-12-4                                                 ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: backend
---

# Add Service Method: getTransfersByLegalEntity

## Objective

Create a service method that combines PEO client call with enrichment for the public API.

## Implementation Steps

### Step 1: Create service file

**File:** `backend/services/peo/entity_transfer/services/transfer_list_service.ts` (NEW)

```typescript
import { BasePEOService } from '../../base_peo_service';
import { entityTransferClientService } from '../../entity_transfer_client_service';
import { transferEnrichmentService } from '../helpers/transfer_enrichment_service';

interface GetTransfersOptions {
  cursor?: string;
  limit?: number;
}

interface TransferListResponse {
  data: EnrichedTransferWithAgreement[];
  cursor: string | null;
  hasMore: boolean;
}

interface EnrichedTransferWithAgreement {
  transfer: EnrichedTransfer;
  agreement: EnrichedAgreement | null;
}

export class TransferListService extends BasePEOService {
  /**
   * Get transfers for a legal entity with enriched data
   *
   * @param legalEntityPublicId - Legal entity public ID
   * @param organizationId - Organization ID (for validation/logging)
   * @param options - Pagination options
   */
  async getTransfersByLegalEntity(
    legalEntityPublicId: string,
    organizationId: number,
    options: GetTransfersOptions = {}
  ): Promise<TransferListResponse> {
    const { cursor, limit = 100 } = options;

    this.log.info({
      message: '[TransferListService] Fetching transfers',
      legalEntityPublicId,
      organizationId,
      cursor,
      limit,
    });

    // 1. Call PEO endpoint for raw data
    const rawResponse = await entityTransferClientService.getTransfersBySourceEntity(
      legalEntityPublicId,
      { cursor, limit }
    );

    // 2. Enrich with backend data
    const enrichedTransfers = await transferEnrichmentService.enrichTransfers(
      rawResponse.transfers
    );

    this.log.info({
      message: '[TransferListService] Successfully enriched transfers',
      legalEntityPublicId,
      organizationId,
      transferCount: enrichedTransfers.length,
      hasMore: rawResponse.hasMore,
    });

    // 3. Format response
    return {
      data: enrichedTransfers.map((transfer) => ({
        transfer,
        agreement: transfer.agreement,
      })),
      cursor: rawResponse.cursor,
      hasMore: rawResponse.hasMore,
    };
  }
}

export const transferListService = new TransferListService();
```

### Step 2: Export from index

**File:** `backend/services/peo/entity_transfer/services/index.ts`

```typescript
export { TransferListService, transferListService } from './transfer_list_service';
```

## Acceptance Criteria

- [ ] Service extends `BasePEOService` for logging
- [ ] Calls PEO client service for raw data
- [ ] Uses enrichment service from EEXPR-12-3
- [ ] Returns formatted response with pagination
- [ ] Proper logging for debugging
