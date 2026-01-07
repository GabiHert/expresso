#!/bin/bash
# Test: Create transfer with invalid payload
# Endpoint: POST /admin/peo/tech_ops/entity_transfer
#
# This test verifies error handling for invalid/missing required fields.
# Expected: HTTP 400 or 422 with error details

source "$(dirname "$0")/config.sh"

echo -e "${YELLOW}Test: Create Transfer with Invalid Payload${NC}"
echo "====================================================="

# Test 1: Missing required fields
echo -e "\n${YELLOW}Test 1: Missing required fields${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/admin/peo/tech_ops/entity_transfer" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${AUTH_TOKEN}" \
  -d "{
    \"organizationId\": ${TEST_ORGANIZATION_ID}
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" -ge 400 ] && [ "$HTTP_CODE" -lt 500 ]; then
  echo -e "${GREEN}✓ Error handling works correctly${NC}"
else
  echo -e "${RED}✗ Expected 4xx error, got $HTTP_CODE${NC}"
fi

# Test 2: Invalid UUID format
echo -e "\n${YELLOW}Test 2: Invalid UUID format${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/admin/peo/tech_ops/entity_transfer" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${AUTH_TOKEN}" \
  -d "{
    \"organizationId\": ${TEST_ORGANIZATION_ID},
    \"requesterProfilePublicId\": \"invalid-uuid\",
    \"sourceLegalEntityPublicId\": \"${TEST_SOURCE_LEGAL_ENTITY_ID}\",
    \"destinationLegalEntityPublicId\": \"${TEST_DESTINATION_LEGAL_ENTITY_ID}\",
    \"effectiveDate\": \"${TEST_EFFECTIVE_DATE}\",
    \"basePeoContractOid\": \"${TEST_BASE_PEO_CONTRACT_OID}\",
    \"newBenefitGroupId\": \"${TEST_NEW_BENEFIT_GROUP_ID}\",
    \"newPayrollSettingsId\": \"${TEST_NEW_PAYROLL_SETTINGS_ID}\",
    \"newPtoPolicyId\": \"${TEST_NEW_PTO_POLICY_ID}\",
    \"newWorkLocationId\": \"${TEST_NEW_WORK_LOCATION_ID}\",
    \"newJobCode\": \"${TEST_NEW_JOB_CODE}\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" -ge 400 ] && [ "$HTTP_CODE" -lt 500 ]; then
  echo -e "${GREEN}✓ UUID validation works correctly${NC}"
else
  echo -e "${RED}✗ Expected 4xx error, got $HTTP_CODE${NC}"
fi

# Test 3: Invalid date format
echo -e "\n${YELLOW}Test 3: Invalid date format${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/admin/peo/tech_ops/entity_transfer" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${AUTH_TOKEN}" \
  -d "{
    \"organizationId\": ${TEST_ORGANIZATION_ID},
    \"requesterProfilePublicId\": \"${TEST_REQUESTER_PROFILE_ID}\",
    \"sourceLegalEntityPublicId\": \"${TEST_SOURCE_LEGAL_ENTITY_ID}\",
    \"destinationLegalEntityPublicId\": \"${TEST_DESTINATION_LEGAL_ENTITY_ID}\",
    \"effectiveDate\": \"invalid-date\",
    \"basePeoContractOid\": \"${TEST_BASE_PEO_CONTRACT_OID}\",
    \"newBenefitGroupId\": \"${TEST_NEW_BENEFIT_GROUP_ID}\",
    \"newPayrollSettingsId\": \"${TEST_NEW_PAYROLL_SETTINGS_ID}\",
    \"newPtoPolicyId\": \"${TEST_NEW_PTO_POLICY_ID}\",
    \"newWorkLocationId\": \"${TEST_NEW_WORK_LOCATION_ID}\",
    \"newJobCode\": \"${TEST_NEW_JOB_CODE}\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" -ge 400 ] && [ "$HTTP_CODE" -lt 500 ]; then
  echo -e "${GREEN}✓ Date validation works correctly${NC}"
else
  echo -e "${RED}✗ Expected 4xx error, got $HTTP_CODE${NC}"
fi

