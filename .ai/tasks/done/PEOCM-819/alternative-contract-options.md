# Alternative Contract Options for Validation

## Issue with Current Contract

Contract `mz2en97` uses a test employee that doesn't exist in HiBob, so validation fails.

## Alternative Contracts (Recently Synced)

These contracts were synced recently, suggesting their employees exist in HiBob:

### Option 1: Contract `mqqe5zx` (Most Recent)
- **Contract ID**: 2619687
- **PEO Contract ID**: 99522
- **Organization**: 58362
- **HRIS Provider ID**: 3773754477450887342
- **Name**: Jennie Larkin
- **Email**: faked986e71dc8993edb5d5654cb81eec914@test.com
- **Last Sync**: 2025-12-02T17:35:35.274Z

### Option 2: Contract `359vejr`
- **Contract ID**: 2577404
- **PEO Contract ID**: 95631
- **Organization**: 58362
- **HRIS Provider ID**: 3739063889699012932
- **Name**: Loriann Swift
- **Email**: fake60c2f584c5206d3335921b72a4d011a9@test.com
- **Last Sync**: 2025-11-29T16:47:32.961Z

### Option 3: Contract `3y49nry`
- **Contract ID**: 2600348
- **PEO Contract ID**: 98028
- **Organization**: 58362
- **HRIS Provider ID**: 3591175558022561987
- **Name**: Ginny Deckow
- **Email**: fake6cf7131721af7fecbd1552b657e8c598@test.com
- **Last Sync**: 2025-11-28T17:10:38.018Z

## Next Steps

1. Query database for `clientLegalEntityId` for one of these contracts
2. Update `hris-sync-trigger.sh` with the new contract data
3. Re-run validation

## Note

All these contracts have "fake" emails, but they were synced recently, which suggests they exist in HiBob. The validation should work with these contracts.

