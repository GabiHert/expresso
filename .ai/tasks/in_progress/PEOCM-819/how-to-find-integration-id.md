# How to Find the Correct Integration Connection ID

## Problem
The `integrationId` in the HRIS sync request must be an **Integration Connection UUID**, not a HRIS Profile OID. The value `903421b5-9814-43d8-b9ab-2d48637a9d6e` is a HRIS Profile OID, which doesn't exist as a connection.

## Solution: Query Methods

### Method 1: Use the API Endpoint (Recommended)

**Endpoint:** `GET /hris_integration/organization/integrations`

This endpoint returns all HRIS integrations for an organization.

**Curl Command:**
```bash
curl 'https://api-dev-yvczb3rsul.giger.training/hris_integration/organization/integrations' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-US,en;q=0.9' \
  -H 'cache-control: no-cache' \
  -H 'origin: https://admin-dev-yvczb3rsul.giger.training' \
  -H 'pragma: no-cache' \
  -H 'referer: https://admin-dev-yvczb3rsul.giger.training/' \
  -H 'x-app-host: www-dev-yvczb3rsul.giger.training' \
  -H 'x-auth-token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0aW1lc3RhbXAiOjE3NjY0MTM1MDM4MzMsImFkbWluIjp0cnVlLCJkZWVsIjoiZ2FicmllbC5oZXJ0ZXJAZGVlbC5jb20iLCJwcm9maWxlIjoyMDU0NDYyLCJyZWFkT25seSI6ZmFsc2UsImlkIjoxOTUzNzIwLCJpYXQiOjE3NjY0MTM1MDMsImV4cCI6MTc2OTAwNTUwMywiYXVkIjoiZGV2LXl2Y3piM3JzdWwiLCJpc3MiOiJhcGktZGV2LXl2Y3piM3JzdWwuZ2lnZXIudHJhaW5pbmciLCJzdWIiOiJhcGkifQ.Ax3YABfakRYXIsenmtfNV4HUXXqUSXfYexfh-OI48GequAhMneiNEKlzebAIFWCGrRpurfLy8JTGcBLynRnRpfQVLYCiyMxWOInu2Fd0ZRrTghVBIUy0TeaqUMmhu161468axWLTr-SharH_mJXKrBmiYJbXv1wSF5M0Lsp5Gafvh_QQjN4_YzHu_Jmdb1NkHTa1FJLCduh4vNZ5ctsVOqmugU1ADiNBY4F2fkC_eCosKsy5w2Iv3Cq4xHhIWv5xa8y-uWx3siPouZ-HTQPp4ciYEdzkMkjMYy7evXruGGCwfcW7gTAuPYjziT2defh-8cF9VietjOv8A79G-9nW6g' \
  -H 'x-proxy-to: payments'
```

**Note:** This endpoint requires authentication and organization context. You may need to:
- Set the organization in the request context
- Or use an admin endpoint that accepts organizationId as a parameter

### Method 2: Query via Integrations Service API

The integrations service has an internal API. Check if there's an endpoint like:
- `GET /internal/organizations/{organizationId}/connections`
- `GET /internal/connections?organizationId={organizationId}`

### Method 3: Database Query (If Direct Access)

If you have database access, you could query:

```sql
-- Find integration connections for organization 58362
-- Note: Table names and schema may vary
SELECT 
  c.id as connection_id,
  c.organization_id,
  c.provider_type,
  c.status
FROM integrations.connections c
WHERE c.organization_id = 58362
  AND c.provider_type = 'hibob'
  AND c.status = 'active';
```

**Note:** The actual table structure may be different. The integrations service may use a different database or schema.

### Method 4: Use Admin Endpoint

Check if there's an admin endpoint that can list integrations:
- `GET /admin/integrations/organizations/{organizationId}/connections`
- `GET /admin/peo/integrations?organizationId=58362`

## What to Look For

The response should contain:
- `id` or `connectionId`: The UUID to use as `integrationId`
- `providerType` or `provider`: Should be "hibob" or "HiBob"
- `status`: Should be "active" or "connected"
- `organizationId`: Should match 58362

## Expected Response Format

```json
[
  {
    "id": "actual-connection-uuid-here",
    "organizationId": 58362,
    "provider": "hibob",
    "status": "active",
    "name": "HiBob Integration"
  }
]
```

Use the `id` field as the `integrationId` in your sync request.

## Alternative: Check Contract Data

The contract GET endpoint might also return integration information. Check the response from:
`GET /admin/hris/contracts/mz2en97`

Look for fields like:
- `integrationId`
- `connectionId`
- `hrisIntegration.id`
- `hrisInfo.integrationId`

