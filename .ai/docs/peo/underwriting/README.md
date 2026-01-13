<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: DOMAIN                                                    ║
║ STATUS: Current                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ NAVIGATION:                                                      ║
║ • Parent: .ai/docs/peo/README.md                                ║
║ • Related: entity_transfers, hris_integration                    ║
║ • Index: .ai/INDEX.md                                           ║
╚══════════════════════════════════════════════════════════════════╝
-->

# PEO Underwriting (UW) Process

Complete documentation of the PEO Underwriting workflow for new positions, work locations, and billing modifiers - from initial request creation through Prism approval and contract activation.

---

## Overview

- **What**: The UW (Underwriting) process manages approval requests for new positions, work locations, and billing modifiers that need to be added to PrismHR before they can be used in PEO contracts.
- **Why**: PrismHR (the external PEO management system) requires all positions, work locations, and billing modifiers to be explicitly defined before they can be used. New resources must go through an approval process before they exist in Prism.
- **When**: Triggered when a new hire has a job title/position that doesn't exist in Prism, when a new work location is needed, or when workers' compensation billing modifiers change.

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Position** | A job role defined in PrismHR (e.g., "Sales Development Manager" with code "SDM") |
| **Job Code** | The short code identifier for a position in Prism (e.g., "SDM" for "Sales Development Manager") |
| **Prism Resource Request** | A tracking record for resources awaiting approval in PrismHR |
| **Workbench Task** | An OpsWorkbench task created for the ops team to process the underwriting request |
| **Billing Modifier** | Workers' compensation classification codes that affect billing rates |
| **Work Location** | Physical locations where employees work, tracked for tax and compliance |
| **FLSA Exempt** | Fair Labor Standards Act exemption status for overtime eligibility |

---

## Architecture / Structure

### High-Level Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        UW PROCESS FLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘

1. POSITION CREATION
   ┌──────────────────┐
   │ New Contract     │  job_code = "sales development manager"
   │ Created          │  (position title, not Prism code)
   └────────┬─────────┘
            │
            ▼
2. UW REQUEST CREATION
   ┌──────────────────┐     ┌───────────────────────────────┐
   │ prism_resource_  │────▶│ Workbench Task Created        │
   │ requests         │     │ (peoNewUnderwritingFlow flag) │
   │ status: UNDER_   │     └───────────────────────────────┘
   │ REVIEW           │
   └────────┬─────────┘
            │
            │           ┌───────────────────────────────────┐
            └──────────▶│ peo_user_events                   │
                        │ event: POSITION_REQUESTED         │
                        └───────────────────────────────────┘
            │
            ▼
3. MANUAL PRISM APPROVAL (External)
   ┌──────────────────┐
   │ Ops team creates │  Position created with code "SDM"
   │ position in      │  in PrismHR
   │ PrismHR          │
   └────────┬─────────┘
            │
            ▼
4. APPROVAL DETECTION (Backend polling)
   ┌──────────────────┐
   │ Backend polls    │  Matches "sales development manager"
   │ Prism for new    │  with Prism position code "SDM"
   │ positions        │
   └────────┬─────────┘
            │
            ▼
5. SYSTEM UPDATES
   ┌──────────────────┐     ┌───────────────────────────────┐
   │ peo_contracts    │     │ prism_resource_requests       │
   │ job_code: "SDM"  │     │ status: APPROVED              │
   └──────────────────┘     └───────────────────────────────┘
            │
            │               ┌───────────────────────────────┐
            └──────────────▶│ peo_positions                 │
                            │ code: "SDM"                   │
                            │ title: "Sales Dev Manager"    │
                            └───────────────────────────────┘
            │
            ▼
6. CONTRACT ACTIVATION
   ┌──────────────────┐     ┌───────────────────────────────┐
   │ Contract status  │     │ peo_user_events               │
   │ UNDERWRITING →   │     │ event: POSITION_APPROVED      │
   │ ACTIVE           │     └───────────────────────────────┘
   └──────────────────┘
