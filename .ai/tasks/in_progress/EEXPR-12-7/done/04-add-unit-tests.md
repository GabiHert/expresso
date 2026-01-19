<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-add-unit-tests.md                                  ║
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

# Add Unit Tests

## Objective

Create comprehensive unit tests for the unified entity transfers service and controller, covering success scenarios, partial failures, and validation.

## Pre-Implementation

Before starting, explore existing test patterns:
- Look in `backend/__tests__/` or `backend/services/**/__tests__/` for test examples
- Understand the testing framework used (Jest, Mocha, etc.)
- Check how service mocking is done
- Review existing entity transfer tests for patterns

## Implementation Steps

### Step 1: Create Test Directory

**Directory**: `backend/services/entity_transfers/__tests__/`

Or follow the existing test location pattern.

### Step 2: Create Service Unit Tests

**File**: `backend/services/entity_transfers/__tests__/unified_entity_transfer_service.test.js`

```javascript
const {unifiedEntityTransferService} = require('../unified_entity_transfer_service');

// Mock the external services
jest.mock('../../../employee/eor_experience', () => ({
    eorExperienceService: {
        getContractsLegalEntityMovements: jest.fn(),
    },
}));

jest.mock('../../../peo/peo_client_service', () => ({
    peoClientService: {
        getTransfersBySourceEntity: jest.fn(),
    },
}));

const {eorExperienceService} = require('../../../employee/eor_experience');
const {peoClientService} = require('../../../peo/peo_client_service');

describe('UnifiedEntityTransferService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getUnifiedTransfers', () => {
        const mockEorTransfers = [
            {id: 'eor-1', status: 'AWAITING_SIGNATURE', requesterProfileId: 1},
            {id: 'eor-2', status: 'COMPLETED', requesterProfileId: 2},
        ];

        const mockPeoTransfers = {
            transfers: [
                {id: 'peo-1', status: 'DRAFT', organizationId: 100},
                {id: 'peo-2', status: 'SCHEDULED', organizationId: 100},
            ],
            cursor: null,
            hasMore: false,
        };

        describe('when both services succeed', () => {
            it('should return both EOR and PEO transfers', async () => {
                eorExperienceService.getContractsLegalEntityMovements.mockResolvedValue(mockEorTransfers);
                peoClientService.getTransfersBySourceEntity.mockResolvedValue(mockPeoTransfers);

                const result = await unifiedEntityTransferService.getUnifiedTransfers({
                    types: ['eor', 'peo'],
                    organizationId: 123,
                    sourceLegalEntityPublicId: 'uuid-123',
                });

                expect(result.eor).toEqual(mockEorTransfers);
                expect(result.peo).toEqual(mockPeoTransfers);
                expect(result.errors).toBeUndefined();
            });

            it('should call services with correct parameters', async () => {
                eorExperienceService.getContractsLegalEntityMovements.mockResolvedValue([]);
                peoClientService.getTransfersBySourceEntity.mockResolvedValue({transfers: [], cursor: null, hasMore: false});

                await unifiedEntityTransferService.getUnifiedTransfers({
                    types: ['eor', 'peo'],
                    organizationId: 123,
                    sourceLegalEntityPublicId: 'uuid-123',
                    peoStatus: ['DRAFT', 'SCHEDULED'],
                });

                expect(eorExperienceService.getContractsLegalEntityMovements).toHaveBeenCalledWith(123);
                expect(peoClientService.getTransfersBySourceEntity).toHaveBeenCalledWith('uuid-123', {
                    status: 'DRAFT,SCHEDULED',
                });
            });
        });

        describe('when only EOR is requested', () => {
            it('should return only EOR transfers', async () => {
                eorExperienceService.getContractsLegalEntityMovements.mockResolvedValue(mockEorTransfers);

                const result = await unifiedEntityTransferService.getUnifiedTransfers({
                    types: ['eor'],
                    organizationId: 123,
                });

                expect(result.eor).toEqual(mockEorTransfers);
                expect(result.peo).toBeNull();
                expect(peoClientService.getTransfersBySourceEntity).not.toHaveBeenCalled();
            });
        });

        describe('when only PEO is requested', () => {
            it('should return only PEO transfers', async () => {
                peoClientService.getTransfersBySourceEntity.mockResolvedValue(mockPeoTransfers);

                const result = await unifiedEntityTransferService.getUnifiedTransfers({
                    types: ['peo'],
                    sourceLegalEntityPublicId: 'uuid-123',
                });

                expect(result.peo).toEqual(mockPeoTransfers);
                expect(result.eor).toBeNull();
                expect(eorExperienceService.getContractsLegalEntityMovements).not.toHaveBeenCalled();
            });
        });

        describe('partial failure handling', () => {
            it('should return PEO data when EOR fails', async () => {
                eorExperienceService.getContractsLegalEntityMovements.mockRejectedValue(new Error('EOR service unavailable'));
                peoClientService.getTransfersBySourceEntity.mockResolvedValue(mockPeoTransfers);

                const result = await unifiedEntityTransferService.getUnifiedTransfers({
                    types: ['eor', 'peo'],
                    organizationId: 123,
                    sourceLegalEntityPublicId: 'uuid-123',
                });

                expect(result.eor).toBeNull();
                expect(result.peo).toEqual(mockPeoTransfers);
                expect(result.errors).toEqual({eor: 'EOR service unavailable'});
            });

            it('should return EOR data when PEO fails', async () => {
                eorExperienceService.getContractsLegalEntityMovements.mockResolvedValue(mockEorTransfers);
                peoClientService.getTransfersBySourceEntity.mockRejectedValue(new Error('PEO service unavailable'));

                const result = await unifiedEntityTransferService.getUnifiedTransfers({
                    types: ['eor', 'peo'],
                    organizationId: 123,
                    sourceLegalEntityPublicId: 'uuid-123',
                });

                expect(result.eor).toEqual(mockEorTransfers);
                expect(result.peo).toBeNull();
                expect(result.errors).toEqual({peo: 'PEO service unavailable'});
            });

            it('should return errors for both when both fail', async () => {
                eorExperienceService.getContractsLegalEntityMovements.mockRejectedValue(new Error('EOR error'));
                peoClientService.getTransfersBySourceEntity.mockRejectedValue(new Error('PEO error'));

                const result = await unifiedEntityTransferService.getUnifiedTransfers({
                    types: ['eor', 'peo'],
                    organizationId: 123,
                    sourceLegalEntityPublicId: 'uuid-123',
                });

                expect(result.eor).toBeNull();
                expect(result.peo).toBeNull();
                expect(result.errors).toEqual({
                    eor: 'EOR error',
                    peo: 'PEO error',
                });
            });
        });

        describe('status filtering', () => {
            it('should filter EOR transfers client-side by status', async () => {
                eorExperienceService.getContractsLegalEntityMovements.mockResolvedValue(mockEorTransfers);

                const result = await unifiedEntityTransferService.getUnifiedTransfers({
                    types: ['eor'],
                    organizationId: 123,
                    eorStatus: ['AWAITING_SIGNATURE'],
                });

                expect(result.eor).toEqual([
                    {id: 'eor-1', status: 'AWAITING_SIGNATURE', requesterProfileId: 1},
                ]);
            });

            it('should pass PEO status filter to service', async () => {
                peoClientService.getTransfersBySourceEntity.mockResolvedValue(mockPeoTransfers);

                await unifiedEntityTransferService.getUnifiedTransfers({
                    types: ['peo'],
                    sourceLegalEntityPublicId: 'uuid-123',
                    peoStatus: ['DRAFT'],
                });

                expect(peoClientService.getTransfersBySourceEntity).toHaveBeenCalledWith(
                    'uuid-123',
                    {status: 'DRAFT'}
                );
            });
        });
    });
});
```

