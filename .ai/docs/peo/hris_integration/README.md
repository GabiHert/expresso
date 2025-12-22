# PEO HRIS Integration

System for synchronizing employee data from HRIS providers (BambooHR, Hibob, Workday) into PEO contracts, enabling automated employee onboarding and updates.

---

## Overview

The PEO HRIS Integration allows PEO clients to automatically import and sync employee data from their HRIS systems. When employees are added or updated in the HRIS, the system can:

- **Create new PEO contracts** for employees imported from HRIS
- **Update existing contracts** when employee data changes in HRIS
- **Match employees** between HRIS and existing Deel profiles
- **Sync domain-specific updates** (compensation, demographics, job data, bank info, terminations)

**Why it exists**: Eliminates manual data entry for PEO clients who already manage employees in HRIS systems, reducing onboarding time and errors.

**When to use**: 
- PEO clients with active HRIS integrations (BambooHR, Hibob, Workday)
- Organizations that want automated employee synchronization
- Mass onboarding scenarios

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| **HRIS Integration Provider ID** | Unique identifier from HRIS system (`hrisIntegrationProviderId`) used to link HRIS employees with PEO contracts |
| **HRIS Integration Data** | Cached JSON data from HRIS stored in `peo_contract_hris_integration_data` table for change detection |
| **Domain Updates** | Granular update types: Job Data, Demographic, Compensation, Bank Info, Termination |
| **Client Sync Flag** | `isHrisIntegrationSyncActive` flag on PEO clients controls whether sync is enabled for that client |
| **Contract Origin** | PEO contracts created via HRIS integration have origin set to integration slug (e.g., `BAMBOOHR`, `HIBOB`, `WORKDAY_GPC`) |
| **Provider ID Matching** | Links HRIS employees to existing Deel profiles via email matching, then updates contracts with `hrisIntegrationProviderId` |

---

## Architecture / Structure

```
HRIS Provider (BambooHR/Hibob/Workday)
    ↓
Integrations Service (backend/modules/integrations)
    ↓
PEO HRIS Integration Service (backend/services/peo/peo_hris_integration_service.ts)
    ↓
┌─────────────────────────────────────────────────────────┐
│  Event Flow:                                             │
│  1. Integration sync event → PEO update event           │
│  2. PEO update event → Domain-specific events           │
│  3. Domain events → Contract update processors          │
└─────────────────────────────────────────────────────────┘
    ↓
PEO Service (peo/)
    ↓
PEO Contracts & Data Storage
```

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **PEO HRIS Integration Service** | `backend/services/peo/peo_hris_integration_service.ts` | Main service for fetching employees, mapping data, handling updates |
| **HRIS Integration Data Service** | `backend/services/peo/peo_contract_hris_integration_data_service.ts` | Manages cached HRIS data for change detection |
| **PEO Integration Controller** | `backend/controllers/peo_integration/index.js` | Client-facing API endpoints for HRIS integration |
| **Update Listener** | `backend/jetstream_consumers/peo_hris_integration_update.js` | Listens for HRIS sync events and triggers updates |
| **Domain Update Listener** | `backend/jetstream_consumers/peo_hris_integration_update_domain.js` | Processes domain-specific update events |
| **Domain Processors** | `backend/modules/peo/events/processors/contract/peo_hris_integration_update/` | Handle specific domain updates (compensation, job data, etc.) |
| **PEO Contract HRIS Data Model** | `peo/src/models/peoContractHrisIntegrationData/` | Stores cached HRIS integration data |
| **PEO Contract HRIS Data Service** | `peo/src/services/peoContractHrisIntegrationData/` | PEO service for managing HRIS integration data |

---

## Patterns & Conventions

### Pattern 1: HRIS Data Caching with Hash Comparison

**When to use**: Detecting changes in HRIS employee data without reprocessing unchanged records.

**Implementation**:

```typescript
// backend/services/peo/peo_hris_integration_service.ts
const newHashJson = crypto.createHash('md5').update(JSON.stringify(employee)).digest('hex');
if (peoContractHrisIntegrationData?.jsonHash === newHashJson) {
    // Skip processing - data unchanged
    continue;
}
```

