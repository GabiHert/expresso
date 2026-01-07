# Entity Transfer Database Tables - Schema Expectations

## Overview

The entity transfer feature uses three main database tables in the `entity_transfer` schema. These tables are defined using Sequelize models in the PEO service. The tables may not exist in the database yet (migrations pending), but the models define their expected structure.

**Schema**: `entity_transfer`  
**Tables**:
1. `peo_employee_transfers` - Master transfer records
2. `peo_employee_transfer_items` - Individual employee transfers within a batch
3. `peo_employee_transfer_signatures` - Signature tracking for agreements

---

## Table 1: `peo_employee_transfers`

**Purpose**: Master table for batch employee transfer requests between legal entities

**Model**: `peo/src/models/entityTransfer/PeoEmployeeTransfer.ts`

### Columns

| Column Name | Type | Nullable | Default | Description |
|------------|------|----------|---------|-------------|
| `id` | UUID | NO | UUIDV4 | Primary key - unique transfer identifier |
| `created_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Record last update timestamp |
| `organization_id` | INTEGER | NO | - | FK to `organizations.id` - Client organization |
| `requester_profile_public_id` | INTEGER | NO | - | FK to `profiles.public_id` - Admin who initiated transfer |
| `source_legal_entity_public_id` | UUID | NO | - | FK to `legal_entities.public_id` - Entity employee is leaving |
| `destination_legal_entity_public_id` | UUID | NO | - | FK to `legal_entities.public_id` - Entity employee is joining |
| `status` | ENUM | NO | `'DRAFT'` | Transfer state (see enum values below) |
| `effective_date` | DATE | NO | - | Date transfer takes effect (DATEONLY format: YYYY-MM-DD) |
| `agreement_id` | UUID | YES | NULL | FK to Entity Assignment Agreement document |

### Status Enum Values

The `status` column accepts one of these values:
- `'DRAFT'` - Initial state, transfer not yet submitted
- `'PENDING_SIGNATURES'` - Waiting for required signatures
- `'SCHEDULED'` - Approved and scheduled for processing
- `'PROCESSING'` - Currently being executed
- `'COMPLETED'` - Successfully finished
- `'PARTIAL_FAILURE'` - Some items failed, others succeeded
- `'FAILED'` - Transfer failed completely
- `'CANCELLED'` - Transfer was cancelled

### Key Points

1. **`requester_profile_public_id` is INTEGER**: Despite the name containing "public_id", this field stores the numeric `id` from the `profiles` table, NOT the UUID `public_id`. This is a naming inconsistency.
   - **Expected**: `1714436` (number)
   - **NOT**: `"99b7c17f-3420-4a50-b7d2-58c8c8940f6b"` (UUID string)

2. **`agreement_id` is optional**: Can be NULL if no agreement document is associated yet.

3. **`effective_date` is DATEONLY**: Only stores the date portion (YYYY-MM-DD), no time component.

---

## Table 2: `peo_employee_transfer_items`

**Purpose**: Individual employees within a batch transfer request

**Model**: `peo/src/models/entityTransfer/PeoEmployeeTransferItem.ts`

### Columns

| Column Name | Type | Nullable | Default | Description |
|------------|------|----------|---------|-------------|
| `id` | UUID | NO | UUIDV4 | Primary key - unique transfer item identifier |
| `created_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Record last update timestamp |
| `organization_id` | INTEGER | NO | - | FK to `organizations.id` - Client organization (denormalized from parent transfer) |
| `transfer_id` | UUID | NO | - | FK to `peo_employee_transfers.id` - Parent transfer |
| `base_contract_oid` | VARCHAR(20) | NO | - | FK to `peo_contracts.deel_contract_oid` - Contract being transferred (string OID) |
| `new_benefit_prism_group_id` | VARCHAR(10) | NO | - | References `peo_benefit_groups.prism_group_id` - Destination benefit group (e.g., "400", "600") |
| `new_employment_payroll_setting_id` | UUID | NO | - | **FK to `employment.payroll_settings.id` - Destination pay group** |
| `new_pto_policy_id` | VARCHAR(64) | NO | - | Destination PTO policy ID |
| `new_work_location_id` | VARCHAR(100) | NO | - | Work location code (e.g., WL001) |
| `new_job_code` | VARCHAR(64) | NO | - | Position code (e.g., MGR001) |
| `new_team_id` | INTEGER | YES | NULL | Destination team ID (optional) |
| `new_contract_oid` | VARCHAR(100) | YES | NULL | New contract OID created during transfer execution |
| `resume_from_step` | VARCHAR(100) | YES | NULL | Entity transfer step to resume from when status is WAITING_FOR_RESOURCES |
| `status` | ENUM | NO | `'PENDING'` | Item state (see enum values below) |

### Status Enum Values

