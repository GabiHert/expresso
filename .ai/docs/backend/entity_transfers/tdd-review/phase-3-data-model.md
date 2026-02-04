# Phase 3 Findings: Data Model

**Task**: EEXPR-129 | **Date**: 2026-02-03 | **Status**: Complete

---

## Summary

The TDD's data model has **significant discrepancies** with the actual production schema. Key issues: column types are wrong (profile IDs, payroll setting IDs, PTO policy IDs, work location IDs), a column was replaced (`new_job_code` → `new_position_public_id`), a 4th table exists only in the EEXPR-44 branch (not production), and the TDD's schema name is wrong. The TDD also describes `requester_profile_public_id` and `profile_public_id` as INTEGER, but both are UUID in production after a migration fix.

---

## Methodology

Three sources were compared:
1. **TDD** — Schema documented in `.ai/tasks/done/PEOCM-660/entity-transfer-tables-schema.md`
2. **Migrations & Models** — PEO migration files and Sequelize model definitions
3. **Live Production DB** — Direct query via `mcp__sql-query` to confirm actual deployed state

---

## 1. Schema Name

### Verdict: INCORRECT

**TDD says**: Schema `entity_transfer`
**Actual**: Schema `peo`

All 3 tables exist in the `peo` schema, not a separate `entity_transfer` schema. The migrations explicitly set `schema: 'peo'`.

---

## 2. Table Count

### Verdict: PARTIALLY ACCURATE

**TDD defines**: 3 tables (PEOCM-660 era — no 4th table yet)
**Work item references**: 4 tables (including `peo_employee_transfer_item_signatures`)
**Production DB**: 3 tables
**EEXPR-44 branch**: 4 tables (adds `peo_employee_transfer_item_signatures`)

| Table | In TDD? | In Production? | In EEXPR-44? |
|-------|---------|----------------|--------------|
| `peo_employee_transfers` | Yes | Yes | Yes |
| `peo_employee_transfer_items` | Yes | Yes | Yes |
| `peo_employee_transfer_signatures` | Yes | Yes | Yes |
| `peo_employee_transfer_item_signatures` | No | **No** | **Yes** |

---

## 3. Table: `peo_employee_transfers`

### Verdict: PARTIALLY INCORRECT (3 column-level issues)

| Column | TDD Type | TDD Nullable | Production Type | Production Nullable | Status |
|--------|----------|-------------|-----------------|---------------------|--------|
| `id` | UUID | NO | uuid | NO | ACCURATE |
| `organization_id` | INTEGER | NO | integer | NO | ACCURATE |
| `requester_profile_public_id` | **INTEGER** | NO | **uuid** | NO | **INCORRECT** |
| `source_legal_entity_public_id` | UUID | NO | uuid | NO | ACCURATE |
| `destination_legal_entity_public_id` | UUID | NO | uuid | NO | ACCURATE |
| `status` | ENUM | NO (default: DRAFT) | USER-DEFINED | NO (default: DRAFT) | ACCURATE |
| `effective_date` | DATE | NO | date | NO | ACCURATE* |
| `agreement_id` | UUID | YES | uuid | YES | ACCURATE |
| `created_at` | TIMESTAMP | NO | timestamptz | NO | ACCURATE |
| `updated_at` | TIMESTAMP | NO | timestamptz | NO | ACCURATE |

**Column count**: TDD says 10 columns. Production has 10 columns. **Match.**

### Discrepancies:

#### 3a. `requester_profile_public_id` Type — INCORRECT

**TDD says**: INTEGER (stores `profiles.id`, not `profiles.public_id`)
**Production**: UUID

The TDD explicitly warns about a naming inconsistency: "Despite the name containing 'public_id', this field stores the numeric `id` from the `profiles` table." This was the original design but was **never deployed** — the migration created it as UUID from the start (`20251217172700`). The TDD's warning is based on an early model definition that was corrected before the migration was written.

#### 3b. `effective_date` Nullability — PENDING CHANGE

**TDD says**: NOT NULL
**Production**: NOT NULL (correct for now)
**EEXPR-44 branch**: Will become nullable via migration `20260131000004-make_effective_date_nullable__pre_release.js`
**Sequelize model**: Currently `allowNull: false`, will change with EEXPR-44

Once EEXPR-44 deploys, `effective_date` will be nullable to allow creating transfers without a date during the `PENDING_SIGNATURES` phase.

### Indexes:

