# PEO Entity Transfer - Test Environment Data Cleanup Guide

This guide explains how to prepare anonymized/scrambled test data for PEO Entity Transfers. When the database contains anonymized data, PrismHR will reject the cross-hire API calls with validation errors.

## Overview

The Entity Transfer process validates data against PrismHR requirements. Anonymized data (random strings, invalid codes) will fail validation. This guide lists all fields that need real/valid values.

> **⚠️ CRITICAL: Source vs Destination**
>
> Work locations, positions, and pay groups must be valid for the **DESTINATION** client, not the source.
> Before looking up codes in PrismHR, always verify which client is the destination:
> ```sql
> SELECT pc.prism_client_id, le.public_id as legal_entity_public_id,
>        'destination' as role
> FROM peo.peo_clients pc
> JOIN "LegalEntities" le ON le.id = pc.deel_entity_id
> WHERE le.public_id = '<destinationLegalEntityPublicId>';
> ```

## Tables and Fields to Update

### 1. `peo.peo_contracts` (Base Contract)

The `CreateContractStep` reads employee data from this table for the **source contract**.

| Field | Invalid Example | Valid Example | Notes |
|-------|-----------------|---------------|-------|
| `ssn` | `60BC7J06RK` | `644085585` | 9 digits, no dashes, must match PrismHR |
| `state_code` | `X5` | `FL` | 2-letter US state code |
| `zip_code` | `WV5Y2` | `33101` | 5-digit US ZIP |
| `city` | `8FJ2KL9M` | `Miami` | Valid city name |
| `address` | hash | `123 Main St` | Street address |
| `gender` | `7` | `M` | Valid: `M`, `F`, `X`, `D`, `U` |
| `citizen_status` | `TSH` | `Z01` | PrismHR i9docs code (get from ClientMaster.getClientCodes) |
| `fed_file_status` | `AFH` | `SS` | W4 filing status: `SS`, `MFJ`, `MFS`, `HOH` (2020+ W4). Do NOT use `S` or `M` (those are pre-2020) |
| `pay_method` | `YOVT2IMS8P` | `C` | Pay delivery method: `C` (Check) or `D` (Direct Deposit). **Note:** `C` works reliably; `D` may fail |

> **⚠️ ZIP Code Warning**
>
> Some ZIP codes (especially dense urban areas like NYC 10001, 10022) cause "More than one geocode found" errors.
> Use simpler/rural ZIP codes like `12345` (Schenectady, NY) or `33101` (Miami, FL) to avoid this.

**SQL to fix:**
```sql
UPDATE peo.peo_contracts
SET
    ssn = '644085585',
    state_code = 'NY',
    zip_code = '12345',
    city = 'Schenectady',
    address = '123 Main St',
    gender = 'M',
    citizen_status = 'Z01',
    fed_file_status = 'SS',
    pay_method = 'C',
    updated_at = NOW()
WHERE deel_contract_id = <BASE_CONTRACT_ID>;
```

### 2. `peo.peo_contracts` (New Contract)

> **⚠️ CRITICAL: Update BOTH Contracts**
>
> The cross-hire API reads employee data from the **BASE contract** (not the new one).
> However, **BOTH** contracts should be updated with the same valid values to avoid issues.

If a new contract was already created with anonymized data, update it with ALL the same fields:

```sql
-- Update BOTH contracts at once
UPDATE peo.peo_contracts
SET
    state_code = 'NY',
    zip_code = '12345',
    city = 'Schenectady',
    address = '123 Main St',
    gender = 'M',
    citizen_status = 'Z01',
    fed_file_status = 'SS',
    pay_method = 'C',
    updated_at = NOW()
WHERE deel_contract_oid IN ('<BASE_CONTRACT_OID>', '<NEW_CONTRACT_OID>');
```

### 3. `peo.peo_work_locations`

Work location codes must match PrismHR client configuration **for the DESTINATION client**.

| Field | Invalid Example | Valid Example | Notes |
|-------|-----------------|---------------|-------|
| `prism_client_work_location_id` | hash | `NC` | Must exist in PrismHR Client > Worksite Locations |
| `state` | `X5` | `NC` | 2-letter state code |
| `city` | `KB5NYVU5DC` | `RALEIGH` | Valid city name |
| `zip` | `BQQVQGBWCW` | `27601` | 5-digit ZIP code |

