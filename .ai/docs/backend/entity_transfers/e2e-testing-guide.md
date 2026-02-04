<!--
LAYER: DOMAIN
STATUS: Current
NAVIGATION:
  Parent: .ai/docs/backend/entity_transfers/README.md
  Related: .ai/docs/backend/entity_transfers/deployments.md
  Index: .ai/INDEX.md
-->

# Entity Transfer E2E Testing Guide

Step-by-step guide for testing entity transfer creation end-to-end on a Giger preview environment. Originally created during EEXPR-44 validation (replace mock repository with PEO service calls, remove effectiveDate requirement).

---

## Overview

- **What**: How to set up and execute an E2E test of the entity transfer creation flow
- **Why**: Validates that backend, PEO, and Documents services work together correctly for creating transfers with real signatures
- **When**: After deploying entity transfer changes to a Giger environment, before merging to main

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| Transfer | A request to move an employee between legal entities within the same organization |
| Transfer Item | One employee contract within a transfer (a transfer can have multiple items) |
| Transfer-level Signatures | Admin signatures blocking the whole transfer (stored in `peo_employee_transfer_signatures`) |
| Item-level Signatures | Per-item document signatures (stored in `peo_employee_transfer_item_signatures`) |
| Sanity Checks | Pre-flight validations across Deel DB, PEO, EMS, and Payroll before creating a transfer |
| Document Requirements | Custom document templates (e.g., Arbitration Agreement) created via the Documents microservice |

---

## Prerequisites

### Required Services on Giger

| Service | Branch | Why |
|---------|--------|-----|
| backend | Feature branch (e.g., `EEXPR-44`) | Entity transfer creation endpoint and client service |
| peo | Feature branch (e.g., `EEXPR-44`) | Transfer, signature, and item signature persistence |
| documents | Any (default/main is fine) | Document template creation for item-level signatures |

### Required Tools

| Tool | Purpose |
|------|---------|
| Admin token | JWT for the Giger environment (audience must match namespace) |
| SQL access | Port-forwarded or direct access to the Giger PostgreSQL database |
| API client | Postman MCP, curl, or any HTTP client |

---

## Step 1: Environment Setup

### 1a: Create or Identify a Giger Environment

Use the Giger UI or leed MCP to create an environment. Note the namespace (e.g., `dev-w268o9nc0f`).

### 1b: Deploy Services

Deploy all three services from the correct branches. Ensure they are healthy before proceeding.

### 1c: Determine API Base URL

```
https://www-dev-{namespace}.giger.training/deelapi
```

**Warning**: Do NOT use `https://api-dev-{namespace}.giger.training` -- this causes `jwt audience invalid` (401).

### 1d: Generate Admin Token

Generate an admin token for the environment. The token's `aud` claim must match the namespace exactly.

**Token expiry**: Tokens expire. If you get `jwt expired` (401), generate a new one.

---

## Step 2: Configure API Client

If using the Postman MCP:

```
/switch_env GIGER
/set_variable domain https://www-dev-{namespace}.giger.training/deelapi
/set_variable admin_token {your_token}
```

---

## Step 3: Find Test Data

All queries run against the **Giger environment's database**, not DEV or local. Ensure your SQL connection (port-forward) targets the correct environment.

### 3a: Find an Active PEO Contract

```sql
SELECT c.oid AS base_peo_contract_oid,
       c.id  AS contract_id,
       c.status,
       c.organization_id,
       c.client_legal_entity_id
FROM   contracts c
WHERE  c.contract_type = 'peo'
  AND  c.status = 'in_progress'
LIMIT  10;
```

Pick one row. Record:
- `oid` --> `basePeoContractOid`
- `organization_id` --> `organizationId`
- `client_legal_entity_id` --> used to find source LE

**Important**: The contract must be `contract_type = 'peo'`, NOT `'peo_csa'`.

### 3b: Find the Source Legal Entity

```sql
SELECT id, public_id, name
FROM   legal_entities
WHERE  id = {client_legal_entity_id};
```

Record `public_id` --> `sourceLegalEntityPublicId`.

### 3c: Find a Destination Legal Entity

Must be a **different** legal entity in the **same** organization:

```sql
SELECT le.id, le.public_id, le.name
FROM   legal_entities le
JOIN   client_legal_entities cle ON cle.legal_entity_id = le.id
JOIN   clients cl ON cl.id = cle.client_id
WHERE  cl.organization_id = {organization_id}
  AND  le.id != {client_legal_entity_id}
LIMIT  5;
```

