<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-44-9-backend-remove-debug-logging.md            ║
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

# Backend: Remove Debug Logging from AttachSignedDocumentsStep

## Objective

Clean up temporary debug logging (`//todo REMOVE`) from the `attachSignedDocumentsFromDocumentRequests()` method in `AttachSignedDocumentsStep`.

## Implementation Steps

### Step 1: Remove debug logs

**File**: `services/peo/entity_transfer/steps/attach_signed_documents_step.ts`

Remove three `//todo REMOVE` debug log blocks:

1. **~line 497-501**: Debug log of full document request response
2. **~line 504-508**: Debug log of document request object
3. **~line 521-526**: Debug log of document submission and signed file

Keep the existing INFO-level logs that provide meaningful operational information (e.g., "Fetching signed document", "Found signed document, attaching").

## Acceptance Criteria

- All `//todo REMOVE` markers and their associated debug log statements removed
- Meaningful operational logs preserved
- No functional changes

## Testing

- Verify no TypeScript compilation errors
