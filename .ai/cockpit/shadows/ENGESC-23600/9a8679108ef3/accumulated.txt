<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-techops-endpoint.md                                ║
║ TASK: ENGESC-23600                                               ║
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
# Repository Context
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: ENGESC-23600-create-missing-employment-endpoint
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Add Tech Ops Endpoint

## Objective

Add a new tech_ops endpoint `POST /admin/peo/tech_ops/contract/:oid/create_missing_employment` that allows L2/Tech Ops to create missing employment records for PEO contracts.

## Pre-Implementation

Reference existing endpoints in `tech_ops.ts`:
- `/contract/:oid/update_start_date` (lines 32-50) - Similar POST pattern with path param and body
- `/contract/evaluate_peo_vip_assignment/:oid` (lines 151-163) - Simple POST with path param

## Implementation Steps

### Step 1: Add the endpoint

**File**: `backend/controllers/admin/peo/tech_ops.ts`

**Location**: Add after the `evaluatePeoVipAssignment` endpoint (around line 163)

**Instructions**:

Add the following endpoint:

```typescript
/**
 * Creates a missing employment for a PEO contract.
 * Use when a contract exists but employment was not created (e.g., entity transfer bug).
 *
 * The endpoint will:
 * 1. Check if employment already exists (skip if it does)
 * 2. Fetch all required data from the NEW contract and its peo_contracts record
 * 3. Use peo_contracts.peo_start_date for employment start date
 * 4. Resolve jobTitle from jobCode (fallback to jobCode if not found)
 * 5. Create employment via Employment microservice
 *
 * Example tickets: ENGESC-23650, ENGESC-23600
 */
@Post('/contract/:oid/create_missing_employment')
@Joi((joi, db) => ({
    params: joi.object().keys({
        oid: joi.publicId(db.Contract).permission('admin:contracts.write', db.Contract).secure().resolve(false).required(),
    }),
}))
async createMissingEmployment({params, res}) {
    const {oid: contractOid} = params;

    try {
        const result = await peoContractService.createMissingEmploymentForContract({
            contractOid,
        });

        return res.status(HTTP_CODES.ok).json(result);
    } catch (error) {
        if (error instanceof HttpError) {
            throw error;
        }

        return res.status(HTTP_CODES.unprocessable_entity).json({
            success: false,
            error: error.message,
            contractOid,
        });
    }
}
```

### Step 2: Verify the endpoint is accessible

The endpoint will be available at:
```
POST /admin/peo/tech_ops/contract/:oid/create_missing_employment
```

No request body required - all data is read from the database.

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Endpoint exists at `/admin/peo/tech_ops/contract/:oid/create_missing_employment`
- [ ] Endpoint requires `admin:contracts.write` permission
- [ ] Endpoint validates contract OID using `joi.publicId()`
- [ ] Endpoint requires NO body - all data read from database
- [ ] Endpoint returns success response with `employmentId`
- [ ] Endpoint returns `skipped: true` if employment already exists
- [ ] Endpoint handles errors with appropriate HTTP status codes

## Testing

### Manual Testing

1. **Test idempotency** - Call for a contract that already has employment:
```bash
curl -X POST "http://localhost:3000/admin/peo/tech_ops/contract/EXISTING_OID/create_missing_employment" \
  -H "Authorization: Bearer <token>"

# Expected: { "success": true, "skipped": true, "message": "...", "employmentId": "..." }
```

2. **Test creation** - Call for an affected contract:
```bash
curl -X POST "http://localhost:3000/admin/peo/tech_ops/contract/3dzvvwg/create_missing_employment" \
  -H "Authorization: Bearer <token>"

# Expected: { "success": true, "message": "Employment created...", "employmentId": "..." }
```

3. **Test not found** - Call for non-existent contract:
```bash
curl -X POST "http://localhost:3000/admin/peo/tech_ops/contract/INVALID/create_missing_employment" \
  -H "Authorization: Bearer <token>"

# Expected: 404 Not Found
```

## Notes

- This endpoint is for tech ops use only - requires admin permissions
- Safe to call multiple times (idempotent)
- All data is fetched from the NEW contract - no old contract reference needed
- `startDate` is read from `peo_contracts.peo_start_date` - no parameter needed
- `jobTitle` is resolved from `jobCode` automatically (falls back to jobCode if not found)
- `payrollSettingsId` is auto-looked up by Employment service based on legal entity

## Usage for Affected Contracts

After deployment, fix the 19 affected contracts:

```javascript
const affectedContractOids = [
    '3dq6djq',  // peo_start_date: 2026-01-06
    '3e5w458',  // peo_start_date: 2026-01-06
    '32n67rk',  // peo_start_date: 2026-01-06
    '3e5w7xx',  // peo_start_date: 2026-01-06
    '3475r45',  // peo_start_date: 2026-01-07
    '3dzvvwg',  // peo_start_date: 2026-01-07
    'mqrxxzp',  // peo_start_date: 2026-01-07
    '35p22xk',  // peo_start_date: 2026-01-07
    '3yq77rx',  // peo_start_date: 2026-01-07
    '3rz8745',  // peo_start_date: 2026-01-07
    '3yq7per',  // peo_start_date: 2026-01-07
    '39p95e4',  // peo_start_date: 2026-01-07
    'm7pw922',  // peo_start_date: 2026-01-07
    '39p95dw',  // peo_start_date: 2026-01-07
    'mzdg745',  // peo_start_date: 2026-01-07
    'm2pkzvz',  // peo_start_date: 2026-01-07
    'm6p829e',  // peo_start_date: 2026-01-07
    '3yq7pzn',  // peo_start_date: 2026-01-07
    '34pvkev',  // peo_start_date: 2026-01-07
];

for (const oid of affectedContractOids) {
    const response = await fetch(
        `${API_BASE}/admin/peo/tech_ops/contract/${oid}/create_missing_employment`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        }
    );
    console.log(oid, await response.json());
}
```
