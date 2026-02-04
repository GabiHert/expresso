# Phase 4 Findings: API Endpoints & Contracts

**Task**: EEXPR-129 | **Date**: 2026-02-03 | **Status**: Complete

---

## Summary

The TDD's API endpoint definitions have **major discrepancies** with the actual implementation. The URL paths differ significantly (TDD uses REST-style paths, code uses different prefixes per layer), request field names don't match, two TDD endpoints (sign, cancel) **do not exist** in the codebase, and the TDD omits 8+ endpoints that do exist. The response shapes are structurally different from what the TDD describes.

---

## 1. Endpoint Inventory

### Verdict: SIGNIFICANTLY INCOMPLETE

**TDD defines 5 endpoints:**
1. `POST /peo-employee-transfers`
2. `GET /legal-entities/{id}/transfer-resources`
3. `GET /peo-employee-transfers/entities/{source_entity_public_id}`
4. `PUT /peo-employee-transfers/{id}/sign`
5. `POST /peo-employee-transfers/{id}/cancel`

**Actual endpoints exist in 3 layers:**

#### Layer 1: PEO Microservice Internal API
**File**: `peo/src/controllers/entityTransfer/entityTransferController.ts`
**Base**: `@JsonController('/peo/entity-transfer')`

| # | Method | Path | Handler | Validation |
|---|--------|------|---------|------------|
| 1 | POST | `/peo/entity-transfer/transfers` | `createTransfer()` | Zod |
| 2 | GET | `/peo/entity-transfer/transfers/ready` | `getReadyTransfers()` | Zod |
| 3 | GET | `/peo/entity-transfer/transfers/source/:sourceEntityPublicId` | `getTransfersBySourceEntity()` | Zod |
| 4 | GET | `/peo/entity-transfer/items/:id` | `getTransferItemById()` | None (param only) |
| 5 | GET | `/peo/entity-transfer/transfers/:id` | `getTransferById()` | None (param only) |
| 6 | PATCH | `/peo/entity-transfer/transfers/:id/status` | `updateTransferStatus()` | Zod |
| 7 | PATCH | `/peo/entity-transfer/items/:id` | `updateTransferItem()` | Zod |

#### Layer 2: Backend Tech Ops Admin API
**File**: `backend/controllers/admin/peo/tech_ops.ts`
**Base**: `@Controller('admin/peo/tech_ops', {admin: true})`

| # | Method | Path | Handler | Validation |
|---|--------|------|---------|------------|
| 8 | GET | `/admin/peo/tech_ops/legal-entities/:legalEntityPublicId/transfer-resources` | `getTransferResources()` | Joi |
| 9 | GET | `/admin/peo/tech_ops/entity_transfer/ready` | `getReadyEntityTransfers()` | Joi |
| 10 | GET | `/admin/peo/tech_ops/entity_transfer/item/:id` | `getEntityTransferItemById()` | Joi |
| 11 | GET | `/admin/peo/tech_ops/entity_transfer/:id` | `getEntityTransferById()` | Joi |
| 12 | POST | `/admin/peo/tech_ops/entity_transfer` | `executeEntityTransfer()` | Joi |

#### Layer 3: Backend Public (Client-Facing) API
**File**: `backend/controllers/peo_integration/index.js`
**Base**: `/peo_integration`

| # | Method | Path | Handler | Validation |
|---|--------|------|---------|------------|
| 13 | GET | `/peo_integration/legal_entities/entity_transfer/:legalEntityId/transfer_resources` | Anonymous | Joi |

**NOT YET IMPLEMENTED** (planned in EEXPR-13-7):
- `POST /peo_integration/legal_entities/entity_transfer` — Public API POST endpoint (work item completed in docs but code exists only on EEXPR-13 branch, not yet merged)

---

## 2. POST /peo-employee-transfers (Create Transfer)

### Verdict: PARTIALLY INCORRECT

#### 2a. URL Path — INCORRECT

| Source | Path |
|--------|------|
| TDD | `POST /peo-employee-transfers` |
| PEO internal | `POST /peo/entity-transfer/transfers` |
| Tech ops admin | `POST /admin/peo/tech_ops/entity_transfer` |
| Public API (planned) | `POST /peo_integration/legal_entities/entity_transfer` |