```

### Database Tables

| Table | Repository | Purpose |
|-------|------------|---------|
| `prism_resource_requests` | peo | Tracks resources awaiting approval |
| `peo_positions` | peo | Stores approved positions from Prism |
| `peo_contracts` | peo/backend | Contains job_code field that gets updated |
| `peo_user_events` | peo | Audit trail for position request/approval events |
| `peo_contract_missing_updates` | peo | Tracks pending updates when position is under review |

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **PrismResourceRequest Model** | `peo/src/models/peoPrismResourceRequest/peoPrismResourceRequest.ts` | Database model for resource requests |
| **PeoPosition Model** | `peo/src/models/peoPosition/peoPosition.ts` | Database model for approved positions |
| **PrismResourceRequest Service (PEO)** | `peo/src/services/peoPrismResourceRequest/peoPrismResourceRequestService.ts` | Creates requests, checks approvals, updates contracts |
| **PrismResourceRequest Service (Backend)** | `backend/services/peo/peo_prism_resource_request_service.ts` | Notifies workbench, sends details to Prism |
| **Position Service (PEO)** | `peo/src/services/peoPosition/peoPositionService.ts` | Manages peo_positions table, imports from Prism |
| **Position Service (Backend)** | `backend/services/peo/peo_position_service.ts` | Fetches and validates positions |
| **Contract Service (PEO)** | `peo/src/services/peoContract/peoContractService.ts` | Triggers UW for billing modifiers, updates contract status |
| **OpsWorkbench Service** | `backend/services/peo/peo_ops_workbench_service.ts` | Creates/manages workbench tasks |
| **JobCode Eligibility Handler** | `peo/src/services/peoContract/updateActiveContractOnPrism/handlers/updateEmployeeJobCodeEligibilityHandler.ts` | Validates job code updates |

---

## Database Schema

### prism_resource_requests

```sql
CREATE TABLE prism_resource_requests (
    id            SERIAL PRIMARY KEY,
    public_id     UUID UNIQUE NOT NULL,
    external_entity_id UUID NOT NULL,     -- Deel Legal Entity public ID
    resource      VARCHAR(50) NOT NULL,   -- 'POSITION', 'WORK_LOCATION', 'BILLING_MODIFIER'
    description   VARCHAR(255) NOT NULL,  -- The resource name (e.g., 'sales development manager')
    status        VARCHAR(50) NOT NULL,   -- 'UNDER_REVIEW', 'APPROVED', 'CANCELLED'
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP
);
```

**Enums:**

| Enum | Values |
|------|--------|
| `PrismResourceRequestStatus` | `UNDER_REVIEW`, `APPROVED`, `CANCELLED` |
| `PrismResourceRequestResource` | `POSITION`, `WORK_LOCATION`, `BILLING_MODIFIER` |

### peo_positions

```sql
CREATE TABLE peo_positions (
    id                SERIAL PRIMARY KEY,
    public_id         UUID UNIQUE NOT NULL,
    code              VARCHAR(255) NOT NULL,  -- Position code from Prism (e.g., 'SDM')
    title             VARCHAR(255) NOT NULL,  -- Position title (e.g., 'Sales Development Manager')
    peo_client_id     INTEGER REFERENCES peo_clients(id),
    class             VARCHAR(255),           -- Position class code
    supervisory       BOOLEAN DEFAULT FALSE,
    indirect_tipped   BOOLEAN DEFAULT FALSE,
    sales_position    BOOLEAN DEFAULT FALSE,
    tipped_position   BOOLEAN DEFAULT FALSE,
    flsa_exempt       BOOLEAN DEFAULT FALSE,
    clerical_position BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMP,
    updated_at        TIMESTAMP
);
```

---

## Detailed Workflow

### Step 1: Position Creation & UW Request

When a new PEO contract is created with a position that doesn't exist in Prism:

**Location:** `peo/src/services/peoContract/peoContractService.ts:2022`

```typescript
// Contract created with job_code = 'sales development manager' (the title)
const prismResourceResponse = await this.peoPrismResourceRequestService.createPeoPrismResourceRequest(
    client.deelLegalEntityPublicId,
    {
        description: 'sales development manager',  // Position title
        resource: PrismResourceRequestResource.Position,
    }
);
```

**What happens:**
1. A row is inserted into `prism_resource_requests` with:
   - `status`: `UNDER_REVIEW`
   - `resource`: `POSITION`
   - `description`: The position title (e.g., "sales development manager")
   - `external_entity_id`: The Deel Legal Entity's public ID

2. A user event `POSITION_REQUESTED` is created for audit trail

### Step 2: Workbench Task Creation

When the new underwriting flow is enabled (feature flag: `peoNewUnderwritingFlow`):

**Location:** `backend/services/peo/peo_prism_resource_request_service.ts:431-434`

```typescript
await peoOpsWorkbenchService.createTaskForUnderwritingRequest({
    requestId,  // public_id from prism_resource_requests
    payload: {
        // Position details: job title, classification, FLSA status, etc.
    },
});
```

**What happens:**
1. The backend's `notifyPrismResourceRequestCreation()` is called
2. A workbench task is created for the ops team to process
3. The task contains all details needed to create the position in Prism

### Step 3: Manual Approval in PrismHR

This step happens **externally** in the PrismHR system:
1. An ops team member receives the workbench task
2. They create the position in PrismHR with:
   - A position code (e.g., "SDM")
   - The position title (e.g., "Sales Development Manager")
   - Classification details (FLSA exempt, supervisory, etc.)

### Step 4: Approval Detection

The backend periodically polls Prism to detect approved positions:

**Location:** `peo/src/services/peoPrismResourceRequest/peoPrismResourceRequestService.ts:184-406`

```typescript
async checkPeoPrismResourceRequestIsApproved(externalEntityId: string) {
    // 1. Get all pending position requests
    const pendingRequests = await this.getPeoPrismResourceRequestByExternalEntityId(
        externalEntityId,
        { status: PrismResourceRequestStatus.UnderReview, resource: PrismResourceRequestResource.Position }
    );

    // 2. Query Prism for existing job codes
    const prismPositions = await this.clientService.getJobCodesByDeelEntity(externalEntityId);

    // 3. Match pending requests with approved positions
    for (const request of pendingRequests) {
        const matchedPosition = prismPositions.find(
            p => p.jobTitle.toLowerCase() === request.description.toLowerCase()
        );

        if (matchedPosition) {
            // Position was approved in Prism!
            await this.handlePositionApproval(request, matchedPosition);
        }
    }
}
```

### Step 5: Contract & Position Updates

When a position is approved:

**Location:** `peo/src/services/peoPrismResourceRequest/peoPrismResourceRequestService.ts:245-256`

```typescript
// 1. Update peo_contracts.job_code from title to Prism code
await PeoContract.update(
    {
        jobCode: positionOnPrism.id,  // Updated to 'SDM'
    },
    {
        where: {
            prismClientId: peoClient.prismClientId,
            jobCode: request.description,  // Was 'sales development manager'
        },
        transaction,
    },
);