Record `public_id` --> `destinationLegalEntityPublicId`.

### 3d: Find Destination Resources

Use the admin resources endpoint (preferred):

```
GET /admin/peo/tech_ops/legal-entities/{destinationLegalEntityPublicId}/transfer-resources
```

From the response, extract:

| Payload Field | Source in Response |
|---------------|-------------------|
| `newBenefitPrismGroupId` | Benefit group ID (string, e.g., `"1"`) |
| `newEmploymentPayrollSettingId` | Payroll setting ID (CUID format) |
| `newPtoPolicyId` | PTO policy UUID |
| `newWorkLocationId` | Work location UUID |
| `newPositionPublicId` | Position/job code UUID |

If the resources endpoint isn't available, query the DB directly:

```sql
-- Work locations
SELECT public_id FROM entity_work_locations
WHERE legal_entity_id = {destination_le_id} LIMIT 5;

-- Positions
SELECT public_id FROM peo_positions
WHERE legal_entity_id = {destination_le_id} LIMIT 5;

-- Payroll settings (in EMS / employment schema)
SELECT id FROM employment_payroll_settings
WHERE legal_entity_id = {destination_le_id} LIMIT 5;
```

### 3e: Find Requester Profile

Decode the admin JWT to get the `profile` claim, then:

```sql
SELECT public_id FROM profiles WHERE id = {profile_id_from_jwt};
```

Record `public_id` --> `requesterProfilePublicId`.

---

## Step 4: Execute Create Transfer

```
POST /admin/peo/tech_ops/entity_transfer/create
Authorization: Bearer {admin_token}
Content-Type: application/json
```

```json
{
  "organizationId": 191800,
  "requesterProfilePublicId": "3511d95c-5a10-4c18-a7e6-a60b3cca9495",
  "sourceLegalEntityPublicId": "5820581e-eda0-4ccb-943d-f646186fa98f",
  "destinationLegalEntityPublicId": "da55f341-5cfc-4129-be7a-5feea774591c",
  "contracts": [
    {
      "basePeoContractOid": "m47pwwd",
      "newBenefitPrismGroupId": "1",
      "newEmploymentPayrollSettingId": "cmiz2czgl000t018qc8zv786p",
      "newPtoPolicyId": "b8fcd795-ac8d-47a6-bb2f-da8e93777b4d",
      "newWorkLocationId": "84e768ee-87f7-456f-800d-7999ccdfb614",
      "newPositionPublicId": "8b25efdc-446e-498a-8832-c3b6c54ce994"
    }
  ]
}
```

**Note**: No `effectiveDate` in the payload. This is intentional -- EEXPR-44-5 removed it from the creation flow.

---

## Step 5: Verify Response

Expected status: **201 Created**

### Verification Checklist

| # | Check | Expected | How to Verify |
|---|-------|----------|---------------|
| 1 | HTTP status | `201` | Response status code |
| 2 | `success` | `true` | Top-level field |
| 3 | `transfer.status` | `PENDING_SIGNATURES` | Transfer starts in this status |
| 4 | `transfer.effectiveDate` | `null` | Not required since EEXPR-44-5 |
| 5 | `effectiveDateDetails` | **absent** | Removed from response in EEXPR-44-5 |
| 6 | `transfer.agreementId` | **absent** | Removed from transfer-level in EEXPR-44-1 |
| 7 | `transfer.signatures` | Non-empty array | At least ADMIN + EMPLOYEE with `status: "PENDING"` |
| 8 | Signatures are real | `status: "PENDING"`, not `"SIGNED"` | Mock data returned `SIGNED`; real data starts `PENDING` |
| 9 | `transfer.items[].itemSignatures` | Array (may be empty) | Empty if no document templates configured for the LE |
| 10 | `underwritingRequestIds` | `[]` (if all resources exist) | Non-empty if destination LE is missing Prism resources |
| 11 | No 500 errors | Clean 201 response | No server errors in response |

### Item Signatures

If the Documents service has templates configured for the destination legal entity, `itemSignatures` will contain entries like:

```json
{
  "id": "uuid",
  "transferItemId": "uuid",
  "agreementType": "ARBITRATION_AGREEMENT",
  "agreementId": "uuid",
  "status": "PENDING",
  "signedAt": null
}
```

If no templates are configured (common on fresh Giger environments), `itemSignatures` will be `[]`. This is expected behavior, not a bug.

---

## Step 6: Verify Persistence (Optional)

### Fetch Transfer by ID

