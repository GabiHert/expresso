# Phase 7 Findings: Open Questions, Risks & Operational

**Task**: EEXPR-129 | **Date**: 2026-02-04 | **Status**: Complete

---

## Summary

The TDD's operational sections (open questions, risks, milestones, test plan) are **partially outdated**. Several open questions have been answered by implementation (document signing, step tracking, admin authorization), while others remain genuinely open (dry run mode, audit logging, concurrency protection). The milestone timeline doesn't match reality — Milestone 1 shipped Dec 2025, Milestone 2 is still in progress. The sanity check metrics have no monitoring implementation, and the test plan marked "TO BE COMPLETED" now has an E2E testing guide but no automated E2E tests.

---

## 1. Open Questions Status

### Question 1: Entity-Specific Document Signing

**TDD asks**: How should entity-specific document signing (Arbitration Agreement, WSE Notice) be handled?

**Status**: ANSWERED by EEXPR-44

**Answer**: Document Requests framework with global templates (`PEO_ENTITY_TRANSFER_ARBITRATION_AGREEMENT`, `PEO_ENTITY_TRANSFER_WSE_NOTICE`). Documents created via `TransferDocumentService.createDocumentRequirements()`, employee signs in compliance documents view, JetStream consumer processes signing events. See Phase 5 report for full details.

---

### Question 2: Failed Transfer Cleanup Process

**TDD asks**: What is the cleanup process for failed transfers?

**Status**: PARTIALLY ANSWERED

**What exists**:
- **Before PONR** (Steps 1-10): Automatic rollback in reverse order within single transaction. CreateContract rollback hard-deletes all related records (WorkStatements, UserContracts, OnboardingSteps, Events, Guarantees, PEO contract, Contract).
- **After PONR** (Steps 11-13): No automatic rollback. Logs warning requiring manual intervention:
  1. Terminate new employee in destination entity (PrismHR)
  2. Reactivate old employee in source entity
  3. Manually delete Deel contracts if needed

**What's missing**: No formal runbook or ops playbook for post-PONR failures. The cleanup steps are documented in code comments and log messages but not in an operational document.

---

### Question 3: Concurrency Protection

**TDD says**: Partial answer — "runtime check" to prevent duplicate transfers.

**Status**: NOT FULLY IMPLEMENTED

**What exists**:
- Database transactions for step execution atomicity (Sequelize transactions)
- Feature flag gating (`isEntityTransferEnabled`)
- Status-based guards (only SCHEDULED transfers picked up by cron)

**What's missing**:
- No advisory locks (`SELECT ... FOR UPDATE`)
- No distributed locking (Redis, mutex)
- No pessimistic row-level locks on contracts being transferred
- No explicit duplicate transfer prevention for the same employee
- **Risk**: If two transfers target the same employee concurrently, both could proceed past sanity checks before either commits

**Cron processor** runs transfers sequentially within a single instance, but there's no protection against multiple cron instances running simultaneously.

---

### Question 4: Pay Cycle Alignment

**TDD says**: "effective_date automatically calculated as end of source entity's current pay cycle"

**Status**: OBSOLETE

The `EffectiveDateService` was deleted in EEXPR-13-14. Effective date is now provided by the caller in the request body. There is a TODO in code (`// TODO [EEXPR-44]: effectiveDate will eventually be removed from request - calculated in a separate step`) suggesting future reintroduction of calculation, but this is not yet implemented.

EEXPR-44-4 made `effectiveDate` nullable in PEO for the new creation flow where it may be calculated later.

---

### Question 5: Step Execution Tracking

**TDD asks**: How is step execution tracked for resume?

**Status**: IMPLEMENTED

**Implementation**:
- `resumeFromStep` field on `peo_employee_transfer_items` table (VARCHAR 100, nullable)
- When a step returns `HALT_SUCCESS`, the step name is saved to `resumeFromStep`
- On cron retry, `TransferStepExecutor` calculates starting index from `resumeFromStep` and skips completed steps
- `newContractOid` also tracked for resume scenarios (contract may already exist)
- Steps that can halt: ForceCompleteUnderwritingStep, UpdateTimeOffEmploymentStep