// 2. Update prism_resource_requests.status
await request.update({ status: PrismResourceRequestStatus.Approved }, { transaction });

// 3. Create POSITION_APPROVED user event
await this.peoUserEventService.createUserEvent(
    PeoEventType.PositionApproved,
    { /* event details */ }
);
```

### Step 6: Position Import

After approval, the position is imported to `peo_positions`:

**Location:** `peo/src/services/peoPosition/peoPositionService.ts:185-209`

```typescript
const updatedPosition = await this.upsert(
    {
        deelLegalEntityPublicId: peoClient.deelLegalEntityPublicId,
        code: position.id,           // 'SDM'
        title: position.jobTitle,    // 'Sales Development Manager'
        class: position.jobClass,
        supervisory: position.supervisory,
        salesPosition: position.salesPosition,
        tippedPosition: position.tippedPosition,
        indirectTipped: position.indirectTipped,
        flsaExempt: position.flsaExempt,
    },
    peoClient,
    { transaction },
);
```

### Step 7: Contract Status Update

After all UW requirements are met:

**Location:** `peo/src/services/peoContract/peoContractService.ts:197-230`

```typescript
async updatePEOContractStatusForUnderwritingContracts() {
    // Find contracts in UNDERWRITING status
    const underwritingContracts = await PeoContract.findAll({
        where: { peoContractStatus: PeoContractStatus.Underwriting }
    });

    for (const contract of underwritingContracts) {
        // Check if position AND work location are approved
        const positionApproved = await this.isPositionApproved(contract);
        const workLocationApproved = await this.isWorkLocationApproved(contract);

        if (positionApproved && workLocationApproved) {
            await contract.update({ peoContractStatus: PeoContractStatus.Active });
        }
    }
}
```

---

## API Endpoints

### Position Controller

**Location:** `peo/src/controllers/peoPosition/PeoPositionController.ts`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/peo/position` | Upsert position |
| `GET` | `/peo/position` | Get positions by IDs |
| `GET` | `/peo/position/by-filter` | Get positions by filter |
| `GET` | `/peo/position/client/:externalLegalEntityId/underwriting` | Get positions in underwriting |
| `POST` | `/peo/position/client/:externalEntityId/create-in-prism` | Create position in Prism |

