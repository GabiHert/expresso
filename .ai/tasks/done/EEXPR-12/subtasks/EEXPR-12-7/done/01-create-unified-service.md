<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-create-unified-service.md                          ║
║ TASK: EEXPR-12-7                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ GIT CONTEXT:                                                     ║
║   Repo: backend                                                  ║
║   Path: /Users/gabriel.herter/Documents/Projects/deel/backend    ║
║   Branch: EEXPR-12-7-unified-entity-transfers                    ║
║                                                                  ║
║ BEFORE GIT OPERATIONS:                                           ║
║   cd /Users/gabriel.herter/Documents/Projects/deel/backend       ║
║   git rev-parse --show-toplevel                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: "backend"
repo_path: "/Users/gabriel.herter/Documents/Projects/deel/backend"
branch: "EEXPR-12-7-unified-entity-transfers"
protected: false
---

# Create Unified Entity Transfers Service

## Objective

Create a service that aggregates entity transfer data from both EOR and PEO services, calling them in parallel and handling partial failures gracefully.

## Pre-Implementation

Before starting, explore existing patterns in `backend/services/` for:
- HTTP client services that call external microservices
- Error handling patterns for service-to-service calls
- Promise.allSettled usage patterns

## Implementation Steps

### Step 1: Create Service Directory

**Directory**: `backend/services/entity_transfers/`

Create the directory if it doesn't exist.

### Step 2: Create Service File

**File**: `backend/services/entity_transfers/unified_entity_transfer_service.js`

**Implementation**:

```javascript
const {eorExperienceService} = require('../../employee/eor_experience');
const {peoClientService} = require('../../peo/peo_client_service');

/**
 * Options for fetching unified transfers
 */
const UnifiedTransferOptions = {
    types: ['eor', 'peo'], // default both
    sourceLegalEntityPublicId: null, // required for PEO
    organizationId: null, // required for EOR
    eorStatus: [], // optional filter
    peoStatus: [], // optional filter
};

/**
 * Fetches entity transfers from both EOR and PEO services in parallel.
 * Returns {eor: [...] | null, peo: {...} | null, errors?: {...}}
 */
async function getUnifiedTransfers(options) {
    const {types, sourceLegalEntityPublicId, organizationId, eorStatus, peoStatus} = options;

    const fetchEor = types.includes('eor');
    const fetchPeo = types.includes('peo');

    const promises = [];
    const promiseKeys = [];

    if (fetchEor) {
        promises.push(fetchEorTransfers(organizationId, eorStatus));
        promiseKeys.push('eor');
    }

    if (fetchPeo) {
        promises.push(fetchPeoTransfers(sourceLegalEntityPublicId, peoStatus));
        promiseKeys.push('peo');
    }

    const results = await Promise.allSettled(promises);

    const response = {
        eor: null,
        peo: null,
    };
    const errors = {};

    results.forEach((result, index) => {
        const key = promiseKeys[index];
        if (result.status === 'fulfilled') {
            response[key] = result.value;
        } else {
            errors[key] = result.reason?.message || 'Unknown error';
            response[key] = null;
        }
    });

    if (Object.keys(errors).length > 0) {
        response.errors = errors;
    }

    return response;
}

/**
 * Fetches EOR transfers from eor-experience service
 */
async function fetchEorTransfers(organizationId, statusFilter) {
    // Call eor-experience service
    const transfers = await eorExperienceService.getContractsLegalEntityMovements(organizationId);

    // Client-side status filtering (EOR doesn't support server-side filtering)
    if (statusFilter && statusFilter.length > 0) {
        return transfers.filter(t => statusFilter.includes(t.status));
    }

    return transfers;
}

/**
 * Fetches PEO transfers from PEO service
 */
async function fetchPeoTransfers(sourceLegalEntityPublicId, statusFilter) {
    const options = {};
    if (statusFilter && statusFilter.length > 0) {
        options.status = statusFilter.join(',');
    }

    // Call PEO service
    return await peoClientService.getTransfersBySourceEntity(sourceLegalEntityPublicId, options);
}

module.exports = {
    getUnifiedTransfers,
};
```

### Step 3: Verify Service Dependencies

Check that these services exist and understand their interfaces:

1. **EOR Service**: Find how backend calls eor-experience service
   - Look in `backend/services/employee/eor_experience/` or similar
   - Understand the method signature for listing movements

2. **PEO Client Service**: Find how backend calls PEO service
   - Look in `backend/services/peo/` for HTTP client
   - Understand the method for getting transfers by source entity

**Note**: The exact import paths may need adjustment based on existing code structure.

### Step 4: Add Index Export

**File**: `backend/services/entity_transfers/index.js`

```javascript
const unifiedEntityTransferService = require('./unified_entity_transfer_service');

module.exports = {
    unifiedEntityTransferService,
};
```

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Service file created at `backend/services/entity_transfers/unified_entity_transfer_service.js`
- [ ] `getUnifiedTransfers()` function accepts options with types, filters, and IDs
- [ ] Uses `Promise.allSettled()` for parallel calls
- [ ] Returns `{eor, peo, errors?}` structure
- [ ] Handles partial failures (one service down, other returns data)
- [ ] Client-side status filtering for EOR implemented
- [ ] Status filter passed through to PEO service

## Testing

Run manual test after controller is created (work item 02).

## Notes

- The exact import paths for `eorExperienceService` and `peoClientService` need to be verified by exploring the codebase
- EOR status filtering is client-side because the EOR endpoint doesn't support it
- PEO status filtering is server-side (passed to PEO service)
