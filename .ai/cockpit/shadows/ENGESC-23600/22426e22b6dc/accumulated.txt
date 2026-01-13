<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-add-jobtitle-lookup.md                            ║
║ TASK: EEXPR-59                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                 ║
║ 2. Update status.yaml with new status                           ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml              ║
║ 5. Update task README with any learnings                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: backend
---

# Add jobTitle Lookup in CreateContractStep

## Objective

Modify `CreateContractStep` to lookup `jobTitle` from `jobCode` before calling `createContract()`, ensuring the employment creation receives the required `jobTitle` field.

## Pre-Implementation

Before starting, verify:
1. The `peoClientMasterService.getPEOJobCodesByEntityId()` method exists and returns job codes with `jobTitle`
2. Review how `workers_service.ts` handles job title resolution for regular contracts

## Implementation Steps

### Step 1: Add Import

**File**: `backend/services/peo/entity_transfer/steps/create_contract_step.ts`

**Instructions**:
Add import for `peoClientMasterService` at the top of the file (around line 5):

```typescript
import {peoClientMasterService} from '../../client_master_service';
```

### Step 2: Add jobTitle Lookup in execute()

**File**: `backend/services/peo/entity_transfer/steps/create_contract_step.ts`

**Instructions**:
Add jobTitle resolution before `buildContractDetails()` call (around line 223, after `const startTime = Date.now();`):

```typescript
// Lookup jobTitle from jobCode using destination entity's job master
let jobTitle: string | undefined;
try {
    const jobCodesList = await peoClientMasterService.getPEOJobCodesByEntityId(
        context.legalEntities.destination.id
    );
    const matchedJob = jobCodesList.find(
        (job) => job.id === context.request.item.newJobCode
    );
    jobTitle = matchedJob?.jobTitle;

    if (jobTitle) {
        this.log.info({
            message: '[CreateContractStep] Resolved jobTitle from jobCode',
            transferId: context.request.transfer.id,
            itemId: context.request.item.id,
            jobCode: context.request.item.newJobCode,
            jobTitle,
        });
    } else {
        this.log.warn({
            message: '[CreateContractStep] Could not find jobTitle for jobCode, using jobCode as fallback',
            transferId: context.request.transfer.id,
            itemId: context.request.item.id,
            jobCode: context.request.item.newJobCode,
            destinationLegalEntityId: context.legalEntities.destination.id,
        });
        // Fallback: use jobCode as jobTitle (better than nothing)
        jobTitle = context.request.item.newJobCode;
    }
} catch (error) {
    this.log.warn({
        message: '[CreateContractStep] Failed to lookup jobTitle from jobCode, using jobCode as fallback',
        transferId: context.request.transfer.id,
        itemId: context.request.item.id,
        jobCode: context.request.item.newJobCode,
        destinationLegalEntityId: context.legalEntities.destination.id,
        error,
    });
    // Fallback: use jobCode as jobTitle
    jobTitle = context.request.item.newJobCode;
}
```

### Step 3: Modify peopleFirstPayload

**File**: `backend/services/peo/entity_transfer/steps/create_contract_step.ts`

**Instructions**:
Update the `peopleFirstPayload` object in the `createContract()` call (around lines 237-241) to include `jobTitle`:

**Before**:
```typescript
peopleFirstPayload: {
    validatedData: {
        jobCode: context.request.item.newJobCode,
    },
},
```

**After**:
```typescript
peopleFirstPayload: {
    validatedData: {
        jobCode: context.request.item.newJobCode,
        jobTitle,
    },
},
```

### Step 4: Add Unit Test

**File**: `backend/services/peo/entity_transfer/steps/create_contract_step.test.ts` (create if doesn't exist)

**Instructions**:
Add a test that verifies jobTitle is resolved and passed to createContract:

```typescript
describe('CreateContractStep', () => {
    describe('execute', () => {
        it('should resolve jobTitle from jobCode and pass to createContract', async () => {
            // Mock peoClientMasterService.getPEOJobCodesByEntityId
            const mockJobCodes = [
                { id: 'JOB001', jobTitle: 'Software Engineer' },
                { id: 'JOB002', jobTitle: 'Product Manager' },
            ];
            jest.spyOn(peoClientMasterService, 'getPEOJobCodesByEntityId')
                .mockResolvedValue(mockJobCodes);

            // Mock peoContractService.createContract
            const createContractSpy = jest.spyOn(peoContractService, 'createContract')
                .mockResolvedValue({ id: 1, oid: 'test-oid', HrisProfileId: 123 });

            // Execute with context containing newJobCode = 'JOB001'
            const context = createMockTransferContext({
                newJobCode: 'JOB001',
            });

            await step.execute(context, mockTransaction);

            // Verify jobTitle was passed
            expect(createContractSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    peopleFirstPayload: expect.objectContaining({
                        validatedData: expect.objectContaining({
                            jobCode: 'JOB001',
                            jobTitle: 'Software Engineer',
                        }),
                    }),
                }),
                true
            );
        });

        it('should use jobCode as fallback when jobTitle not found', async () => {
            // Mock empty response
            jest.spyOn(peoClientMasterService, 'getPEOJobCodesByEntityId')
                .mockResolvedValue([]);

            const createContractSpy = jest.spyOn(peoContractService, 'createContract')
                .mockResolvedValue({ id: 1, oid: 'test-oid', HrisProfileId: 123 });

            const context = createMockTransferContext({
                newJobCode: 'UNKNOWN_JOB',
            });

            await step.execute(context, mockTransaction);

            // Should fallback to jobCode as jobTitle
            expect(createContractSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    peopleFirstPayload: expect.objectContaining({
                        validatedData: expect.objectContaining({
                            jobCode: 'UNKNOWN_JOB',
                            jobTitle: 'UNKNOWN_JOB', // Fallback
                        }),
                    }),
                }),
                true
            );
        });
    });
});
```

## Post-Implementation

After completing:
1. Run existing entity transfer tests: `npm test -- --grep "entity_transfer"`
2. Run a **code review agent** to check for issues
3. Manually test via tech_ops endpoint if available

## Acceptance Criteria

- [ ] `peoClientMasterService` import added
- [ ] jobTitle lookup logic added before createContract() call
- [ ] Proper error handling with fallback to jobCode
- [ ] Logging added for debugging
- [ ] `peopleFirstPayload.validatedData.jobTitle` is passed
- [ ] Unit tests added and passing
- [ ] Existing tests still pass

## Testing

1. **Unit Tests**:
   ```bash
   cd backend
   npm test -- --grep "CreateContractStep"
   ```

2. **Integration Test** (if tech_ops endpoint available):
   ```bash
   curl -X POST "http://localhost:3000/admin/peo/tech_ops/entity_transfer" \
     -H "Content-Type: application/json" \
     -d '{
       "organizationId": 386153,
       "basePeoContractOid": "test-contract-oid",
       "effectiveDate": "2026-01-15",
       ...
     }'
   ```
   Then verify employment was created.

## Notes

- The `peoClientMasterService.getPEOJobCodesByEntityId()` method queries the PEO microservice for job codes
- Job codes are cached, so the additional call has minimal performance impact
- The fallback to using jobCode as jobTitle ensures the transfer doesn't fail even if job master isn't configured
- This mirrors the pattern used in `workers_service.ts` for regular contract creation

## References

- Similar implementation: `backend/services/workers_service.ts:957-968`
- Job code validation: `backend/services/peo/peo_contract_service.ts:135-155`
- Employment schema requiring jobTitle: `employment/src/controllers/employment/dtos/Employment.dto.ts:22`
