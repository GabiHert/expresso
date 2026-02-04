# Phase 6 Findings: Business Logic & Edge Cases

**Task**: EEXPR-129 | **Date**: 2026-02-04 | **Status**: Complete

---

## Summary

The TDD's business logic descriptions have **multiple inaccuracies** across effective date handling, batch processing, concurrency, and rollback descriptions. The most impactful change is the removal of automatic effective date calculation (EEXPR-13-14). The batch limit is wrong (100, not 50), there is no distributed locking, and the rollback compensation chain in the TDD uses wrong step numbers and incorrect per-step rollback capabilities.

---

## 1. Effective Date Logic

### Verdict: OBSOLETE

**TDD says**:
> `effective_date` automatically calculated as end of source entity's current pay cycle. Admins cannot manually select transfer date.

**Actual**:
- `EffectiveDateService` was **deleted** (189 lines removed in commit `e9ba92b0f10`)
- Change: "EEXPR-13: remove effectiveDate calculation - accept from request body instead"
- `effectiveDate` is now a **required field in the POST request body** (string, YYYY-MM-DD format)
- PEO Zod validation: `effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` with date bounds checking
- TODO comment in code: `// TODO [EEXPR-44]: effectiveDate will eventually be removed from request - calculated in a separate step`
- EEXPR-44-4 made `effectiveDate` nullable in PEO (for the creation flow where it's calculated later)

**Current state**: Caller provides effective date. No auto-calculation. The EEXPR-44 TODO suggests future plans to reintroduce calculation in a different step, but this is not yet implemented.

---

## 2. Underwriting Workflow

### Verdict: PARTIALLY ACCURATE

**TDD describes**: Two-phase approach — check status, then force-complete if pending. Dynamic lookup by code.

**Actual — 3-Step Workflow**:

#### Step 3: CheckUnderwritingRequestStatusStep (EXTERNAL)

Combines finding and checking underwriting requests in a single operation:

1. **Work Locations**: Calls `peoWorkLocationService.getPEOWorkLocationByEntityWorkLocationId()` → extracts Prism client work location ID → looks up `PrismResourceRequest` by legal entity + resource type + description (Prism code)
2. **Positions**: Calls `peoPositionService.getByFilters()` → uses position `code` (if completed UW) or `title` (if still in UW) → looks up `PrismResourceRequest`
3. **Stores request IDs**: `item.workLocationUwRequestId` and `item.positionUwRequestId`

**Context populated**:
```typescript
underwriting.statusCheck: {
    workLocationApproved: boolean,
    positionApproved: boolean,
    needsForceComplete: boolean,
    pendingRequests: string[]
}
```

**Status values**: APPROVED, UNDER_REVIEW, REJECTED, DRAFT

**TDD accuracy**: The "dynamic lookup by code" approach is accurate. The two-phase check/force-complete is accurate. What's missing is the detail of HOW requests are found (by resource type + description, not by stored ID).

#### Step 4: ForceCompleteUnderwritingStep (DATABASE)

**Only runs if** `needsForceComplete === true`

1. Uses cached request objects from Step 3 context (no redundant HTTP calls)
2. Completes ops workbench tasks via `opsWorkbenchTaskService.patchTaskV2()` with status COMPLETED
3. Task completion triggers NATS events → async resource creation in PrismHR
4. Returns `StepExecutionResult.HALT_SUCCESS` → pipeline pauses
5. Item status → `WAITING_FOR_RESOURCES`, transfer status → `SCHEDULED`

**Rollback**: Cannot rollback — completed workbench tasks trigger irreversible async events. Logs warning only.

**TDD accuracy**: Mostly correct about force-complete as fallback. Missing: Ops Workbench integration, HALT_SUCCESS mechanism, async resource creation via NATS events.

#### Step 5: SanityCheckResourcesExistStep (EXTERNAL)

Safety gate before PONR — re-verifies resources exist in PrismHR after async creation:
- Calls `peoWorkLocationService` and `peoPositionService` again
- Throws error if ANY resource missing (prevents cross-hire attempt)

**TDD accuracy**: Not specifically described in TDD. Critical safety check that prevents cross-hire failures.

#### WAITING_FOR_RESOURCES Flow

| Event | Result |
|-------|--------|
| ForceComplete triggers async creation | HALT_SUCCESS returned |
| Item status | WAITING_FOR_RESOURCES |
| Transfer status | SCHEDULED |
| Next cron run | Picks up transfer, resumes from `resumeFromStep` |
| CheckUnderwritingRequestStatus re-runs | Re-queries fresh status (not using stored IDs) |
| Resources now exist | ForceComplete skipped, SanityCheck passes |

**TDD accuracy**: WAITING_FOR_RESOURCES concept is correct. Missing: resume mechanism via `resumeFromStep` field, re-query on resume instead of using stored IDs.

---

## 3. Rollback Compensation Chain

### Verdict: INCORRECT (Step Numbers and Per-Step Capabilities)

**TDD describes rollback for steps in reverse**:
- Step 6.5: Unassign PTO policy
- Step 6: Revert time-off employment entity
- Step 5: Delete compliance document submissions
- Step 4: Delete created contract

**Actual rollback chain** (current 13-step pipeline):

| Step # | Name | Rollback? | Implementation |
|--------|------|-----------|----------------|
| 1 | CrossHireSanityCheck | No-op | Read-only validation |
| 2 | TerminationSanityCheck | No-op | Read-only validation |
| 3 | CheckUnderwritingRequestStatus | No-op | Read-only check |
| 4 | ForceCompleteUnderwriting | Logs warning | Cannot undo completed workbench tasks |
| 5 | SanityCheckResourcesExist | No-op | Read-only check |
| 6 | CreateContract | **Conditional** | Hard delete if `crossHireCompleted=false`; SKIPPED if true |
| 7 | ShareComplianceDocuments | **Yes** | Outbox event `ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK` |
| 8 | CopyI9Data | **Yes** | Direct delete in reverse FK order (I9Section2 → I9RepresentativeInvitation → I9Section1) |
| 9 | UpdateTimeOffEmployment | **No-op** | Logs warning — time-off service handles compensating transactions |
| 10 | AssignPtoPolicy | **Yes** | HTTP call to unassign policy: `setPolicyToProfile(policyId, profileId, false)` |
| 11 | CrossHire (PONR) | **Manual only** | Logs "manual PrismHR cleanup required" |
| 12 | UpdateNewContractStatus | **No-op** | Side effects irreversible |
| 13 | TerminateContract | N/A | Final step |

**Rollback mechanism** (`transfer_step_executor.ts:207-256`):
- Executes in **reverse order** of completed steps
- All within a **single Sequelize transaction**
- Individual step rollback failures are captured but don't stop subsequent rollbacks

**TDD discrepancies**:
1. Step numbers are wrong (TDD uses 11-step numbering, actual is 13)
2. TDD says UpdateTimeOffEmployment has rollback — it does NOT
3. TDD says ShareComplianceDocuments rollback "deletes documents" — actual uses outbox event pattern (async deletion by PEO)
4. TDD doesn't mention the `crossHireCompleted` guard on CreateContract rollback
5. TDD doesn't mention CopyI9Data rollback at all (step not in TDD)

---

## 4. EEXPR-90 Rollback Fix

### Verdict: VERIFIED

**Issue**: CreateContractStep rollback had cascading failures

**Root causes and fixes**:

| Problem | Fix |
|---------|-----|
| Setting `newContractOid: null` failed Zod validation (expects `string \| undefined`) | Changed to `context.contracts.new = undefined` |
| ShareComplianceDocuments couldn't delete file_submissions (PEO schema FK constraints) | Replaced direct SQL DELETE with transactional outbox event (`ENTITY_TRANSFER_FILE_SUBMISSION_ROLLBACK`) |
| Employment records had soft FK triggers preventing contract deletion | Added `cancelEmploymentOnContractDeactivation()` call before contract deletion |

**Primary commit**: `1c7d126cf08`

**Note**: The two-phase retry rollback with exponential backoff that was designed in EEXPR-90 work item 06 was **reverted**. The single-transaction rollback is the intended final design.

---

## 5. PTO Handling

### Verdict: PARTIALLY ACCURATE

**TDD describes**:
1. UpdateTimeOffEmployment: Updates legal entity pointer
2. AssignPtoPolicy: Applies destination PTO policy
3. Balance preserved (tied to employee profile)

**Actual**:

#### UpdateTimeOffEmploymentStep (Step 9)

- Calls `TimeOffService.transferAdjustments(oldContractOid, newContractOid)` — HTTP call to time-off microservice
- Migrates PTO adjustments from old contract to new contract
- Handles the problem that time-off service auto-creates a new employment record with WRONG legal entity
- **Can return HALT_SUCCESS** if `EMSEmploymentNotReadyError` is thrown (EMS not ready)
- Sets `resumeFromStep: this.name` for retry
- **No rollback** — logs warning that time-off service handles its own compensating transactions

**TDD accuracy**: "Updates legal entity pointer" is an oversimplification. The actual step transfers PTO adjustments between contracts. The HALT_SUCCESS behavior is not mentioned.

#### AssignPtoPolicyStep (Step 10)

- Gets or creates time-off profile using `HrisProfileId` (same employee for both contracts)
- Assigns new PTO policy with `override=true`
- Policy assignment is **additive** — does NOT replace old policies
- **Has rollback**: Calls `setPolicyToProfile(newPolicyId, profileId, false)` to unassign
- Old policies remain assigned (never unassigned during transfer)

**TDD accuracy**: "Applies destination PTO policy" is correct. "Balance preserved (tied to employee profile)" is correct — the HrisProfileId is shared, so balances carry over.

---

## 6. Cron Job Behavior

### Verdict: PARTIALLY INCORRECT

**TDD says**:
- Batch of 50 transfers per run
- Pagination with LIMIT 50
- Sequential processing
- Distributed locking

**Actual** (`entity_transfer_processor.ts`):

| Aspect | TDD | Actual |
|--------|-----|--------|
| Batch limit | 50 | **100** |
| Processing model | Sequential | Sequential (correct) |
| Distributed locking | Yes | **NO — none implemented** |
| Pagination | LIMIT 50 | Single query with LIMIT 100, no pagination |

**Processing flow**:
```
Cron triggers → EntityTransferProcessor.run()
  → findReadyTransfers(today, 100) // status=SCHEDULED, effectiveDate<=today
  → for each transfer (sequential):
    → updateTransferStatus(PROCESSING)
    → for each item (sequential):
      → executeTransfer(transfer, item)
    → determineTransferStatus(results)
    → updateTransferStatus(finalStatus)
```

**Status determination priority**:
1. Any item WAITING_FOR_RESOURCES → transfer = SCHEDULED (will retry)
2. All COMPLETED → COMPLETED
3. All FAILED → FAILED
4. Mix → PARTIAL_FAILURE

**Concurrency risk**: No advisory locks, no Redis locks, no SELECT FOR UPDATE. If multiple cron instances overlap, they could fetch and process the same transfers simultaneously.

---

## 7. Cross-Hire Integration

### Verdict: PARTIALLY ACCURATE

**TDD describes**: PrismHR cross-hire call parameters and new employee creation.

**Actual** (`cross_hire_step.ts`):

**Endpoint**: HTTP POST to `/import-cross-hire-employee` on PEO microservice

**Request payload**:
```typescript
{
    deelContractId: number,              // newContract.id
    deelContractorId: number,            // newContract.HrisProfileId
    deelEntityId: number,                // destinationLegalEntity.id
    employmentPayrollSettingId?: string,  // item.newPayrollSettingsId
    previousPrismEmployeeId: string       // oldContract.peoContract.prismEmployeeId
}
```

**Response**:
```typescript
{
    skipped: boolean,
    message: string
}
```

Accepts status 200 or 202. Throws error if `skipped=true`.

**New Prism employee ID storage**: PEO microservice persists `prismEmployeeId` directly to its database. The ID is NOT returned in the response payload. The backend service assumes successful response means the ID was persisted.

**Failure after PONR**: No automatic rollback. Requires manual steps:
1. Terminate new employee in destination entity (PrismHR)
2. Reactivate old employee in source entity
3. Manually delete Deel contracts if needed

**TDD accuracy**: The general concept is correct. Missing details: the `employmentPayrollSettingId` parameter, the `skipped` response field, and the fact that the new Prism employee ID is NOT returned in the response.

---

## Findings Summary

| # | Category | Finding | Severity |
|---|----------|---------|----------|
| 1 | **Obsolete** | Effective date auto-calculation removed (EEXPR-13-14). EffectiveDateService deleted. Caller now provides effectiveDate in request body | Critical |
| 2 | **Incorrect** | Batch limit is 100, not 50 | Medium |
| 3 | **Incorrect** | No distributed locking exists (TDD claims it does) | High |
| 4 | **Incorrect** | No pagination — single query with LIMIT 100 | Low |
| 5 | **Incorrect** | Rollback step numbers wrong (TDD uses 11-step numbering, actual is 13) | Medium |
| 6 | **Incorrect** | TDD says UpdateTimeOffEmployment has rollback — it does NOT (time-off service handles compensating) | Medium |
| 7 | **Incorrect** | TDD says ShareComplianceDocuments rollback "deletes documents" — actual uses outbox event pattern | Medium |
| 8 | **Missing** | SanityCheckResourcesExistStep (Step 5) safety gate not documented | Medium |
| 9 | **Missing** | Ops Workbench integration in ForceCompleteUnderwriting not documented | Medium |
| 10 | **Missing** | HALT_SUCCESS mechanism in ForceCompleteUnderwriting and UpdateTimeOffEmployment not documented | High |
| 11 | **Missing** | `resumeFromStep` field and resume-from-step mechanism not documented | High |
| 12 | **Missing** | `crossHireCompleted` guard on CreateContract rollback not documented | High |
| 13 | **Missing** | CopyI9Data step and its rollback (reverse FK order deletion) not documented | Medium |
| 14 | **Missing** | New Prism employee ID is NOT returned in cross-hire response (persisted by PEO directly) | Low |
| 15 | **Missing** | `employmentPayrollSettingId` parameter in cross-hire request | Low |
| 16 | **Missing** | AssignPtoPolicy is additive (doesn't unassign old policies) | Low |
| 17 | **Missing** | EEXPR-90 rollback fix details (null→undefined, outbox pattern, employment cancellation) | Medium |
| 18 | **Verified** | Single-transaction rollback in reverse order is the intended design (EEXPR-90 two-phase was reverted) | Info |
| 19 | **Verified** | Status determination priority: WAITING > COMPLETED > FAILED > PARTIAL_FAILURE | Info |