```
GET /admin/peo/tech_ops/entity_transfer/{transferId}
```

### Query PEO Database Directly

```sql
-- Transfer record
SELECT id, status, effective_date, organization_id
FROM   peo_employee_transfers
WHERE  id = '{transfer_id}';

-- Transfer items
SELECT id, status, base_contract_oid
FROM   peo_employee_transfer_items
WHERE  transfer_id = '{transfer_id}';

-- Transfer-level signatures
SELECT id, profile_public_id, role, status
FROM   peo_employee_transfer_signatures
WHERE  transfer_id = '{transfer_id}';

-- Item-level signatures (if any)
SELECT s.id, s.agreement_type, s.agreement_id, s.status
FROM   peo_employee_transfer_item_signatures s
JOIN   peo_employee_transfer_items i ON i.id = s.transfer_item_id
WHERE  i.transfer_id = '{transfer_id}';
```

---

## Common Pitfalls

| Issue | Symptom | Root Cause | Fix |
|-------|---------|------------|-----|
| Wrong Giger domain format | `jwt audience invalid` (401) | Using `api-dev-...` instead of `www-dev-...` | Domain must be `https://www-dev-{ns}.giger.training/deelapi` |
| Token expired | `jwt expired` (401) | Admin tokens have an expiry window | Generate a fresh admin token |
| SQL targeting wrong DB | Contract OIDs not found (400) | Port-forward points to DEV/local, not Giger | Verify `kubectl port-forward` targets the Giger namespace |
| Documents not deployed | `Unable to create request custom template` (500) | Documents microservice missing from Giger | Deploy `documents` service to the environment |
| PEO on wrong branch | `Cannot read properties of undefined (reading 'transaction')` (500) | PEO deployed from `main` instead of feature branch | Redeploy PEO from the correct branch |
| Contract type wrong | Sanity check fails | Using `peo_csa` contract instead of `peo` | Filter by `contract_type = 'peo'` |
| Position not in destination | `Position not found` (400) | Selected position belongs to source, not destination LE | Query positions for the destination legal entity |
| effectiveDate Zod schema | `Effective date is required` + `effectiveDate is not allowed` | Backend Zod schema still required effectiveDate | Fixed in EEXPR-44 commit `88916ad2620` |
| PEO `db` class import | `Cannot read properties of undefined (reading 'transaction')` | Service imported DB class instead of TypeDI singleton | Fixed in EEXPR-44 commit `3bd6d957` |
| PEO `new Date(undefined)` | Invalid Date passed to Sequelize | Controller didn't guard null effectiveDate | Fixed in EEXPR-44 commit `3bd6d957` |

---

## Architecture Reference

### Creation Flow (Backend)

```
create_transfer_service.ts:createEntityTransfer()
  1. runSanityChecks()           -- CrossHire, Termination, Resources
  2. createUnderwritingRequests() -- For missing Prism resources
  3. resolveEmployeeProfiles()    -- Get profile publicIds
  4. buildSignatures()            -- ADMIN + EMPLOYEE + additional
  5. prepareDocumentRequirements()-- Documents API templates
  6. createTransfer() via PEO     -- HTTP POST to PEO service
  7. createItemSignaturesForTransfer() -- HTTP POST per item
  8. buildSuccessResponse()       -- Enrich with LE names
```

### Key Files

| File | Repo | Purpose |
|------|------|---------|
| `services/peo/entity_transfer/services/create_transfer_service.ts` | backend | Orchestrates transfer creation |
| `services/peo/entity_transfer/entity_transfer_service.ts` | backend | Sanity checks, document prep, item signatures |
| `services/peo/entity_transfer/services/entity_transfer_client_service.ts` | backend | HTTP client to PEO |
| `services/peo/entity_transfer/steps/termination_sanity_check_step.ts` | backend | Pre-flight validation |
| `src/controllers/entityTransfer/entityTransferController.ts` | peo | REST endpoints |
| `src/services/entityTransfer/entityTransferService.ts` | peo | CRUD operations, Sequelize |
| `src/controllers/entityTransfer/entityTransferDto.ts` | peo | Zod validation schemas |

---

## Related Documentation

- [Entity Transfers README](README.md)
- [Deployments](deployments.md)
- [Test Data Cleanup](test-data-cleanup.md)
- [EEXPR-44 Custom Documents Integration](explorations/EEXPR-44-custom-documents-integration.md)

---

_Created: 2026-02-02_
_Last Updated: 2026-02-02_
