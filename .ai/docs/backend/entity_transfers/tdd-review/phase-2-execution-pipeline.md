# Phase 2 Findings: Step-Based Execution Pipeline

**Task**: EEXPR-129 | **Date**: 2026-02-03 | **Status**: Complete

---

## Summary

The TDD's execution pipeline description has **significant discrepancies** with the actual implementation. The step count is wrong (TDD says 11, actual is 13), the Point of No Return position is shifted, rollback descriptions are partially incorrect, and the TDD omits the HALT_SUCCESS flow for async resource waiting.

---

## 1. Step Count

### Verdict: INCORRECT

**TDD says**: 11 steps
**Actual code**: 13 steps (registered in `entity_transfer_service.ts:48-61`)

| Actual # | Step Name | TDD Step # | TDD Name | Status |
|----------|-----------|------------|----------|--------|
| 1 | CrossHireSanityCheckStep | 1 | Sanity Check - Cross Hire | ACCURATE |
| 2 | TerminationSanityCheckStep | 2 | Sanity Check - Termination | ACCURATE |
| 3 | CheckUnderwritingRequestStatusStep | 3 | Check Underwriting Request Status | ACCURATE |
| 4 | ForceCompleteUnderwritingStep | 4 | Force Complete Underwriting | ACCURATE |
| 5 | SanityCheckResourcesExistStep | 5 | Sanity Check Resources Exist | ACCURATE |
| 6 | CreateContractStep | 6 | Create Contract | ACCURATE |
| 7 | ShareComplianceDocumentsStep | 7 | Share Compliance Documents | ACCURATE |
| **8** | **CopyI9DataStep** | — | **NOT IN TDD** | **MISSING** |
| 9 | UpdateTimeOffEmploymentStep | 8 | Update Time Off Employment | ACCURATE |
| 10 | AssignPtoPolicyStep | 9 | Assign PTO Policy | ACCURATE |
| 11 | CrossHireStep | 10 | Cross Hire (PONR) | **POSITION SHIFTED** |
| **12** | **UpdateNewContractStatusStep** | — | **NOT IN TDD** | **MISSING** |
| 13 | TerminateContractStep | 11 | Terminate Old Contract | **POSITION SHIFTED** |

### Missing Steps:

**Step 8: CopyI9DataStep**
- **Type**: EXTERNAL
- **Purpose**: Copies I-9 compliance data (3 tables: I9Section1, I9RepresentativeInvitation, I9Section2) from old contract to new contract
- **Note**: Runs WITHOUT Sequelize transaction because I9Section2's `beforeCreate` hook validates Section1 with `useMaster:true`
- **Has rollback**: Yes — deletes I-9 records in reverse FK order (I9Section2 → I9RepresentativeInvitation → I9Section1)

**Step 12: UpdateNewContractStatusStep**
- **Type**: DATABASE
- **Purpose**: Transitions new contract from `under_review` → `ONBOARDED`. If `effectiveDate ≤ today`, further activates to `IN_PROGRESS`. If future date, a cronjob handles activation later.
- **Side effects**: Triggers contract sync, events, HOFY integration, payroll reports
- **Has rollback**: No (stub only — side effects are irreversible)

---

## 2. Step Type Classification

### Verdict: PARTIALLY INCORRECT

The TDD defines three step types: `DATABASE`, `EXTERNAL`, `MIXED`. The actual StepType enum matches:

```typescript
// backend/services/peo/entity_transfer/types.ts
export enum StepType {
    DATABASE = 'DATABASE',
    EXTERNAL = 'EXTERNAL',
    MIXED = 'MIXED',
}
```

However, the TDD doesn't specify which type each step is. Actual classification:

| Step | TDD Type | Actual Type |
|------|----------|-------------|
| 1 CrossHireSanityCheck | Not specified | DATABASE |
| 2 TerminationSanityCheck | Not specified | DATABASE |
| 3 CheckUnderwritingRequestStatus | Not specified | EXTERNAL |
| 4 ForceCompleteUnderwriting | Not specified | DATABASE |
| 5 SanityCheckResourcesExist | Not specified | EXTERNAL |
| 6 CreateContract | Not specified | DATABASE |
| 7 ShareComplianceDocuments | Not specified | EXTERNAL |
| 8 CopyI9Data | N/A | EXTERNAL |
| 9 UpdateTimeOffEmployment | Not specified | EXTERNAL |
| 10 AssignPtoPolicy | Not specified | EXTERNAL |
| 11 CrossHire | Not specified | EXTERNAL |
| 12 UpdateNewContractStatus | N/A | DATABASE |
| 13 TerminateContract | Not specified | EXTERNAL |

