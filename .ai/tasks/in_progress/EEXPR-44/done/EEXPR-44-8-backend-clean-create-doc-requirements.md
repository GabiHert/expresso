<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-44-8-backend-clean-create-doc-requirements.md   ║
║ TASK: EEXPR-44                                                   ║
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
# Repository Context (EEXPR-44)
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/worktrees/EEXPR-44/backend
branch: EEXPR-44
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/worktrees/EEXPR-44/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Backend: Clean Up Create Doc Requirements Endpoint

## Objective

Make the `POST /admin/peo/tech_ops/entity_transfer/create_doc_requirements` endpoint production-ready by removing "DO NOT MERGE" markers and testing-only comments.

This endpoint creates document requirements (Arbitration Agreement, WSE Notice) via the Documents microservice, making them available for employee signing. It is the first phase of the two-phase TechOps workflow:

1. `POST /create_doc_requirements` → creates documents for signing
2. Wait for employee to sign
3. `POST /entity_transfer` (execute with `skipDocumentSteps: false`) → runs full pipeline

## Implementation Steps

### Step 1: Remove "DO NOT MERGE" comment

**File**: `controllers/admin/peo/tech_ops.ts` (~line 647)

Remove the `// TODO: do not merge this endpoint - its just for testing purposes` comment (or similar marker).

### Step 2: Review endpoint for debug artifacts

Check the endpoint body (~lines 648-743) for any `//todo REMOVE` debug logging or temporary code that should be cleaned up before merging.

### Step 3: Verify endpoint documentation

Ensure the endpoint has a clear comment/docblock explaining its production use case as part of the two-phase TechOps workflow.

## Acceptance Criteria

- "DO NOT MERGE" / testing-only markers removed
- No debug logging artifacts remain
- Endpoint is functionally unchanged (no logic changes)
- Clear documentation of its role in the two-phase workflow

## Testing

- Deploy to Giger and verify endpoint still works: creates document requests in Documents microservice
