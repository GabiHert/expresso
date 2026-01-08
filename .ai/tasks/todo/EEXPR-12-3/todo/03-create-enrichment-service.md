<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-create-enrichment-service.md                       ║
║ TASK: EEXPR-12-3                                                 ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: backend
---

# Create Enrichment Service: TransferEnrichmentService

## Objective

Create a service to enrich raw transfer data with profile, email, and legal entity information from backend's database.

## Implementation Steps

### Step 1: Create service file

**File:** `backend/services/peo/entity_transfer/helpers/transfer_enrichment_service.ts` (NEW)

```typescript
import { Op } from 'sequelize';
import db from '../../../../models';

const { Profile, Contract, LegalEntity } = db;

interface LegalEntityInfo {
  publicId: string;
  legalName: string;
  countryCode: string | null;
}

interface ProfileInfo {
  publicId: string;
  name: string;
  email: string;
  jobTitle: string | null;
}

export class TransferEnrichmentService {
  /**
   * Batch fetch legal entities by publicIds
   */
  async fetchLegalEntities(publicIds: string[]): Promise<Map<string, LegalEntityInfo>> {
    if (publicIds.length === 0) return new Map();

    const entities = await LegalEntity.findAll({
      where: { publicId: { [Op.in]: publicIds } },
      attributes: ['publicId', 'name', 'address'],
      useMaster: false,
    });

    return new Map(
      entities.map((e) => [
        e.publicId,
        {
          publicId: e.publicId,
          legalName: e.name,
          countryCode: e.address?.country || null,
        },
      ])
    );
  }

  /**
   * Batch fetch emails for contracts via Contract → Profile join
   */
  async fetchContractEmails(contractIds: number[]): Promise<Map<number, string | null>> {
    if (contractIds.length === 0) return new Map();

    const contracts = await Contract.findAll({
      where: { id: { [Op.in]: contractIds } },
      include: [
        {
          model: Profile,
          as: 'Contractor',
          attributes: ['email'],
          required: false,
        },
      ],
      attributes: ['id'],
      useMaster: false,
    });

    return new Map(contracts.map((c) => [c.id, c.Contractor?.email || null]));
  }

  /**
   * Batch fetch profiles by publicIds
   */
  async fetchProfiles(publicIds: string[]): Promise<Map<string, ProfileInfo>> {
    if (publicIds.length === 0) return new Map();

    const profiles = await Profile.findAll({
      where: { publicId: { [Op.in]: publicIds } },
      attributes: ['publicId', 'firstName', 'lastName', 'email', 'jobTitle'],
      useMaster: false,
    });

    return new Map(
      profiles.map((p) => [
        p.publicId,
        {
          publicId: p.publicId,
          name: `${p.firstName} ${p.lastName}`.trim(),
          email: p.email,
          jobTitle: p.jobTitle || null,
        },
      ])
    );
  }

  /**
   * Enrich raw transfers with profile, email, and legal entity data
   */
  async enrichTransfers(rawTransfers: RawTransfer[]): Promise<EnrichedTransfer[]> {
    // 1. Collect all IDs for batch fetching
    const legalEntityIds = new Set<string>();
    const contractIds = new Set<number>();
    const profilePublicIds = new Set<string>();

    for (const transfer of rawTransfers) {
      legalEntityIds.add(transfer.sourceLegalEntityPublicId);
      legalEntityIds.add(transfer.destinationLegalEntityPublicId);

      for (const item of transfer.items) {
        if (item.deelContractId) {
          contractIds.add(item.deelContractId);
        }
      }

      for (const signature of transfer.signatures) {
        profilePublicIds.add(signature.profilePublicId);
      }
    }

    // 2. Batch fetch all enrichment data in parallel
    const [legalEntityMap, contractEmailMap, profileMap] = await Promise.all([
      this.fetchLegalEntities(Array.from(legalEntityIds)),
      this.fetchContractEmails(Array.from(contractIds)),
      this.fetchProfiles(Array.from(profilePublicIds)),
    ]);

    // 3. Enrich transfers with O(1) lookups
    return rawTransfers.map((transfer) => ({
      id: transfer.id,
      status: transfer.status,
      organizationId: transfer.organizationId,
      requesterPublicProfileId: transfer.requesterProfilePublicId,
      sourceLegalEntity: legalEntityMap.get(transfer.sourceLegalEntityPublicId) || {
        publicId: transfer.sourceLegalEntityPublicId,
        legalName: null,
        countryCode: null,
      },
      destinationLegalEntity: legalEntityMap.get(transfer.destinationLegalEntityPublicId) || {
        publicId: transfer.destinationLegalEntityPublicId,
        legalName: null,
        countryCode: null,
      },
      effectiveDate: transfer.effectiveDate,
      items: transfer.items.map((item) => ({
        id: item.id,
        peoContractOid: item.baseContractOid,
        employeeName: item.employeeName,
        employeeEmail: item.deelContractId
          ? contractEmailMap.get(item.deelContractId) || null
          : null,
        status: item.status,
        benefitGroupId: item.benefitGroupId,
        payGroupId: item.payGroupId,
        ptoPolicyId: item.ptoPolicyId,
        workLocationId: item.workLocationId,
        positionPublicId: item.positionPublicId,
        teamId: item.teamId,
        newContractOid: item.newContractOid,
        resumeFromStep: item.resumeFromStep,
      })),
      signatures: this.groupSignaturesByRole(transfer.signatures, profileMap),
      agreementId: transfer.agreement?.id || null,
      agreement: transfer.agreement
        ? {
            id: transfer.agreement.id,
            pdfUrl: transfer.agreement.pdfUrl,
            type: transfer.agreement.type,
            createdAt: transfer.agreement.createdAt,
            expiresAt: null,
          }
        : null,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
    }));
  }

  /**
   * Group signatures by role and enrich with profile data
   */
  private groupSignaturesByRole(
    signatures: RawTransferSignature[],
    profileMap: Map<string, ProfileInfo>
  ): { admins: EnrichedSignature[]; employees: EnrichedSignature[] } {
    const admins: EnrichedSignature[] = [];
    const employees: EnrichedSignature[] = [];

    for (const sig of signatures) {
      const profile = profileMap.get(sig.profilePublicId);
      const enrichedSig: EnrichedSignature = {
        publicProfileId: sig.profilePublicId,
        name: profile?.name || null,
        email: profile?.email || null,
        jobTitle: profile?.jobTitle || null,
        role: sig.role,
        agreementType: sig.agreementType,
        status: sig.signedAt ? 'SIGNED' : 'AWAITING_SIGNATURE',
        signedAt: sig.signedAt,
      };

      if (sig.role === 'ADMIN') {
        admins.push(enrichedSig);
      } else {
        employees.push(enrichedSig);
      }
    }

    return { admins, employees };
  }
}

export const transferEnrichmentService = new TransferEnrichmentService();
```

