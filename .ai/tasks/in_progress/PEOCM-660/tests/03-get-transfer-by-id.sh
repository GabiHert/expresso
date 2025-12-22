#!/bin/bash
# Test: Get transfer by ID
# Endpoint: GET /admin/peo/tech_ops/entity_transfer/:id
#
# This test retrieves a transfer by its ID and verifies the response structure.
# Expected: HTTP 200 with full transfer object including items
#
# Prerequisites: Set TRANSFER_ID environment variable (from test 01)

source "$(dirname "$0")/config.sh"

if [ -z "$TRANSFER_ID" ]; then
  echo -e "${RED}Error: TRANSFER_ID not set${NC}"
  echo "Run test 01-create-transfer.sh first, or set TRANSFER_ID manually:"
  echo "  export TRANSFER_ID=\"your-transfer-id-here\""
  exit 1
fi

echo -e "${YELLOW}Test: Get Transfer by ID${NC}"
echo "=============================="
echo "Transfer ID: $TRANSFER_ID"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "${BASE_URL}/admin/peo/tech_ops/entity_transfer/${TRANSFER_ID}" \
  -H "X-Auth-Token: ${AUTH_TOKEN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
  # Verify response structure
  HAS_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
  HAS_ITEMS=$(echo "$BODY" | jq -r '.data.items // empty' 2>/dev/null)
  HAS_STATUS=$(echo "$BODY" | jq -r '.data.status // empty' 2>/dev/null)
  
  if [ -n "$HAS_ID" ] && [ -n "$HAS_ITEMS" ] && [ -n "$HAS_STATUS" ]; then
    echo -e "\n${GREEN}✓ Transfer retrieved successfully${NC}"
    echo "  Transfer ID: $(echo "$BODY" | jq -r '.data.id' 2>/dev/null)"
    echo "  Status: $(echo "$BODY" | jq -r '.data.status' 2>/dev/null)"
    echo "  Items count: $(echo "$BODY" | jq -r '.data.items | length' 2>/dev/null)"
  else
    echo -e "\n${YELLOW}⚠ Response structure may be incomplete${NC}"
  fi
elif [ "$HTTP_CODE" -eq 404 ]; then
  echo -e "\n${RED}✗ Transfer not found${NC}"
  exit 1
else
  echo -e "\n${RED}✗ Request failed with HTTP $HTTP_CODE${NC}"
  exit 1
fi

