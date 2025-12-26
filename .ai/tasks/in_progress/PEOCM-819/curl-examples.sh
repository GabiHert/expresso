#!/bin/bash

# Example curl command for HRIS contract endpoint
# GET /admin/hris/contracts/{contractOid}
EXAMPLE_HRIS_CONTRACT_GET='curl '\''https://api-dev-yvczb3rsul.giger.training/admin/hris/contracts/mz2en97'\'' \
  -H '\''accept: application/json, text/plain, */*'\'' \
  -H '\''accept-language: en-US,en;q=0.9'\'' \
  -H '\''cache-control: no-cache'\'' \
  -H '\''origin: https://admin-dev-yvczb3rsul.giger.training'\'' \
  -H '\''pragma: no-cache'\'' \
  -H '\''priority: u=1, i'\'' \
  -H '\''referer: https://admin-dev-yvczb3rsul.giger.training/'\'' \
  -H '\''sec-ch-ua: "Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"'\'' \
  -H '\''sec-ch-ua-mobile: ?0'\'' \
  -H '\''sec-ch-ua-platform: "macOS"'\'' \
  -H '\''sec-fetch-dest: empty'\'' \
  -H '\''sec-fetch-mode: cors'\'' \
  -H '\''sec-fetch-site: same-site'\'' \
  -H '\''user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'\'' \
  -H '\''x-app-host: www-dev-yvczb3rsul.giger.training'\'' \
  -H '\''x-auth-token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0aW1lc3RhbXAiOjE3NjY0MTM1MDM4MzMsImFkbWluIjp0cnVlLCJkZWVsIjoiZ2FicmllbC5oZXJ0ZXJAZGVlbC5jb20iLCJwcm9maWxlIjoyMDU0NDYyLCJyZWFkT25seSI6ZmFsc2UsImlkIjoxOTUzNzIwLCJpYXQiOjE3NjY0MTM1MDMsImV4cCI6MTc2OTAwNTUwMywiYXVkIjoiZGV2LXl2Y3piM3JzdWwiLCJpc3MiOiJhcGktZGV2LXl2Y3piM3JzdWwuZ2lnZXIudHJhaW5pbmciLCJzdWIiOiJhcGkifQ.Ax3YABfakRYXIsenmtfNV4HUXXqUSXfYexfh-OI48GequAhMneiNEKlzebAIFWCGrRpurfLy8JTGcBLynRnRpfQVLYCiyMxWOInu2Fd0ZRrTghVBIUy0TeaqUMmhu161468axWLTr-SharH_mJXKrBmiYJbXv1wSF5M0Lsp5Gafvh_QQjN4_YzHu_Jmdb1NkHTa1FJLCduh4vNZ5ctsVOqmugU1ADiNBY4F2fkC_eCosKsy5w2Iv3Cq4xHhIWv5xa8y-uWx3siPouZ-HTQPp4ciYEdzkMkjMYy7evXruGGCwfcW7gTAuPYjziT2defh-8cF9VietjOv8A79G-9nW6g'\'' \
  -H '\''x-proxy-to: payments'\'''

# HRIS sync trigger endpoint
# POST /admin/peo/automation-test/hris-integration/validate-and-trigger-updates?sync=true
# 
# NOTE: This endpoint requires an array of employees in the body. 
# First, use the GET endpoint below to fetch contract data, then construct the employee payload.
# 
# Required employee fields:
# - hrisIntegrationProviderId (string, required)
# - organizationId (number, required)
# - integrationId (string UUID, required)
# - clientLegalEntityId (string, required)
# - employeeFirstName (string, required)
# - employeeLastName (string, required)
# - employeeEmail (string email, required)
# - startDate (date, optional) - This is the HiBob hire date
# - peoStartDate (date, optional) - This is the PEO start date
#
# Test contract: mz2en97
# Organization: 58362
# Entity: 1235745
# HiBob Integration Provider ID: 3591175584849330422
#
# Example (replace with actual employee data from GET endpoint):
HRIS_SYNC_TRIGGER='curl -X POST '\''https://api-dev-yvczb3rsul.giger.training/admin/peo/automation-test/hris-integration/validate-and-trigger-updates?sync=true'\'' \
  -H '\''accept: application/json, text/plain, */*'\'' \
  -H '\''accept-language: en-US,en;q=0.9'\'' \
  -H '\''cache-control: no-cache'\'' \
  -H '\''content-type: application/json'\'' \
  -H '\''origin: https://admin-dev-yvczb3rsul.giger.training'\'' \
  -H '\''pragma: no-cache'\'' \
  -H '\''priority: u=1, i'\'' \
  -H '\''referer: https://admin-dev-yvczb3rsul.giger.training/'\'' \
  -H '\''sec-ch-ua: "Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"'\'' \
  -H '\''sec-ch-ua-mobile: ?0'\'' \
  -H '\''sec-ch-ua-platform: "macOS"'\'' \
  -H '\''sec-fetch-dest: empty'\'' \
  -H '\''sec-fetch-mode: cors'\'' \
  -H '\''sec-fetch-site: same-site'\'' \
  -H '\''user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'\'' \
  -H '\''x-app-host: www-dev-yvczb3rsul.giger.training'\'' \
  -H '\''x-auth-token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0aW1lc3RhbXAiOjE3NjY0MTM1MDM4MzMsImFkbWluIjp0cnVlLCJkZWVsIjoiZ2FicmllbC5oZXJ0ZXJAZGVlbC5jb20iLCJwcm9maWxlIjoyMDU0NDYyLCJyZWFkT25seSI6ZmFsc2UsImlkIjoxOTUzNzIwLCJpYXQiOjE3NjY0MTM1MDMsImV4cCI6MTc2OTAwNTUwMywiYXVkIjoiZGV2LXl2Y3piM3JzdWwiLCJpc3MiOiJhcGktZGV2LXl2Y3piM3JzdWwuZ2lnZXIudHJhaW5pbmciLCJzdWIiOiJhcGkifQ.Ax3YABfakRYXIsenmtfNV4HUXXqUSXfYexfh-OI48GequAhMneiNEKlzebAIFWCGrRpurfLy8JTGcBLynRnRpfQVLYCiyMxWOInu2Fd0ZRrTghVBIUy0TeaqUMmhu161468axWLTr-SharH_mJXKrBmiYJbXv1wSF5M0Lsp5Gafvh_QQjN4_YzHu_Jmdb1NkHTa1FJLCduh4vNZ5ctsVOqmugU1ADiNBY4F2fkC_eCosKsy5w2Iv3Cq4xHhIWv5xa8y-uWx3siPouZ-HTQPp4ciYEdzkMkjMYy7evXruGGCwfcW7gTAuPYjziT2defh-8cF9VietjOv8A79G-9nW6g'\'' \
  -H '\''x-proxy-to: payments'\'' \
  -d '\''{
    "employees": [
      {
        "hrisIntegrationProviderId": "3591175584849330422",
        "organizationId": 58362,
        "integrationId": "<UUID_FROM_CONTRACT>",
        "clientLegalEntityId": "1235745",
        "employeeFirstName": "<FIRST_NAME>",
        "employeeLastName": "<LAST_NAME>",
        "employeeEmail": "<EMAIL>",
        "startDate": "2025-03-15",
        "peoStartDate": "2026-01-01"
      }
    ]
  }'\'''

