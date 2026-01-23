# EEXPR-13: Entity Transfers POST Endpoint - Discussion & Research

## Overview

This document captures all research, discoveries, and decisions made during the scoping of EEXPR-13 - the entity transfers POST endpoint for creating transfers with PENDING_SIGNATURES status.

---

## Related Task Context

### EEXPR-12 (Parent Epic)
- **Purpose**: GET endpoint to retrieve transfer details, status, and signature progress
- **Location**: `.ai/tasks/in_progress/EEXPR-12/README.md`
- **Key Subtasks**:
  - EEXPR-12-1: Migration - Fix signature profile_public_id (INTEGER → UUID)
  - EEXPR-12-2: GET transfers by source entity endpoint (PEO) - **DONE**
  - EEXPR-12-3: Tech ops endpoint with enrichment (Backend) - **DONE**
  - EEXPR-12-4: Public API endpoint for transfers (Backend)
  - EEXPR-12-5: Multi-status filter for transfers

### Architecture Constraint
**CRITICAL**: Backend CANNOT query PEO database tables directly. Must use PEO service HTTP endpoints.

---

## Database Schema

### Table: `peo.peo_employee_transfers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `organization_id` | INTEGER | FK to Organizations |
| `requester_profile_public_id` | UUID | Admin who initiated |
| `source_legal_entity_public_id` | UUID | Entity employee is leaving |
| `destination_legal_entity_public_id` | UUID | Entity employee is joining |
| `status` | ENUM | See status values below |
| `effective_date` | DATE | When transfer takes effect |
| `agreement_id` | UUID | NULL for now (future: links to agreement) |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Status Enum Values**:
```
DRAFT → PENDING_SIGNATURES → SCHEDULED → PROCESSING → COMPLETED | PARTIAL_FAILURE | FAILED | CANCELLED
```

### Table: `peo.peo_employee_transfer_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `organization_id` | INTEGER | |
| `transfer_id` | UUID | FK to transfers |
| `base_contract_oid` | VARCHAR(20) | Employee's current PEO contract OID |
| `new_benefit_prism_group_id` | VARCHAR(10) | e.g., "400", "600" |
| `new_employment_payroll_setting_id` | VARCHAR(50) | Pay group ID |
| `new_pto_policy_id` | UUID | |
| `new_work_location_id` | UUID | |
| `new_position_public_id` | UUID | |
| `new_team_id` | INTEGER | Optional |
| `new_contract_oid` | VARCHAR(20) | NULL until transfer completes |
| `resume_from_step` | VARCHAR(100) | For resume scenarios |
| `status` | ENUM | PENDING, COMPLETED, FAILED |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### Table: `peo.peo_employee_transfer_signatures`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `organization_id` | INTEGER | |
| `transfer_id` | UUID | FK to transfers |
| `profile_public_id` | UUID | Signer's profile |
| `role` | ENUM | `ADMIN` or `EMPLOYEE` |
| `agreement_type` | ENUM | See values below |
| `agreement_id` | UUID | NULL for now |
| `signed_at` | TIMESTAMP | NULL until signed |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Role Enum Values**: `ADMIN`, `EMPLOYEE`

**Agreement Type Enum Values**:
- `ENTITY_ASSIGNMENT_AGREEMENT`
- `ARBITRATION_AGREEMENT`
- `WSE_NOTICE_OF_PEO_RELATIONSHIP`

**Unique Constraint**: `(transfer_id, profile_public_id, agreement_type)` - same person can sign multiple agreement types.

---

## Existing Endpoints & Services

### transfer_resources Endpoint (Reference)

**Location**: `backend/controllers/peo_integration/index.js:1695-1756`

**Endpoint**: `GET /peo_integration/legal_entities/entity_transfer/:legalEntityId/transfer_resources`

**Returns**:
```typescript
{
    benefitGroups: ResourceOption[];        // id = prismGroupId
    employmentPayrollSettings: ResourceOption[];  // id = publicId
    ptoPolicies: ResourceOption[];          // id = uid (UUID)
    workLocations: ResourceOption[];        // id = deelEntityWorkLocationId
    jobCodes: ResourceOption[];             // id = publicId (UUID)
    teams: ResourceOption[];                // id = id (string)
}
```

**Service**: `backend/services/peo/entity_transfer/services/transfer_resources_service.ts`

