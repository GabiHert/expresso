# Entity Transfer Issues to Fix

## Priority: CRITICAL (Blocking API requests)

### 1. Backend: Transform `requesterProfilePublicId` from UUID string to INTEGER

**Issue**: Backend receives UUID string but PEO service expects INTEGER (profile.id)

**Location**: `backend/controllers/admin/peo/tech_ops.ts:224`

**Current Behavior**:
- Backend accepts: `"requesterProfilePublicId": "99b7c17f-3420-4a50-b7d2-58c8c8940f6b"` (UUID string)
- PEO service expects: `1714436` (INTEGER)

**Fix Required**:
```typescript
// Look up profile by public_id to get numeric id
const profile = await Profile.findOne({ where: { public_id: requesterProfilePublicId } });
const requesterProfileId = profile.id; // Use numeric id
```

**Files to Update**:
- `backend/controllers/admin/peo/tech_ops.ts` - Add profile lookup before calling PEO service

---

### 2. Backend: Transform flat payload to nested `items` array structure

**Issue**: Backend receives flat payload but PEO service expects nested `items` array

**Location**: `backend/controllers/admin/peo/tech_ops.ts:295-371`

**Current Structure** (Backend receives):
```json
{
  "basePeoContractOid": "3v9x7yz",
  "newPayrollSettingsId": "cm9kf4nvo0000016t657ug818",
  "newBenefitGroupId": "1",
  "newPtoPolicyId": "4dae5dd9-7db3-41b7-b439-c551cc3bf5b7",
  ...
}
```

**Expected Structure** (PEO service):
```json
{
  "items": [{
    "baseContractOid": "3v9x7yz",
    "newEmploymentPayrollSettingId": "...",
    "newBenefitPrismGroupId": "1",
    "newPtoPolicyId": "4dae5dd9-7db3-41b7-b439-c551cc3bf5b7",
    ...
  }]
}
```

**Field Name Mappings**:
- `basePeoContractOid` → `baseContractOid`
- `newBenefitGroupId` → `newBenefitPrismGroupId`
- `newPayrollSettingsId` → `newEmploymentPayrollSettingId`

**Fix Required**:
```typescript
const items = [{
  baseContractOid: body.basePeoContractOid,
  newBenefitPrismGroupId: body.newBenefitGroupId,
  newEmploymentPayrollSettingId: body.newPayrollSettingsId, // See issue #3
  newPtoPolicyId: body.newPtoPolicyId,
  newWorkLocationId: body.newWorkLocationId,
  newJobCode: body.newJobCode,
  newTeamId: body.newTeamId,
}];
```

**Files to Update**:
- `backend/controllers/admin/peo/tech_ops.ts` - Transform payload structure before calling PEO service

---

### 3. Schema Mismatch: `newEmploymentPayrollSettingId` UUID vs Nanoid

**Issue**: Model expects UUID but database stores nanoids (TEXT)

**Location**: 
- Model: `peo/src/models/entityTransfer/PeoEmployeeTransferItem.ts:80-85`
- DTO: `peo/src/controllers/entityTransfer/entityTransferDto.ts:7`
- Database: `employment.payroll_settings.id` (TEXT/nanoid)

**Current State**:
- Model definition: `DataTypes.UUID` 
- Database reality: `TEXT` (nanoid like `"cm9kf4nvo0000016t657ug818"`)
- DTO validation: `z.string().uuid()` (requires UUID format)

**Options to Fix**:

**Option A: Change Model to Accept Nanoids** (Recommended - Quick Fix)
- Update `PeoEmployeeTransferItem` model: Change `DataTypes.UUID` → `DataTypes.STRING`
- Update DTO schema: Change `z.string().uuid()` → `z.string().min(1)`
- **Pros**: Quick fix, matches database reality
- **Cons**: Less type safety

**Option B: Add UUID Field to Database** (Better Long-term)
- Add `public_id UUID` column to `employment.payroll_settings`
- Migrate existing records to have UUIDs
- Update model to use `public_id` instead of `id`
- **Pros**: Better type safety, consistent with other entities
- **Cons**: Requires database migration, more work

**Option C: Create Mapping/Lookup**
- Check if payroll_settings has a UUID field elsewhere
- Use that field instead of `id`
- **Pros**: No schema changes needed
- **Cons**: May not exist

**Recommended**: Option A for immediate fix, Option B for long-term

**Files to Update**:
- `peo/src/models/entityTransfer/PeoEmployeeTransferItem.ts:80-85` - Change UUID to STRING
- `peo/src/controllers/entityTransfer/entityTransferDto.ts:7` - Change UUID validation to string

---

### 4. Backend: Handle `agreementId` - Remove invalid default generation

**Issue**: Backend generates non-UUID test values when `agreementId` is not provided

**Location**: `backend/controllers/admin/peo/tech_ops.ts:283`

**Current Behavior**:
```typescript
agreementId: agreementId || `TEST-AGREEMENT-${Date.now()}`, // Generates: "TEST-AGREEMENT-1766493568137"
```

**Problem**: PEO service expects either `undefined` or a valid UUID

**Fix Required**:
```typescript
// Option 1: Don't send if not provided
const agreementId = body.agreementId && isValidUUID(body.agreementId) 
  ? body.agreementId 
  : undefined;

// Option 2: Generate valid UUID for testing
const agreementId = body.agreementId || (isTest ? generateUUID() : undefined);
```