The TDD path doesn't match any actual path.

#### 2b. Request Body Fields — PARTIALLY INCORRECT

**TDD claims** (reconstructed from TDD references):
```
{
  organizationId, requesterProfilePublicId,
  sourceLegalEntityPublicId, destinationLegalEntityPublicId,
  items: [{
    basePeoContractOid, newBenefitGroupId, newPayrollSettingsId,
    newPtoPolicyId, newWorkLocationId, newJobCode, newTeamId?
  }]
}
```

**PEO CreateTransferSchema (Zod)** (`peo/src/controllers/entityTransfer/entityTransferDto.ts:14-34`):
```typescript
{
  organizationId: number,
  requesterProfilePublicId: string (uuid),
  sourceLegalEntityPublicId: string (uuid),
  destinationLegalEntityPublicId: string (uuid),
  effectiveDate: string (YYYY-MM-DD),        // NOT IN TDD — required
  agreementId?: string (uuid),                // NOT IN TDD — optional
  items: [{
    baseContractOid: string (1-20 chars),     // TDD says "basePeoContractOid"
    newBenefitPrismGroupId: string (1-10),    // TDD says "newBenefitGroupId"
    newEmploymentPayrollSettingId: string,     // TDD says "newPayrollSettingsId"
    newPtoPolicyId: string (uuid),
    newWorkLocationId: string (uuid),
    newPositionPublicId: string (uuid),        // TDD says "newJobCode"
    newTeamId?: number (int, positive),
  }]
}
```

**Tech ops endpoint (Joi)** (`backend/controllers/admin/peo/tech_ops.ts:321-369`):
Uses different field names from PEO:
- `basePeoContractOid` (tech ops) → mapped to `baseContractOid` (PEO)
- `newBenefitGroupId` (tech ops) → mapped to `newBenefitPrismGroupId` (PEO)
- `newPayrollSettingsId` (tech ops) → mapped to `newEmploymentPayrollSettingId` (PEO)
- `newPositionPublicId` (tech ops) → same name (PEO)
- `effectiveDate` required in both
- Tech ops also supports `newContractOid` for resume scenarios
- Tech ops supports dual mode: resume (`transferItemId`) XOR full payload (`organizationId`)

#### Field Name Comparison

| TDD Field | Tech Ops (Backend) | PEO API | DB Column |
|-----------|--------------------|---------|-----------|
| basePeoContractOid | basePeoContractOid | baseContractOid | base_contract_oid |
| newBenefitGroupId | newBenefitGroupId | newBenefitPrismGroupId | new_benefit_prism_group_id |
| newPayrollSettingsId | newPayrollSettingsId | newEmploymentPayrollSettingId | new_employment_payroll_setting_id |
| newJobCode | newPositionPublicId | newPositionPublicId | new_position_public_id |
| — | effectiveDate | effectiveDate | effective_date |
| — | agreementId | agreementId | agreement_id |
| newTeamId | newTeamId | newTeamId | new_team_id |

#### 2c. Response Shape — INCORRECT

**TDD claims**: Returns transfer with status `DRAFT`, nested entity details.

**PEO actually returns** (`entityTransferService.ts:99-140`):
- Transfer created with status `PENDING_SIGNATURES` (not DRAFT)
- Returns via `getTransferById()` which includes items
- Response wrapped in `{ success: true, data: <transfer> }`

**Tech ops actually returns** (`tech_ops.ts:407-430`):
- Returns execution result, not just the created transfer
- Includes `success`, `transferId`, `itemId`, `status`, `completedSteps`, `crossHireCompleted`, `workLocationId`, `positionPublicId`
- Tech ops creates AND executes immediately (single endpoint)

#### 2d. Business Logic — INCORRECT

**TDD says**: Creates transfer with DRAFT status, separate execution step.

**Code does**:
- **PEO service**: Creates with `PENDING_SIGNATURES` status, returns immediately
- **Tech ops endpoint**: Creates AND executes in one call via `entityTransferService.executeTransfer()`
- The two-step (create → execute) flow exists but is separate: PEO creates, backend cron executes later

---

## 3. GET /legal-entities/{id}/transfer-resources

### Verdict: PARTIALLY INCORRECT

