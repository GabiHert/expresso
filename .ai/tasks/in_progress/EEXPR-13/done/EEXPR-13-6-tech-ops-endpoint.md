<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: EEXPR-13-6-tech-ops-endpoint.md                       ║
║ TASK: EEXPR-13                                                   ║
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
# Repository Context (EEXPR-13)
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: EEXPR-13-entity-transfer-post
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Tech Ops POST Endpoint

## Objective

Create the tech ops POST endpoint for entity transfer creation. This endpoint orchestrates:
1. Calculate effective date
2. Run sanity checks
3. Create UW requests for missing resources
4. Create transfer with signatures

**Endpoint**: `POST /admin/peo/tech_ops/entity_transfer/create`

## Pre-Implementation

Before starting, explore:
- `backend/controllers/admin/peo/tech_ops.ts` - Existing tech ops controller
- Existing POST endpoint at line 362-497 for reference

## Implementation Steps

### Step 1: Define the request payload

```typescript
interface CreateEntityTransferRequest {
  organizationId: number;
  requesterProfilePublicId: string;
  sourceLegalEntityPublicId: string;
  destinationLegalEntityPublicId: string;
  contracts: Array<{
    basePeoContractOid: string;
    newBenefitGroupId: string;
    newTeamId?: number;
    newPayrollSettingsId: string;
    newPtoPolicyId: string;
    newWorkLocationId: string;
    newPositionPublicId: string;
  }>;
  additionalSignerProfilePublicIds?: string[];
}
```

**Note**: `effectiveDate` is NOT in the payload - it's calculated.

### Step 2: Create the endpoint handler

**File**: `backend/controllers/admin/peo/tech_ops.ts`

Add new route after existing entity_transfer endpoint:

```typescript
router.post('/entity_transfer/create', adminAuth, async (req, res) => {
  // Implementation here
});
```

### Step 3: Implement the orchestration flow

```typescript
// 1. Validate request payload
const payload = validateCreateTransferPayload(req.body);

// 2. Calculate effective date
const effectiveDateResult = await effectiveDateService.calculateEffectiveDate(
  payload.sourceLegalEntityPublicId
);

// 3. Run sanity checks for all contracts
const sanityResult = await entityTransferService.executeSanityChecksOnly(
  payload.contracts,
  {
    organizationId: payload.organizationId,
    sourceLegalEntityPublicId: payload.sourceLegalEntityPublicId,
    destinationLegalEntityPublicId: payload.destinationLegalEntityPublicId,
    effectiveDate: effectiveDateResult.effectiveDate,
  }
);

// 4. If sanity checks failed (excluding missing resources), return 400
if (!sanityResult.success && sanityResult.failures.length > 0) {
  return res.status(400).json({
    success: false,
    errors: sanityResult.failures,
  });
}

// 5. Create UW requests for missing resources
if (sanityResult.missingResources.length > 0) {
  await underwritingRequestService.createUnderwritingRequestsForMissingResources(
    sanityResult.missingResources,
    context
  );
}

// 6. Get employee profile IDs from contracts (for signatures)
const employeeProfileIds = await getEmployeeProfilesForContracts(payload.contracts);

// 7. Build signatures array
const signatures = buildSignaturesArray(
  payload.requesterProfilePublicId,
  employeeProfileIds,
  payload.additionalSignerProfilePublicIds
);

// 8. Create transfer with signatures via PEO
const result = await entityTransferClientService.createTransferWithSignatures(
  {
    organizationId: payload.organizationId,
    requesterProfilePublicId: payload.requesterProfilePublicId,
    sourceLegalEntityPublicId: payload.sourceLegalEntityPublicId,
    destinationLegalEntityPublicId: payload.destinationLegalEntityPublicId,
    effectiveDate: effectiveDateResult.effectiveDate,
    items: payload.contracts.map(c => ({
      baseContractOid: c.basePeoContractOid,
      newBenefitPrismGroupId: c.newBenefitGroupId,
      newEmploymentPayrollSettingId: c.newPayrollSettingsId,
      newPtoPolicyId: c.newPtoPolicyId,
      newWorkLocationId: c.newWorkLocationId,
      newPositionPublicId: c.newPositionPublicId,
      newTeamId: c.newTeamId,
    })),
  },
  signatures
);

// 9. Enrich response with legal entity names, profile info
const enrichedResponse = await enrichTransferResponse(result);

// 10. Return 201 with response
return res.status(201).json({
  transfer: enrichedResponse,
  agreement: null, // Placeholder for future
});
```

### Step 4: Implement helper functions

**buildSignaturesArray**:
```typescript
function buildSignaturesArray(
  requesterProfileId: string,
  employeeProfileIds: string[],
  additionalSignerIds: string[] = []
): Array<{ profilePublicId: string; role: string; agreementType: string }> {
  const signatures = [];

  // Requester (admin)
  signatures.push({
    profilePublicId: requesterProfileId,
    role: 'ADMIN',
    agreementType: 'ENTITY_ASSIGNMENT_AGREEMENT',
  });

  // Employees
  for (const empId of employeeProfileIds) {
    signatures.push({
      profilePublicId: empId,
      role: 'EMPLOYEE',
      agreementType: 'ENTITY_ASSIGNMENT_AGREEMENT',
    });
  }

  // Additional admin signers
  for (const signerId of additionalSignerIds) {
    signatures.push({
      profilePublicId: signerId,
      role: 'ADMIN',
      agreementType: 'ENTITY_ASSIGNMENT_AGREEMENT',
    });
  }

  return signatures;
}
```

**getEmployeeProfilesForContracts**:
```typescript
async function getEmployeeProfilesForContracts(
  contracts: Array<{ basePeoContractOid: string }>
): Promise<string[]> {
  // Get PEO contracts to extract profile IDs
  const profiles = [];
  for (const contract of contracts) {
    const peoContract = await peoContractService.getPEOContract({
      deelContractOid: contract.basePeoContractOid
    });
    if (peoContract?.profilePublicId) {
      profiles.push(peoContract.profilePublicId);
    }
  }
  return profiles;
}
```

### Step 5: Add response enrichment

**enrichTransferResponse**: Fetch legal entity names and profile info to enrich the response.

### Step 6: Add validation

Use Zod or Joi for request payload validation.

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Endpoint accepts POST request with specified payload
- [ ] Effective date is calculated automatically
- [ ] Sanity checks run for all contracts
- [ ] 400 returned with all validation errors if sanity checks fail
- [ ] UW requests created for missing resources
- [ ] Transfer and signatures created via PEO
- [ ] Response includes enriched data (legal entity names, etc.)
- [ ] 201 response on success

## Testing

1. Successful transfer creation with valid contracts
2. 400 response when sanity checks fail
3. UW requests created when resources missing
4. Validation errors for invalid payload

## Notes

- This is a NEW endpoint, separate from the existing full-execution endpoint
- The existing endpoint at line 362-497 runs all 13 steps - this endpoint only creates the transfer
- Authorization: adminAuth middleware (same as existing endpoints)
