<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-add-client-service-method.md                       ║
║ TASK: EEXPR-12-3                                                 ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: backend
---

# Add Client Service Method: getTransfersBySourceEntity

## Objective

Add HTTP client method to call the PEO transfers endpoint.

## Implementation Steps

### Step 1: Add type definitions

**File:** `backend/services/peo/entity_transfer_client_service.ts`

```typescript
interface RawTransferItem {
  id: string;
  status: string;
  baseContractOid: string;
  deelContractId: number;
  employeeName: string;
  benefitGroupId: string | null;
  payGroupId: string | null;
  ptoPolicyId: string | null;
  workLocationId: string | null;
  positionPublicId: string | null;
  teamId: number | null;
  newContractOid: string | null;
  resumeFromStep: string | null;
}

interface RawTransferSignature {
  id: string;
  profilePublicId: string;
  role: string;
  agreementType: string;
  signedAt: string | null;
}

interface RawTransferAgreement {
  id: string;
  type: string;
  pdfUrl: string | null;
  createdAt: string;
}

interface RawTransfer {
  id: string;
  status: string;
  organizationId: number;
  requesterProfilePublicId: string;
  sourceLegalEntityPublicId: string;
  destinationLegalEntityPublicId: string;
  effectiveDate: string;
  items: RawTransferItem[];
  signatures: RawTransferSignature[];
  agreement: RawTransferAgreement | null;
  createdAt: string;
  updatedAt: string;
}

interface GetTransfersBySourceEntityResponse {
  transfers: RawTransfer[];
  cursor: string | null;
  hasMore: boolean;
}

interface GetTransfersBySourceEntityOptions {
  cursor?: string;
  limit?: number;
}
```

### Step 2: Add client method

**File:** `backend/services/peo/entity_transfer_client_service.ts`

```typescript
import { entityTransferEndpoints } from './endpoints/entity_transfer_endpoints';
import { peoApiClient } from './peo_api_client';

export class EntityTransferClientService {
  async getTransfersBySourceEntity(
    sourceEntityPublicId: string,
    options: GetTransfersBySourceEntityOptions = {}
  ): Promise<GetTransfersBySourceEntityResponse> {
    const { cursor, limit = 100 } = options;

    const endpoint = entityTransferEndpoints.getTransfersBySourceEntity(sourceEntityPublicId);

    const queryParams = new URLSearchParams();
    if (cursor) queryParams.append('cursor', cursor);
    if (limit) queryParams.append('limit', String(limit));

    const url = queryParams.toString()
      ? `${endpoint}?${queryParams.toString()}`
      : endpoint;

    const response = await peoApiClient.get<{
      success: boolean;
      data: GetTransfersBySourceEntityResponse;
    }>(url);

    if (!response.success) {
      throw new Error('Failed to fetch transfers from PEO');
    }

    return response.data;
  }
}

export const entityTransferClientService = new EntityTransferClientService();
```

## Acceptance Criteria

- [ ] Type definitions for raw transfer response
- [ ] Client method with cursor/limit params
- [ ] Proper error handling
- [ ] Query params properly encoded