### Tech Ops Entity Transfer Endpoint (Reference)

**Location**: `backend/controllers/admin/peo/tech_ops.ts:362-497`

**Endpoint**: `POST /admin/peo/tech_ops/entity_transfer`

**Two Modes**:
1. **Full Payload Mode** - Creates and executes new transfer
2. **Resume Mode** - Resumes from specific step

This endpoint executes ALL 13 steps. EEXPR-13 will only run sanity checks and create transfer with PENDING_SIGNATURES.

---

## Entity Transfer Pipeline (13 Steps)

**Service**: `backend/services/peo/entity_transfer/entity_transfer_service.ts`

| Step | Name | Type | Purpose |
|------|------|------|---------|
| 1 | CrossHireSanityCheckStep | READ_ONLY | Validates 21+ mandatory employee fields |
| 2 | TerminationSanityCheckStep | EXTERNAL | Validates contract state, payroll access |
| 3 | CheckUnderwritingRequestStatusStep | EXTERNAL | Checks UW request status |
| 4 | ForceCompleteUnderwritingStep | DATABASE | Auto-completes pending UW |
| 5 | SanityCheckResourcesExistStep | EXTERNAL | Verifies work location & position exist |
| 6-13 | ... | ... | CrossHire, Termination, Contract creation, etc. |

### Sanity Check Details

#### CrossHireSanityCheckStep
**File**: `backend/services/peo/entity_transfer/steps/cross_hire_sanity_check_step.ts`
- Validates 21+ mandatory fields using Zod schema
- Fields: SSN, birthDate, address, citizenship data, pay method fields
- Conditional validation for permanent residents (Z03) vs alien authorized (Z04)
- No external calls - read-only validation

#### TerminationSanityCheckStep
**File**: `backend/services/peo/entity_transfer/steps/termination_sanity_check_step.ts`
- Validates contract existence, state, employment status
- Checks payroll accessibility, concurrent operations
- **External calls**:
  - `peoContractService.getPEOContract()`
  - `EMSEmploymentsService.searchEmployments()`
  - `PmsEmsSelectionService.selectServiceInstance()`
  - `EMSEmploymentPayrollEventsService.countEmployeePayrollEvents()`
  - `peoEmployeeTerminationService.getPeoEmployeeTerminationByDeelContractOid()`

#### SanityCheckResourcesExistStep
**File**: `backend/services/peo/entity_transfer/steps/sanity_check_resources_exist_step.ts`
- Last safety gate before irreversible cross-hire
- Verifies work location and position exist in PrismHR
- **External calls**:
  - `peoWorkLocationService.getPEOWorkLocationByEntityWorkLocationId()`
  - `peoPositionService.getByFilters()`

---

## Underwriting (UW) Request System

### Overview
- UW requests are created when employee transfer requires NEW work locations or positions that don't exist yet in the destination legal entity
- Managed through **OPS Workbench** with task type `PEO_UNDERWRITING_REQUEST`

### Key Service Files

| Service | File | Purpose |
|---------|------|---------|
| `peoOpsWorkbenchService` | `backend/services/peo/peo_ops_workbench_service.ts` | Main UW request management |
| `opsWorkbenchTaskService` | `backend/services/ops_workbench/ops_workbench_task.js` | Lower-level task CRUD |
| `peoPrismResourceRequestService` | `backend/services/peo/peo_prism_resource_request_service.ts` | Prism resource requests |

### Creating UW Request

**Method**: `peoOpsWorkbenchService.createTaskForUnderwritingRequest()`
**File**: `backend/services/peo/peo_ops_workbench_service.ts:645-669`

```typescript
await peoOpsWorkbenchService.createTaskForUnderwritingRequest({
    requestId: string,      // UUID - unique identifier
    payload: UnderwritingRequestPayload
});
```

### UnderwritingRequestPayload Type

```typescript
type UnderwritingRequestPayload = {
    field: string;                      // Required: 'WORK_LOCATION' or 'POSITION'
    newFlowField?: string;              // Optional: takes precedence over field
    locationName?: string;              // Optional
    clientName?: string;                // Optional
    organizationName: string;           // Required
    icp?: string;                       // Optional
    flsa?: boolean;                     // Optional (Y/N)
    employeeName?: string;              // Optional
    state?: string;                     // Optional
    originalEffectiveDate?: string;     // Optional
    jobTitle?: string;                  // Optional
    oldJobTitle?: string;               // Optional
    workFromHome?: boolean;             // Optional (Y/N)
    requestDescription: string;         // Required
    grossPayroll?: string;              // Optional
    address?: {                         // Optional
        zip?: string;
        state?: string;
        city?: string;
        street?: string;
    };
    employeeNeedToTravel?: boolean;     // Optional (Y/N)
    isClericalPosition?: boolean;       // Optional (Y/N)
    billingModifier?: string;           // Optional
    legalEntityId?: number;             // Optional
};
```

