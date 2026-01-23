<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-1-effective-date-service.md                  ║
║ TASK: EEXPR-13                                                   ║
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
# Repository Context (EEXPR-13)
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: EEXPR-13-entity-transfer-post
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Effective Date Calculation Service

## Objective

Create a service to calculate the effective date for entity transfers based on the source legal entity's current pay cycle. The effective date should be the **end of the current pay cycle**.

## Pre-Implementation

Before starting, explore existing payroll settings services:
- `backend/services/ems/payroll_settings_service.js` - `getPayrollStartEndForDate()` method
- `backend/services/globalPayroll/pms_gateway_service.ts` - Alternative calculation

## Implementation Steps

### Step 1: Create the service file

**File**: `backend/services/peo/entity_transfer/services/effective_date_service.ts`

**Instructions**:

Create a new TypeScript service with:

```typescript
interface EffectiveDateResult {
  effectiveDate: string; // YYYY-MM-DD format
  cycleType: string;     // MONTHLY, BIMONTHLY, BIWEEKLY, WEEKLY
  cycleStart: string;    // YYYY-MM-DD
  cycleEnd: string;      // YYYY-MM-DD
}

async function calculateEffectiveDate(
  sourceLegalEntityPublicId: string
): Promise<EffectiveDateResult>
```

### Step 2: Implement the calculation logic

1. **Get legal entity ID from public ID**:
   - Use `LegalEntity.findOne({ where: { publicId } })`

2. **Get payroll settings for source legal entity**:
   - Use `payrollSettingsService.searchPayrollSettings({
       payrollLegalEntityIds: [legalEntityId],
       experienceType: 'PEO',
       isActive: true,
     })`

3. **Calculate current pay cycle**:
   - Get today's date
   - Call `payrollSettingsService.getPayrollStartEndForDate(settings[0], today)`
   - Return the `to` date as the effective date

### Step 3: Handle different cycle types

The calculation differs by cycle type:

**MONTHLY**:
```typescript
{
  from: moment(today).startOf('month').format('YYYY-MM-DD'),
  to: moment(today).endOf('month').format('YYYY-MM-DD')
}
```

**BIMONTHLY**:
```typescript
if (moment(today).date() <= 15) {
  // First half: 1st to 15th
  { from: startOf('month'), to: set('date', 15) }
} else {
  // Second half: 16th to end
  { from: set('date', 16), to: endOf('month') }
}
```

**BIWEEKLY/WEEKLY**:
- Requires fetching first payroll calendar
- Loop through cycles to find which contains current date

### Step 4: Add error handling

- Handle case where legal entity not found
- Handle case where no active payroll settings found
- Handle case where cycle calculation fails

### Step 5: Export the service

Export the function for use in the main entity transfer service.

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Service calculates effective date correctly for MONTHLY cycle
- [ ] Service calculates effective date correctly for BIMONTHLY cycle
- [ ] Service handles BIWEEKLY/WEEKLY cycles (or throws clear error if not supported)
- [ ] Returns cycle type and date range in response
- [ ] Proper error handling for missing data

## Testing

1. Unit test with mocked payroll settings for each cycle type
2. Integration test with real legal entity data (use sql-query MCP to find test data)

## Notes

- Reference: `backend/services/ems/payroll_settings_service.js:478-578`
- This service will be called by the main POST endpoint before creating the transfer