| Index | TDD Mentions? | Production? | Status |
|-------|---------------|-------------|--------|
| PK on `id` | Implicit | `peo_employee_transfers_pkey` | ACCURATE |
| `idx_..._organization_id` | No | Yes | **MISSING from TDD** |
| `idx_..._effective_date` | Mentioned | Yes | ACCURATE |
| `idx_..._status_effective_date` (composite) | Mentioned | Yes | ACCURATE |

---

## 4. Table: `peo_employee_transfer_items`

### Verdict: INCORRECT (column replaced, types wrong, column count wrong)

| Column | TDD Type | TDD Nullable | Production Type | Production Nullable | Status |
|--------|----------|-------------|-----------------|---------------------|--------|
| `id` | UUID | NO | uuid | NO | ACCURATE |
| `organization_id` | INTEGER | NO | integer | NO | ACCURATE |
| `transfer_id` | UUID | NO | uuid | NO | ACCURATE |
| `base_contract_oid` | VARCHAR(20) | NO | varchar(20) | NO | ACCURATE |
| `new_benefit_prism_group_id` | VARCHAR(10) | NO | varchar(10) | NO | ACCURATE |
| `new_employment_payroll_setting_id` | **UUID** | NO | **varchar(50)** | NO | **INCORRECT** |
| `new_pto_policy_id` | **VARCHAR(64)** | NO | **uuid** | NO | **INCORRECT** |
| `new_work_location_id` | **VARCHAR(100)** | NO | **uuid** | NO | **INCORRECT** |
| `new_job_code` | VARCHAR(64) | NO | — | — | **DROPPED** |
| `new_position_public_id` | — | — | uuid | NO | **NEW COLUMN** |
| `new_team_id` | INTEGER | YES | integer | YES | ACCURATE |
| `new_contract_oid` | VARCHAR(100) | YES | **varchar(20)** | YES | **INCORRECT** |
| `resume_from_step` | VARCHAR(100) | YES | varchar(100) | YES | ACCURATE |
| `status` | ENUM | NO (default: PENDING) | USER-DEFINED | NO (default: PENDING) | ACCURATE |
| `created_at` | TIMESTAMP | NO | timestamptz | NO | ACCURATE |
| `updated_at` | TIMESTAMP | NO | timestamptz | NO | ACCURATE |

**Column count**: TDD says 15 (including timestamps). Production has 15. But the composition differs (dropped `new_job_code`, added `new_position_public_id`).

### Discrepancies:

#### 4a. `new_employment_payroll_setting_id` — INCORRECT TYPE

**TDD says**: UUID
**Production**: `character varying(50)` (STRING)
**Reason**: The `employment.payroll_settings.id` uses nanoid format (CUIDs like `cm9kf4nvo0000016t657ug818`), not UUIDs. The migration correctly defines this as `STRING(50)` to accommodate both UUID and CUID formats. The TDD inherited the original model's incorrect UUID type assumption.

#### 4b. `new_pto_policy_id` — INCORRECT TYPE

**TDD says**: VARCHAR(64)
**Production**: `uuid`
**Reason**: The `time_off.policies.uid` field is UUID. The migration correctly defines this as UUID. The TDD has the wrong type.

#### 4c. `new_work_location_id` — INCORRECT TYPE

**TDD says**: VARCHAR(100)
**Production**: `uuid`
**Reason**: The `entity_work_locations.public_id` is UUID. The migration correctly defines this as UUID. The TDD describes it as a "work location code (e.g., WL001)" but it's actually a UUID reference.

#### 4d. `new_job_code` → `new_position_public_id` — COLUMN REPLACED

**TDD says**: `new_job_code` VARCHAR(64) NOT NULL — "Position code (e.g., MGR001)"
**Production**: Column **dropped** and replaced with `new_position_public_id` UUID NOT NULL

**Migration history**:
1. `20251217172701`: Created table with `new_job_code` VARCHAR(64)
2. `20251229142007`: Added `new_position_public_id` UUID (nullable initially)
3. `20260105130001` (post-deployment): Made `new_position_public_id` NOT NULL, dropped `new_job_code`

**Reason**: Position identification switched from string codes to UUID references to `peo_positions.public_id`.

#### 4e. `new_contract_oid` Length — INCORRECT

**TDD says**: VARCHAR(100)
**Production**: `character varying(20)` — matches `base_contract_oid` length since both are PEO contract OIDs

### Indexes:

| Index | TDD Mentions? | Production? | Status |
|-------|---------------|-------------|--------|
| PK on `id` | Implicit | `peo_employee_transfer_items_pkey` | ACCURATE |
| `idx_..._organization_id` | No | Yes | **MISSING from TDD** |
| `idx_..._transfer_id` | Mentioned | Yes | ACCURATE |
| `idx_..._base_contract_oid` | No | Yes | **MISSING from TDD** |
| `idx_..._status` | No | Yes | **MISSING from TDD** |
| `idx_..._new_position_public_id` | N/A | Yes | **NEW** |

