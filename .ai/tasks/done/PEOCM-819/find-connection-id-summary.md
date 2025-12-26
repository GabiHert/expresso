# Finding Integration Connection ID - Summary

## Current Status
- ✅ **Connection ID Found**: `99823f3c-ef7d-4010-842d-9d882c59b74d`
- ✅ **Endpoint Found**: `GET /admin/integrations/organizations/:id`
- ✅ **Script Updated**: `hris-sync-trigger.sh` now has correct `integrationId`

## What We Know
- **Organization ID**: 58362
- **Entity ID**: 1235745
- **Contract OID**: mz2en97
- **Contract ID**: 2577352
- **HRIS Profile OID**: 903421b5-9814-43d8-b9ab-2d48637a9d6e (this is NOT the connection ID)
- **HiBob Integration Provider ID**: 3591175584849330422
- **✅ Integration Connection ID**: `99823f3c-ef7d-4010-842d-9d882c59b74d` (FOUND!)

## Solution Found! ✅

**Endpoint**: `GET /admin/integrations/organizations/58362`

**Connection ID**: `99823f3c-ef7d-4010-842d-9d882c59b74d`

**Response**:
```json
{
  "id": "99823f3c-ef7d-4010-842d-9d882c59b74d",
  "slug": "hibob",
  "name": "Hibob"
}
```

The correct endpoint was `/admin/integrations/organizations/:id` (not `/admin/internal/connections`).

## What to Do Once We Have the Connection ID

1. Update `hris-sync-trigger.sh` with the correct `integrationId`
2. Re-run the sync trigger
3. Verify the employee is now marked as valid
4. Continue with validation steps

