<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-129-7-open-questions-risks.md                 ║
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
repo: docs
repo_path: /Users/gabriel.herter/Documents/Projects/deel/.ai/docs
branch: N/A (documentation review)
protected: false
---

# Phase 7: Open Questions, Risks & Operational

## Objective

Review the TDD's Open Questions, Risks, Milestones, Sanity Checks, Test Plan, and Rollout sections against what actually happened during implementation. Mark questions as answered, update risks with real-world findings, and reconcile milestones with the Dec 2025 production deployment.

## TDD Sections Under Review

1. **Open Questions** (9 questions)
2. **Risks** (5 risk categories)
3. **Milestones** (2 milestones)
4. **Sanity Checks** (3 checks)
5. **Test Plan** (marked "TO BE COMPLETED")
6. **Rollout / Deployment plan**
7. **Affected Domains**
8. **Impact** section
9. **Non-Goals** — any that became goals or changed

## Pre-Implementation

Before starting:
- Read `.ai/docs/backend/entity_transfers/deployments.md` for actual deployment history
- Read `.ai/docs/backend/entity_transfers/e2e-testing-guide.md` for testing reality
- Scan completed task docs in `.ai/tasks/done/` for answered questions
- Check `.ai/tasks/in_progress/EEXPR-13/` for open items

## Implementation Steps

### Step 1: Review Open Questions (1-9)

For each of the 9 open questions, determine status:

1. **Entity-Specific Document Signing** — Answered by EEXPR-44 (Document Requests framework)
2. **Failed Transfer Cleanup Process** — Is there a runbook now?
3. **Concurrency Protection** — TDD has partial answer ("runtime check"). What was implemented?
4. **Pay Cycle Alignment** — TDD has answer. Verify it matches implementation.
5. **Step Execution Tracking** — Was resume_from_step implemented? (It's in the items table)
6. **Admin Authorization** — What permission model was implemented?
7. **Admin Turnover** — Was this addressed?
8. **Dry Run Mode** — Was this implemented?
9. **Audit Logging** — Was this enabled?

### Step 2: Review Risks

For each of the 5 risks, check if:
- The risk materialized during implementation
- The mitigation was implemented as described
- New risks were discovered

Also check deployment docs for production issues encountered.

### Step 3: Review Milestones

TDD defines 2 milestones:
- Milestone 1: Core Backend Engine (API-Only)
- Milestone 2: Frontend UI & Signature Workflow

Compare against actual delivery timeline from deployment docs (Dec 2025 deployment).

### Step 4: Review Sanity Checks

TDD defines 3 sanity checks:
1. Transfer Success Rate (>95%)
2. Failures After PONR (<1%)
3. Stuck in WAITING_FOR_RESOURCES (<48h)

Are these implemented? What monitoring exists?

### Step 5: Review Test Plan

TDD says "TO BE COMPLETED". The e2e testing guide exists now. Reconcile.

### Step 6: Review Rollout / Deployment

Compare TDD's planned rollout against actual deployment history documented in `deployments.md`.

### Step 7: Review Affected Domains and Non-Goals

Check if any non-goals became goals or if new affected domains were discovered.

### Step 8: Document findings

## Acceptance Criteria

- [ ] All 9 open questions marked as answered/unanswered with current status
- [ ] All 5 risks reviewed against actual implementation experience
- [ ] Milestones compared to actual delivery
- [ ] Sanity checks implementation status verified
- [ ] Test plan gap analysis complete
- [ ] Deployment plan compared to actual deployment
- [ ] Findings report created

## Notes

- This phase is primarily documentation-vs-documentation comparison (less code reading)
- The deployment docs are the primary source of truth for what actually shipped
- Some open questions may still be genuinely open — that's fine, just document current status