### Foreign Keys:

| FK | TDD Mentions? | Production? | Status |
|----|---------------|-------------|--------|
| `transfer_id` → `peo_employee_transfers(id)` CASCADE | Mentioned | Yes | ACCURATE |

---

## 5. Table: `peo_employee_transfer_signatures`

### Verdict: PARTIALLY INCORRECT (1 column type fixed post-TDD)

| Column | TDD Type | TDD Nullable | Production Type | Production Nullable | Status |
|--------|----------|-------------|-----------------|---------------------|--------|
| `id` | UUID | NO | uuid | NO | ACCURATE |
| `organization_id` | INTEGER | NO | integer | NO | ACCURATE |
| `transfer_id` | UUID | NO | uuid | NO | ACCURATE |
| `profile_public_id` | **INTEGER** | NO | **uuid** | NO | **INCORRECT** |
| `role` | ENUM | NO | USER-DEFINED | NO | ACCURATE |
| `agreement_type` | ENUM | NO | USER-DEFINED | NO | ACCURATE |
| `agreement_id` | UUID | YES | uuid | YES | ACCURATE |
| `signed_at` | TIMESTAMP | YES | timestamptz | YES | ACCURATE |
| `created_at` | TIMESTAMP | NO | timestamptz | NO | ACCURATE |
| `updated_at` | TIMESTAMP | NO | timestamptz | NO | ACCURATE |

**Column count**: TDD says 10 (including timestamps). Production has 10. **Match.**

### Discrepancies:

#### 5a. `profile_public_id` Type — FIXED POST-TDD

**TDD says**: INTEGER (stores `profiles.id`)
**Production**: UUID (stores `profiles.public_id`)

**Migration history**:
1. `20251217172702`: Created with `profile_public_id` as INTEGER (matching TDD)
2. `20260108183000`: Fixed type from INTEGER to UUID (column dropped and recreated while table was empty)

The TDD matches the **original** migration, but a subsequent fix corrected the type. The TDD's warning about naming confusion ("stores numeric `id`, not UUID `public_id`") was valid at TDD-writing time but is now obsolete.

### Indexes:

| Index | TDD Mentions? | Production? | Status |
|-------|---------------|-------------|--------|
| PK on `id` | Implicit | `peo_employee_transfer_signatures_pkey` | ACCURATE |
| `idx_..._organization_id` | No | Yes | **MISSING from TDD** |
| `idx_..._profile_public_id` | No | Yes | **MISSING from TDD** |
| UNIQUE `(transfer_id, profile_public_id, agreement_type)` | Yes | Yes | ACCURATE |

### Foreign Keys:

| FK | TDD Mentions? | Production? | Status |
|----|---------------|-------------|--------|
| `transfer_id` → `peo_employee_transfers(id)` CASCADE | Mentioned | Yes | ACCURATE |

---

## 6. Table: `peo_employee_transfer_item_signatures` (EEXPR-44 Only)

### Verdict: NOT IN PRODUCTION

This table exists only in the EEXPR-44 worktree branch. It is **not yet deployed** to production.

**Migration**: `worktrees/EEXPR-44/peo/migrations/20260131000003-create_peo_employee_transfer_item_signatures_table__pre_release.js`

**Schema** (when deployed):

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | UUID | NO | UUIDV4 |
| `transfer_item_id` | UUID | NO | — (FK CASCADE) |
| `organization_id` | INTEGER | NO | — |
| `agreement_type` | ENUM | NO | — |
| `agreement_id` | UUID | NO | — |
| `status` | ENUM | NO | PENDING |
| `signed_at` | DATE | YES | — |
| `created_at` | DATE | NO | CURRENT_TIMESTAMP |
| `updated_at` | DATE | NO | CURRENT_TIMESTAMP |

**Enums**:
- `agreement_type`: ARBITRATION_AGREEMENT, WSE_NOTICE_OF_PEO_RELATIONSHIP
- `status`: PENDING, SIGNED

**Indexes**:
- UNIQUE on `(transfer_item_id, agreement_type)`
- Index on `transfer_item_id`

**Note**: This table tracks per-item signatures (employee-level documents), separate from the transfer-level signatures table. The TDD work item references 4 tables, but the TDD-era schema (PEOCM-660) only documented 3.

---

## 7. Additional Schema Changes Not in TDD

### 7a. `peo_contracts.origin` Enum

