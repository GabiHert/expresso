#!/bin/bash
# Test: Get transfer by non-existent ID (404 test)
# Endpoint: GET /admin/peo/tech_ops/entity_transfer/:id
#
# This test verifies proper 404 handling for non-existent transfers.
# Expected: HTTP 404 with error message

source "$(dirname "$0")/config.sh"

# Use a clearly non-existent UUID
NON_EXISTENT_ID="00000000-0000-0000-0000-000000000000"

echo -e "${YELLOW}Test: Get Transfer by Non-Existent ID (404)${NC}"
echo "====================================================="
echo "Transfer ID: $NON_EXISTENT_ID"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "${BASE_URL}/admin/peo/tech_ops/entity_transfer/${NON_EXISTENT_ID}" \
  -H "X-Auth-Token: ${AUTH_TOKEN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" -eq 404 ]; then
  echo -e "\n${GREEN}✓ 404 error handling works correctly${NC}"
else
  echo -e "\n${RED}✗ Expected HTTP 404, got $HTTP_CODE${NC}"
  exit 1
fi