#### 3a. URL Path — INCORRECT

| Source | Path |
|--------|------|
| TDD | `GET /legal-entities/{id}/transfer-resources` |
| Tech ops admin | `GET /admin/peo/tech_ops/legal-entities/:legalEntityPublicId/transfer-resources` |
| Public client | `GET /peo_integration/legal_entities/entity_transfer/:legalEntityId/transfer_resources` |

The TDD path doesn't match either actual path. Note: underscores vs hyphens differ between tech ops and public paths.

#### 3b. Response Fields — PARTIALLY INCORRECT

**TDD claims response includes**: `benefitGroups`, `employmentPayrollSettingIds`, `ptoPolicies`, `workLocations`, `jobCodes`, `teams`

**TransferResourcesResponse** (`transfer_resources_service.ts:27-34`):
```typescript
{
  benefitGroups: ResourceOption[],        // { id, label } — id is prismGroupId
  employmentPayrollSettings: ResourceOption[], // TDD says "employmentPayrollSettingIds"
  ptoPolicies: ResourceOption[],
  workLocations: ResourceOption[],        // label uses entity_work_locations.name
  jobCodes: ResourceOption[],             // id is position.publicId (UUID)
  teams: ResourceOption[],
}
```

| TDD Field Name | Actual Field Name | Type Difference |
|----------------|-------------------|-----------------|
| `employmentPayrollSettingIds` | `employmentPayrollSettings` | TDD says array of IDs, actual returns `ResourceOption[]` with id+label |
| `jobCodes` | `jobCodes` | Name matches, but TDD implies Prism codes; actual returns `position.publicId` (UUID) and `position.title` |

All actual fields return `{ id: string, label: string }` objects, not raw IDs as the TDD implies.

#### 3c. Work Location Label Fix (PEOCM-792-3)

The TDD doesn't document that work location labels now use `entity_work_locations.name` from the database via a batch query (`fetchWorkLocationNames()` at line 222). Before this fix, labels used city/state or locationId.

---

## 4. GET /peo-employee-transfers/entities/{source_entity_public_id}

### Verdict: PARTIALLY INCORRECT

#### 4a. URL Path — INCORRECT

| Source | Path |
|--------|------|
| TDD | `GET /peo-employee-transfers/entities/{source_entity_public_id}` |
| PEO internal | `GET /peo/entity-transfer/transfers/source/:sourceEntityPublicId` |

#### 4b. Response Shape — MISSING FROM TDD

**PEO returns** (`entityTransferService.ts:293-347`):
```typescript
{
  success: true,
  data: {
    transfers: TransferRecordResponse[],  // Enriched with employee names
    cursor: string | null,                // For pagination
    hasMore: boolean,                     // Pagination flag
  }
}
```

Each `TransferRecordResponse` includes:
```typescript
{
  id, status, organizationId, requesterProfilePublicId,
  sourceLegalEntityPublicId, destinationLegalEntityPublicId,
  effectiveDate: string (YYYY-MM-DD),
  agreementId: string | null,
  items: TransferItemResponse[],     // Includes deelContractId, employeeName
  signatures: TransferSignatureResponse[],
  createdAt, updatedAt,
}
```

**NOT documented in TDD**:
- Cursor-based pagination (`cursor`, `hasMore`, `limit`)
- Status filtering (`?status=SCHEDULED,PROCESSING`)
- Contract OID filtering (`?baseContractOid=xxx`)
- Employee name enrichment via PEO contract lookup
- `deelContractId` field in items (resolved from `baseContractOid`)

#### 4c. Query Parameters — MISSING FROM TDD

```typescript
// GetTransfersBySourceEntityQuerySchema (Zod)
{
  cursor?: string (uuid),           // Pagination cursor
  limit?: number (1-100, default 100),
  status?: string,                  // Comma-separated: "SCHEDULED,PROCESSING"
  baseContractOid?: string (max 20), // Filter by specific employee
}
```

---

## 5. PUT /peo-employee-transfers/{id}/sign

### Verdict: DOES NOT EXIST

**TDD says**: `PUT /peo-employee-transfers/{id}/sign` — endpoint to sign transfer agreements