Migration `20251222150000` added `'entity_transfer'` to the `enum_peo_contracts_origin` enum type. This allows contracts created during entity transfers to be identified by their origin. Not documented in the TDD.

### 7b. EEXPR-124 Data Migration

A data migration at `automated-data-migrations/deel/public/V20260202184620212__EEXPR-124.sql` copies I9 dismissal records for 7 specific contract pairs that were missed during entity transfer execution (before CopyI9DataStep was added). This is a production data fix, not a schema change.

---

## 8. Backend Type vs PEO Model Discrepancies

The backend service (`backend/services/peo/entity_transfer/types.ts`) defines TypeScript interfaces that have naming differences from the PEO model:

| Backend Interface Field | PEO Model Field | Status |
|------------------------|-----------------|--------|
| `basePeoContractOid` | `baseContractOid` | **DIFFERENT** |
| `newBenefitGroupId` | `newBenefitPrismGroupId` | **DIFFERENT** |
| `newPayrollSettingsId` | `newEmploymentPayrollSettingId` | **DIFFERENT** |
| `employeeAgreementId` | — (not in model) | **BACKEND ONLY** |
| `crossHireCompleted` | — (not in model) | **BACKEND ONLY** (runtime state) |
| `workLocationUwRequestId` | — (not in model) | **BACKEND ONLY** (runtime state) |
| `positionUwRequestId` | — (not in model) | **BACKEND ONLY** (runtime state) |

The backend interface includes runtime fields (`crossHireCompleted`, `*UwRequestId`, `employeeAgreementId`) that are not persisted in the database — they are populated during execution context building.

---

## 9. TDD "Critical Schema Mismatches" Section

### Verdict: OBSOLETE

The TDD documents two "critical schema mismatches":

1. **`requester_profile_public_id` / `profile_public_id` naming confusion** — Claimed these fields store INTEGER `id` values despite being named `*_public_id`. **Status: OBSOLETE.** Both fields are UUID in production. The naming is now correct.

2. **`new_employment_payroll_setting_id` UUID vs nanoid** — Claimed the model expects UUID but the referenced table uses nanoid. **Status: PARTIALLY RESOLVED.** The migration uses `STRING(50)` (not UUID), so the type is correct in DB. However, the Sequelize model originally defined it as `DataTypes.UUID` — the model was subsequently fixed to use `DataTypes.STRING(50)`.

---

## Findings Summary

| # | Category | Finding | Severity |
|---|----------|---------|----------|
| 1 | **Incorrect** | Schema is `peo`, not `entity_transfer` | Medium |
| 2 | **Incorrect** | `requester_profile_public_id` is UUID, not INTEGER | High |
| 3 | **Incorrect** | `profile_public_id` (signatures) is UUID, not INTEGER | High |
| 4 | **Incorrect** | `new_employment_payroll_setting_id` is VARCHAR(50), not UUID | High |
| 5 | **Incorrect** | `new_pto_policy_id` is UUID, not VARCHAR(64) | Medium |
| 6 | **Incorrect** | `new_work_location_id` is UUID, not VARCHAR(100) | Medium |
| 7 | **Incorrect** | `new_contract_oid` is VARCHAR(20), not VARCHAR(100) | Low |
| 8 | **Replaced** | `new_job_code` dropped, replaced by `new_position_public_id` UUID | High |
| 9 | **Missing** | `new_position_public_id` column not in TDD | High |
| 10 | **Missing** | `peo_employee_transfer_item_signatures` table not in TDD (EEXPR-44) | Medium |
| 11 | **Missing** | `peo_contracts.origin` enum value `entity_transfer` not in TDD | Low |
| 12 | **Missing** | Multiple indexes not documented in TDD (organization_id, base_contract_oid, status, profile_public_id) | Low |
| 13 | **Pending** | `effective_date` will become nullable with EEXPR-44 deployment | Medium |
| 14 | **Obsolete** | TDD's "Critical Schema Mismatches" section about INTEGER profile IDs — fields are UUID now | Medium |
| 15 | **Obsolete** | TDD's description of `new_job_code` as "Position code (e.g., MGR001)" — column no longer exists | High |
| 16 | **Accurate** | Status enum values match for both transfers and items | Info |
| 17 | **Accurate** | SignatureRole and AgreementType enum values match | Info |
| 18 | **Accurate** | Unique constraint on signatures `(transfer_id, profile_public_id, agreement_type)` | Info |
| 19 | **Accurate** | Composite index on `(status, effective_date)` for cron job exists | Info |
| 20 | **Accurate** | FK CASCADE relationships on transfer_id | Info |