**Example from codebase**: 
- [`backend/services/peo/peo_hris_integration_service.ts:L902-L908`](https://github.com/letsdeel/backend/blob/main/services/peo/peo_hris_integration_service.ts#L902-L908)

**Key points**:
- MD5 hash of full employee JSON used for change detection
- Only processes employees when hash differs
- Reduces unnecessary processing and API calls

---

### Pattern 2: Client Legal Entity Resolution

**When to use**: Determining which PEO legal entity an HRIS employee belongs to.

**Resolution order**:
1. **Company Group**: Match from `integrationEmployee.groups` where `type === 'COMPANY'`
2. **Latest Job Work Location**: Extract from most recent job's `workLocation`
3. **Payroll Group Match**: Match `payrollGroup` name to active payroll settings
4. **Fallback**: Use first available payroll setting for organization

**Example from codebase**: 
- [`backend/services/peo/peo_hris_integration_service.ts:L524-L557`](https://github.com/letsdeel/backend/blob/main/services/peo/peo_hris_integration_service.ts#L524-L557)

---

### Pattern 3: Domain-Specific Update Events

**When to use**: Publishing granular update events for specific data domains instead of full contract updates.

**Domains**:
- `Job Data` - Job title, work location, employment type
- `Demographic` - Name, DOB, address, gender
- `Compensation` - Salary, pay method, work hours
- `Bank Info` - Banking details
- `Termination` - Termination date and details

**Implementation**:

```typescript
// backend/services/peo/peo_hris_integration_service.ts
async _publishHrisIntegrationDomainMessages(message) {
    const publisher = new PEOHrisIntegrationUpdateDomainPublisher(message);
    for (const domain of PeoHrisIntegrationUpdateDomainEnum.values) {
        await publisher.publish({domain});
    }
}
```

**Example from codebase**: 
- [`backend/services/peo/peo_hris_integration_service.ts:L948-L953`](https://github.com/letsdeel/backend/blob/main/services/peo/peo_hris_integration_service.ts#L948-L953)

---

### Pattern 4: Compensation Conversion

**When to use**: Converting HRIS compensation data to PEO contract format (annual salary or hourly rate).

**Conversion logic**:
- Supports MONTH, WEEK, YEAR, HOUR pay types
- Converts between types using conversion table
- Handles multiple compensation components
- Selects matching component or converts to expected pay type

**Example from codebase**: 
- [`backend/services/peo/peo_hris_integration_service.ts:L362-L423`](https://github.com/letsdeel/backend/blob/main/services/peo/peo_hris_integration_service.ts#L362-L423)

---

## Integration Points

### Integration with Integrations Service

**Purpose**: Fetch employee data from HRIS providers (BambooHR, Hibob, Workday)

**How**: Uses `hrisProvidersService` and `integrationsService` from `backend/modules/integrations`

**Key methods**:
- `integrationsService.getOrganizationIntegrations(organizationId)` - Get active HRIS integrations
- `hrisProvidersService.getProviderUsers(integrationId, {cursor})` - Fetch employees with pagination

**Example**:
- [`backend/services/peo/peo_hris_integration_service.ts:L127`](https://github.com/letsdeel/backend/blob/main/services/peo/peo_hris_integration_service.ts#L127)

---

### Integration with PEO Service

**Purpose**: Store HRIS integration data and manage contract linking

**How**: Backend calls PEO service endpoints for HRIS integration data management

**Endpoints**:
- `GET /peo/contract-hris-integration-data/:hrisIntegrationProviderId` - Get cached data
- `PATCH /peo/contract-hris-integration-data` - Upsert cached data
- `DELETE /peo/contract-hris-integration-data/contract/:deelContractOid` - Delete by contract
- `DELETE /peo/contract-hris-integration-data/client/:deelLegalEntityPublicId` - Delete by client

**Example**:
- [`backend/services/peo/peo_contract_hris_integration_data_service.ts`](https://github.com/letsdeel/backend/blob/main/services/peo/peo_contract_hris_integration_data_service.ts)

---

### Integration with NATS Events

**Purpose**: Async processing of HRIS updates via event-driven architecture

**Event flow**:
1. Integration sync event → `peo.hris_integration_update` (full employee data)
2. Domain-specific events → `peo.hris_integration_update_domain` (Job Data, Compensation, etc.)
3. New match events → `peo.hris_integration_new_match` (when HRIS employee matches Deel profile)

**Stream**: `peo`
**Consumers**:
- `backend-peo-hris-integration-update` - Processes full updates
- `backend-peo-hris-integration-update-domain` - Processes domain-specific updates
- `backend-peo-hris-integration-new-match` - Handles employee matching

**Example**:
- [`backend/jetstream_consumers/peo_hris_integration_update.js`](https://github.com/letsdeel/backend/blob/main/jetstream_consumers/peo_hris_integration_update.js)

---

## Examples

### Example 1: Fetching Employees from HRIS Integration

**Scenario**: Client wants to see employees available for import from their BambooHR integration

**Code**:
```typescript
// backend/controllers/peo_integration/index.js
app.get('/hris_integration/:integrationId/employees', async (req, res) => {
    const {integrationId} = req.params;
    const {cursor} = req.query;
    
    const employees = await peoHrisIntegrationService.getEmployeesByIntegration({
        integrationId,
        organizationId: organization.id,
        cursor,
        shouldFilterTerminatedEEs: true,
    });
    
    return res.json(employees);
});
```

**Source**: [`backend/controllers/peo_integration/index.js:L988-L1031`](https://github.com/letsdeel/backend/blob/main/controllers/peo_integration/index.js#L988-L1031)

**Key takeaways**:
- Supports pagination via cursor
- Filters terminated employees by default
- Returns mapped employee data ready for contract creation

---

### Example 2: Creating Contracts from HRIS Employees

**Scenario**: Mass onboarding employees from HRIS integration

**Code**:
```typescript
// backend/controllers/peo_integration/index.js
app.post('/hris_integration/create_contracts', async (req, res) => {
    const employees = req.body.employees;
    const contracts = [];
    
    for (const employee of employees) {
        const contract = await sequelize.transaction(async (transaction) => {
            const contractDetails = {
                ...employee,
                origin: req.body.integrationSlug, // BAMBOOHR, HIBOB, etc.
                clientLegalEntityId: legalEntity.id,
                payrollSettingsId,
            };
            
            return await peoContractService.createContract({
                creator: req.profile,
                contractDetails,
                organization: req.organization,
                transaction,
            });
        });
        
        contracts.push(contract);
    }
    
    await peoHrisIntegrationService.sendImportEmailToClient(
        req.profile.id, 
        legalEntity.OrganizationId, 
        contracts, 
        integrationName
    );
    
    res.json(contracts);
});
```

**Source**: [`backend/controllers/peo_integration/index.js:L1099-L1312`](https://github.com/letsdeel/backend/blob/main/controllers/peo_integration/index.js#L1099-L1312)

**Key takeaways**:
- Creates contracts in transaction for atomicity
- Sets contract origin to integration slug
- Sends notification email after creation
- Links contract with `hrisIntegrationProviderId`

---

### Example 3: Handling HRIS Update Events

**Scenario**: Employee data updated in HRIS, system processes update

**Code**:
```typescript
// backend/services/peo/peo_hris_integration_service.ts
async handleNewUpdateMessage(integrationUpdateData): Promise<void> {
    const {organizationId} = integrationUpdateData;
    const integrationId = integrationUpdateData.app.connectionId;
    
    // Get active PEO clients with sync enabled
    const peoClients = await peoClientsService.getClientsByOrganizationId({organizationId});
    const activePeoClientPrismClientIds = peoClients
        .filter((client) => client.isHrisIntegrationSyncActive)
        .map((client) => client.prismClientId);
    
    // Fetch employees from HRIS
    const {employees} = await this.getEmployeesByIntegration({
        integrationId,
        organizationId,
        shouldFilterExistEEs: false,
        shouldReturnOnlyExistEEs: true, // Only existing employees
    });
    
    for (const employee of employees) {
        // Check if data changed
        const existingData = await peoContractHrisIntegrationDataService
            .getPeoContractHrisIntegrationDatabyHrisIntegrationProviderId(
                employee.hrisIntegrationProviderId
            );
        
        const newHashJson = crypto.createHash('md5')
            .update(JSON.stringify(employee))
            .digest('hex');
        
        if (existingData?.jsonHash === newHashJson) {
            continue; // No changes
        }
        
        // Get linked contract
        const peoContract = await peoContractService
            .getPEOContractByHrisIntegrationProviderId(employee.hrisIntegrationProviderId);
        
        if (!peoContract || !activePeoClientPrismClientIds.includes(peoContract.prismClientId)) {
            continue;
        }
        
        // Update cached data
        await peoContractHrisIntegrationDataService.upsertPeoContractHrisIntegrationData({
            hrisIntegrationProviderId: employee.hrisIntegrationProviderId,
            jsonHash: newHashJson,
            jsonData: JSON.stringify(employee),
            hrisIntegrationName: integrationUpdateData?.app?.slug,
            peoContractId: peoContract.id,
        });
        
        // Publish domain-specific update events
        await this._publishHrisIntegrationDomainMessages(employee);
    }
}
```

**Source**: [`backend/services/peo/peo_hris_integration_service.ts:L863-L946`](https://github.com/letsdeel/backend/blob/main/services/peo/peo_hris_integration_service.ts#L863-L946)

**Key takeaways**:
- Only processes updates for clients with `isHrisIntegrationSyncActive = true`
- Skips unchanged data using hash comparison
- Publishes domain-specific events for granular updates
- Handles missing contracts gracefully

---

## Common Pitfalls

### Pitfall 1: Missing Client Sync Flag Check

**Problem**: Updates processed for clients that have disabled HRIS sync

**Why it happens**: Forgetting to check `isHrisIntegrationSyncActive` flag before processing

**Solution**: Always check client sync flag before processing updates

**Good example**: [`backend/services/peo/peo_hris_integration_service.ts:L875-L925`](https://github.com/letsdeel/backend/blob/main/services/peo/peo_hris_integration_service.ts#L875-L925)

---

### Pitfall 2: Not Handling Hash Comparison

**Problem**: Reprocessing unchanged employee data, causing unnecessary updates and API calls

**Why it happens**: Not comparing cached data hash before processing

**Solution**: Always compute hash and compare with cached data before processing

**Good example**: [`backend/services/peo/peo_hris_integration_service.ts:L902-L908`](https://github.com/letsdeel/backend/blob/main/services/peo/peo_hris_integration_service.ts#L902-L908)

---

### Pitfall 3: Incorrect Legal Entity Resolution

**Problem**: Employees assigned to wrong legal entity, causing contract creation failures

**Why it happens**: Not following resolution order or missing fallback logic

**Solution**: Use `_getClientLegalEntityId()` method which implements proper resolution order

**Good example**: [`backend/services/peo/peo_hris_integration_service.ts:L524-L557`](https://github.com/letsdeel/backend/blob/main/services/peo/peo_hris_integration_service.ts#L524-L557)

---

### Pitfall 4: Compensation Conversion Errors

**Problem**: Salary values incorrect due to wrong pay type conversion

**Why it happens**: Not converting compensation components to expected pay type (YEAR or HOUR)

**Solution**: Use `_convertCompensationComponentsToEmploymentPayType()` for proper conversion

**Good example**: [`backend/services/peo/peo_hris_integration_service.ts:L362-L423`](https://github.com/letsdeel/backend/blob/main/services/peo/peo_hris_integration_service.ts#L362-L423)

---

## Testing

**Test patterns**:
- Unit tests for service methods in `backend/__tests__/peo/peo_hris_integration.test.js`
- Integration tests for API endpoints
- Mock HRIS provider responses for testing data mapping

**Example tests**:
- [`backend/__tests__/peo/peo_hris_integration.test.js`](https://github.com/letsdeel/backend/blob/main/__tests__/peo/peo_hris_integration.test.js)

**Key test scenarios**:
- Employee data mapping and transformation
- Legal entity resolution logic
- Compensation conversion
- Hash comparison for change detection
- Client sync flag filtering

---

## API Endpoints

### Client-Facing Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/peo_integration/hris_integration/organization/integrations` | GET | Get active HRIS integrations for organization |
| `/peo_integration/hris_integration/:integrationId/employees` | GET | Fetch employees from HRIS integration (paginated) |
| `/peo_integration/hris_integration/create_contracts` | POST | Create PEO contracts from HRIS employees |
| `/peo_integration/hris_integration/contract/:oid/update` | POST | Full update of HRIS contract |
| `/peo_integration/hris_integration/contract/:oid/partial-update` | PATCH | Partial update of HRIS contract |
| `/peo_integration/hris_integration/contract/:oid` | DELETE | Delete draft HRIS contract |
| `/peo_integration/hris_integration/clients/by-organization/:organizationId` | GET | Get PEO clients for organization |
| `/peo_integration/hris_integration/clients/by-entity/:deelEntityId/update-hris-sync` | PATCH | Enable/disable HRIS sync for client |

### Tech Ops Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/peo-tech/hris_integration/clean_contract_data/:oid` | POST | Clean HRIS integration data for contract (retry sync) |
| `/admin/peo-tech/hris_integration/clean_client_data/:entityId` | POST | Clean HRIS integration data for client |
| `/admin/peo-tech/hris_integration/set_provider_id/:oid` | POST | Manually link contract with HRIS provider ID |
| `/admin/peo-tech/hris_integration/:integrationId/invalid_employees` | GET | Get employees filtered out due to missing data |

---

## Database Schema

### `peo_contract_hris_integration_data` (PEO Service)

Stores cached HRIS integration data for change detection.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INTEGER | Primary key |
| `public_id` | UUID | Public identifier |
| `hris_integration_provider_id` | STRING(255) | HRIS employee provider ID |
| `peo_contract_id` | INTEGER | Foreign key to `peo_contracts` |
| `json_hash` | STRING(255) | MD5 hash of JSON data |
| `json_data` | JSONB | Cached employee data from HRIS |
| `hris_integration_name` | ENUM | Integration name (BAMBOOHR, HIBOB, WORKDAY_GPC) |

**Indexes**:
- `peo_contract_id` - For contract lookups

**Source**: [`peo/src/models/peoContractHrisIntegrationData/peoContractHrisIntegrationData.ts`](https://github.com/letsdeel/peo/blob/main/src/models/peoContractHrisIntegrationData/peoContractHrisIntegrationData.ts)

---

### `peo_contracts.hris_integration_provider_id` (PEO Service)

Links PEO contracts to HRIS employees.

| Column | Type | Purpose |
|--------|------|---------|
| `hris_integration_provider_id` | STRING(255) | HRIS employee provider ID (nullable) |

**Source**: [`peo/src/models/peoContract/peoContract.ts:L79`](https://github.com/letsdeel/peo/blob/main/src/models/peoContract/peoContract.ts#L79)

---

### `peo_clients.is_hris_integration_sync_active` (PEO Service)

Controls whether HRIS sync is enabled for a PEO client.

| Column | Type | Purpose |
|--------|------|---------|
| `is_hris_integration_sync_active` | BOOLEAN | Flag to enable/disable HRIS sync |

**Source**: [`peo/src/models/client/Client.ts:L182`](https://github.com/letsdeel/peo/blob/main/src/models/client/Client.ts#L182)

---

## Related Documentation

### Internal Docs
- [PEO Service Overview](../README.md) - PEO service structure and patterns
- [Entity Transfers](../entity_transfers/) - Entity transfer feature
- [NATS Events](../../_shared/nats-events.md) - Event messaging patterns

### HRIS Integration Documentation
- [Testing Endpoints Guide](testing_endpoints.md) - API endpoints for testing HRIS integration
- [HiBob Testing Guide](hibob_testing_guide.md) - Step-by-step testing guide for HiBob integration
- [Module Overview](module_overview.md) - Comprehensive module documentation with architecture details

### External Docs
- [Integrations Module](../../backend/modules/integrations/) - HRIS provider integration
- [PEO Contract Service](../../backend/services/peo/peo_contract_service.ts) - Contract management

### Related Work
- Completed Task: [_completed_tasks.md](../../_completed_tasks.md) - See HRIS integration related tasks

---

## Maintenance Notes

**Last Reviewed**: 2025-12-18  
**Codebase Version**: Current  
**Status**: ✅ Current

**Known TODOs**:
- [ ] Document domain processor implementations
- [ ] Add examples for each domain update type
- [ ] Document error handling and retry logic
- [ ] Add troubleshooting guide for common issues

**Key Files to Monitor**:
- `backend/services/peo/peo_hris_integration_service.ts` - Main service logic
- `backend/jetstream_consumers/peo_hris_integration_*.js` - Event consumers
- `peo/src/services/peoContractHrisIntegrationData/` - PEO service integration

---

_Created: 2025-12-18_  
_Last Updated: 2025-12-18_  
_Maintained By: PEO Engineering Team_
