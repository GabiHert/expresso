<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-129-6-business-logic.md                       ║
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

# Phase 6: Business Logic & Edge Cases

## Objective

Compare the TDD's business logic descriptions against actual implementation. Focus on effective date calculation (removed), underwriting workflow, PTO handling, rollback compensation chain, and cron job behavior.

## TDD Sections Under Review

1. **PrismHR Cross-Hire Integration** logic
2. **Underwriting Workflow for Missing Resources** (two-phase approach, force-complete, dynamic lookup)
3. **Rollback** compensation chain (steps 1-6.5 in TDD)
4. **Time-Off (PTO) Policy Handling** (UpdateTimeOffEmployment, AssignPtoPolicy)
5. **Effective date** calculation (TDD: "automatically calculated as end of source entity's current pay cycle")
6. **Batch Processing Strategy** (50 transfers per run, distributed locking)

## Pre-Implementation

Before starting, launch an **exploration agent** to:
- Read the cron job / scheduled task implementation
- Find effective date logic (or its absence after EEXPR-13-14)
- Find underwriting workflow code (ForceCompleteUnderwriting step)
- Find rollback/compensate methods across all steps
- Read EEXPR-90 task docs (CreateContractStep rollback fix)
- Find PTO-related steps (UpdateTimeOffEmployment, AssignPtoPolicy)

## Implementation Steps

### Step 1: Verify effective date logic

**Known change**: EEXPR-13-14 removed effective date auto-calculation.

TDD claims:
- "effective_date automatically calculated as end of source entity's current pay cycle"
- "Admins cannot manually select transfer date"

What's the actual behavior now? Is effectiveDate provided by the caller? Is it nullable (EEXPR-44-4)?

### Step 2: Verify underwriting workflow

TDD describes a two-phase approach with force-complete fallback. Verify:
- Does the "dynamic lookup by code" approach still hold?
- Is force-complete still the fallback?
- Does WAITING_FOR_RESOURCES still work as described?
- Are underwriting request IDs stored or looked up dynamically?

### Step 3: Verify rollback compensation chain

TDD describes rollback for steps in reverse order:
- Step 6.5: Unassign PTO policy
- Step 6: Revert time-off employment entity
- Step 5: Delete compliance document submissions
- Step 4: Delete created contract

With the new step numbering (15 steps), map the actual rollback chain. Also verify EEXPR-90 fix.

### Step 4: Verify PTO handling

TDD describes:
1. UpdateTimeOffEmployment: Updates legal entity pointer
2. AssignPtoPolicy: Applies destination PTO policy
3. Balance preserved (tied to employee profile)

Verify this is still accurate.

### Step 5: Verify cron job behavior

TDD describes:
- Batch of 50 transfers per run
- Pagination with LIMIT 50
- Sequential processing
- Distributed locking

Verify actual cron job implementation.

### Step 6: Verify cross-hire integration

TDD describes the PrismHR cross-hire call parameters. Verify:
- What data is sent to PEO microservice
- What response is expected
- How the new Prism employee ID is stored

### Step 7: Document findings

## Acceptance Criteria

- [ ] Effective date logic current state documented
- [ ] Underwriting workflow verified against code
- [ ] Rollback chain mapped to actual step numbers
- [ ] EEXPR-90 rollback fix verified
- [ ] PTO handling verified
- [ ] Cron job behavior verified
- [ ] Cross-hire integration verified
- [ ] Findings report created

## Notes

- Effective date is the single most impactful change — it affects lifecycle, scheduling, and cron job logic
- Rollback step numbers in TDD are definitely wrong if step count changed from 11 to 15
- EEXPR-95 (fix tech ops status update) may also affect business logic around status determination
