<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-129-4-api-endpoints.md                        ║
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

# Phase 4: API Endpoints & Contracts

## Objective

Compare the TDD's 5 endpoint definitions against actual route registrations, request validation schemas, and response shapes. Identify any new endpoints (e.g., tech ops admin endpoint) not in the TDD.

## TDD Sections Under Review

1. **`POST /peo-employee-transfers`** — create transfer (request body, response shape, business logic)
2. **`GET /legal-entities/{id}/transfer-resources`** — fetch destination resources
3. **`GET /peo-employee-transfers/entities/{source_entity_public_id}`** — list transfers
4. **`PUT /peo-employee-transfers/{id}/sign`** — sign agreement
5. **`POST /peo-employee-transfers/{id}/cancel`** — cancel transfer
6. **Frontend Integration sequence diagram**

## Pre-Implementation

Before starting, launch an **exploration agent** to:
- Find route definitions for entity transfer endpoints in `backend/`
- Find request validation schemas (Joi/Zod)
- Find response serialization/formatting logic
- Look for the tech ops admin endpoint (`POST /admin/peo/tech_ops/entity_transfer/create`)
- Check EEXPR-13 task docs for POST endpoint implementation details
- Check PEOCM-792-3 docs for transfer resources 404 fix

## Implementation Steps

### Step 1: Verify POST /peo-employee-transfers

Compare TDD against code:
- Request body fields — are all fields still the same? (e.g., `newPeoContractOid` vs `base_contract_oid`)
- Response shape — does it match the nested structure in TDD?
- Business logic steps (validation, underwriting request creation, agreement generation)
- Status after creation — TDD says SCHEDULED but lifecycle says DRAFT first

### Step 2: Verify GET /transfer-resources

- Response fields — TDD lists benefitGroups, employmentPayrollSettingIds, ptoPolicies, workLocations, jobCodes, teams
- PEOCM-792-3 fixed work location labels — verify the fix is reflected
- Are label formats correct?

### Step 3: Verify GET /peo-employee-transfers/entities/{id}

- Response shape — does it return an array of transfers?
- Nested entity, item, and signature structures
- Pagination or filtering?

### Step 4: Verify PUT /sign endpoint

- Request format (empty body vs with data)
- Response shape
- Does it handle both transfer-level and item-level signatures now?

### Step 5: Verify POST /cancel endpoint

- Allowed statuses for cancellation
- Response shape

### Step 6: Identify endpoints NOT in the TDD

Known candidates:
- `POST /admin/peo/tech_ops/entity_transfer/create` (tech ops endpoint from e2e testing guide)
- Any signature-related endpoints from EEXPR-44
- Public API endpoint from EEXPR-13-7

### Step 7: Document findings

For each endpoint: method, path, request/response diff, business logic changes.

## Acceptance Criteria

- [ ] All 5 TDD endpoints verified against route definitions
- [ ] Request body schemas compared field-by-field
- [ ] Response shapes compared against actual serialization
- [ ] New endpoints not in TDD documented
- [ ] Frontend integration sequence accuracy checked
- [ ] Findings report created

## Notes

- The TDD's POST endpoint response shows `status: "DRAFT"` but the business logic section says it creates with `SCHEDULED` — this internal inconsistency should be flagged
- The tech ops admin endpoint is documented in the e2e testing guide but not the TDD
- EEXPR-13-7 implemented a public API endpoint
