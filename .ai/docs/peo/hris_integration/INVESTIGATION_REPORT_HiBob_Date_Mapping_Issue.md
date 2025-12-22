# Investigation Report: HiBob Date Mapping Issue

**Date**: January 19, 2025  
**Investigator**: Gabriel Herter  
**Requested By**: Austin Schlueter  
**Status**: 🔴 **CRITICAL BUG CONFIRMED**

---

## Executive Summary

**Root Cause Identified**: The HiBob integration is incorrectly overwriting the **Contract `effectiveDate`** (agreement start date) with HiBob's `startDate` field during sync updates. This is happening in the job data update processor, which sets `effectiveDate = peoStartDate` where `peoStartDate` comes from HiBob's `startDate`.

**Impact**: 
- Agreement start dates manually set by operations are being overwritten on every HiBob sync
- Original start dates are being replaced with PEO start dates
- 142 Bitfarms employees affected
- Client relationship at risk

**Fix Required**: Remove `effectiveDate` updates from HiBob sync updates, or add guard to prevent overwriting manually set agreement start dates.

---

## Detailed Investigation

### 1. Date Mapping Flow (Initial Import)

**Location**: `backend/services/peo/peo_hris_integration_service.ts:712-713`

```typescript
startDate: integrationEmployee.hireDate,      // ✅ CORRECT: Maps to original start date
peoStartDate: integrationEmployee.startDate, // ✅ CORRECT: Maps to PEO start date
```

**Status**: ✅ **CORRECT** - Initial mapping is correct:
- HiBob `hireDate` → Deel `startDate` (original start date)
- HiBob `startDate` → Deel `peoStartDate` (PEO start date)

---

### 2. Date Mapping Flow (Sync Updates) - **THE BUG**

**Location**: `backend/services/peo/integrations/hris_integration_update/builders/job_data_update_builder.ts:163`

```typescript
static buildContractUpdateData(
    payload: PeoHrisIntegrationUpdateData,
    matchedJobTitle: Job | undefined,
    peoStartDate: string | Date,        // ← Comes from HiBob startDate
    contractStartDate: string | Date,   // ← Comes from HiBob hireDate
    stateCode: string
): ContractUpdateData {
    return {
        // ... other fields ...
        ...(peoStartDate ? {
            effectiveDate: (peoStartDate as unknown) as Date,  // ❌ BUG HERE!
            effectivePlainDate: peoStartDate
        } : {}),
        ...(contractStartDate ? {
            initialEffectiveDate: (contractStartDate as unknown) as Date,
            initialEffectivePlainDate: contractStartDate
        } : {}),
        // ...
    };
}
```

**The Problem**:
- `effectiveDate` on the Contract model represents the **agreement start date** (when the PEO contract starts)
- This field is being set to `peoStartDate`, which comes from HiBob's `startDate`
- **HiBob has no concept of Deel PEO agreement start date** - this is a Deel-specific field
- Every time HiBob syncs, it overwrites manually corrected agreement start dates

**Call Chain**:
1. `peo_hris_integration_service.ts:942` → `_publishHrisIntegrationDomainMessages(employee)`
2. Domain event → `peo_hris_integration_update_job_data_processor.js:33` → `peoHrisIntegrationUpdateService.jobData(this.data)`
3. `hris_integration_update_service.ts:509` → `_jobDataHrisIntegrationUpdateUseCase.execute(...)`
4. `job_data_hris_integration_update_use_case.ts:283-284`:
   ```typescript
   const peoStartDate: string = JobDataUpdateTransformer.formatDate(jobDataUpdateData.peoStartDate, contract.timezone);
   const contractStartDate: string = JobDataUpdateTransformer.formatDate(jobDataUpdateData.startDate, contract.timezone);
   ```
5. `job_data_hris_integration_update_use_case.ts:559` → `JobDataUpdateBuilder.buildContractUpdateData(..., peoStartDate, contractStartDate, ...)`
6. **BUG**: `buildContractUpdateData` sets `effectiveDate = peoStartDate` ❌

---

### 3. What Should Happen