### Custom Fields Mapping

The `buildCustomFieldValues()` method maps payload to workbench fields:

| Payload Field | Custom Field Reference |
|---------------|----------------------|
| requestDescription | DETAILED_JOB_DESCRIPTION |
| locationName | LOCATION_NAME |
| clientName | CLIENT |
| employeeName | NAME_OF_EMPLOYEE |
| originalEffectiveDate | EFFECTIVE_DATE |
| address.zip | ZIP_CODE |
| address.state OR state | STATE |
| address.city | CITY |
| address.street | STREET |
| flsa | FLSA_EXEMPT |
| icp | ICP |
| grossPayroll | GROSS_PAYROLL |
| jobTitle | JOB_TITLE |
| oldJobTitle | PREVIOUS_JOB_TITLE |
| workFromHome | WORKING_FROM_HOME |
| isClericalPosition | CLERICAL_POSITION |
| employeeNeedToTravel | EMPLOYEES_NEED_TO_TRAVEL |
| billingModifier | BILLING_MODIFIER |
| legalEntityId | LEGAL_ENTITY_ID |

### Task Status Enum
- `TO_DO` - Initial status
- `IN_PROGRESS` - Being worked on
- `ON_HOLD` - Temporarily stopped
- `ESCALATED` - Needs escalation
- `COMPLETED` - Work finished
- `CLOSED` - Task closed

---

## Pay Cycle / Effective Date Calculation

### Business Rule
**Effective date** should be automatically calculated as **end of source entity's current pay cycle**.

### Where Pay Cycle Info is Stored
- **Employment Service (EMS)** or **PMS (Payroll Management System)**
- Accessible via `/payroll-settings` endpoints

### Key Data Structure

**PayrollSetting**:
```typescript
{
    id: string;
    payrollLegalEntityId: number;
    ICPId: number;
    cycleType: 'MONTHLY' | 'BIMONTHLY' | 'BIWEEKLY' | 'WEEKLY';
    experienceType: 'EOR' | 'GP' | 'PEO';
    isActive: boolean;
    payrollSchedules: PayrollSchedule[];
}
```

**PayrollSchedule**:
```typescript
{
    startDayInMonth: number;
    lockDayInMonth: number;
    endDayInMonth?: number;
    payDateOffsetFromEnd?: number;
    payDayInMonth?: number;
    payMonth?: 'SAME_MONTH' | 'PREV_MONTH' | 'NEXT_MONTH';
}
```

### Calculation Service

**File**: `backend/services/ems/payroll_settings_service.js`
**Method**: `getPayrollStartEndForDate()` (lines 478-578)

**Alternative**: `backend/services/globalPayroll/pms_gateway_service.ts:1349-1481`

### Calculation Logic by Cycle Type

**MONTHLY**:
```typescript
{
    from: moment(effectiveDate).startOf('month').format('YYYY-MM-DD'),
    to: moment(effectiveDate).endOf('month').format('YYYY-MM-DD')
}
```

**BIMONTHLY**:
```typescript
if (moment(effectiveDate).date() <= 15) {
    // First half: 1st to 15th
    { from: startOf('month'), to: set('date', 15) }
} else {
    // Second half: 16th to end
    { from: set('date', 16), to: endOf('month') }
}
```

**BIWEEKLY / WEEKLY**:
- Requires fetching first payroll calendar
- Loop through cycles to find which contains current date
- Add 2 weeks (biweekly) or 1 week (weekly) until match found

### Implementation Example

