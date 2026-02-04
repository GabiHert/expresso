# Phase 1 Findings: State Machines & Lifecycle

**Task**: EEXPR-129 | **Date**: 2026-02-03 | **Status**: Complete

---

## Summary

The TDD's state machine definitions are **mostly accurate** for transfer and item statuses. The major discrepancies are in the **lifecycle flow** (effective date handling, initial status, signature transitions) and the **step count** (TDD says 11, actual is 13).

---

## 1. Transfer Statuses

### Verdict: ACCURATE

**TDD defines 8 statuses:**
`DRAFT`, `PENDING_SIGNATURES`, `SCHEDULED`, `PROCESSING`, `COMPLETED`, `PARTIAL_FAILURE`, `FAILED`, `CANCELLED`

**Code defines 8 statuses (identical):**
```typescript
// backend/services/peo/entity_transfer/types.ts
// peo/src/models/entityTransfer/types.ts
export enum TransferStatus {
    DRAFT = 'DRAFT',
    PENDING_SIGNATURES = 'PENDING_SIGNATURES',
    SCHEDULED = 'SCHEDULED',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    PARTIAL_FAILURE = 'PARTIAL_FAILURE',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
}
```

**No discrepancy.** Both backend and PEO repos have identical enum definitions.

---

## 2. Transfer Item Statuses

### Verdict: ACCURATE

**TDD defines 5 statuses:**
`PENDING`, `PROCESSING`, `WAITING_FOR_RESOURCES`, `COMPLETED`, `FAILED`

**Code defines 5 statuses (identical):**
```typescript
export enum TransferItemStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    WAITING_FOR_RESOURCES = 'WAITING_FOR_RESOURCES',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}
```

**No discrepancy.**

---

## 3. Transfer State Machine Transitions

### Verdict: PARTIALLY INCORRECT

| Transition | TDD Says | Code Does | Status |
|---|---|---|---|
| Creation status | `DRAFT` | `PENDING_SIGNATURES` | **INCORRECT** |
| DRAFT → PENDING_SIGNATURES | Admin submits | Skipped — created directly as PENDING_SIGNATURES | **INCORRECT** |
| PENDING_SIGNATURES → SCHEDULED | All signatures collected (automatic) | Manual PATCH `/transfers/:id/status` API call | **INCORRECT** |
| SCHEDULED → PROCESSING | Cron job on effective date | Cron job on effective date | ACCURATE |
| PROCESSING → COMPLETED | All items complete | All items COMPLETED | ACCURATE |
| PROCESSING → FAILED | All items fail | All items FAILED | ACCURATE |
| PROCESSING → PARTIAL_FAILURE | Mix of success/fail | Mix of COMPLETED & FAILED | ACCURATE |
| PROCESSING → SCHEDULED | Items waiting for resources | Any item WAITING_FOR_RESOURCES | ACCURATE |
| PENDING_SIGNATURES → CANCELLED | Admin cancels | Not verified (endpoint exists) | ASSUMED ACCURATE |
| SCHEDULED → CANCELLED | Admin cancels | Not verified (endpoint exists) | ASSUMED ACCURATE |

### Discrepancy Details:

#### 3a. Initial Status — INCORRECT
- **TDD says**: Transfer created with status `DRAFT`, then admin submits to move to `PENDING_SIGNATURES`
- **Code does**: Transfer created directly with `PENDING_SIGNATURES` status
- **Source**: `peo/src/services/entityTransfer/entityTransferService.ts:107` — `status: TransferStatus.PENDING_SIGNATURES`
- **Note**: The `DRAFT` status exists in the enum but is NOT used during creation. The TDD's two-step (DRAFT → PENDING_SIGNATURES) lifecycle doesn't match the single-step creation.

#### 3b. PENDING_SIGNATURES → SCHEDULED — INCORRECT
- **TDD says**: Automatic transition when "all signatures collected"
- **Code does**: Manual API call via `PATCH /transfers/:id/status` with `{ status: 'SCHEDULED' }` — the backend calls `entityTransferClientService.updateTransferStatus()`
- **Source**: `peo/src/controllers/entityTransfer/entityTransferController.ts:128-143`
- **Note**: Auto-transition was planned (EEXPR-13-4) but not yet implemented. Currently requires explicit API call.

---

## 4. Transfer Item State Machine

### Verdict: ACCURATE

| Transition | TDD Says | Code Does | Status |
|---|---|---|---|
| PENDING → PROCESSING | Cron job starts | `executeTransfer()` called | ACCURATE |
| PROCESSING → COMPLETED | All steps succeed | All steps complete, not halted | ACCURATE |
| PROCESSING → FAILED | Any step fails | Step throws error | ACCURATE |
| PROCESSING → WAITING_FOR_RESOURCES | ForceComplete triggers async | Step execution halts | ACCURATE |
| WAITING_FOR_RESOURCES → PROCESSING | Cron retry (resources ready) | Transfer goes back to SCHEDULED, cron retries | ACCURATE |

**Minor note**: The TDD shows `WAITING_FOR_RESOURCES → PROCESSING` as a direct item-level retry. In practice, the transfer-level status goes back to `SCHEDULED`, and the cron job picks it up again, which then processes items including the waiting ones. The end result is the same but the mechanism is transfer-level, not item-level.

