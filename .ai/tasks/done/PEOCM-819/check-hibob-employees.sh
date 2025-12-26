#!/bin/bash

# Check what employees HiBob returns for this connection
# This will help us see if the employee exists in HiBob

HEXDUMP_PATH=/usr/bin/hexdump curl 'https://api-dev-yvczb3rsul.giger.training/admin/integrations/organizations/58362' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'x-auth-token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0aW1lc3RhbXAiOjE3NjY0MTM1MDM4MzMsImFkbWluIjp0cnVlLCJkZWVsIjoiZ2FicmllbC5oZXJ0ZXJAZGVlbC5jb20iLCJwcm9maWxlIjoyMDU0NDYyLCJyZWFkT25seSI6ZmFsc2UsImlkIjoxOTUzNzIwLCJpYXQiOjE3NjY0MTM1MDMsImV4cCI6MTc2OTAwNTUwMywiYXVkIjoiZGV2LXl2Y3piM3JzdWwiLCJpc3MiOiJhcGktZGV2LXl2Y3piM3JzdWwuZ2lnZXIudHJhaW5pbmciLCJzdWIiOiJhcGkifQ.Ax3YABfakRYXIsenmtfNV4HUXXqUSXfYexfh-OI48GequAhMneiNEKlzebAIFWCGrRpurfLy8JTGcBLynRnRpfQVLYCiyMxWOInu2Fd0ZRrTghVBIUy0TeaqUMmhu161468axWLTr-SharH_mJXKrBmiYJbXv1wSF5M0Lsp5Gafvh_QQjN4_YzHu_Jmdb1NkHTa1FJLCduh4vNZ5ctsVOqmugU1ADiNBY4F2fkC_eCosKsy5w2Iv3Cq4xHhIWv5xa8y-uWx3siPouZ-HTQPp4ciYEdzkMkjMYy7evXruGGCwfcW7gTAuPYjziT2defh-8cF9VietjOv8A79G-9nW6g' \
  -H 'x-proxy-to: payments' 2>/dev/null | jq '.[] | select(.slug == "hibob") | {id, slug, name}'

echo ""
echo "Note: To see actual employees from HiBob, we would need to call the internal endpoint:"
echo "GET /internal/connections/99823f3c-ef7d-4010-842d-9d882c59b74d/users"
echo "But this requires internal service access."