```typescript
async function calculateEffectiveDate(sourceLegalEntityPublicId: string): Promise<string> {
  // 1. Get legal entity ID from public ID
  const legalEntity = await LegalEntity.findOne({
    where: { publicId: sourceLegalEntityPublicId }
  });

  // 2. Get payroll settings for source legal entity
  const settings = await payrollSettingsService.searchPayrollSettings({
    payrollLegalEntityIds: [legalEntity.id],
    experienceType: 'PEO',
    isActive: true,
  });

  // 3. Calculate current pay cycle end based on today
  const today = moment().format('YYYY-MM-DD');
  const { to: cycleEndDate } = await payrollSettingsService.getPayrollStartEndForDate(
    settings[0],
    today
  );

  return cycleEndDate;
}
```

---

## EEXPR-13 Requirements

### Request Payload

```json
{
  "organizationId": 191800,
  "requesterProfilePublicId": "uuid",
  "sourceLegalEntityPublicId": "uuid",
  "destinationLegalEntityPublicId": "uuid",
  "contracts": [
    {
      "basePeoContractOid": "3j5g47p",
      "newBenefitGroupId": "4",
      "newTeamId": "375618",
      "newPayrollSettingsId": "cmi82fl2b00cd01bk6waddhj8",
      "newPtoPolicyId": "uuid",
      "newWorkLocationId": "uuid",
      "newPositionPublicId": "uuid"
    }
  ],
  "additionalSignerProfilePublicIds": ["uuid"]
}
```

**Note**: `effectiveDate` is NOT in payload - calculated automatically from source entity pay cycle.

### Response Format (201 Created)

```json
{
  "transfer": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING_SIGNATURES",
    "organizationId": 191800,
    "requesterPublicProfileId": "uuid",
    "sourceLegalEntity": {
      "publicId": "uuid",
      "legalName": "Deel PEO - California",
      "countryCode": "US"
    },
    "destinationLegalEntity": {
      "publicId": "uuid",
      "legalName": "Deel PEO - Texas",
      "countryCode": "US"
    },
    "effectiveDate": "2025-02-15",
    "items": [
      {
        "id": "uuid",
        "peoContractOid": "3j5g47p",
        "employeeName": "John Doe",
        "employeeEmail": "john.doe@company.com",
        "status": "PENDING",
        "benefitGroupId": "4",
        "payGroupId": "cmi82fl2b00cd01bk6waddhj8",
        "ptoPolicyId": "uuid",
        "workLocationId": "uuid",
        "positionPublicId": "uuid",
        "teamId": 375618,
        "newContractOid": null,
        "resumeFromStep": null
      }
    ],
    "signatures": {
      "admins": [
        {
          "publicProfileId": "uuid",
          "name": "Admin Name",
          "email": "admin@company.com",
          "role": "ADMIN",
          "agreementType": "ENTITY_ASSIGNMENT_AGREEMENT",
          "status": "AWAITING_SIGNATURE",
          "signedAt": null
        }
      ],
      "employees": [
        {
          "publicProfileId": "uuid",
          "name": "John Doe",
          "email": "john.doe@company.com",
          "jobTitle": "Software Developer",
          "role": "EMPLOYEE",
          "agreementType": "ENTITY_ASSIGNMENT_AGREEMENT",
          "status": "AWAITING_SIGNATURE",
          "signedAt": null
        }
      ]
    },
    "agreementId": null,
    "createdAt": "2025-01-20T10:30:00Z",
    "updatedAt": "2025-01-20T10:30:00Z"
  },
  "agreement": null
}
```

### Error Response (400 - Validation Errors)

```json
{
  "success": false,
  "errors": [
    {
      "contractOid": "3j5g47p",
      "step": "CrossHireSanityCheckStep",
      "message": "Missing required field: ssn"
    },
    {
      "contractOid": "abc123",
      "step": "TerminationSanityCheckStep",
      "message": "Contract has pending payroll events"
    }
  ]
}
```

---

## Architecture Decision

### Endpoints

| Endpoint | Location | Purpose |
|----------|----------|---------|
| `POST /admin/peo/tech_ops/entity_transfer` | Backend | Tech ops endpoint |
| `POST /peo_integration/legal_entities/entity_transfer` | Backend | Public API endpoint |

**Authorization**: ADMIN role for both endpoints

### Existing PEO Endpoints (No New Routes Needed)