**How to find valid values:**
1. PrismHR > Client > Change > Worksite Locations
2. **Make sure you're looking at the DESTINATION client**, not the source

**SQL to find the work location:**
```sql
-- Find by deel_entity_work_location_id (UUID from transfer request)
SELECT id, prism_client_work_location_id, state, city, zip, client_id
FROM peo.peo_work_locations
WHERE deel_entity_work_location_id = '<newWorkLocationId_UUID>';
```

> **⚠️ Duplicate Constraint Warning**
>
> The `peo_work_locations_client_prism_location_unique` constraint prevents duplicate location codes per client.
> Before updating, check if the location code already exists:
> ```sql
> SELECT id, prism_client_work_location_id FROM peo.peo_work_locations
> WHERE client_id = <DESTINATION_CLIENT_ID> AND prism_client_work_location_id = 'NY';
> ```
> If it exists, either use a different code (e.g., `CA` instead of `NY`) or update the payload to use the existing location.

**SQL to fix:**
```sql
UPDATE peo.peo_work_locations
SET
    prism_client_work_location_id = 'NY',
    state = 'NY',
    city = 'NEW YORK',
    zip = '12345',
    updated_at = NOW()
WHERE id = <WORK_LOCATION_ID>;  -- integer, not UUID
```

### 4. `peo.payroll_settings_prism_pay_codes`

Pay group codes must match PrismHR configuration.

| Field | Invalid Example | Valid Example | Notes |
|-------|-----------------|---------------|-------|
| `prism_pay_code` | `SJVPVSWNWL` | `BW` | Must exist in PrismHR Pay Groups |

> **⚠️ Pay Group vs Pay Schedule**
>
> - **Pay Group** (what we need): Short codes like `BW`, `BW-FRI`, `SM` - found in PrismHR > Client > Change > **Pay Groups**
> - **Pay Schedule** (NOT what we need): Longer IDs like `B5PE1`, `B5PE12` - found in Pay Grade/Review Schedule Maintenance
>
> The `prism_pay_code` field needs the **Pay Group** code, not the Pay Schedule ID.

**How to find valid values:**
1. PrismHR > Client > Change > **Pay Groups** (NOT Pay Grade/Review Schedule)
2. Look for short codes like `BW`, `SM`, `WK`

**SQL to find the pay code:**
```sql
-- Find by employment_payroll_settings_id (from transfer request newPayrollSettingsId)
SELECT id, prism_pay_code, employment_payroll_settings_id, status
FROM peo.payroll_settings_prism_pay_codes
WHERE employment_payroll_settings_id = '<newPayrollSettingsId>';
```

**SQL to fix (if record exists):**
```sql
UPDATE peo.payroll_settings_prism_pay_codes
SET
    prism_pay_code = 'BW',
    updated_at = NOW()
WHERE employment_payroll_settings_id = '<newPayrollSettingsId>';
```

**SQL to fix (if record is MISSING):**
```sql
-- If the query above returns 0 rows, INSERT a new record
INSERT INTO peo.payroll_settings_prism_pay_codes
    (employment_payroll_settings_id, prism_pay_code, status, created_at, updated_at)
VALUES
    ('<newPayrollSettingsId>', 'BW', 'ACTIVE', NOW(), NOW());
```

### 5. `peo.peo_positions`

Position/Job codes must exist in PrismHR for the destination client.

| Field | Invalid Example | Valid Example | Notes |
|-------|-----------------|---------------|-------|
| `code` | `UEE0ZH78PH` | `PRES` | Must exist in PrismHR Positions |
| `title` | `37Y12MIOKL` | `President` | Human-readable title |
| `class` | `M3EUGO5M32` | `8810E1-1` | Position classification |

**How to find valid values:**
1. PrismHR > Client > Change > Positions
2. Note the Position Code (e.g., `PRES`, `CTO`, `SEM`)

**SQL to fix:**
```sql
UPDATE peo.peo_positions
SET
    code = 'PRES',
    title = 'President',
    class = '8810E1-1',
    updated_at = NOW()
WHERE peo_client_id = <DESTINATION_PEO_CLIENT_ID>
AND code = '<ANONYMIZED_CODE>';
```

## Finding IDs and Relationships