---

### Question 6: Admin Authorization

**TDD asks**: What permission model for admin access?

**Status**: IMPLEMENTED

**Implementation**:
- Tech ops endpoints: `admin:contracts.read` (GET endpoints) and `admin:contracts.write` (POST/execute endpoint)
- Enforced via `@Middleware((app) => app.permissions(...))` decorators
- Public API (EEXPR-13): User JWT with `ROLES.CLIENT` + `validatePEOLegalEntityAccessMiddleware()`
- Service-level: Feature flag check `isEntityTransferEnabled(organizationId)`

**Gap**: No requester identity validation at service level beyond the feature flag. The `requesterProfilePublicId` is stored in the transfer record but not verified against the authenticated user.

---

### Question 7: Admin Turnover

**TDD asks**: What happens if the admin who initiated a transfer leaves?

**Status**: NOT ADDRESSED

The `requesterProfilePublicId` is stored in the transfer but there is no delegation mechanism. If the initiating admin is deactivated, the transfer continues to process (cron-driven, no admin involvement needed after creation). However, there's no way to reassign ownership of a pending transfer.

---

### Question 8: Dry Run Mode

**TDD asks**: Can transfers be previewed without execution?

**Status**: NOT IMPLEMENTED

No dry run, preview, or validation-only mode exists. Transfers execute immediately with database persistence. The sanity check steps (1-5) provide some pre-validation, but they run as part of the actual execution pipeline, not as a separate preview.

---

### Question 9: Audit Logging

**TDD asks**: Is transfer activity audited?

**Status**: PARTIAL

**What exists**:
- Structured operational logging throughout all steps (`this.log.info()`, `this.log.error()`)
- Transfer ID, item ID, contract IDs, step names, timing, and error details logged
- Rollback operations logged per step
- Logs shipped to centralized logging system (stdout)

**What's missing**:
- No immutable audit trail table
- No dedicated audit log with who-what-when-outcome records
- No Datadog metrics or dashboards
- No automated alerting on transfer failures
- Logs are operational, not compliance-grade audit records

---

## 2. Risks Review

### Risk 1: PrismHR API Failures

**TDD risk**: PrismHR API may fail during cross-hire, causing partial state.

**Actual mitigation**:
- SanityCheckResourcesExistStep (Step 5) verifies resources before PONR
- CrossHireStep accepts status 200 or 202
- `crossHireCompleted` flag prevents rollback of contract if cross-hire succeeded
- Manual cleanup required if cross-hire succeeds but later steps fail

**Did it materialize?** Yes — production issues documented:
- EEXPR-94: Replication lag caused intermittent failures (fixed with master read after write)
- EEXPR-59: Missing employment records (19/20 contracts affected, fixed by adding jobTitle lookup)

---

### Risk 2: Data Inconsistency

**TDD risk**: Partial transfer state between Deel and PrismHR systems.

**Actual mitigation**:
- Single-transaction rollback for pre-PONR steps
- Outbox event pattern for async rollback operations (file submissions, contract deletion)
- `crossHireCompleted` guard prevents contract deletion after PONR

**Did it materialize?** Yes:
- EEXPR-64: Seniority dates not copied — employee lost 1.5 years of seniority. In progress, not yet fixed.
- EEXPR-90: Rollback itself had bugs (null vs undefined, FK constraints). Fixed.

---

### Risk 3: Performance Under Load

**TDD risk**: Transfer processing may be too slow for large batches.

**Actual mitigation**:
- Sequential processing with LIMIT 100
- No parallel execution (deliberate choice for simplicity)
- No performance monitoring or metrics

**Did it materialize?** Unknown — no monitoring exists to measure. Large document sets may slow ShareComplianceDocuments step.

---

### Risk 4: Regulatory Compliance