---

## 3. Step Interface

### Verdict: ACCURATE (with additions)

**TDD describes**: `execute()`, `validate()`, `rollback()`
**Actual interface** (`steps/i_transfer_step.ts`):

```typescript
interface ITransferStep {
    name: string;
    type: StepType;
    execute(context: TransferContext, transaction?: Transaction): Promise<StepExecutionReturn>;
    validate(context: TransferContext): Promise<void>;
    rollback?(context: TransferContext, transaction?: Transaction): Promise<void>;
}
```

**Missing from TDD**:
- `StepExecutionReturn` type which returns `StepExecutionResult` enum (`CONTINUE` | `HALT_SUCCESS`)
- The `HALT_SUCCESS` result is critical — it pauses the pipeline when async operations need to complete (e.g., ForceCompleteUnderwriting triggers resource creation, then halts for cron retry)
- `rollback` is optional (marked with `?`)

---

## 4. Rollback Logic

### Verdict: PARTIALLY INCORRECT

#### 4a. Rollback Mechanism

**TDD says**: Steps 4-9 have rollback capability. Steps before 4 are read-only. Steps after PONR can't be rolled back.

**Code does** (`transfer_step_executor.ts:207-256`):
- **Single-transaction rollback**: All completed steps are rolled back in reverse order within ONE Sequelize transaction
- Individual step rollback failures are captured but don't stop subsequent rollbacks
- **No retry logic** (two-phase retry was designed in EEXPR-90 work item 06 but not yet merged)

#### 4b. Per-Step Rollback Capabilities