### Identify Source and Destination Clients (IMPORTANT - Do this first!)
```sql
-- Find both source and destination clients from the transfer request
SELECT
    pc.prism_client_id,
    pc.id as peo_client_id,
    le.public_id as legal_entity_public_id,
    CASE
        WHEN le.public_id = '<sourceLegalEntityPublicId>' THEN 'SOURCE'
        WHEN le.public_id = '<destinationLegalEntityPublicId>' THEN 'DESTINATION'
    END as role
FROM peo.peo_clients pc
JOIN "LegalEntities" le ON le.id = pc.deel_entity_id
WHERE le.public_id IN (
    '<sourceLegalEntityPublicId>',
    '<destinationLegalEntityPublicId>'
);
```

### Find PEO Client ID from Prism Client ID
```sql
SELECT id, prism_client_id, deel_entity_id, organization_id
FROM peo.peo_clients
WHERE prism_client_id = '000349';  -- destination client
```

### Find Base Contract
```sql
SELECT id, deel_contract_id, ssn, state_code, zip_code, city, gender,
       citizen_status, fed_file_status, pay_method
FROM peo.peo_contracts
WHERE deel_contract_id = <CONTRACT_ID>;
```

### Find Work Location by UUID
```sql
-- The UUID from the transfer request maps to deel_entity_work_location_id, not id
SELECT * FROM peo.peo_work_locations
WHERE deel_entity_work_location_id = '<newWorkLocationId_UUID>';
```

### Find Positions for a Client
```sql
SELECT pp.id, pp.code, pp.title, pp.class, pc.prism_client_id
FROM peo.peo_positions pp
JOIN peo.peo_clients pc ON pp.peo_client_id = pc.id
WHERE pc.prism_client_id = '000349';
```

### Find Payroll Settings
```sql
SELECT * FROM peo.payroll_settings_prism_pay_codes
WHERE employment_payroll_settings_id = '<newPayrollSettingsId>';
```

### Find New Contract (when resuming failed transfer)
```sql
-- The newContractOid from the error response maps to deel_contract_oid
SELECT id, deel_contract_id, deel_contract_oid, ssn, state_code, zip_code,
       gender, citizen_status, fed_file_status, pay_method
FROM peo.peo_contracts
WHERE deel_contract_oid = '<newContractOid>';
```

## Validation Steps Before Transfer

1. **Verify all peo_contracts fields** have valid values (not anonymized)
2. **Verify work location** exists with valid `prism_client_work_location_id`
3. **Verify position** exists with valid `code` for destination client
4. **Verify pay group** has valid `prism_pay_code`

## Pre-PrismHR Errors

These errors occur **before** the PrismHR cross-hire API is called:

| Error | Cause | Fix |
|-------|-------|-----|
| `Non-EOR workers are not allowed to be assigned to EOR policies` | PTO policy doesn't support PEO worker type | Add `peo` worker type to the policy (see below) |

### PTO Policy Worker Type Fix

The PTO policy must support `peo` worker type. Check and fix:

```sql
-- Check if policy supports PEO workers
SELECT p.id, p.uid, p.name, pwt.worker_type
FROM time_off.policies p
LEFT JOIN time_off.policy_worker_types pwt ON pwt.policy_id = p.id
WHERE p.uid = '<newPtoPolicyId_UUID>';

-- Add PEO worker type if missing
INSERT INTO time_off.policy_worker_types (policy_id, worker_type, organization_id, created_at, updated_at)
VALUES (<policy_id>, 'peo', <organization_id>, NOW(), NOW());
```

## Common PrismHR Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid ssn: ABC123` | SSN is anonymized/scrambled | Update SSN in peo_contracts with valid 9-digit SSN |
| `crossHireEid does not match the provided social security number` | SSN in Deel doesn't match existing employee in PrismHR | Get correct SSN from PrismHR employee record |
| `Invalid LOCATION CODE X for employee` | Work location code doesn't exist for **destination** client | Check PrismHR destination client's Worksite Locations |
| `Invalid JOB CODE X for employee` | Position code doesn't exist for **destination** client | Check PrismHR destination client's Positions |
| `Invalid PAY GROUP X for employee` | Pay group code is anonymized | Update prism_pay_code in payroll_settings_prism_pay_codes |
| `Invalid state code` | state_code is anonymized | Use valid 2-letter state |
| `Invalid ZIP` | zip_code is not 5 digits | Use valid 5-digit ZIP |
| `Invalid gender` | gender not in M/F/X/D/U | Use valid gender code |
| `Invalid citizenStatus` | Not a valid i9docs code | Use `Z01` for US Citizen |
| `Invalid fed_file_status` | Not a W4 status code | Use `SS`, `MFJ`, `MFS`, or `HOH` (2020+ codes) |
| `filing status M or S, which signify a W4 completed in 2019 or prior` | Using old W4 codes | Change `S` to `SS`, `M` to `MFJ` |
| `Missing PAY METHOD` | pay_method is null, invalid, or `D` | Use `C` (Check) - it works reliably |
| `More than one geocode found for zip code` | Dense urban ZIP has multiple geocodes | Use simpler/rural ZIP like `12345` |