**Code**: No sign endpoint exists in either PEO or backend:
- No `PUT` or `POST` with `/sign` in PEO entity transfer controller
- No sign-related routes in backend tech ops or peo_integration
- The PEO controller has 7 endpoints (listed in section 1), none handle signing
- `PeoEmployeeTransferSignature` model exists but has no controller endpoint

**Status**: The signing flow is planned as part of EEXPR-44 (custom documents via Document Requests + JetStream). The current implementation creates signature records during transfer creation but has no endpoint to mark them as signed.

---

## 6. POST /peo-employee-transfers/{id}/cancel

### Verdict: DOES NOT EXIST

**TDD says**: `POST /peo-employee-transfers/{id}/cancel` — endpoint to cancel a transfer

**Code**: No cancel endpoint exists in either PEO or backend:
- No `/cancel` route in PEO entity transfer controller
- No cancel-related routes in backend tech ops or peo_integration
- Transfer can be cancelled by updating status to `CANCELLED` via `PATCH /transfers/:id/status` with `{ status: "CANCELLED" }`, but there is no dedicated cancel endpoint with cancellation-specific validation

**Status**: Cancellation is technically possible via the generic status update endpoint, but there is no enforcement of which statuses allow cancellation. The TDD's dedicated cancel endpoint with business rules does not exist.

---

## 7. Endpoints NOT in the TDD

### Verdict: 8+ ENDPOINTS MISSING

| # | Method | Path | Purpose | Source |
|---|--------|------|---------|--------|
| 1 | POST | `/admin/peo/tech_ops/entity_transfer` | Create AND execute transfer (or resume) | `tech_ops.ts:319` |
| 2 | GET | `/admin/peo/tech_ops/entity_transfer/ready` | List scheduled transfers ready for processing | `tech_ops.ts:243` |
| 3 | GET | `/admin/peo/tech_ops/entity_transfer/:id` | Get transfer by ID | `tech_ops.ts:294` |
| 4 | GET | `/admin/peo/tech_ops/entity_transfer/item/:id` | Get transfer item by ID | `tech_ops.ts:265` |
| 5 | PATCH | `/peo/entity-transfer/transfers/:id/status` | Update transfer status | PEO controller:128 |
| 6 | PATCH | `/peo/entity-transfer/items/:id` | Update transfer item | PEO controller:145 |
| 7 | GET | `/peo/entity-transfer/transfers/ready` | Get ready transfers | PEO controller:49 |
| 8 | GET | `/peo/entity-transfer/items/:id` | Get transfer item by ID | PEO controller:96 |
| 9 | GET | `/peo/entity-transfer/transfers/:id` | Get transfer by ID | PEO controller:112 |

The TDD treats the API as a single-layer REST API. The actual architecture has 3 layers:
1. **PEO microservice** — Internal CRUD endpoints (7 endpoints)
2. **Backend tech ops** — Admin endpoints that proxy to PEO + execute transfers (5 endpoints)
3. **Backend public API** — Client-facing endpoints (1 endpoint, 1 planned)

---

## 8. Validation Schemas

### Verdict: MISSING FROM TDD

The TDD doesn't document validation rules. The actual implementation uses:

**PEO (Zod)**:
- `CreateTransferSchema` — Full request validation with date format refinement
- `UpdateTransferStatusSchema` — Status enum validation
- `UpdateTransferItemSchema` — Partial update fields
- `GetReadyTransfersSchema` — Date + limit validation
- `GetTransfersBySourceEntityParamsSchema` — UUID validation
- `GetTransfersBySourceEntityQuerySchema` — Pagination + filtering

**Backend Tech Ops (Joi)**:
- Dual-mode XOR validation (`transferItemId` XOR `organizationId`)
- Conditional field requirements (full payload mode requires all resource fields)
- Field name mapping (backend names → PEO names)

---

## 9. Tech Ops Execute Endpoint — Resume Mode

### Verdict: MISSING FROM TDD

The tech ops `POST /entity_transfer` endpoint supports a resume mode not documented in the TDD:

**Resume mode fields**:
```typescript
{
  transferItemId: string (uuid),       // Required in resume mode
  resumeFromStep?: string (1-100),     // Optional step name to resume from
}
```