**TDD risk**: Compliance documents may not transfer correctly.

**Actual mitigation**:
- ShareComplianceDocumentsStep copies portable documents
- Explicitly excludes entity-specific agreements (Arbitration, WSE Notice) — these require re-signing
- CopyI9DataStep transfers I-9 verification data
- EEXPR-44 adds proper document signing via Document Requests framework

**Did it materialize?** Partially — the initial implementation did not handle entity-specific documents. EEXPR-44 addresses this (not yet merged).

---

### Risk 5: Rollback Complexity

**TDD risk**: Multi-step rollback may have cascading failures.

**Actual mitigation**:
- Single-transaction rollback (EEXPR-90 two-phase approach was reverted)
- Individual step rollback failures captured but don't stop subsequent rollbacks
- Post-PONR: no automatic rollback, manual intervention required

**Did it materialize?** Yes — EEXPR-90 documented cascading rollback failures:
- null vs undefined caused Zod validation errors
- FK constraints prevented file submission deletion
- Employment records blocked contract deletion
All three issues were fixed.

---

### New Risks Discovered (Not in TDD)

| Risk | Description | Status |
|------|-------------|--------|
| **Replication lag** | Read-after-write hits replica before sync | Fixed (EEXPR-94) |
| **EMS dependency** | Employment Management System may not be ready | Mitigated with HALT_SUCCESS retry |
| **No concurrency protection** | Multiple transfers on same employee possible | Open risk |
| **No monitoring** | No metrics, dashboards, or alerts | Open risk |
| **Seniority data loss** | Hire dates overwritten during transfer | In progress (EEXPR-64) |

---

## 3. Milestones Review

**TDD defines 2 milestones**:

| Milestone | TDD Description | Actual Status |
|-----------|-----------------|---------------|
| 1: Core Backend Engine (API-Only) | Transfer pipeline, cron job, rollback | **ACHIEVED** — Dec 18, 2025 production deployment |
| 2: Frontend UI & Signature Workflow | UI for creating transfers, signature collection | **IN PROGRESS** — EEXPR-44 (custom documents) + EEXPR-13 (POST endpoint) |

**Milestone 1 delivery details**:
- Deployed via 4 cherry-pick PRs across backend and PEO repos
- 332 unit tests included
- 11-step pipeline at deployment (now 13 with CopyI9Data + UpdateNewContractStatus)
- Tech ops admin endpoints for execution and monitoring

**Milestone 2 current state**:
- EEXPR-44: 11/11 work items complete, PR #116580 open
- EEXPR-13: 7/10 work items complete (remaining: underwriting request creation + POST endpoint wiring)
- No frontend UI work started (separate team/timeline)

---

## 4. Sanity Checks Review

**TDD defines 3 sanity check metrics**:

| Check | Target | Monitoring Status |
|-------|--------|-------------------|
| Transfer Success Rate | >95% | **NOT MONITORED** — no metrics, no dashboards |
| Failures After PONR | <1% | **NOT MONITORED** — no metrics |
| Stuck in WAITING_FOR_RESOURCES | <48h | **NOT MONITORED** — no alerting |

**Reality**: No Datadog metrics, StatsD counters, or automated alerting exists for entity transfers. All telemetry is in structured logs only. There are no dashboards tracking these SLAs.

The code does log timing data (step durations), status transitions, and error details, but none of this is surfaced as actionable metrics.

---

## 5. Test Plan Review

**TDD says**: "TO BE COMPLETED"

**Actual state**:

| Testing Type | Status | Details |
|--------------|--------|---------|
| Unit tests | **332 tests deployed** | Comprehensive coverage of processor, steps, rollback |
| E2E testing guide | **EXISTS** | Step-by-step guide at `.ai/docs/backend/entity_transfers/e2e-testing-guide.md` |
| Automated E2E tests | **NOT IMPLEMENTED** | Manual testing only on Giger environments |
| Integration tests | **PARTIAL** | Test doubles for PEO service calls |

The E2E testing guide documents:
- Giger environment setup and service deployment
- Test data discovery SQL queries
- API request examples with expected responses
- 10-point verification checklist
- Common pitfalls table (wrong domain, token expiry, SQL targeting, etc.)

---

## 6. Rollout / Deployment Plan Review

**TDD describes**: Phased rollout with feature flags.

**Actual deployment** (Dec 18, 2025):

| Aspect | TDD Plan | Actual |
|--------|----------|--------|
| Strategy | Phased rollout | Cherry-pick PRs with dependency ordering |
| Feature flags | Yes | `ENTITY_TRANSFER_ENABLED` (organization-level) |
| Rollback plan | Mentioned | 3 levels: feature flag → endpoint disable → git revert |
| Deployment order | Not specified | PEO CP#1 → Backend CP#1 → PEO CP#2 → Backend CP#2 |

**Deployment order was critical**: Backend depends on PEO endpoints. Must deploy PEO first. Revert must happen in reverse order.

---

## 7. Affected Domains & Non-Goals Review

### Non-Goals That Became Goals

| TDD Non-Goal | Current Status |
|--------------|----------------|
| Frontend UI | Still a non-goal for backend team; separate team handles UI |
| Multi-entity transfers (batch) | Still a non-goal — one source → one destination per transfer |

### New Affected Domains (Not in TDD)

| Domain | How Affected |
|--------|-------------|
| Documents microservice | EEXPR-44 integrates Document Requests framework |
| Ops Workbench | ForceCompleteUnderwriting completes workbench tasks |
| EMS (Employment Management) | UpdateTimeOffEmploymentStep depends on EMS readiness |
| NATS/JetStream | Event-driven signature processing (EEXPR-44) |

---

## Findings Summary

| # | Category | Finding | Severity |
|---|----------|---------|----------|
| 1 | **Answered** | Open Q1 (Document Signing) resolved by EEXPR-44 Document Requests framework | Info |
| 2 | **Answered** | Open Q5 (Step Tracking) implemented via `resumeFromStep` field | Info |
| 3 | **Answered** | Open Q6 (Admin Auth) implemented via `admin:contracts.read/write` permissions | Info |
| 4 | **Partially Answered** | Open Q2 (Failed Cleanup) — pre-PONR automatic rollback exists, post-PONR requires manual intervention, no runbook | Medium |
| 5 | **Obsolete** | Open Q4 (Pay Cycle Alignment) — effective date auto-calculation removed | High |
| 6 | **Unanswered** | Open Q3 (Concurrency) — no advisory locks or distributed locking implemented | High |
| 7 | **Unanswered** | Open Q7 (Admin Turnover) — no delegation mechanism | Low |
| 8 | **Unanswered** | Open Q8 (Dry Run) — not implemented | Medium |
| 9 | **Partial** | Open Q9 (Audit Logging) — operational logs exist, no immutable audit table | Medium |
| 10 | **Incorrect** | Milestones timeline — Milestone 1 shipped Dec 2025, Milestone 2 still in progress | Medium |
| 11 | **Missing** | No monitoring, metrics, or dashboards for any of the 3 sanity check targets | High |
| 12 | **Missing** | Test plan "TO BE COMPLETED" — E2E guide exists but no automated E2E tests | Medium |
| 13 | **Missing** | 3-level rollback procedure (feature flag, endpoint disable, git revert) not in TDD | Medium |
| 14 | **Missing** | Production issues encountered (replication lag, missing employments, seniority loss) not documented in TDD | High |
| 15 | **Missing** | New affected domains (Documents microservice, Ops Workbench, EMS, NATS/JetStream) | Medium |
| 16 | **Missing** | Deployment dependency ordering (PEO before Backend) not documented | Low |
| 17 | **Verified** | Feature flag approach matches TDD (`ENTITY_TRANSFER_ENABLED`) | Info |
| 18 | **Verified** | Cherry-pick deployment strategy was used as planned | Info |