**Contract Date Fields**:
- `effectiveDate` / `effectivePlainDate`: **Agreement start date** (PEO-specific, when contract starts)
- `initialEffectiveDate` / `initialEffectivePlainDate`: **Original start date** (employee's original hire date)

**HiBob Fields**:
- `hireDate`: Employee's original hire date with company
- `startDate`: Employee's start date (could be rehire, transfer, etc.)

**Correct Mapping**:
- HiBob `hireDate` → `initialEffectiveDate` ✅ (already correct)
- HiBob `startDate` → `peoStartDate` in PEO contract ✅ (already correct)
- **HiBob should NOT update `effectiveDate`** ❌ (currently doing this incorrectly)

---

### 4. Additional Issues Found

#### Issue 1: Work Statement Update
**Location**: `job_data_update_builder.ts:176`

```typescript
static buildWorkStatementUpdateData(...): WorkStatementUpdateData {
    return {
        ...(contractStartDate ? {effectiveDate: (contractStartDate as unknown) as Date} : {}),
        ...(peoStartDate ? {effectivePlainDate: peoStartDate} : {}),
        // ...
    };
}
```

**Status**: ⚠️ **POTENTIALLY PROBLEMATIC** - Work statement `effectiveDate` is being set from `contractStartDate` (HiBob hireDate). Need to verify if this is correct.

#### Issue 2: PEO Contract Update
**Location**: `job_data_update_builder.ts:268-269`

```typescript
static buildPeoContractUpdateData(...): PeoContractUpdateData {
    return {
        // ...
        ...(peoStartDate ? {peoStartDate} : {}),  // ✅ CORRECT
        ...(contractStartDate ? {
            origHireDate: contractStartDate,      // ✅ CORRECT
            lastHireDate: contractStartDate      // ✅ CORRECT
        } : {}),
        // ...
    };
}
```

**Status**: ✅ **CORRECT** - PEO contract dates are mapped correctly.

---

## Code Locations Summary

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `backend/services/peo/integrations/hris_integration_update/builders/job_data_update_builder.ts` | 163 | Sets `effectiveDate = peoStartDate` | 🔴 **CRITICAL** |
| `backend/services/peo/integrations/hris_integration_update/builders/job_data_update_builder.ts` | 176 | Sets work statement `effectiveDate` from `contractStartDate` | ⚠️ **REVIEW** |
| `backend/services/peo/peo_hris_integration_service.ts` | 712-713 | Initial mapping (correct) | ✅ OK |

---

## Recommended Fix

### Option 1: Remove `effectiveDate` from Contract Updates (RECOMMENDED)

**Change**: Remove `effectiveDate` and `effectivePlainDate` from `buildContractUpdateData` when called from HRIS integration updates.

**Rationale**: 
- Agreement start date is a Deel-specific concept that HiBob doesn't have
- Should only be set during initial contract creation or manual updates
- Prevents accidental overwrites

**Implementation**:
```typescript
// In job_data_update_builder.ts:149
static buildContractUpdateData(
    payload: PeoHrisIntegrationUpdateData,
    matchedJobTitle: Job | undefined,
    peoStartDate: string | Date,
    contractStartDate: string | Date,
    stateCode: string,
    shouldUpdateEffectiveDate: boolean = false  // ← Add flag
): ContractUpdateData {
    return {
        // ... other fields ...
        // REMOVE or conditionally include:
        ...(shouldUpdateEffectiveDate && peoStartDate ? {
            effectiveDate: (peoStartDate as unknown) as Date,
            effectivePlainDate: peoStartDate
        } : {}),
        // Keep initialEffectiveDate (original start date)
        ...(contractStartDate ? {
            initialEffectiveDate: (contractStartDate as unknown) as Date,
            initialEffectivePlainDate: contractStartDate
        } : {}),
        // ...
    };
}
```

Then in `job_data_hris_integration_update_use_case.ts:559`:
```typescript
const contractUpdateData = JobDataUpdateBuilder.buildContractUpdateData(
    jobDataUpdateData, 
    matchedJobTitle, 
    peoStartDate, 
    contractStartDate, 
    stateCode,
    false  // ← Never update effectiveDate from HRIS sync
);
```

### Option 2: Add Guard to Prevent Overwriting Manual Dates

**Change**: Check if `effectiveDate` was manually set (e.g., different from `peoStartDate`) and skip update if so.

**Rationale**: 
- More defensive approach
- Allows updates if dates match
- Prevents overwriting manual corrections

**Implementation**: Add check in `job_data_hris_integration_update_use_case.ts` before calling `buildContractUpdateData`:
```typescript
// Only update effectiveDate if it hasn't been manually set
const shouldUpdateEffectiveDate = 
    !contract.effectivePlainDate || 
    moment(contract.effectivePlainDate).isSame(moment(peoStartDate), 'day');
```

### Option 3: Feature Flag (Short-term)

**Change**: Add feature flag to disable `effectiveDate` updates from HRIS sync.

**Rationale**: 
- Quick fix to stop the bleeding
- Allows gradual rollout of permanent fix
- Can be toggled per client if needed

---

## Testing Plan

### Unit Tests
1. ✅ Verify `buildContractUpdateData` doesn't set `effectiveDate` when `shouldUpdateEffectiveDate = false`
2. ✅ Verify `initialEffectiveDate` is still set correctly from `contractStartDate`
3. ✅ Verify PEO contract `peoStartDate`, `origHireDate`, `lastHireDate` are still updated correctly

### Integration Tests
1. ✅ Create contract with manual agreement start date
2. ✅ Trigger HiBob sync update
3. ✅ Verify agreement start date is NOT overwritten
4. ✅ Verify original start date IS updated from HiBob `hireDate`
5. ✅ Verify PEO start date IS updated from HiBob `startDate`

### Manual Testing (Bitfarms)
1. ✅ Fix all 142 employee dates manually
2. ✅ Re-enable HiBob sync
3. ✅ Verify dates remain correct after sync
4. ✅ Monitor for 24-48 hours

---

## Immediate Actions

### 1. Hotfix (Today)
- [ ] Implement Option 1 (remove `effectiveDate` from updates)
- [ ] Deploy to production
- [ ] Re-enable HiBob sync for Bitfarms
- [ ] Monitor for date overwrites

### 2. Data Fix (Today)
- [ ] Work with @adam.elmonairy to correct all 142 Bitfarms employee dates
- [ ] Use TechOps tools to bulk update agreement start dates
- [ ] Verify 401k eligibility after date corrections

### 3. Long-term (This Week)
- [ ] Add unit tests to prevent regression
- [ ] Add integration tests for date field updates
- [ ] Document date field semantics in code comments
- [ ] Update HiBob integration documentation

---

## Related Code Files

### Core Files
- `backend/services/peo/peo_hris_integration_service.ts` - Initial mapping (✅ correct)
- `backend/services/peo/integrations/hris_integration_update/builders/job_data_update_builder.ts` - **BUG LOCATION**
- `backend/services/peo/integrations/hris_integration_update/usecases/job_data_hris_integration_update_use_case.ts` - Update orchestration

### Supporting Files
- `backend/modules/peo/events/processors/contract/peo_hris_integration_update/peo_hris_integration_update_job_data_processor.js` - Event processor
- `backend/services/peo/integrations/hris_integration_update/hris_integration_update_service.ts` - Service entry point

---

## Questions for Austin

1. **Should `effectiveDate` ever be updated from HRIS sync?** 
   - My recommendation: **NO** - it's a Deel-specific field

2. **What about work statement `effectiveDate`?**
   - Currently being set from `contractStartDate` (HiBob hireDate)
   - Is this correct, or should it also be protected?

3. **Should we add a feature flag for this fix?**
   - Allows gradual rollout and easy rollback if needed

4. **Data migration strategy?**
   - Should we backfill agreement start dates for all affected contracts?
   - Or only fix Bitfarms and let others be corrected manually?

---

## Conclusion

**Root Cause**: ✅ **CONFIRMED** - `effectiveDate` (agreement start date) is being overwritten by HiBob's `startDate` during sync updates.

**Fix**: Remove `effectiveDate` updates from HRIS integration sync updates. Agreement start date should only be set during initial contract creation or manual updates.

**Priority**: 🔴 **CRITICAL** - Affecting client relationship and blocking 401k eligibility.

**Estimated Fix Time**: 2-4 hours (code + tests + deployment)

---

_Report Generated: January 19, 2025_  
_Next Steps: Review with Austin, implement fix, coordinate data correction with @adam.elmonairy_
