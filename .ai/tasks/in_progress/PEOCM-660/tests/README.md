# Entity Transfer API Test Suite

This directory contains curl-based test scripts for testing the Entity Transfer endpoints.

## Prerequisites

1. **Backend service running** on `http://localhost:3000` (or update `BASE_URL` in config)
2. **PEO service running** (optional, for direct endpoint tests)
3. **Authentication token** - Set `AUTH_TOKEN` environment variable
4. **Test data** - Update test data placeholders in `config.sh` with real values from your environment
5. **jq** - JSON processor (install with `brew install jq` on macOS)

## Setup

1. **Configure test environment:**
   ```bash
   # Edit config.sh and set your test data
   export AUTH_TOKEN="your-auth-token-here"
   export TEST_ORGANIZATION_ID=1
   export TEST_REQUESTER_PROFILE_ID="uuid-here"
   export TEST_SOURCE_LEGAL_ENTITY_ID="uuid-here"
   export TEST_DESTINATION_LEGAL_ENTITY_ID="uuid-here"
   # ... etc
   ```

2. **Make scripts executable:**
   ```bash
   chmod +x tests/*.sh
   ```

## Test Files

### Core Tests

- **01-create-transfer.sh** - Create a new entity transfer
- **02-create-transfer-invalid-payload.sh** - Test error handling for invalid payloads
- **03-get-transfer-by-id.sh** - Retrieve transfer by ID
- **04-get-transfer-404.sh** - Test 404 handling for non-existent transfers
- **05-get-transfer-item-by-id.sh** - Retrieve transfer item by ID
- **06-get-transfer-item-404.sh** - Test 404 handling for non-existent items
- **07-get-ready-transfers.sh** - Get transfers ready for processing
- **08-resume-transfer.sh** - Resume a failed transfer

### Advanced Tests

- **09-test-direct-peo-endpoints.sh** - Test PEO service endpoints directly (requires PEO service access)

### Utility Scripts

- **10-run-all-tests.sh** - Run all tests in sequence
- **config.sh** - Configuration and shared variables

## Usage

### Run Individual Tests

```bash
# Source config first
source tests/config.sh

# Run a specific test
./tests/01-create-transfer.sh

# After creating a transfer, export IDs for subsequent tests
export TRANSFER_ID="uuid-from-response"
export ITEM_ID="uuid-from-response"

# Run tests that depend on created transfer
./tests/03-get-transfer-by-id.sh
./tests/05-get-transfer-item-by-id.sh
```

### Run All Tests

```bash
./tests/10-run-all-tests.sh
```

### Resume Transfer Test

```bash
# First, create a transfer that fails (or manually set status to FAILED)
./tests/01-create-transfer.sh

# Export the item ID
export ITEM_ID="uuid-from-response"

# Resume the transfer
./tests/08-resume-transfer.sh

# Or resume from a specific step
./tests/08-resume-transfer.sh "create_contract_step"
```

## Endpoints Tested

### Backend Tech Ops Endpoints

- `POST /admin/peo/tech_ops/entity_transfer` - Create or resume transfer
- `GET /admin/peo/tech_ops/entity_transfer/:id` - Get transfer by ID
- `GET /admin/peo/tech_ops/entity_transfer/item/:id` - Get transfer item by ID
- `GET /admin/peo/tech_ops/entity_transfer/ready` - Get ready transfers

### PEO Service Endpoints (Direct)

- `POST /peo/entity-transfer/transfers` - Create transfer
- `GET /peo/entity-transfer/transfers/:id` - Get transfer
- `PATCH /peo/entity-transfer/transfers/:id/status` - Update status
- `PATCH /peo/entity-transfer/items/:id` - Update item
- `GET /peo/entity-transfer/items/:id` - Get item
- `GET /peo/entity-transfer/transfers/ready` - Get ready transfers

## Expected Responses

### Success Response (Create Transfer)
```json
{
  "success": true,
  "transferId": "uuid",
  "itemId": "uuid",
  "status": "COMPLETED",
  "completedSteps": ["step1", "step2", ...],
  "crossHireCompleted": true
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "errorDetails": {
    "message": "...",
    "stack": "..."
  }
}
```

## Test Data Requirements

Before running tests, ensure you have:

- Organization with PEO enabled
- Source legal entity with employees
- Destination legal entity with:
  - Benefit groups
  - Payroll settings
  - PTO policies
  - Work locations
  - Job codes
  - Teams (optional)

## Troubleshooting

### Authentication Errors
- Verify `AUTH_TOKEN` is set and valid
- Check token has required permissions: `admin:contracts.read` and `admin:contracts.write`
- Note: Token is sent in `X-Auth-Token` header (not `Authorization: Bearer`)

### Connection Errors
- Verify backend service is running on `$BASE_URL`
- Check network connectivity
- Verify CORS settings if testing from browser

### Validation Errors
- Check all required fields are provided in test data
- Verify UUID formats are correct
- Ensure date format is YYYY-MM-DD

### 404 Errors
- Verify transfer/item IDs exist in database
- Check IDs are correct UUID format
- Ensure data wasn't deleted between tests

## Next Steps

After running these tests:

1. **Verify database persistence** - Check that transfers and items are saved in PEO database
2. **Test resume functionality** - Create a transfer that fails, then resume it
3. **Test status transitions** - Verify status updates work correctly
4. **Test with multiple items** - Create transfers with multiple employees
5. **Performance testing** - Test with larger datasets

## Notes

- Tests are designed to be run in sequence (some depend on previous tests)
- IDs from successful tests are exported for use in subsequent tests
- All tests include error handling and validation
- Response validation checks for expected structure and fields