---

## 5. Lifecycle Steps

### Verdict: PARTIALLY INCORRECT

#### 5a. Creation (Step 1) — INCORRECT

**TDD says:**
> Admin selects employees and destination entity. System validates resources exist or creates underwriting requests. Transfer record created with status `DRAFT`.

**Code does:**
- Transfer created with `PENDING_SIGNATURES` (not DRAFT)
- `DRAFT` status is not used in the current implementation

#### 5b. Signature Collection (Step 2) — PARTIALLY INCORRECT

**TDD says:**
> Admin and employees sign Entity Assignment Agreements. Employees sign Notice of PEO Relationship documents. Once all signatures collected → `SCHEDULED`.

**Code does:**
- Signature records created in PEO database
- Transition to SCHEDULED is **manual** (PATCH API call), not automatic
- The auto-transition logic is planned but not yet implemented

#### 5c. Scheduling (Step 3) — INCORRECT

**TDD says:**
> `effective_date` automatically calculated as end of source entity's current pay cycle. Admins cannot manually select transfer date.

**Code does:**
- `effectiveDate` is a **required field in the POST request body** (provided by caller)
- `EffectiveDateService` exists but is **deprecated** (no longer called during creation)
- Change implemented in EEXPR-13-14
- TODO comment: `// TODO [EEXPR-44]: effectiveDate will eventually be removed from request - calculated in a separate step`

#### 5d. Execution (Step 4) — PARTIALLY INCORRECT

**TDD says:**
> Batch processing with `LIMIT 50`. Processes each transfer sequentially.

**Code does:**
- Uses `LIMIT 100` (not 50) in `findReadyTransfers` method
- Otherwise the cron job mechanism is accurate

---

## 6. Step Count

### Verdict: INCORRECT

**TDD says**: 11 steps
**Code has**: 13 steps

Actual step order from `entity_transfer_service.ts:48-61`:

| # | Step Name | In TDD? |
|---|-----------|---------|
| 1 | CrossHireSanityCheckStep | Yes (Step 1) |
| 2 | TerminationSanityCheckStep | Yes (Step 2) |
| 3 | CheckUnderwritingRequestStatusStep | Yes (Step 3) |
| 4 | ForceCompleteUnderwritingStep | Yes (Step 4) |
| 5 | SanityCheckResourcesExistStep | Yes (Step 5) |
| 6 | CreateContractStep | Yes (Step 6) |
| 7 | ShareComplianceDocumentsStep | Yes (Step 7) |
| **8** | **CopyI9DataStep** | **NO — Missing from TDD** |
| 9 | UpdateTimeOffEmploymentStep | Yes (Step 8) |
| 10 | AssignPtoPolicyStep | Yes (Step 9) |
| 11 | CrossHireStep (PONR) | Yes (Step 10) |
| **12** | **UpdateNewContractStatusStep** | **NO — Missing from TDD** |
| 13 | TerminateContractStep | Yes (Step 11) |

**New steps not in TDD:**
- **Step 8: CopyI9DataStep** — Copies I-9 compliance data to the new contract
- **Step 12: UpdateNewContractStatusStep** — Updates the new contract status (activates if effective date passed)

**Point of No Return**: TDD says step 10, actual is step **11** (CrossHireStep).

---

## 7. Additional Enums Not in TDD

### Missing from TDD:

| Enum | Values | Location |
|---|---|---|
| `SignatureRole` | ADMIN, EMPLOYEE | `peo/src/models/entityTransfer/types.ts` |
| `AgreementType` | ARBITRATION_AGREEMENT, WSE_NOTICE_OF_PEO_RELATIONSHIP, ENTITY_ASSIGNMENT_AGREEMENT | `peo/src/models/entityTransfer/types.ts` |
| `StepType` | DATABASE, EXTERNAL, MIXED | `backend/services/peo/entity_transfer/types.ts` |

The TDD mentions these concepts but doesn't define them as formal enums.

---

## Findings Summary

| # | Category | Finding | Severity |
|---|----------|---------|----------|
| 1 | **Incorrect** | Initial status is PENDING_SIGNATURES, not DRAFT | Medium |
| 2 | **Incorrect** | PENDING_SIGNATURES → SCHEDULED is manual, not automatic | High |
| 3 | **Incorrect** | Effective date is provided by caller, not auto-calculated | High |
| 4 | **Incorrect** | Batch limit is 100, not 50 | Low |
| 5 | **Incorrect** | Step count is 13, not 11 (CopyI9DataStep and UpdateNewContractStatusStep added) | High |
| 6 | **Incorrect** | Point of No Return is step 11, not step 10 | Medium |
| 7 | **Missing** | SignatureRole, AgreementType, StepType enums not documented | Low |
| 8 | **Missing** | Manual PATCH endpoint for status transitions not documented in TDD | Medium |
| 9 | **Obsolete** | DRAFT status described in lifecycle but not used in creation flow | Medium |
| 10 | **Obsolete** | EffectiveDateService auto-calculation described but deprecated | High |