### Prism Resource Request Controller

**Location:** `peo/src/controllers/peoPrismResourceRequest/peoPrismResourceRequestController.ts`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/peo/prism-resource-request/client/:externalEntityId` | Create resource request |
| `POST` | `/peo/prism-resource-request/client/:externalEntityId/check_approved` | Check if approved |
| `GET` | `/peo/prism-resource-request/client/:externalEntityId` | Get resource requests |

---

## Patterns & Conventions

### Pattern: Job Code Eligibility Check

**When to use**: Before updating an employee's job code on an active contract.

**Location:** `peo/src/services/peoContract/updateActiveContractOnPrism/handlers/updateEmployeeJobCodeEligibilityHandler.ts:39-46`

```typescript
// Check if the new position is still under review
const positionIsUnderReview = await this.peoPrismResourceRequestService
    .getPeoPrismResourceRequestByExternalEntityId(
        this.client.deelLegalEntityPublicId,
        {
            status: PrismResourceRequestStatus.UnderReview,
            resource: PrismResourceRequestResource.Position,
            description: updatePeoEmployeeDto.jobCode,
        },
    );

// Only proceed if NOT under review
return positionIsUnderReview.length === 0;
```

### Pattern: Missing Updates Tracking

**When to use**: When a position/work location change is requested but the resource is under review.

**Location:** `peo/src/models/peoContract/peoContractMissingUpdate/enum.ts`

```typescript
enum MissingUpdateType {
    JOB_TITLE = 'JOB_TITLE',
    WORK_LOCATION = 'WORK_LOCATION',
    BILLING_MODIFIER_POSITION_CHANGE = 'BILLING_MODIFIER_POSITION_CHANGE',
}
```

When the resource is under review:
1. Store the requested change in `peo_contract_missing_updates`
2. Once the resource is approved, process pending missing updates
3. Push the update to Prism

### Pattern: Feature Flag Controlled Flow

**When to use**: The new underwriting flow is controlled by the `peoNewUnderwritingFlow` feature flag.

```typescript
if (await isFeatureEnabled('peoNewUnderwritingFlow')) {
    await peoOpsWorkbenchService.createTaskForUnderwritingRequest({
        requestId,
        payload,
    });
}
```

---

## Integration Points

### PrismHR Integration

- **Direction**: Two-way
- **Outbound**: UW requests trigger workbench tasks that result in Prism data entry
- **Inbound**: Backend polls Prism to detect approved positions

### NATS Events

**Location:** `backend/modules/peo/events/processors/entity_address/peo_entity_address_creation_processor.ts`

When work locations are created:
1. `ENTITY_ADDRESS_CREATION` NATS event is published
2. Processor checks for approved underwriting reviews
3. If not approved, creates workbench task for underwriting

### OpsWorkbench

- Workbench tasks are created for ops team to process UW requests
- Task completion triggers status updates in the system

---

## User Events

| Event Type | When Created | Data Included |
|------------|--------------|---------------|
| `POSITION_REQUESTED` | New position UW request created | Position name, contract ID, request ID |
| `POSITION_APPROVED` | Position approved in Prism | Position code, position name, contract ID |
| `WORK_LOCATION_REQUESTED` | New work location UW request created | Location details, contract ID |
| `WORK_LOCATION_APPROVED` | Work location approved in Prism | Location code, contract ID |

---

## Common Pitfalls

### 1. Job Code vs Position Title Confusion

**Issue**: `peo_contracts.job_code` initially contains the position title (e.g., "sales development manager"), not the Prism code.

**Solution**: Always check if the job_code matches a Prism position code or is still a descriptive title. The title format indicates the position is under review.

### 2. Case Sensitivity in Matching

**Issue**: Position title matching between Deel and Prism may fail due to case differences.

**Solution**: The system performs case-insensitive matching:
```typescript
p.jobTitle.toLowerCase() === request.description.toLowerCase()
```

### 3. Multiple Contracts with Same Position

**Issue**: When a position is approved, ALL contracts with that position title need updating.

**Solution**: The system updates all matching contracts in a transaction:
```typescript
await PeoContract.update(
    { jobCode: positionOnPrism.id },
    {
        where: {
            prismClientId: peoClient.prismClientId,
            jobCode: request.description,  // Updates ALL matching contracts
        },
        transaction,
    },
);
```

### 4. Race Condition Between Approval and Updates

**Issue**: Contract updates might happen while approval detection is running.

**Solution**: Use database transactions to ensure atomicity of all updates during approval processing.

### 5. Feature Flag Dependencies

**Issue**: Workbench tasks only created when `peoNewUnderwritingFlow` is enabled.

**Solution**: Ensure feature flag is correctly enabled in the environment. Without it, the ops team won't receive workbench tasks.

---

## Related Documentation

- [Entity Transfers](../entity_transfers/README.md) - Contract transfers between legal entities
- [HRIS Integration](../hris_integration/README.md) - Integration with BambooHR, Hibob, Workday
- [NATS Events](../../_shared/nats-events.md) - Event messaging patterns
- [Sequelize Patterns](../../_shared/sequelize-patterns.md) - ORM conventions

---

## File References

### Models

| File | Line | Purpose |
|------|------|---------|
| `peo/src/models/peoPrismResourceRequest/peoPrismResourceRequest.ts` | - | Resource request model |
| `peo/src/models/peoPrismResourceRequest/enum.ts` | - | Status and resource type enums |
| `peo/src/models/peoPosition/peoPosition.ts` | - | Position model |
| `peo/src/models/peoEvents/enums.ts` | - | User event types |
| `peo/src/models/peoContract/peoContractMissingUpdate/enum.ts` | - | Missing update types |

### Services

| File | Line | Purpose |
|------|------|---------|
| `peo/src/services/peoPrismResourceRequest/peoPrismResourceRequestService.ts` | 184-406 | Approval checking |
| `peo/src/services/peoPosition/peoPositionService.ts` | 185-209 | Position import |
| `peo/src/services/peoContract/peoContractService.ts` | 2022 | UW request creation |
| `backend/services/peo/peo_prism_resource_request_service.ts` | 431-434 | Workbench notification |
| `backend/services/peo/peo_ops_workbench_service.ts` | - | Task management |

### Controllers

| File | Purpose |
|------|---------|
| `peo/src/controllers/peoPosition/PeoPositionController.ts` | Position endpoints |
| `peo/src/controllers/peoPrismResourceRequest/peoPrismResourceRequestController.ts` | Resource request endpoints |

### Migrations

| File | Purpose |
|------|---------|
| `peo/migrations/20240124181619-create_prism_resource_request_table.js` | Creates prism_resource_requests table |
| `peo/migrations/20240920120905-add_peo_positions_table.js` | Creates peo_positions table |

---

_Created: 2025-12-29_
_Last Updated: 2025-12-29_