The PEO service already has these endpoints that we will reuse:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/peo/entity-transfer/transfers` | Create a new entity transfer |
| `GET` | `/peo/entity-transfer/transfers/ready` | Get transfers ready to execute |
| `GET` | `/peo/entity-transfer/transfers/source/:sourceEntityPublicId` | Get transfers for a source entity |
| `GET` | `/peo/entity-transfer/items/:id` | Get a specific transfer item |
| `GET` | `/peo/entity-transfer/transfers/:id` | Get a specific transfer by ID |
| `PATCH` | `/peo/entity-transfer/transfers/:id/status` | Update transfer status |
| `PATCH` | `/peo/entity-transfer/items/:id` | Update transfer item |

**Key Files:**
- Controller: `peo/src/controllers/entityTransfer/entityTransferController.ts`
- Service: `peo/src/services/entityTransfer/entityTransferService.ts`

### What's Missing in PEO (Current State)

The existing `createTransfer()` method does NOT create signature records. We need a new method.

### Service Boundary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            BACKEND SERVICE                              │
│                                                                         │
│  Responsibilities:                                                      │
│    1. Validate request payload                                          │
│    2. Calculate effective date (end of source pay cycle)               │
│    3. Run sanity checks using EXISTING step classes in Backend         │
│       (CrossHireSanityCheckStep, TerminationSanityCheckStep,           │
│        SanityCheckResourcesExistStep)                                   │
│    4. If sanity checks pass (or only resources missing):               │
│       a. Create UW requests in ops workbench (if resources missing)    │
│       b. Call PEO to create transfer WITH signatures                   │
│    5. Enrich response (legal entity names, profile info)               │
│    6. Return response                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (existing endpoint)
                              │ POST /peo/entity-transfer/transfers
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             PEO SERVICE                                 │
│                                                                         │
│  NO NEW ROUTES NEEDED - Use existing POST /transfers endpoint          │
│                                                                         │
│  NEW METHOD: createTransferWithSignatures()                            │
│    - Called by existing POST /transfers endpoint                        │
│    - Different from existing createTransfer() method                    │
│                                                                         │
│  Responsibilities:                                                      │
│    1. Create transfer record in peo_employee_transfers                 │
│    2. Create items in peo_employee_transfer_items                      │
│    3. Create signatures in peo_employee_transfer_signatures (NEW)      │
│    4. Return raw data (no enrichment)                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Insight: Sanity Checks Run in Backend

Sanity check steps are implemented as **Backend step classes**, not PEO endpoints:
- `CrossHireSanityCheckStep` - `backend/services/peo/entity_transfer/steps/cross_hire_sanity_check_step.ts`
- `TerminationSanityCheckStep` - `backend/services/peo/entity_transfer/steps/termination_sanity_check_step.ts`
- `SanityCheckResourcesExistStep` - `backend/services/peo/entity_transfer/steps/sanity_check_resources_exist_step.ts`

We will create a new method `executeSanityChecksOnly()` in **Backend** that reuses these existing step classes.

---

## Implementation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ALL STEPS BELOW RUN IN BACKEND                                          │
│ (except step 5 which calls PEO via HTTP)                                │
└─────────────────────────────────────────────────────────────────────────┘

1. CALCULATE EFFECTIVE DATE (Backend)
   ─────────────────────────────────────────────────────────────────────
   • Get source legal entity payroll settings
   • Determine current pay cycle based on today
   • effectiveDate = end of current pay cycle

   Service: payrollSettingsService.getPayrollStartEndForDate()
   File: backend/services/ems/payroll_settings_service.js:478-578

2. EXECUTE SANITY CHECKS FOR ALL CONTRACTS (Backend)
   ─────────────────────────────────────────────────────────────────────
   New method in Backend: executeSanityChecksOnly(contracts[])

   Uses EXISTING step classes (no new code needed for steps):
     • CrossHireSanityCheckStep - backend/services/peo/entity_transfer/steps/cross_hire_sanity_check_step.ts
     • TerminationSanityCheckStep - backend/services/peo/entity_transfer/steps/termination_sanity_check_step.ts
     • SanityCheckResourcesExistStep - backend/services/peo/entity_transfer/steps/sanity_check_resources_exist_step.ts

   For EACH contract, instantiate and execute these steps
   COLLECT ALL FAILURES (don't stop at first)
   Return: { failures: [], resourcesNotFound: [] }

3. VALIDATE SANITY CHECK RESULTS (Backend)
   ─────────────────────────────────────────────────────────────────────
   IF any CrossHireSanityCheck or TerminationSanityCheck failed:
     → Return 400 with all validation errors

   IF only SanityCheckResourcesExistStep failed:
     → Continue (will create UW requests for missing resources)

4. CREATE UW REQUESTS FOR MISSING RESOURCES (Backend)
   ─────────────────────────────────────────────────────────────────────
   New function: createUnderwritingRequestsForMissingResources()

   For each resource not found (from step 2):
     • Generate requestId (UUID)
     • Build payload:
       - field: 'WORK_LOCATION' or 'POSITION'
       - organizationName: from org lookup
       - requestDescription: resource details
       - legalEntityId: destination legal entity
     • Call: peoOpsWorkbenchService.createTaskForUnderwritingRequest()

   File: backend/services/peo/peo_ops_workbench_service.ts:645-669

5. CREATE TRANSFER WITH PENDING_SIGNATURES (PEO via HTTP)
   ─────────────────────────────────────────────────────────────────────
   Backend calls existing PEO endpoint: POST /peo/entity-transfer/transfers

   PEO uses NEW method: createTransferWithSignatures()
   (separate from existing createTransfer() method)

   A. Create peo_employee_transfers record:
      - id: UUID
      - organization_id
      - requester_profile_public_id
      - source_legal_entity_public_id
      - destination_legal_entity_public_id
      - status: 'PENDING_SIGNATURES'
      - effective_date: calculated in step 1
      - agreement_id: NULL (for now)

   B. Create peo_employee_transfer_items (one per contract):
      - id: UUID
      - transfer_id: FK to transfer
      - base_contract_oid
      - new_benefit_prism_group_id
      - new_employment_payroll_setting_id
      - new_pto_policy_id
      - new_work_location_id
      - new_position_public_id
      - new_team_id (optional)
      - status: 'PENDING'

   C. Create peo_employee_transfer_signatures:
      - Requester: role=ADMIN, type=ENTITY_ASSIGNMENT_AGREEMENT
      - Each employee: role=EMPLOYEE, type=ENTITY_ASSIGNMENT_AGREEMENT
      - Additional signers: role=ADMIN, type=ENTITY_ASSIGNMENT_AGREEMENT

6. PLACEHOLDER FUNCTIONS (Backend - Empty for Future Implementation)
   ─────────────────────────────────────────────────────────────────────
   • generateEntityAssignmentAgreementPreview() → returns null
   • createWorkerDocumentRequirements() → empty implementation

7. RETURN RESPONSE (Backend - 201)
   ─────────────────────────────────────────────────────────────────────
   Enrich with legal entity names, profile info, employee emails
```

