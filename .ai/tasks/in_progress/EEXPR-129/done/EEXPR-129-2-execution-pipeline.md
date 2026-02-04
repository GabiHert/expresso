<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-129-2-execution-pipeline.md                   ║
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
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: N/A (documentation review)
protected: false
---

# Phase 2: Step-Based Execution Pipeline

## Objective

Compare the TDD's 11-step execution pipeline against the actual implementation. The deployment docs reference 15 steps — identify all steps, their order, rollback behavior, and the point-of-no-return positioning.

## TDD Sections Under Review

1. **Step table** (11 steps: Sanity Checks x2, Underwriting x3, Create Contract, Share Compliance, Update Time-Off, Assign PTO, Cross-Hire, Terminate Old Contract)
2. **Rollback logic** per step (which steps have auto-rollback)
3. **Point of No Return** (TDD says step 10 = Cross-Hire)
4. **Transfer Steps Flow diagram**

## Pre-Implementation

Before starting, launch an **exploration agent** to:
- List all files in `backend/services/peo/entity_transfer/steps/`
- Read the step pipeline executor / orchestrator
- Check step ordering constants or configuration
- Look at EEXPR-90 task docs for rollback changes
- Read `.ai/docs/backend/entity_transfers/deployments.md` for the 15-step reference

## Implementation Steps

### Step 1: List all actual transfer steps

**Directory**: `backend/services/peo/entity_transfer/steps/`

List every step file, extract:
- Step name
- Step order/position
- Whether it has rollback (compensate) logic
- Whether it's a validation, database, or external step

### Step 2: Compare step count and ordering

TDD says 11 steps. Deployment docs say 15. Find the truth:
- Which steps were added?
- Were any steps split or renamed?
- What's the actual execution order?

### Step 3: Review rollback logic

The TDD describes rollback for steps 4-9 (contract creation through PTO). EEXPR-90 fixed CreateContractStep rollback (null vs undefined). Verify:
- Which steps actually have compensate/rollback methods?
- Is the rollback chain correct in the TDD?
- What changed with EEXPR-90?

### Step 4: Verify Point of No Return

TDD says step 10 (Cross-Hire) is the PONR. With 15 steps, what number is it now? Is the concept still the same?

### Step 5: Document findings

Create a findings report with:
- Complete step list (actual vs TDD)
- Rollback accuracy per step
- PONR position
- New steps not in TDD

## Acceptance Criteria

- [ ] Complete list of actual steps with order numbers
- [ ] Each step compared to TDD's description
- [ ] Rollback logic verified per step
- [ ] Point of no return position confirmed
- [ ] New/changed steps documented
- [ ] Findings report created

## Notes

- EEXPR-44 custom documents integration likely added document-related steps (AttachSignedDocumentsStep)
- The 3-phase architecture from EEXPR-44 exploration (creation, async signature, 15-step execution) should be the reference
- EEXPR-90 specifically fixed null vs undefined in CreateContractStep rollback
