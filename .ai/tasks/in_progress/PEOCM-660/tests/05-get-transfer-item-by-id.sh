#!/bin/bash
# Test: Get transfer item by ID
# Endpoint: GET /admin/peo/tech_ops/entity_transfer/item/:id
#
# This test retrieves a transfer item by its ID and verifies the response.
# Expected: HTTP 200 with item object including parent transfer info
#
# Prerequisites: Set ITEM_ID environment variable (from test 01)

source "$(dirname "$0")/config.sh"

if [ -z "$ITEM_ID" ]; then
  echo -e "${RED}Error: ITEM_ID not set${NC}"
  echo "Run test 01-create-transfer.sh first, or set ITEM_ID manually:"
  echo "  export ITEM_ID=\"your-item-id-here\""
  exit 1
fi

echo -e "${YELLOW}Test: Get Transfer Item by ID${NC}"
echo "===================================="
echo "Item ID: $ITEM_ID"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "${BASE_URL}/admin/peo/tech_ops/entity_transfer/item/${ITEM_ID}" \
  -H "X-Auth-Token: ${AUTH_TOKEN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
  # Verify response structure
  HAS_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
  HAS_TRANSFER=$(echo "$BODY" | jq -r '.data.transfer // empty' 2>/dev/null)
  HAS_STATUS=$(echo "$BODY" | jq -r '.data.status // empty' 2>/dev/null)
  
  if [ -n "$HAS_ID" ] && [ -n "$HAS_TRANSFER" ] && [ -n "$HAS_STATUS" ]; then
    echo -e "\n${GREEN}✓ Transfer item retrieved successfully${NC}"
    echo "  Item ID: $(echo "$BODY" | jq -r '.data.id' 2>/dev/null)"
    echo "  Status: $(echo "$BODY" | jq -r '.data.status' 2>/dev/null)"
    echo "  Transfer ID: $(echo "$BODY" | jq -r '.data.transferId' 2>/dev/null)"
  else
    echo -e "\n${YELLOW}⚠ Response structure may be incomplete${NC}"
  fi
elif [ "$HTTP_CODE" -eq 404 ]; then
  echo -e "\n${RED}✗ Transfer item not found${NC}"
  exit 1
else
  echo -e "\n${RED}✗ Request failed with HTTP $HTTP_CODE${NC}"
  exit 1
fi