---

## Files to Create/Modify

### PEO Repository

| File | Action | Description |
|------|--------|-------------|
| `src/services/entityTransfer/entityTransferService.ts` | Modify | Add new `createTransferWithSignatures()` method |
| `src/controllers/entityTransfer/entityTransferController.ts` | Modify | Update POST /transfers to accept signature data and call new method |

**Note:** No new routes needed. The existing `POST /peo/entity-transfer/transfers` endpoint will be enhanced to accept signature data in the payload and call the new `createTransferWithSignatures()` method.

### Backend Repository

| File | Action | Description |
|------|--------|-------------|
| `controllers/admin/peo/tech_ops.ts` | Modify | Add new POST entity_transfer endpoint (EEXPR-13 version) |
| `controllers/peo_integration/index.js` | Modify | Add POST entity_transfer endpoint (public API) |
| `services/peo/entity_transfer/entity_transfer_service.ts` | Modify | Add `executeSanityChecksOnly()` method using existing step classes |
| `services/peo/entity_transfer/entity_transfer_client_service.ts` | Modify | Add method to call PEO create transfer with signatures |
| `services/peo/entity_transfer/services/underwriting_request_service.ts` | Create | New service for creating UW requests for missing resources |
| `services/peo/entity_transfer/services/effective_date_service.ts` | Create | Calculate effective date from pay cycle |

---

## Key Decisions Made

1. **Effective Date**: Automatically calculated as end of source entity's current pay cycle (not in payload)

2. **Sanity Checks**: Run for ALL contracts in **Backend** using existing step classes, collect ALL failures before returning

3. **Resource Not Found Handling**: If only SanityCheckResourcesExistStep fails, treat as acceptable and create UW requests

4. **UW Requests**: Created in backend (ops workbench) for missing resources only

5. **Transfer Creation**: One transfer → many contracts (items)

