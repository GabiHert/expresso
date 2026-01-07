#!/bin/bash
# Test: Resume transfer in resume mode
# Endpoint: POST /admin/peo/tech_ops/entity_transfer
#
# This test resumes a transfer that previously failed.
# Resume mode uses only transferItemId (and optionally resumeFromStep).
# Expected: HTTP 200 with transfer execution result
#
# Prerequisites: 
#   - Set ITEM_ID environment variable (from test 01)
#   - Transfer item should have status FAILED and resumeFromStep set

source "$(dirname "$0")/config.sh"

if [ -z "$ITEM_ID" ]; then
  echo -e "${RED}Error: ITEM_ID not set${NC}"
  echo "Run test 01-create-transfer.sh first, or set ITEM_ID manually:"
  echo "  export ITEM_ID=\"your-item-id-here\""
  exit 1
fi

RESUME_FROM_STEP="${1:-}"  # Optional: specify step to resume from

echo -e "${YELLOW}Test: Resume Transfer${NC}"
echo "========================"
echo "Item ID: $ITEM_ID"
if [ -n "$RESUME_FROM_STEP" ]; then
  echo "Resume from step: $RESUME_FROM_STEP"
fi
echo ""

# Build request body
if [ -n "$RESUME_FROM_STEP" ]; then
  REQUEST_BODY="{
    \"transferItemId\": \"${ITEM_ID}\",
    \"resumeFromStep\": \"${RESUME_FROM_STEP}\"
  }"
else
  REQUEST_BODY="{
    \"transferItemId\": \"${ITEM_ID}\"
  }"
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/admin/peo/tech_ops/entity_transfer" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${AUTH_TOKEN}" \
  -d "$REQUEST_BODY")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 422 ]; then
  SUCCESS=$(echo "$BODY" | jq -r '.success // false' 2>/dev/null)
  STATUS=$(echo "$BODY" | jq -r '.status // empty' 2>/dev/null)
  RESUME_STEP=$(echo "$BODY" | jq -r '.resumeFromStep // empty' 2>/dev/null)
  
  echo -e "\n${GREEN}✓ Resume request processed${NC}"
  echo "  Success: $SUCCESS"
  echo "  Status: $STATUS"
  if [ -n "$RESUME_STEP" ]; then
    echo "  Resume from step: $RESUME_STEP"
  fi
  
  if [ "$SUCCESS" = "true" ]; then
    echo -e "\n${GREEN}✓ Transfer completed successfully${NC}"
  else
    echo -e "\n${YELLOW}⚠ Transfer may have failed or is still processing${NC}"
    echo "  Check error details in response above"
  fi
else
  echo -e "\n${RED}✗ Request failed with HTTP $HTTP_CODE${NC}"
  exit 1
fi

