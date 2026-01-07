#!/bin/bash
# Test: Get ready transfers
# Endpoint: GET /admin/peo/tech_ops/entity_transfer/ready
#
# This test retrieves transfers that are ready for processing
# (status=SCHEDULED and effectiveDate <= provided date).
# Expected: HTTP 200 with array of ready transfers
#
# Query params:
#   - effectiveDate: YYYY-MM-DD format (required)
#   - limit: max number of results (default: 100, max: 100)

source "$(dirname "$0")/config.sh"

EFFECTIVE_DATE="${1:-${TEST_EFFECTIVE_DATE}}"
LIMIT="${2:-100}"

echo -e "${YELLOW}Test: Get Ready Transfers${NC}"
echo "=============================="
echo "Effective Date: $EFFECTIVE_DATE"
echo "Limit: $LIMIT"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "${BASE_URL}/admin/peo/tech_ops/entity_transfer/ready?effectiveDate=${EFFECTIVE_DATE}&limit=${LIMIT}" \
  -H "X-Auth-Token: ${AUTH_TOKEN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
  # Verify response structure
  IS_ARRAY=$(echo "$BODY" | jq -r '.data | type' 2>/dev/null)
  COUNT=$(echo "$BODY" | jq -r '.count // (.data | length)' 2>/dev/null)
  
  if [ "$IS_ARRAY" = "array" ]; then
    echo -e "\n${GREEN}✓ Ready transfers retrieved successfully${NC}"
    echo "  Count: $COUNT"
    
    # Show status breakdown if transfers exist
    if [ "$COUNT" -gt 0 ]; then
      echo "  Status breakdown:"
      echo "$BODY" | jq -r '.data[]?.status' 2>/dev/null | sort | uniq -c || true
    fi
  else
    echo -e "\n${YELLOW}⚠ Response is not an array${NC}"
  fi
else
  echo -e "\n${RED}✗ Request failed with HTTP $HTTP_CODE${NC}"
  exit 1
fi