### Step 3: Create Controller Unit Tests

**File**: `backend/controllers/entity_transfers/__tests__/unified_entity_transfers_controller.test.js`

```javascript
const controller = require('../unified_entity_transfers_controller');
const {unifiedEntityTransferService} = require('../../../services/entity_transfers');

jest.mock('../../../services/entity_transfers', () => ({
    unifiedEntityTransferService: {
        getUnifiedTransfers: jest.fn(),
    },
}));

describe('UnifiedEntityTransfersController', () => {
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    describe('getUnifiedEntityTransfers', () => {
        describe('validation', () => {
            it('should return 400 when PEO requested without sourceLegalEntityPublicId', async () => {
                const query = {
                    types: 'peo',
                    organizationId: 123,
                };

                await controller.getUnifiedEntityTransfers.handler({query, res: mockRes});

                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    message: 'sourceLegalEntityPublicId is required when types includes peo',
                });
            });

            it('should return 400 when EOR requested without organizationId', async () => {
                const query = {
                    types: 'eor',
                    sourceLegalEntityPublicId: 'uuid-123',
                };

                await controller.getUnifiedEntityTransfers.handler({query, res: mockRes});

                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    message: 'organizationId is required when types includes eor',
                });
            });
        });

        describe('success scenarios', () => {
            it('should return 200 with unified transfers', async () => {
                const mockResponse = {
                    eor: [{id: 'eor-1'}],
                    peo: {transfers: [{id: 'peo-1'}], cursor: null, hasMore: false},
                };
                unifiedEntityTransferService.getUnifiedTransfers.mockResolvedValue(mockResponse);

                const query = {
                    types: 'eor,peo',
                    organizationId: 123,
                    sourceLegalEntityPublicId: 'uuid-123',
                };

                await controller.getUnifiedEntityTransfers.handler({query, res: mockRes});

                expect(mockRes.status).toHaveBeenCalledWith(200);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: true,
                    data: mockResponse,
                });
            });

            it('should parse comma-separated types correctly', async () => {
                unifiedEntityTransferService.getUnifiedTransfers.mockResolvedValue({eor: [], peo: null});

                const query = {
                    types: 'eor, peo',
                    organizationId: 123,
                    sourceLegalEntityPublicId: 'uuid-123',
                };

                await controller.getUnifiedEntityTransfers.handler({query, res: mockRes});

                expect(unifiedEntityTransferService.getUnifiedTransfers).toHaveBeenCalledWith(
                    expect.objectContaining({
                        types: ['eor', 'peo'],
                    })
                );
            });

            it('should parse comma-separated status filters correctly', async () => {
                unifiedEntityTransferService.getUnifiedTransfers.mockResolvedValue({eor: [], peo: null});

                const query = {
                    types: 'eor',
                    organizationId: 123,
                    eorStatus: 'AWAITING_SIGNATURE, COMPLETED',
                };

                await controller.getUnifiedEntityTransfers.handler({query, res: mockRes});

                expect(unifiedEntityTransferService.getUnifiedTransfers).toHaveBeenCalledWith(
                    expect.objectContaining({
                        eorStatus: ['AWAITING_SIGNATURE', 'COMPLETED'],
                    })
                );
            });
        });

        describe('error handling', () => {
            it('should return 500 on service error', async () => {
                unifiedEntityTransferService.getUnifiedTransfers.mockRejectedValue(new Error('Service error'));

                const query = {
                    types: 'eor',
                    organizationId: 123,
                };

                await controller.getUnifiedEntityTransfers.handler({query, res: mockRes});

                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    message: 'Service error',
                });
            });
        });
    });
});
```

### Step 4: Run Tests

```bash
# Run specific tests
npm test -- --grep "UnifiedEntityTransfer"

# Or with Jest
npx jest unified_entity_transfer --verbose

# Run all tests to ensure no regressions
npm test
```

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Service unit tests created and passing
- [ ] Controller unit tests created and passing
- [ ] Tests cover: both services succeed
- [ ] Tests cover: only EOR requested
- [ ] Tests cover: only PEO requested
- [ ] Tests cover: EOR fails, PEO succeeds
- [ ] Tests cover: PEO fails, EOR succeeds
- [ ] Tests cover: both services fail
- [ ] Tests cover: EOR status filtering (client-side)
- [ ] Tests cover: PEO status filtering (passed to service)
- [ ] Tests cover: validation errors (missing required params)
- [ ] All existing tests still pass

## Testing

```bash
# Run the new tests
npm test -- unified_entity_transfer

# Verify all tests pass
npm test
```

## Notes

- Mock paths may need adjustment based on actual module structure
- The testing framework (Jest/Mocha) should match the existing codebase
- Consider adding integration tests if there's an existing integration test pattern
