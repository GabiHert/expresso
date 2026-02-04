<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/in_progress/EEXPR-129/                      ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)          ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                 ║
║ 4. Work on ONE item at a time from todo/                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

# EEXPR-129: Review and Update Entity Transfer TDD

## Problem Statement

The PEO Employee Entity Transfer TDD document is outdated. Multiple implementation tickets (EEXPR-13, EEXPR-44, EEXPR-90, EEXPR-95, EEXPR-124, etc.) have changed the architecture, data model, API contracts, and business logic since the TDD was written. The document needs a systematic review comparing each section against the actual source code, completed task documentation, and in-progress work to identify and correct all discrepancies.

## Acceptance Criteria

- Each phase produces a findings report listing specific discrepancies between TDD and implementation
- Discrepancies are categorized as: **Incorrect** (TDD says X, code does Y), **Missing** (code has X, TDD doesn't mention it), **Obsolete** (TDD describes X which was removed)
- TDD sections are updated or annotated with corrections after each phase review
- No known inaccurate information remains in the TDD after all phases complete

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| EEXPR-129-1 | Phase 1: State Machines & Lifecycle | backend, peo | todo |
| EEXPR-129-2 | Phase 2: Step-Based Execution Pipeline | backend | todo |
| EEXPR-129-3 | Phase 3: Data Model | backend, peo | todo |
| EEXPR-129-4 | Phase 4: API Endpoints & Contracts | backend | todo |
| EEXPR-129-5 | Phase 5: Signatures & Documents Flow | backend, peo | todo |
| EEXPR-129-6 | Phase 6: Business Logic & Edge Cases | backend, peo | todo |
| EEXPR-129-7 | Phase 7: Open Questions, Risks & Operational | docs | todo |

## Branches

**Note:** This is a documentation review task. No code branches are needed. All output goes into `.ai/docs/backend/entity_transfers/`.

## Technical Context

### Key Source Code Locations

- **Backend entity transfer service**: `backend/services/peo/entity_transfer/`
- **Transfer steps**: `backend/services/peo/entity_transfer/steps/`
- **Transfer types**: `backend/services/peo/entity_transfer/types.ts`
- **PEO entity transfer models**: `peo/src/models/entityTransfer/`
- **PEO migrations**: `peo/migrations/`

### Key Documentation Locations

- **Entity transfer docs**: `.ai/docs/backend/entity_transfers/`
- **E2E testing guide**: `.ai/docs/backend/entity_transfers/e2e-testing-guide.md`
- **Deployment history**: `.ai/docs/backend/entity_transfers/deployments.md`
- **EEXPR-44 explorations**: `.ai/docs/backend/entity_transfers/explorations/`
- **Completed tasks**: `.ai/tasks/done/` (EEXPR-12, EEXPR-64, EEXPR-67, EEXPR-94, etc.)
- **In-progress tasks**: `.ai/tasks/in_progress/` (EEXPR-13, EEXPR-44)

### Known Changes Since TDD Was Written

- **EEXPR-13-14**: Removed effective date auto-calculation from pay cycle
- **EEXPR-44**: Custom documents integration (Arbitration Agreement, WSE Notice via Document Requests framework + JetStream)
- **EEXPR-44-4**: Made effectiveDate nullable in PEO
- **EEXPR-90**: Fixed CreateContractStep rollback (null vs undefined)
- **EEXPR-95**: Fixed tech ops entity transfer status update
- **EEXPR-124**: Database migration changes
- **Deployment docs**: Dec 2025 production deployment with 15-step architecture (vs 11 in TDD)
- **PEOCM-792-3**: Transfer resources 404 error fix

## Implementation Approach

For each phase:
1. **Read** the relevant TDD section thoroughly
2. **Explore** the actual source code for that area using Explore agents
3. **Compare** TDD claims against code behavior
4. **Cross-reference** with task docs (done/in_progress) for context on why changes were made
5. **Document** findings as a structured report
6. **Propose** specific TDD text corrections

## Risks & Considerations

- Source code may have uncommitted or in-progress changes that haven't been documented yet
- Some TDD sections may reference planned features that were descoped
- The TDD may have informal updates not tracked in version control

## Testing Strategy

N/A - This is a documentation review task. Verification is done by comparing TDD text against source code and existing documentation.

## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.

## References

- [PEOCM-381 Epic](https://letsdeel.atlassian.net/browse/PEOCM-381)
- Entity transfer docs: `.ai/docs/backend/entity_transfers/`
- TDD source: provided inline in task creation conversation