### Step 2: Add type exports

Add types at the top of the file or in a separate types file:

```typescript
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

interface EnrichedTransfer {
  id: string;
  status: string;
  organizationId: number;
  requesterPublicProfileId: string;
  sourceLegalEntity: LegalEntityInfo;
  destinationLegalEntity: LegalEntityInfo;
  effectiveDate: string;
  items: EnrichedItem[];
  signatures: { admins: EnrichedSignature[]; employees: EnrichedSignature[] };
  agreementId: string | null;
  agreement: EnrichedAgreement | null;
  createdAt: string;
  updatedAt: string;
}

interface EnrichedSignature {
  publicProfileId: string;
  name: string | null;
  email: string | null;
  jobTitle: string | null;
  role: string;
  agreementType: string;
  status: string;
  signedAt: string | null;
}
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/services/peo/entity_transfer/helpers/transfer_enrichment_service.ts` | Enrichment service |
| `backend/models/profile.js` | Profile model |
| `backend/models/contract.js` | Contract model |
| `backend/models/legal_entity.js` | Legal entity model |

## Acceptance Criteria

- [ ] `fetchLegalEntities()` batch fetches legal entities
- [ ] `fetchContractEmails()` batch fetches emails via Contract → Profile
- [ ] `fetchProfiles()` batch fetches profile data
- [ ] `enrichTransfers()` orchestrates all enrichment
- [ ] All methods use `Op.in` pattern (no N+1)
- [ ] All methods use `useMaster: false` for read replica
- [ ] Signatures grouped by role (admins/employees)