| Step # | Name | TDD Says Rollback? | Actually Has Rollback? | Rollback Behavior |
|--------|------|--------------------|-----------------------|-------------------|
| 1 | CrossHireSanityCheck | No (read-only) | No method defined | Correct — read-only |
| 2 | TerminationSanityCheck | No (read-only) | No method defined | Correct — read-only |
| 3 | CheckUnderwritingRequestStatus | No (read-only) | Stub (logs only) | Accurate — read-only status check |
| 4 | ForceCompleteUnderwriting | Yes | Stub (logs only) | **INCORRECT** — TDD says rollback exists, but can't rollback async PrismHR resource creation |
| 5 | SanityCheckResourcesExist | No (read-only) | Stub (logs only) | Accurate — read-only |
| 6 | CreateContract | Yes | **Yes — hard delete** | **PARTIALLY INCORRECT** — TDD doesn't mention the `crossHireCompleted` guard that SKIPS rollback if PONR passed |
| 7 | ShareComplianceDocuments | Yes | **Yes — outbox event** | **INCORRECT** — TDD says "delete documents", code publishes `ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK` outbox event for PEO to handle asynchronously |
| 8 | CopyI9Data | N/A (not in TDD) | **Yes — direct delete** | Deletes in reverse FK order: I9Section2 → I9RepresentativeInvitation → I9Section1 |
| 9 | UpdateTimeOffEmployment | Yes | **No method defined** | **INCORRECT** — TDD says rollback exists, but time-off service handles its own compensating transactions |
| 10 | AssignPtoPolicy | Yes | **Yes — API call** | Unassigns policy via HTTP API. Rollback failure leaves employee with extra policy (manual cleanup) |
| 11 | CrossHire (PONR) | No (can't rollback) | Stub (logs warning) | Accurate — logs "manual PrismHR cleanup required" |
| 12 | UpdateNewContractStatus | N/A (not in TDD) | No (stub) | Side effects are irreversible |
| 13 | TerminateContract | No (can't rollback) | No method defined | Accurate — final step, irreversible |

#### 4c. CreateContractStep Rollback Guard

The TDD doesn't document the critical safety check:

```typescript
// create_contract_step.ts rollback
if (hasCrossHireCompleted(context, CrossHireStep.stepName)) {
    this.log.error({
        message: '[CreateContractStep] Rollback skipped - cross-hire already completed',
        warning: 'Contract has PrismHR employee associated - manual cleanup required',
    });
    return; // Skip rollback to prevent Deel/PrismHR inconsistency
}
```

This prevents deleting a contract that already has a PrismHR employee linked to it.

#### 4d. EEXPR-90 Rollback Changes (REVERTED)

EEXPR-90 designed a two-phase rollback with exponential backoff retry (work item 06), but this approach was **reverted and will not be used**. The single-transaction rollback is the intended final design.

---

## 5. Point of No Return (PONR)

### Verdict: INCORRECT

**TDD says**: Step 10 (Cross-Hire) is the PONR
**Actual**: Step **11** (CrossHireStep) is the PONR

The shift is due to the insertion of CopyI9DataStep at position 8, pushing CrossHire from position 10 to 11.

The PONR concept itself is accurate:
- Before CrossHire: Full automatic rollback is possible
- After CrossHire: No automatic rollback — `crossHireCompleted` flag is set, and CreateContractStep's rollback is skipped
- Manual PrismHR intervention required: terminate new employee, reactivate old employee

---

## 6. HALT_SUCCESS Flow

### Verdict: MISSING FROM TDD

The TDD does not document the `HALT_SUCCESS` execution result. This is a critical pipeline behavior:

1. **ForceCompleteUnderwritingStep** (Step 4) can return `HALT_SUCCESS` when it triggers async resource creation in PrismHR
2. **UpdateTimeOffEmploymentStep** (Step 9) can return `HALT_SUCCESS` if EMS is not ready
3. When `HALT_SUCCESS` is returned:
   - The item status becomes `WAITING_FOR_RESOURCES`
   - The transfer status goes back to `SCHEDULED`
   - The cron job will retry on the next cycle
   - Completed step state is preserved, so execution resumes from the halted step

The `StepExecutionResult` enum:
```typescript
export enum StepExecutionResult {
    CONTINUE = 'CONTINUE',
    HALT_SUCCESS = 'HALT_SUCCESS',
}
```

---

## 7. Execution Flow Diagram

### Verdict: PARTIALLY ACCURATE

The TDD's flow diagram correctly shows the general flow but misses:

1. **HALT_SUCCESS branches**: Steps 4 and 9 can pause the pipeline
2. **Conditional execution**: Step 4 only runs if `statusCheck.needsForceComplete=true`
3. **CrossHire guard in rollback**: CreateContract rollback is skipped if CrossHire completed
4. **Step 12 conditional activation**: New contract activated immediately if `effectiveDate ≤ today`, deferred to cronjob if future date

---

## 8. External Service Dependencies

### Verdict: MISSING FROM TDD

The TDD doesn't document which external services each step depends on:

| Service | Steps |
|---------|-------|
| PEO Microservice | 3, 4, 7, 8, 11, 12, 13 |
| TimeOffService | 9, 10 |
| EMS (Employment Management) | 2, 9 |
| PrismHR Payroll | 2, 11, 13 |
| Ops Workbench | 4 |

---

## 9. 15-Step Reference in Deployment Docs

### Verdict: EXPLAINED

The deployment docs mention 15 steps. This accounts for 2 additional steps from EEXPR-44 (custom documents) that were being deployed:
- **CheckSignaturesSanityStep** (would be Step 3, shifting others down)
- **AttachSignedDocumentsStep** (would be Step 10)

These are part of PR #116580 and add signature-based entity transfer support. When deployed, the pipeline would be:
- 13 current steps + 2 signature steps = 15 total

**Current production**: 13 steps (signature steps are in PR, not yet merged)

---

## Findings Summary

| # | Category | Finding | Severity |
|---|----------|---------|----------|
| 1 | **Incorrect** | Step count is 13, not 11 (CopyI9DataStep + UpdateNewContractStatusStep added) | High |
| 2 | **Incorrect** | PONR is at step 11, not step 10 | Medium |
| 3 | **Incorrect** | ForceCompleteUnderwriting rollback is stub-only, not real rollback | Medium |
| 4 | **Incorrect** | ShareComplianceDocuments rollback uses outbox event pattern, not direct delete | Medium |
| 5 | **Incorrect** | UpdateTimeOffEmployment has NO rollback method (TDD claims it does) | Medium |
| 6 | **Missing** | HALT_SUCCESS execution result and pipeline pause behavior not documented | High |
| 7 | **Missing** | CreateContract rollback guard (skips if crossHireCompleted) not documented | High |
| 8 | **Missing** | CopyI9DataStep (Step 8) — I-9 data migration with transactionless execution | High |
| 9 | **Missing** | UpdateNewContractStatusStep (Step 12) — conditional activation based on effective date | High |
| 10 | **Missing** | StepType classification per step not documented | Low |
| 11 | **Missing** | External service dependencies per step not documented | Medium |
| 12 | **Missing** | Conditional execution of ForceCompleteUnderwritingStep | Low |
| 13 | **Accurate** | Single-transaction rollback is the intended final design (EEXPR-90 two-phase was reverted) | Info |
| 14 | **Clarification** | 15-step reference in deployment docs = 13 current + 2 from EEXPR-44 signatures PR | Low |
