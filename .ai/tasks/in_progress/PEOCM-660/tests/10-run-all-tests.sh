#!/bin/bash
# Run all entity transfer endpoint tests in sequence
#
# This script runs all tests in order and reports results.
# Make sure to set AUTH_TOKEN and test data in config.sh first.

source "$(dirname "$0")/config.sh"

SCRIPT_DIR="$(dirname "$0")"
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║ Entity Transfer API Test Suite                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Configuration:"
echo "  BASE_URL: $BASE_URL"
echo "  AUTH_TOKEN: ${AUTH_TOKEN:0:20}..."
echo ""

# Test sequence
TESTS=(
  "01-create-transfer.sh"
  "02-create-transfer-invalid-payload.sh"
  "03-get-transfer-by-id.sh"
  "04-get-transfer-404.sh"
  "05-get-transfer-item-by-id.sh"
  "06-get-transfer-item-404.sh"
  "07-get-ready-transfers.sh"
)

# Run each test
for test in "${TESTS[@]}"; do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Running: $test"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if bash "${SCRIPT_DIR}/${test}"; then
    ((TESTS_PASSED++))
    echo -e "\n${GREEN}✓ Test passed${NC}"
  else
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$test")
    echo -e "\n${RED}✗ Test failed${NC}"
  fi
  
  sleep 1  # Brief pause between tests
done

# Summary
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║ Test Summary                                                     ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║ Total: $((TESTS_PASSED + TESTS_FAILED))"
echo "║ Passed: $TESTS_PASSED"
echo "║ Failed: $TESTS_FAILED"
echo "╚══════════════════════════════════════════════════════════════════╝"

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
  echo ""
  echo "Failed tests:"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  exit 1
else
  echo ""
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi

