<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-129-1-state-machines-lifecycle.md              ║
║ TASK: EEXPR-129                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                 ║
║ 2. Update status.yaml with new status                           ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml              ║
║ 5. Update task README with any learnings                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
# Repository Context (EEXPR-129)
repo: backend, peo
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend, /Users/gabriel.herter/Documents/Projects/deel/peo
branch: N/A (documentation review)
protected: false
---

# Phase 1: State Machines & Lifecycle

## Objective

Compare the TDD's state machine definitions and lifecycle description against the actual implementation to identify discrepancies in statuses, transitions, and workflow logic.

## TDD Sections Under Review

1. **Transfer State Machine** (statuses: DRAFT, PENDING_SIGNATURES, SCHEDULED, PROCESSING, COMPLETED, PARTIAL_FAILURE, FAILED, CANCELLED)
2. **Transfer Item State Machine** (statuses: PENDING, PROCESSING, WAITING_FOR_RESOURCES, COMPLETED, FAILED)
3. **Lifecycle** steps 1-4 (Creation, Signature Collection, Scheduling, Execution)
4. **Effective date** calculation logic (TDD says "automatically set to end of source entity's current pay cycle")

## Pre-Implementation

Before starting, launch an **exploration agent** to:
- Find all status enums/constants in `backend/services/peo/entity_transfer/`
- Find transfer state transitions in the service layer
- Check `peo/src/models/entityTransfer/` for status definitions
- Look at EEXPR-13-14 task docs for effective date removal context

## Implementation Steps

### Step 1: Extract actual Transfer statuses from source code

**Files to check**:
- `backend/services/peo/entity_transfer/types.ts` — status enums
- `backend/services/peo/entity_transfer/entity_transfer_service.ts` — state transitions
- `peo/src/models/entityTransfer/` — PEO-side status definitions

**Compare**: Are the 8 transfer statuses in the TDD (DRAFT, PENDING_SIGNATURES, SCHEDULED, PROCESSING, COMPLETED, PARTIAL_FAILURE, FAILED, CANCELLED) still accurate? Any new or renamed statuses?

### Step 2: Extract actual Transfer Item statuses from source code

**Compare**: Are the 5 item statuses in the TDD (PENDING, PROCESSING, WAITING_FOR_RESOURCES, COMPLETED, FAILED) still accurate?

### Step 3: Review lifecycle steps

**Key change to verify**: EEXPR-13-14 removed effective date auto-calculation. The TDD says:
> "effective_date automatically calculated as end of source entity's current pay cycle"
> "Admins cannot manually select transfer date"

Verify what the current behavior is.

### Step 4: Review state transitions

Check the actual transition logic in the service. The TDD describes:
- DRAFT -> PENDING_SIGNATURES (on admin submit)
- PENDING_SIGNATURES -> SCHEDULED (all signatures collected)
- SCHEDULED -> PROCESSING (cron job on effective date)
- etc.

Verify if these transitions match reality, especially around the signature flow changes from EEXPR-44.

### Step 5: Document findings

Create a findings report listing each discrepancy found.

## Acceptance Criteria

- [ ] All transfer statuses verified against source code
- [ ] All transfer item statuses verified against source code
- [ ] Lifecycle steps compared and discrepancies noted
- [ ] Effective date logic current state documented
- [ ] State transitions verified against code
- [ ] Findings report created with categorized discrepancies

## Notes

- EEXPR-44 custom documents integration may have changed the signature flow and thus affected transitions
- The EEXPR-13-14 task explicitly removed effective date calculation — this is a known TDD inaccuracy
