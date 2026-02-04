<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-44-11-backend-clean-copy-signed-documents.md    ║
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

# Backend: Clean Up Copy Signed Documents Endpoint

## Objective

Make the `POST /admin/peo/tech_ops/entity_transfer/copy_signed_documents` endpoint production-ready by removing "DO NOT MERGE" markers.

This endpoint provides manual document attachment for TechOps scenarios where the execute endpoint was run with `skipDocumentSteps: true` (default) and signed documents need to be attached afterward.

## Implementation Steps

### Step 1: Remove "DO NOT MERGE" comment

**File**: `controllers/admin/peo/tech_ops.ts` (~line 745)

Remove the `//TODO: do not merge this endpoint - its just for testing purposes` comment (or similar marker).

### Step 2: Review endpoint for debug artifacts

Check the endpoint body (~lines 757-853) for any `//todo REMOVE` debug logging or temporary code.

### Step 3: Verify endpoint documentation

Ensure the endpoint has a clear comment explaining its use case: manual fallback for attaching signed documents when the execute endpoint skipped document steps.

## Acceptance Criteria

- "DO NOT MERGE" / testing-only markers removed
- No debug logging artifacts remain
- Endpoint is functionally unchanged (no logic changes)
- Clear documentation of its role as a manual fallback

## Testing

- Verify no TypeScript compilation errors