This allows re-executing a failed transfer from a specific step, which is critical for production operations.

---

## 10. Authentication Architecture

### Verdict: MISSING FROM TDD

| Layer | Auth Method | Middleware |
|-------|------------|------------|
| PEO internal | `x-internal-token` header (shared secret) | BasePEOService interceptor |
| Tech ops | Admin JWT + `admin:contracts.read/write` permission | `@Middleware(app.permissions(...))` |
| Public API | User JWT + `ROLES.CLIENT` + PEO legal entity access | `app.profileType()` + `validatePEOLegalEntityAccessMiddleware()` |

The TDD doesn't document the multi-layer authentication architecture.

---

## 11. Response Wrapper Pattern

### Verdict: MISSING FROM TDD

All PEO endpoints use a standard wrapper:
```typescript
interface PeoApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}
```

The TDD doesn't mention this wrapper pattern.

---

## 12. Frontend Integration Sequence

### Verdict: CANNOT VERIFY (No sequence diagram found in TDD)

The TDD claims to include a frontend integration sequence diagram, but no such diagram was found in the available documentation. The actual flow based on code:

1. Frontend calls `GET /peo_integration/legal_entities/entity_transfer/:id/transfer_resources` to populate dropdowns
2. Frontend calls `POST /peo_integration/legal_entities/entity_transfer` (planned) to create transfer
3. Transfer created with `PENDING_SIGNATURES` status
4. Signatures collected (mechanism TBD — EEXPR-44)
5. Admin manually calls `PATCH /transfers/:id/status` with `{ status: "SCHEDULED" }`
6. Cron job picks up on effective date

---

## Findings Summary

| # | Category | Finding | Severity |
|---|----------|---------|----------|
| 1 | **Incorrect** | All 5 TDD endpoint paths differ from actual paths | High |
| 2 | **Incorrect** | Request field names differ: `basePeoContractOid` vs `baseContractOid`, `newBenefitGroupId` vs `newBenefitPrismGroupId`, `newPayrollSettingsId` vs `newEmploymentPayrollSettingId` | High |
| 3 | **Incorrect** | `newJobCode` replaced by `newPositionPublicId` (UUID) | High |
| 4 | **Incorrect** | POST response shows `DRAFT` status but code creates with `PENDING_SIGNATURES` | Medium |
| 5 | **Incorrect** | Transfer resources field `employmentPayrollSettingIds` is actually `employmentPayrollSettings` (array of objects, not IDs) | Medium |
| 6 | **Incorrect** | `jobCodes` returns position UUIDs and titles, not Prism job codes | Medium |
| 7 | **Does Not Exist** | `PUT /sign` endpoint — no signing endpoint implemented | High |
| 8 | **Does Not Exist** | `POST /cancel` endpoint — no dedicated cancel endpoint | High |
| 9 | **Missing** | `effectiveDate` is a required field in create request (TDD doesn't mention it in API) | High |
| 10 | **Missing** | `agreementId` optional field in create request | Low |
| 11 | **Missing** | Tech ops endpoint with resume mode (`transferItemId` + `resumeFromStep`) | High |
| 12 | **Missing** | 8+ endpoints not documented: ready transfers, get by ID, update status, update item, transfer resources (admin + public) | High |
| 13 | **Missing** | Cursor-based pagination on list transfers (cursor, limit, hasMore) | Medium |
| 14 | **Missing** | Status and contract OID filtering on list endpoint | Medium |
| 15 | **Missing** | Employee name enrichment in list response (`deelContractId`, `employeeName`) | Low |
| 16 | **Missing** | Three-layer API architecture (PEO internal, backend admin, backend public) | High |
| 17 | **Missing** | Zod (PEO) and Joi (backend) validation schemas | Medium |
| 18 | **Missing** | `PeoApiResponse<T>` standard wrapper pattern | Medium |
| 19 | **Missing** | Multi-layer authentication (internal token, admin JWT, user JWT) | Medium |
| 20 | **Missing** | Work location labels use `entity_work_locations.name` (PEOCM-792-3 fix) | Low |
| 21 | **Missing** | Transfer resources `ResourceOption` format `{ id, label }` not documented | Low |
| 22 | **Missing** | Frontend integration sequence diagram not available | Low |
