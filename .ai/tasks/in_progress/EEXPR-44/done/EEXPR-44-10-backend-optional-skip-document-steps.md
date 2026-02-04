<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-44-10-backend-optional-skip-document-steps.md   ║
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

# Backend: Make skipDocumentSteps Optional on Execute Endpoint

## Objective

Enable the TechOps execute endpoint (`POST /admin/peo/tech_ops/entity_transfer`) to optionally run document signature validation (Step 3) and document attachment (Step 10) by making `skipDocumentSteps` a configurable request body parameter instead of hardcoded `true`.

This is the key change that enables the two-phase TechOps workflow:
1. `POST /create_doc_requirements` → creates documents for signing
2. Wait for employee to sign
3. `POST /entity_transfer` with `skipDocumentSteps: false` → runs full pipeline including document steps

## Implementation Steps

### Step 1: Add `skipDocumentSteps` to Joi validation schema

**File**: `controllers/admin/peo/tech_ops.ts` (~lines 377-420)

Find the Joi schema for the execute endpoint request body and add:

```javascript
skipDocumentSteps: Joi.boolean().optional().default(true),
```

### Step 2: Replace hardcoded assignment

**File**: `controllers/admin/peo/tech_ops.ts` (~line 441)

**Before**:
```typescript
// skipping a step that is not relevant for tech ops endpoint execution
transferItem.skipDocumentSteps = true;
```

**After**:
```typescript
transferItem.skipDocumentSteps = body.skipDocumentSteps ?? true;
```

## Acceptance Criteria

- `skipDocumentSteps` accepted as optional boolean in request body
- Default value is `true` (backward compatible — existing callers unaffected)
- When `false`: Step 3 (CheckSignaturesSanityStep) validates all signatures are SIGNED, Step 10 (AttachSignedDocumentsStep) attaches signed documents
- When `true` or omitted: current behavior preserved (steps skipped)
- No TypeScript compilation errors

## Testing

1. Deploy to Giger
2. Test backward compat: `POST /entity_transfer` without `skipDocumentSteps` → should work as before (skips doc steps)
3. Test new flow:
   a. `POST /create_doc_requirements` for a contract
   b. Sign documents as employee
   c. `POST /entity_transfer` with `skipDocumentSteps: false` → should validate signatures and attach signed docs
