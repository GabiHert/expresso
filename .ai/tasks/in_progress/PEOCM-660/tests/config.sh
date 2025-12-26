#!/bin/bash
# Configuration for Entity Transfer API tests
# 
# Usage:
#   source tests/config.sh
#   Then use $BASE_URL and $AUTH_TOKEN in curl commands

# Base URL for backend service
export BASE_URL="${BASE_URL:-https://api-dev-yvczb3rsul.giger.training}"

# Authentication token (set this before running tests)
# Get token from your local environment or set it here
export AUTH_TOKEN="${AUTH_TOKEN:-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0aW1lc3RhbXAiOjE3NjY0MTM1MDM4MzMsImFkbWluIjp0cnVlLCJkZWVsIjoiZ2FicmllbC5oZXJ0ZXJAZGVlbC5jb20iLCJwcm9maWxlIjoyMDU0NDYyLCJyZWFkT25seSI6ZmFsc2UsImlkIjoxOTUzNzIwLCJpYXQiOjE3NjY0MTM1MDMsImV4cCI6MTc2OTAwNTUwMywiYXVkIjoiZGV2LXl2Y3piM3JzdWwiLCJpc3MiOiJhcGktZGV2LXl2Y3piM3JzdWwuZ2lnZXIudHJhaW5pbmciLCJzdWIiOiJhcGkifQ.Ax3YABfakRYXIsenmtfNV4HUXXqUSXfYexfh-OI48GequAhMneiNEKlzebAIFWCGrRpurfLy8JTGcBLynRnRpfQVLYCiyMxWOInu2Fd0ZRrTghVBIUy0TeaqUMmhu161468axWLTr-SharH_mJXKrBmiYJbXv1wSF5M0Lsp5Gafvh_QQjN4_YzHu_Jmdb1NkHTa1FJLCduh4vNZ5ctsVOqmugU1ADiNBY4F2fkC_eCosKsy5w2Iv3Cq4xHhIWv5xa8y-uWx3siPouZ-HTQPp4ciYEdzkMkjMYy7evXruGGCwfcW7gTAuPYjziT2defh-8cF9VietjOv8A79G-9nW6g}"

# Test data placeholders (update these with real values from your test environment)
export TEST_ORGANIZATION_ID="${TEST_ORGANIZATION_ID:-1}"
export TEST_REQUESTER_PROFILE_ID="${TEST_REQUESTER_PROFILE_ID:-00000000-0000-0000-0000-000000000000}"
export TEST_SOURCE_LEGAL_ENTITY_ID="${TEST_SOURCE_LEGAL_ENTITY_ID:-00000000-0000-0000-0000-000000000000}"
export TEST_DESTINATION_LEGAL_ENTITY_ID="${TEST_DESTINATION_LEGAL_ENTITY_ID:-00000000-0000-0000-0000-000000000000}"
export TEST_BASE_PEO_CONTRACT_OID="${TEST_BASE_PEO_CONTRACT_OID:-EMP001}"
export TEST_NEW_BENEFIT_GROUP_ID="${TEST_NEW_BENEFIT_GROUP_ID:-BG001}"
export TEST_NEW_PAYROLL_SETTINGS_ID="${TEST_NEW_PAYROLL_SETTINGS_ID:-00000000-0000-0000-0000-000000000000}"
export TEST_NEW_PTO_POLICY_ID="${TEST_NEW_PTO_POLICY_ID:-PTO001}"
export TEST_NEW_WORK_LOCATION_ID="${TEST_NEW_WORK_LOCATION_ID:-WL001}"
export TEST_NEW_JOB_CODE="${TEST_NEW_JOB_CODE:-JC001}"
export TEST_NEW_TEAM_ID="${TEST_NEW_TEAM_ID:-1}"
export TEST_EFFECTIVE_DATE="${TEST_EFFECTIVE_DATE:-$(date +%Y-%m-%d)}"

# Colors for output
export GREEN='\033[0;32m'
export RED='\033[0;31m'
export YELLOW='\033[1;33m'
export NC='\033[0m' # No Color

echo "Configuration loaded:"
echo "  BASE_URL: $BASE_URL"
echo "  AUTH_TOKEN: ${AUTH_TOKEN:0:20}..."
echo "  TEST_ORGANIZATION_ID: $TEST_ORGANIZATION_ID"
echo ""