## Reference: Valid Code Values

### Gender Codes
- `M` - Male
- `F` - Female
- `X` - Non-binary
- `D` - Decline to state
- `U` - Unknown

### Pay Delivery Method (for cross-hire)
- `C` - Check (works reliably)
- `D` - Direct Deposit (may cause "Missing PAY METHOD" errors)

> **Note:** The `pay_method` field in `peo_contracts` is the pay **delivery** method for PrismHR cross-hire,
> not the payment type (Salary/Hourly/etc). Use `C` to avoid issues.

### Federal Filing Status (2020+ W4)
- `SS` - Single or Married Filing Separately
- `MFJ` - Married Filing Jointly
- `HOH` - Head of Household

### Citizenship Status (i9docs)
- `Z01` - A citizen of the United States
- (Other codes vary by PrismHR client configuration)

## Transfer Request Body

When making the transfer request, ensure these fields use valid values:

```json
{
    "organizationId": 54086,
    "sourceLegalEntityId": 123,
    "destinationLegalEntityId": 456,
    "effectiveDate": "2025-01-15",
    "peoContractId": 12345,
    "newWorkLocationId": "e4c4b7b2-c365-4411-a3d8-9ff4ec49ed6e",
    "newJobCode": "PRES",
    "newPayGroupId": 789,
    "newBenefitGroupId": "benefit-uuid",
    "newPtoPolicyId": "pto-uuid",
    "requesterProfileId": 111
}
```

The `newJobCode` must match a `code` value in `peo.peo_positions` for the destination client.

## SQL Query: Generate Valid Test Payloads

This query finds organizations with multiple PEO entities and generates valid transfer payloads:

```sql
WITH
    org_with_multiple_entities AS (
        SELECT organization_id, COUNT(*) as entity_count
        FROM peo.peo_clients
        WHERE is_active = true AND organization_id IS NOT NULL
        GROUP BY organization_id
        HAVING COUNT(*) >= 2
    ),

    entity_pairs AS (
        SELECT
            pc1.organization_id,
            pc1.id as source_peo_client_id,
            pc1.deel_legal_entity_public_id as source_legal_entity_public_id,
            pc1.prism_client_id as source_prism_client_id,
            pc2.id as destination_peo_client_id,
            pc2.deel_legal_entity_public_id as destination_legal_entity_public_id,
            pc2.prism_client_id as destination_prism_client_id
        FROM peo.peo_clients pc1
        INNER JOIN peo.peo_clients pc2
            ON pc1.organization_id = pc2.organization_id
            AND pc1.id != pc2.id AND pc2.is_active = true
        INNER JOIN org_with_multiple_entities ome
            ON pc1.organization_id = ome.organization_id
        WHERE pc1.is_active = true
    ),

    valid_contracts AS (
        SELECT DISTINCT ON (ep.organization_id, ep.source_peo_client_id, ep.destination_peo_client_id)
            ep.*, pcon.deel_contract_id as base_peo_contract_id
        FROM entity_pairs ep
        INNER JOIN peo.peo_contracts pcon
            ON pcon.prism_client_id = ep.source_prism_client_id
        WHERE pcon.peo_contract_status = 'ACTIVE'
        AND pcon.is_active = true
        AND pcon.prism_employee_id IS NOT NULL
    ),

    with_pay_groups AS (
        SELECT DISTINCT ON (vc.organization_id, vc.source_peo_client_id, vc.destination_peo_client_id)
            vc.*,
            ps.id as new_payroll_settings_id
        FROM valid_contracts vc
        INNER JOIN public."LegalEntities" le ON le.public_id = vc.destination_legal_entity_public_id
        INNER JOIN employment.payroll_settings ps ON ps.payroll_legal_entity_id = le.id
        WHERE ps.is_active = true AND ps.experience_type = 'PEO'
    ),

    with_benefit_groups AS (
        SELECT DISTINCT ON (wpg.organization_id, wpg.source_peo_client_id, wpg.destination_peo_client_id)
            wpg.*,
            pbg.prism_group_id as new_benefit_group_id
        FROM with_pay_groups wpg
        INNER JOIN peo.peo_benefit_groups pbg
            ON pbg.peo_client_id = wpg.destination_peo_client_id
    ),

    with_work_locations AS (
        SELECT DISTINCT ON (wbg.organization_id, wbg.source_peo_client_id, wbg.destination_peo_client_id)
            wbg.*, ewl.public_id as new_work_location_id
        FROM with_benefit_groups wbg
        INNER JOIN peo.peo_work_locations pwl
            ON pwl.client_id = wbg.destination_peo_client_id AND pwl.status = 'ACTIVE'
        INNER JOIN public.entity_work_locations ewl
            ON ewl.public_id = pwl.deel_entity_work_location_id
    ),

    with_positions AS (
        SELECT DISTINCT ON (wwl.organization_id, wwl.source_peo_client_id, wwl.destination_peo_client_id)
            wwl.*, pp.code as new_job_code
        FROM with_work_locations wwl
        INNER JOIN peo.peo_positions pp
            ON pp.peo_client_id = wwl.destination_peo_client_id
        ORDER BY wwl.organization_id, wwl.source_peo_client_id, wwl.destination_peo_client_id, pp.created_at DESC
    ),

    with_pto AS (
        SELECT DISTINCT ON (wp.organization_id, wp.source_peo_client_id, wp.destination_peo_client_id)
            wp.*, pol.uid as new_pto_policy_id
        FROM with_positions wp
        INNER JOIN time_off.policies pol
            ON pol.organization_id = wp.organization_id
        INNER JOIN time_off.policy_worker_types pwt
            ON pwt.policy_id = pol.id
            AND pwt.worker_type = 'peo'
        ORDER BY wp.organization_id, wp.source_peo_client_id, wp.destination_peo_client_id, pol.created_at DESC
    ),

    with_teams AS (
        SELECT DISTINCT ON (wpto.organization_id, wpto.source_peo_client_id, wpto.destination_peo_client_id)
            wpto.*, t.id as new_team_id
        FROM with_pto wpto
        INNER JOIN public."Teams" t ON t."OrganizationId" = wpto.organization_id
    ),

    with_profiles AS (
        SELECT DISTINCT ON (wt.organization_id, wt.source_peo_client_id, wt.destination_peo_client_id)
            wt.*, p.public_id as requester_profile_public_id
        FROM with_teams wt
        INNER JOIN public.profile p
            ON p.last_team IN (SELECT id FROM public."Teams" WHERE "OrganizationId" = wt.organization_id)
        WHERE p.public_id IS NOT NULL
    )

SELECT jsonb_pretty(
    jsonb_build_object(
        'organizationId', organization_id,
        'requesterProfilePublicId', requester_profile_public_id::text,
        'sourceLegalEntityPublicId', source_legal_entity_public_id::text,
        'destinationLegalEntityPublicId', destination_legal_entity_public_id::text,
        'effectiveDate', TO_CHAR(CURRENT_DATE + INTERVAL '7 days', 'YYYY-MM-DD'),
        'agreementId', 'AGR-TEST-' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8)),
        'basePeoContractId', base_peo_contract_id,
        'newBenefitGroupId', new_benefit_group_id,
        'newPayrollSettingsId', new_payroll_settings_id,
        'newPtoPolicyId', new_pto_policy_id::text,
        'newTeamId', new_team_id,
        'newWorkLocationId', new_work_location_id::text,
        'newJobCode', new_job_code
    )
) as payload
FROM with_profiles;
```

> **Note:** This query only returns results for organizations that have:
> - 2+ active PEO clients (entities)
> - Active PEO contracts with Prism integration
> - PTO policies with `peo` worker type
> - All required destination entity configuration (work locations, positions, benefit groups, pay groups)
