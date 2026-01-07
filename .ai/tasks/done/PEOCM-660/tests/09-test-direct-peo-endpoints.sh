#!/bin/bash
# Test: Direct PEO service endpoints (if PEO service is accessible)
# 
# These tests call PEO service endpoints directly (bypassing backend).
# Only use if PEO service is running and accessible.
#
# PEO Base URL (update if different)
PEO_BASE_URL="${PEO_BASE_URL:-http://localhost:4000}"

source "$(dirname "$0")/config.sh"

echo -e "${YELLOW}Test: Direct PEO Service Endpoints${NC}"
echo "=========================================="
echo "PEO Base URL: $PEO_BASE_URL"
echo ""
echo -e "${YELLOW}Note: These tests require direct access to PEO service${NC}"
echo ""

# Test 1: Create transfer via PEO
echo -e "\n${YELLOW}Test 1: POST /peo/entity-transfer/transfers${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${PEO_BASE_URL}/peo/entity-transfer/transfers" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${AUTH_TOKEN}" \
  -d "{
    \"organizationId\": ${TEST_ORGANIZATION_ID},
    \"requesterProfilePublicId\": \"${TEST_REQUESTER_PROFILE_ID}\",
    \"sourceLegalEntityPublicId\": \"${TEST_SOURCE_LEGAL_ENTITY_ID}\",
    \"destinationLegalEntityPublicId\": \"${TEST_DESTINATION_LEGAL_ENTITY_ID}\",
    \"effectiveDate\": \"${TEST_EFFECTIVE_DATE}\",
    \"items\": [{
      \"baseContractOid\": \"${TEST_BASE_PEO_CONTRACT_OID}\",
      \"newBenefitPrismGroupId\": \"${TEST_NEW_BENEFIT_GROUP_ID}\",
      \"newEmploymentPayrollSettingId\": \"${TEST_NEW_PAYROLL_SETTINGS_ID}\",
      \"newPtoPolicyId\": \"${TEST_NEW_PTO_POLICY_ID}\",
      \"newWorkLocationId\": \"${TEST_NEW_WORK_LOCATION_ID}\",
      \"newJobCode\": \"${TEST_NEW_JOB_CODE}\",
      \"newTeamId\": ${TEST_NEW_TEAM_ID}
    }]
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
  PEO_TRANSFER_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
  echo -e "\n${GREEN}✓ Transfer created in PEO${NC}"
  echo "  Transfer ID: $PEO_TRANSFER_ID"
  export PEO_TRANSFER_ID
else
  echo -e "\n${RED}✗ PEO endpoint may not be accessible or request failed${NC}"
  exit 1
fi

# Test 2: Get transfer by ID via PEO
if [ -n "$PEO_TRANSFER_ID" ]; then
  echo -e "\n${YELLOW}Test 2: GET /peo/entity-transfer/transfers/:id${NC}"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "${PEO_BASE_URL}/peo/entity-transfer/transfers/${PEO_TRANSFER_ID}" \
    -H "X-Auth-Token: ${AUTH_TOKEN}")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  echo "HTTP Status: $HTTP_CODE"
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  
  if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "\n${GREEN}✓ Transfer retrieved from PEO${NC}"
  fi
fi

# Test 3: Update transfer status via PEO
if [ -n "$PEO_TRANSFER_ID" ]; then
  echo -e "\n${YELLOW}Test 3: PATCH /peo/entity-transfer/transfers/:id/status${NC}"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
    "${PEO_BASE_URL}/peo/entity-transfer/transfers/${PEO_TRANSFER_ID}/status" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Token: ${AUTH_TOKEN}" \
    -d '{"status": "SCHEDULED"}')
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  echo "HTTP Status: $HTTP_CODE"
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  
  if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "\n${GREEN}✓ Transfer status updated${NC}"
  fi
fi

