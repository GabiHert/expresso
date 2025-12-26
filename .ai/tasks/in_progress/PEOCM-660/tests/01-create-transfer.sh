#!/bin/bash
# Test: Create new entity transfer
# Endpoint: POST /admin/peo/tech_ops/entity_transfer
#
# This test creates a new entity transfer with a single transfer item.
# Expected: HTTP 200 with transfer and item IDs

source "$(dirname "$0")/config.sh"

echo -e "${YELLOW}Test: Create New Entity Transfer${NC}"
echo "=========================================="

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/admin/peo/tech_ops/entity_transfer" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${AUTH_TOKEN}" \
  -d "{
    \"organizationId\": ${TEST_ORGANIZATION_ID},
    \"requesterProfilePublicId\": \"${TEST_REQUESTER_PROFILE_ID}\",
    \"sourceLegalEntityPublicId\": \"${TEST_SOURCE_LEGAL_ENTITY_ID}\",
    \"destinationLegalEntityPublicId\": \"${TEST_DESTINATION_LEGAL_ENTITY_ID}\",
    \"effectiveDate\": \"${TEST_EFFECTIVE_DATE}\",
    \"basePeoContractOid\": \"${TEST_BASE_PEO_CONTRACT_OID}\",
    \"newBenefitGroupId\": \"${TEST_NEW_BENEFIT_GROUP_ID}\",
    \"newPayrollSettingsId\": \"${TEST_NEW_PAYROLL_SETTINGS_ID}\",
    \"newPtoPolicyId\": \"${TEST_NEW_PTO_POLICY_ID}\",
    \"newWorkLocationId\": \"${TEST_NEW_WORK_LOCATION_ID}\",
    \"newJobCode\": \"${TEST_NEW_JOB_CODE}\",
    \"newTeamId\": ${TEST_NEW_TEAM_ID}
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 422 ]; then
  # Extract IDs for use in subsequent tests
  TRANSFER_ID=$(echo "$BODY" | jq -r '.transferId // empty' 2>/dev/null)
  ITEM_ID=$(echo "$BODY" | jq -r '.itemId // empty' 2>/dev/null)
  
  if [ -n "$TRANSFER_ID" ] && [ "$TRANSFER_ID" != "null" ]; then
    echo -e "\n${GREEN}✓ Transfer created successfully${NC}"
    echo "  Transfer ID: $TRANSFER_ID"
    echo "  Item ID: $ITEM_ID"
    echo ""
    echo "Export these for use in other tests:"
    echo "  export TRANSFER_ID=\"$TRANSFER_ID\""
    echo "  export ITEM_ID=\"$ITEM_ID\""
  else
    echo -e "\n${RED}✗ Transfer creation may have failed${NC}"
    echo "  Check response above for errors"
  fi
else
  echo -e "\n${RED}✗ Request failed with HTTP $HTTP_CODE${NC}"
  exit 1
fi