6. **Signatures**:
   - Requester → ADMIN role, ENTITY_ASSIGNMENT_AGREEMENT
   - Employees → EMPLOYEE role, ENTITY_ASSIGNMENT_AGREEMENT
   - Additional signers → ADMIN role, ENTITY_ASSIGNMENT_AGREEMENT

7. **Agreement/PDF**: NULL for now, placeholder functions for future implementation

8. **Endpoints**: Both tech ops and public API endpoints, ADMIN authorization

9. **Service Boundary**: All DB operations in PEO, sanity checks and enrichment in Backend

10. **No New PEO Routes**: Reuse existing `POST /peo/entity-transfer/transfers` endpoint with new `createTransferWithSignatures()` method

11. **Separate Methods in PEO**: Create new `createTransferWithSignatures()` method instead of modifying existing `createTransfer()`

---

## Reference Files

### Entity Transfers
- `backend/services/peo/entity_transfer/entity_transfer_service.ts` - Main orchestrator
- `backend/services/peo/entity_transfer/steps/` - All transfer steps
- `backend/controllers/admin/peo/tech_ops.ts:362-497` - Existing tech ops endpoint
- `peo/src/services/entityTransfer/` - PEO service

### Payroll Settings
- `backend/services/ems/payroll_settings_service.js:478-578` - getPayrollStartEndForDate()
- `backend/services/globalPayroll/pms_gateway_service.ts:1349-1481` - Alternative

### UW / Ops Workbench
- `backend/services/peo/peo_ops_workbench_service.ts:645-669` - createTaskForUnderwritingRequest()
- `backend/services/ops_workbench/ops_workbench_task.js` - Lower-level task service

### Transfer Resources
- `backend/services/peo/entity_transfer/services/transfer_resources_service.ts`
- `backend/controllers/peo_integration/index.js:1695-1756`

### Documentation
- `.ai/tasks/in_progress/EEXPR-12/README.md` - Parent epic
- `.ai/docs/backend/entity_transfers/README.md` - Entity transfers docs

---

## SQL Queries for Reference

### Check transfer status enum values
```sql
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_peo_employee_transfers_status');
-- DRAFT, PENDING_SIGNATURES, SCHEDULED, PROCESSING, COMPLETED, PARTIAL_FAILURE, FAILED, CANCELLED
```

### Check signature role enum values
```sql
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_peo_employee_transfer_signatures_role');
-- ADMIN, EMPLOYEE
```

### Check agreement type enum values
```sql
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_peo_employee_transfer_signatures_agreement_type');
-- ARBITRATION_AGREEMENT, WSE_NOTICE_OF_PEO_RELATIONSHIP, ENTITY_ASSIGNMENT_AGREEMENT
```

### Sample signature data
```sql
SELECT s.id, s.transfer_id, s.profile_public_id, s.role, s.agreement_type, s.signed_at
FROM peo.peo_employee_transfer_signatures s
ORDER BY s.created_at DESC LIMIT 10;
```

---

## PEO Repository Exploration (Detailed Findings)

### Existing PEO Entity Transfer Controller

**File:** `peo/src/controllers/entityTransfer/entityTransferController.ts`