The `status` column accepts one of these values:
- `'PENDING'` - Initial state, waiting to be processed
- `'PROCESSING'` - Currently being executed
- `'WAITING_FOR_RESOURCES'` - Paused, waiting for external resources (e.g., underwriting approval)
- `'COMPLETED'` - Successfully finished
- `'FAILED'` - Item failed during processing

### Key Points

1. **`new_employment_payroll_setting_id` is UUID**: This is a **critical mismatch**!
   - **Model expects**: UUID (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
   - **Database reality**: `employment.payroll_settings.id` is a TEXT field storing **nanoids** (e.g., `"cm9kf4nvo0000016t657ug818"`)
   - **Issue**: The model definition doesn't match the actual database schema. This needs to be resolved.

2. **`base_contract_oid`**: References `peo_contracts.deel_contract_oid`, which is a string identifier (not UUID).

3. **`new_benefit_prism_group_id`**: References PrismHR group IDs, which are short strings (max 10 chars).

4. **`resume_from_step`**: Used for resuming failed transfers from a specific step.

5. **`new_contract_oid`**: Populated during transfer execution when a new contract is created.

---

## Table 3: `peo_employee_transfer_signatures`

**Purpose**: Signature tracking for admin and employee agreements during entity transfers

**Model**: `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts`

### Columns

| Column Name | Type | Nullable | Default | Description |
|------------|------|----------|---------|-------------|
| `id` | UUID | NO | UUIDV4 | Primary key - unique signature record identifier |
| `created_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Record last update timestamp |
| `organization_id` | INTEGER | NO | - | FK to `organizations.id` - Client organization (denormalized from parent transfer) |
| `transfer_id` | UUID | NO | - | FK to `peo_employee_transfers.id` - Parent transfer |
| `profile_public_id` | INTEGER | NO | - | FK to `profiles.public_id` - Person required to sign |
| `role` | ENUM | NO | - | Signer role: `'ADMIN'` or `'EMPLOYEE'` |
| `agreement_type` | ENUM | NO | - | Type of agreement being signed (see enum values below) |
| `agreement_id` | UUID | YES | NULL | FK to document being signed (NULL for ENTITY_ASSIGNMENT_AGREEMENT) |
| `signed_at` | TIMESTAMP | YES | NULL | Timestamp when signature was collected |

### Role Enum Values

- `'ADMIN'` - Admin/requester signature
- `'EMPLOYEE'` - Employee signature

### Agreement Type Enum Values

- `'ARBITRATION_AGREEMENT'` - Arbitration agreement document
- `'WSE_NOTICE_OF_PEO_RELATIONSHIP'` - WSE notice document
- `'ENTITY_ASSIGNMENT_AGREEMENT'` - Entity assignment agreement (may not have separate document)

### Unique Constraint

There's a unique index on:
- `(transfer_id, profile_public_id, agreement_type)`

This ensures a person can only sign each agreement type once per transfer.

### Key Points

1. **`profile_public_id` is INTEGER**: Same naming issue as in the transfers table - stores numeric `id`, not UUID `public_id`.

2. **`agreement_id` can be NULL**: For `ENTITY_ASSIGNMENT_AGREEMENT` type, there may not be a separate document.

---

## Critical Schema Mismatches

### Issue 1: `requester_profile_public_id` / `profile_public_id` Field Naming

**Problem**: Field names suggest they store UUID `public_id` values, but they actually store INTEGER `id` values.

**Tables Affected**:
- `peo_employee_transfers.requester_profile_public_id` → INTEGER
- `peo_employee_transfer_signatures.profile_public_id` → INTEGER

**Expected Value**: `1714436` (number)  
**NOT**: `"99b7c17f-3420-4a50-b7d2-58c8c8940f6b"` (UUID string)

**Resolution**: When inserting data, look up the profile by `public_id` (UUID) and use the numeric `id`:
```sql
SELECT id FROM public.profile WHERE public_id = '99b7c17f-3420-4a50-b7d2-58c8c8940f6b';
-- Returns: 1714436
```

### Issue 2: `new_employment_payroll_setting_id` Type Mismatch

**Problem**: Model expects UUID, but `employment.payroll_settings.id` stores nanoids (TEXT).

**Table**: `peo_employee_transfer_items.new_employment_payroll_setting_id`

**Model Definition**: `DataTypes.UUID`  
**Database Reality**: `employment.payroll_settings.id` is `TEXT` (nanoid format)

**Expected by Model**: `"550e8400-e29b-41d4-a716-446655440000"` (UUID)  
**Actual Database Value**: `"cm9kf4nvo0000016t657ug818"` (nanoid)

**Resolution Options**:
1. **Change model to TEXT**: Update `PeoEmployeeTransferItem` model to use `DataTypes.STRING` instead of `DataTypes.UUID`
2. **Add UUID field to payroll_settings**: Create a `public_id` UUID field in `employment.payroll_settings` table
3. **Create mapping table**: Map nanoid → UUID if such a mapping exists elsewhere

**Recommended**: Option 1 (change model) is the quickest fix, but Option 2 (add UUID field) is better long-term.

---

## Foreign Key Relationships

### From `peo_employee_transfers`:
- `organization_id` → `public.organizations.id` (INTEGER)
- `requester_profile_public_id` → `public.profiles.id` (INTEGER) ⚠️ Note: uses `id`, not `public_id`
- `source_legal_entity_public_id` → `public."LegalEntities".public_id` (UUID)
- `destination_legal_entity_public_id` → `public."LegalEntities".public_id` (UUID)
- `agreement_id` → Agreement document UUID (nullable)

### From `peo_employee_transfer_items`:
- `organization_id` → `public.organizations.id` (INTEGER)
- `transfer_id` → `entity_transfer.peo_employee_transfers.id` (UUID)
- `base_contract_oid` → `peo.peo_contracts.deel_contract_oid` (VARCHAR)
- `new_benefit_prism_group_id` → `peo.peo_benefit_groups.prism_group_id` (VARCHAR)
- `new_employment_payroll_setting_id` → `employment.payroll_settings.id` ⚠️ **TYPE MISMATCH** (UUID expected, TEXT/nanoid actual)
- `new_team_id` → `public."Teams".id` (INTEGER, nullable)

### From `peo_employee_transfer_signatures`:
- `organization_id` → `public.organizations.id` (INTEGER)
- `transfer_id` → `entity_transfer.peo_employee_transfers.id` (UUID)
- `profile_public_id` → `public.profiles.id` (INTEGER) ⚠️ Note: uses `id`, not `public_id`
- `agreement_id` → Agreement document UUID (nullable)

---

## Data Type Summary

### UUID Fields (36 chars with hyphens)
- `peo_employee_transfers.id`
- `peo_employee_transfers.source_legal_entity_public_id`
- `peo_employee_transfers.destination_legal_entity_public_id`
- `peo_employee_transfers.agreement_id` (nullable)
- `peo_employee_transfer_items.id`
- `peo_employee_transfer_items.transfer_id`
- `peo_employee_transfer_items.new_employment_payroll_setting_id` ⚠️ **MISMATCH**
- `peo_employee_transfer_signatures.id`
- `peo_employee_transfer_signatures.transfer_id`
- `peo_employee_transfer_signatures.agreement_id` (nullable)

### INTEGER Fields
- `peo_employee_transfers.organization_id`
- `peo_employee_transfers.requester_profile_public_id` ⚠️ **Naming confusion**
- `peo_employee_transfer_items.organization_id`
- `peo_employee_transfer_items.new_team_id` (nullable)
- `peo_employee_transfer_signatures.organization_id`
- `peo_employee_transfer_signatures.profile_public_id` ⚠️ **Naming confusion**

### VARCHAR/String Fields
- `peo_employee_transfer_items.base_contract_oid` (max 20)
- `peo_employee_transfer_items.new_benefit_prism_group_id` (max 10)
- `peo_employee_transfer_items.new_pto_policy_id` (max 64)
- `peo_employee_transfer_items.new_work_location_id` (max 100)
- `peo_employee_transfer_items.new_job_code` (max 64)
- `peo_employee_transfer_items.new_contract_oid` (max 100, nullable)
- `peo_employee_transfer_items.resume_from_step` (max 100, nullable)

### DATE Fields
- `peo_employee_transfers.effective_date` (DATEONLY - no time)
- `peo_employee_transfer_signatures.signed_at` (TIMESTAMP, nullable)

### ENUM Fields
- `peo_employee_transfers.status` → TransferStatus enum
- `peo_employee_transfer_items.status` → TransferItemStatus enum
- `peo_employee_transfer_signatures.role` → SignatureRole enum
- `peo_employee_transfer_signatures.agreement_type` → AgreementType enum

---

## Files Referenced

- **Models**: `peo/src/models/entityTransfer/`
  - `PeoEmployeeTransfer.ts` - Main transfer table
  - `PeoEmployeeTransferItem.ts` - Transfer items table
  - `PeoEmployeeTransferSignature.ts` - Signatures table
  - `types.ts` - Enum definitions

---

## Next Steps

1. **Verify table existence**: Check if migrations have been run to create these tables
2. **Fix schema mismatches**: Resolve the `new_employment_payroll_setting_id` UUID vs nanoid issue
3. **Clarify naming**: Consider renaming `*_profile_public_id` fields to `*_profile_id` to avoid confusion
4. **Create migrations**: If tables don't exist, create migration files based on these model definitions
5. **Update documentation**: Document the actual data types expected vs. what field names suggest

