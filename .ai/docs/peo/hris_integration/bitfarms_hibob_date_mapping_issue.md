# Bitfarms HiBob Date Mapping Issue

**Date**: January 19, 2025  
**Status**: 🔴 Critical - Client relationship at risk  
**Client**: Bitfarms (142 PEO employees)  
**Integration**: HiBob PEO Integration

---

## Issue Summary

The HiBob integration is incorrectly mapping the start date field, causing significant problems for employee onboarding and data integrity. The HiBob start date is being synced to the **Agreement start date** field instead of the **Start Date** (original start date) field.

### Impact

- **Client Relationship**: Bitfarms is growing frustrated with repeated bugs during onboarding
- **Data Integrity**: Manually corrected dates are being overwritten by HiBob sync
- **401k Eligibility**: Employees cannot show as eligible for 401k due to incorrect start dates
- **Scope**: 142 PEO employees affected

---

## Conversation Log

### Initial Report (Adam Elmonairy)

> **Bitfarms Hibob integration for PEO continuing to cause significant problems**
> 
> Hi team, Bitfarms has 142 PEO employees and is the first (or one of the first) to use the expanded Hibob integration for PEO and it has caused significant problems for employee onboarding, mostly around original start dates. The client has faced bug after bug during onboarding and is currently growing frustrated. Our relationship with them is at risk.
> 
> @adam.elmonairy has made several tickets to request assistance with this, and it has not yet been solved. In part due to incomplete or incorrect action by techops, and in part due to the Hibob integration syncing and skewing the existing data
> 
> Due to the number of issues that have arisen and the scope of data updates that need to be made, we need closer and more targeted tech support to ensure our relationship with the client and the onboarding experience improves
> 
> **Current Priorities:**
> 1. **Original Start Date Updates Needed today**: We have a ticket open here that is assigned to @Hameem. It has another hour until it breaches SLA, but we don't expect a response within this time. This needs to be resolved today so that employees will show eligible for 401k and can make their contribution elections
> 2. **UI issues**: The Deel snapshot UI is showing different PEO agreement start dates for different employees and almost none of them are correct, however, after a few spot checks, some seem correct on the front end. Need help investigating this

### Root Cause Analysis (Adam Elmonairy)

> @Austin Schlueter @Mike Olano The start date in HiBob is mapped to the agreement start date in Deel. Which is the first problem.
> 
> I had to correct the start dates for everyone before sending the invites, but even after that, the imported start dates remained, so I made this ticket.
> 
> They told me that the contract drafts were made with the imported dates from HiBob, so those remained, so I made this ticket to get them all updated.
> 
> With the HiBob sync on, the agreement start date kept getting changed so I had to make similar tickets (another). This lead us to turn off the HiBob sync.
> 
> The next problem we have run into is that the original start dates that I spent hours entering during the initial invite process have been replaced with the PEO start date.
> 
> I need to work with someone directly to fix all of the dates. At the same time, we need the HiBob start date field to be mapped to the original start date field and not the agreement start date field.

### Technical Investigation Request (Austin Schlueter)

> @Matheus Bitarães @gabriel.herter can we verify which date we are syncing to the agreement start date? (see screenshots here)
> 
> The start date in HiBob should map to the Start Date and should not overwrite the agreement start date because HiBob has no notion of Deel PEO start date.
> 
> @adam.elmonairy has had the agreement start dates that he modified overwritten. So we are syncing something that we shouldn't I believe.

---

## Technical Details

### Current Behavior (INCORRECT)

- **HiBob `startDate` field** → Maps to **Deel `agreementStartDate`** ❌
- This causes:
  - Agreement start dates to be overwritten on every sync
  - Original start dates to be replaced with PEO start dates
  - Manual corrections to be lost

### Expected Behavior (CORRECT)

- **HiBob `startDate` field** → Should map to **Deel `startDate`** (original start date) ✅
- **HiBob should NOT** overwrite `agreementStartDate` because:
  - HiBob has no concept of Deel PEO agreement start date
  - Agreement start date is a Deel-specific field for PEO contracts
  - These are two different concepts:
    - **Start Date**: Employee's original start date with the company
    - **Agreement Start Date**: When the PEO agreement/contract starts

### UI Screenshots Context

The screenshots show the "Edit agreement details" form with:
- **Agreement start date** field showing validation error: "Date must be at least Dec 19th 2025" (with value 11/23/2022)
- **Start date** field (conditional, appears when toggle is ON) showing "This field is required"
- Toggle switch: "This employee is already working with Venchi 1178 Broadway LLC prior to starting with Deel PEO"

This indicates:
1. The agreement start date validation is failing
2. The start date field is conditionally required based on the toggle
3. There's confusion between these two date fields

---

## Action Items

### Immediate (Today)

1. ✅ **Verify date mapping in code** - Check where HiBob `startDate` is being mapped
2. ✅ **Fix date mapping** - Change mapping from `agreementStartDate` to `startDate`
3. ✅ **Prevent overwrites** - Ensure HiBob sync does not overwrite `agreementStartDate`
4. ✅ **Fix Bitfarms data** - Work directly with @adam.elmonairy to correct all dates

### Short-term

1. **Review all date fields** - Ensure all date mappings are correct for HiBob integration
2. **Add validation** - Prevent HiBob from overwriting manually set agreement start dates
3. **Documentation** - Update HiBob integration docs with correct date field mappings
4. **Testing** - Add tests to prevent this regression

---

## Code Investigation Needed

### Files to Check

1. **HiBob data mapping service**:
   - `backend/services/peo/peo_hris_integration_service.ts`
   - Look for `startDate` mapping logic
   - Check `_mapHrisIntegrationDataToContractData` method

2. **Date field processing**:
   - Check where `agreementStartDate` is being set from HiBob data
   - Verify `startDate` vs `agreementStartDate` usage

3. **Sync update logic**:
   - `backend/jetstream_consumers/peo_hris_integration_update.js`
   - Domain update processors for date fields

### Key Questions

1. Where is HiBob `startDate` being mapped to `agreementStartDate`?
2. Why is the sync overwriting manually corrected dates?
3. Is there a flag to prevent overwriting `agreementStartDate`?
4. How should we handle the difference between employee start date and PEO agreement start date?

---

## Related Issues

- Multiple tickets created by @adam.elmonairy
- HiBob sync had to be turned off to prevent further data corruption
- Original start dates manually entered were replaced with PEO start dates

---

## Team Assignments

- **Owner**: @Mike Olano (took over from @Austin Schlueter as of Jan 1st)
- **Investigation**: @Matheus Bitarães @gabriel.herter
- **Client Support**: @adam.elmonairy @Justine Danner Mora
- **TechOps**: @Hameem (ticket assigned)

---

## References

- Slack thread: https://deel.enterprise.slack.com/archives/C0A5K0D00MN/p1766173901893559
- Related documentation:
  - [PEO HRIS Integration README](README.md)
  - [HiBob Testing Guide](hibob_testing_guide.md)
  - [Module Overview](module_overview.md)

---

_Last Updated: January 19, 2025_  
_Status: 🔴 Critical - Investigation in progress_