**Base Path:** `/peo/entity-transfer`

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/transfers` | `createTransfer()` | Create new transfer (NO signatures) |
| GET | `/transfers/ready` | `getReadyTransfers()` | Get transfers ready to execute |
| GET | `/transfers/source/:sourceEntityPublicId` | `getTransfersBySourceEntity()` | Get transfers by source entity |
| GET | `/items/:id` | `getTransferItemById()` | Get specific transfer item |
| GET | `/transfers/:id` | `getTransferById()` | Get specific transfer |
| PATCH | `/transfers/:id/status` | `updateTransferStatus()` | Update transfer status |
| PATCH | `/items/:id` | `updateTransferItem()` | Update transfer item |

### Existing PEO Entity Transfer Service Methods

**File:** `peo/src/services/entityTransfer/entityTransferService.ts`

| Method | Purpose |
|--------|---------|
| `createTransfer(input)` | Creates transfer + items (NO signatures) |
| `getTransferById(id, includeItems, transaction)` | Get transfer by ID |
| `getTransferItemById(id, transaction)` | Get item by ID |
| `getTransferItemByIdWithTransfer(id, transaction)` | Get item with full transfer context |
| `getReadyTransfers(effectiveDate, limit)` | Get transfers with status=SCHEDULED |
| `getTransfersBySourceEntity(sourceEntityPublicId, options)` | Complex filtering with cursor pagination |
| `updateTransferStatus(id, status)` | Update transfer status |
| `updateTransferItem(id, updates)` | Partial item updates |
| `updateTransferItemStatus(id, status)` | Update item status |

### PEO Models

**Transfer Model:** `peo/src/models/entityTransfer/PeoEmployeeTransfer.ts`
- Table: `peo_employee_transfers`
- Status enum: DRAFT, PENDING_SIGNATURES, SCHEDULED, PROCESSING, COMPLETED, PARTIAL_FAILURE, FAILED, CANCELLED

**Item Model:** `peo/src/models/entityTransfer/PeoEmployeeTransferItem.ts`
- Table: `peo_employee_transfer_items`
- Status enum: PENDING, PROCESSING, WAITING_FOR_RESOURCES, COMPLETED, FAILED

**Signature Model:** `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts`
- Table: `peo_employee_transfer_signatures`
- Role enum: ADMIN, EMPLOYEE
- Agreement type enum: ARBITRATION_AGREEMENT, WSE_NOTICE_OF_PEO_RELATIONSHIP, ENTITY_ASSIGNMENT_AGREEMENT

### What createTransferWithSignatures() Must Do

The new method `createTransferWithSignatures()` in PEO service needs to:

1. **Accept additional input**: signature data (requester, employees, additional signers)
2. **Create transfer record** (same as existing `createTransfer`)
3. **Create item records** (same as existing `createTransfer`)
4. **Create signature records** (NEW - uses PeoEmployeeTransferSignature model)
5. **Return transfer with items and signatures**

### Input for createTransferWithSignatures()

```typescript
interface CreateTransferWithSignaturesInput {
  organizationId: number;
  requesterProfilePublicId: string;
  sourceLegalEntityPublicId: string;
  destinationLegalEntityPublicId: string;
  effectiveDate: string;
  contracts: Array<{
    basePeoContractOid: string;
    newBenefitGroupId: string;
    newPayrollSettingsId: string;
    newPtoPolicyId: string;
    newWorkLocationId: string;
    newPositionPublicId: string;
    newTeamId?: number;
  }>;
  signatures: {
    requesterProfilePublicId: string;
    employeeProfilePublicIds: string[];  // Derived from contracts
    additionalSignerProfilePublicIds: string[];
  };
}
```

### Backend Endpoints Reference

**File:** `backend/services/peo/endpoints/entity_transfer_endpoints.ts`

These are the documented API paths the backend uses to call PEO:
```
POST /peo/entity-transfer/transfers
GET /peo/entity-transfer/transfers/:transferId
GET /peo/entity-transfer/items/:itemId
PATCH /peo/entity-transfer/transfers/:transferId/status
PATCH /peo/entity-transfer/items/:itemId
GET /peo/entity-transfer/transfers/ready
GET /peo/entity-transfer/transfers/source/:sourceEntityPublicId
```

---

## Summary of Changes Required

### PEO Repository (2 files)

1. **`src/services/entityTransfer/entityTransferService.ts`**
   - Add new method: `createTransferWithSignatures(input)`
   - This method creates transfer + items + signatures in a transaction

2. **`src/controllers/entityTransfer/entityTransferController.ts`**
   - Modify `POST /transfers` handler to detect if signature data is present
   - If signatures present → call `createTransferWithSignatures()`
   - If no signatures → call existing `createTransfer()` (backward compatible)

### Backend Repository (5 files)

1. **`services/peo/entity_transfer/entity_transfer_service.ts`**
   - Add method: `executeSanityChecksOnly(contracts[])`
   - Reuses existing step classes

2. **`services/peo/entity_transfer/entity_transfer_client_service.ts`**
   - Add method to call PEO with signature data

3. **`services/peo/entity_transfer/services/underwriting_request_service.ts`** (NEW)
   - Function: `createUnderwritingRequestsForMissingResources()`

4. **`services/peo/entity_transfer/services/effective_date_service.ts`** (NEW)
   - Function: `calculateEffectiveDate(sourceLegalEntityPublicId)`

5. **`controllers/admin/peo/tech_ops.ts`** + **`controllers/peo_integration/index.js`**
   - Add POST endpoints for entity transfer creation