**Files to Update**:
- `backend/controllers/admin/peo/tech_ops.ts:283` - Remove invalid default generation

---

## Priority: HIGH (Data Integrity & Clarity)

### 5. Field Naming Confusion: `*_profile_public_id` Fields

**Issue**: Field names suggest UUID `public_id` but actually store INTEGER `id`

**Affected Fields**:
- `peo_employee_transfers.requester_profile_public_id` → INTEGER (profile.id)
- `peo_employee_transfer_signatures.profile_public_id` → INTEGER (profile.id)

**Problem**: Field names are misleading - developers expect UUID but need to provide INTEGER

**Options to Fix**:

**Option A: Rename Fields** (Breaking Change)
- Rename to `requester_profile_id` and `profile_id`
- Update models, migrations, and all references
- **Pros**: Clear naming, no confusion
- **Cons**: Breaking change, requires migration

**Option B: Update Documentation Only** (Non-breaking)
- Keep field names but document clearly
- Add comments in models explaining the naming
- **Pros**: No breaking changes
- **Cons**: Confusion remains

**Recommended**: Option B for now, Option A in future refactor

**Files to Update**:
- `peo/src/models/entityTransfer/PeoEmployeeTransfer.ts:56-61` - Add clarifying comments
- `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts:63-68` - Add clarifying comments
- Documentation files

---

## Priority: MEDIUM (Code Quality & Consistency)

### 6. Backend: Add Input Validation for Field Name Mappings

**Issue**: Backend accepts different field names than PEO service expects

**Current State**:
- Backend accepts: `basePeoContractOid`, `newBenefitGroupId`, `newPayrollSettingsId`
- PEO service expects: `baseContractOid`, `newBenefitPrismGroupId`, `newEmploymentPayrollSettingId`

**Fix Required**: Document the mapping clearly and add validation/transformation

**Files to Update**:
- `backend/controllers/admin/peo/tech_ops.ts` - Add transformation layer
- API documentation

---

### 7. Missing Error Handling for Profile Lookup

**Issue**: If profile lookup fails (profile not found), error handling is unclear

**Fix Required**:
```typescript
const profile = await Profile.findOne({ where: { public_id: requesterProfilePublicId } });
if (!profile) {
  throw new HttpError(404, `Profile not found: ${requesterProfilePublicId}`);
}
```

**Files to Update**:
- `backend/controllers/admin/peo/tech_ops.ts` - Add error handling

---

### 8. Verify Database Tables Exist

**Issue**: Tables may not exist in database (migrations may not have run)

**Check Required**:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'entity_transfer';
```

**If tables don't exist**:
- Create migration files based on model definitions
- Run migrations to create tables

**Files to Check**:
- Migration files in PEO service
- Database schema

---

## Priority: LOW (Documentation & Testing)

### 9. Update API Documentation

**Issue**: API docs don't reflect actual data types and structure expected

**Fix Required**:
- Document that `requesterProfilePublicId` should be UUID in API but gets transformed to INTEGER
- Document the flat payload structure vs nested items array
- Document field name mappings

**Files to Update**:
- API documentation files
- OpenAPI/Swagger specs if they exist

---

### 10. Add Integration Tests

**Issue**: No tests verify the transformation from backend format to PEO service format

**Fix Required**:
- Add tests for profile UUID → INTEGER transformation
- Add tests for flat payload → nested items array transformation
- Add tests for field name mappings
- Add tests for error cases (profile not found, invalid UUID, etc.)

**Files to Create/Update**:
- `backend/controllers/admin/peo/tech_ops.spec.ts` - Add transformation tests

---

## Summary: Quick Fix Checklist

### Immediate (Blocking):
- [ ] Fix #1: Transform `requesterProfilePublicId` UUID → INTEGER
- [ ] Fix #2: Transform flat payload to nested `items` array
- [ ] Fix #3: Resolve `newEmploymentPayrollSettingId` UUID vs nanoid (choose Option A or B)
- [ ] Fix #4: Remove invalid `agreementId` default generation

### Short-term (High Priority):
- [ ] Fix #5: Document/clarify `*_profile_public_id` field naming
- [ ] Fix #6: Add validation for field name mappings
- [ ] Fix #7: Add error handling for profile lookup
- [ ] Fix #8: Verify tables exist, create migrations if needed

### Long-term (Quality):
- [ ] Fix #9: Update API documentation
- [ ] Fix #10: Add integration tests

---

## Files That Need Changes

### Backend:
1. `backend/controllers/admin/peo/tech_ops.ts` - Main transformation logic
2. `backend/services/peo/entity_transfer_client_service.ts` - May need updates for type safety

### PEO Service:
1. `peo/src/models/entityTransfer/PeoEmployeeTransferItem.ts` - Fix UUID vs nanoid
2. `peo/src/controllers/entityTransfer/entityTransferDto.ts` - Update validation schema
3. `peo/src/models/entityTransfer/PeoEmployeeTransfer.ts` - Add clarifying comments
4. `peo/src/models/entityTransfer/PeoEmployeeTransferSignature.ts` - Add clarifying comments

### Documentation:
1. API documentation files
2. `.ai/tasks/in_progress/PEOCM-660/README.md` - Update with findings

