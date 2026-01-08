<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-update-i9-validation.md                            ║
║ TASK: EEXPR-56                                                   ║
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
repo: backend
---

# Update I-9 Validation Logic

## Objective

Modify the CrossHireSanityCheckStep's I-9 validation for Z04 (Alien Authorized) citizenship to match PEO's `validateForIntegrate()` conditional logic instead of requiring all 5 fields unconditionally.

## Pre-Implementation

Reference the PEO validation source of truth:
- `peo/src/models/peoContract/peoContract.ts:211-239`

## Implementation Steps

### Step 1: Update Z04 validation in cross_hire_sanity_check_step.ts

**File**: `backend/services/peo/entity_transfer/steps/cross_hire_sanity_check_step.ts`

**Lines to modify**: 99-119 (the Z04 validation block)

**Current code** (remove this):
```typescript
if (data.citizenStatus === 'Z04') {
    const i9Fields = [
        {field: 'i9AlienRegistrationNumber', name: 'I-9 Alien Registration Number'},
        {field: 'i9AlienRegistrationExpiration', name: 'I-9 Alien Registration Expiration'},
        {field: 'i94AdmissionNumber', name: 'I-94 Admission Number'},
        {field: 'i9ForeignPassportNumber', name: 'I-9 Foreign Passport Number'},
        {field: 'i9PassportIssuingCountry', name: 'I-9 Passport Issuing Country'},
    ] as const;

    for (const {field, name} of i9Fields) {
        const value = data[field];
        if (!value || value.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${name} is required for Alien Authorized status`,
                path: [field],
            });
        }
    }
}
```

**New code** (matching PEO logic):
```typescript
if (data.citizenStatus === 'Z04') {
    // Alien Registration: if number exists, expiration is required (and vice versa)
    const hasAlienRegNumber = data.i9AlienRegistrationNumber && data.i9AlienRegistrationNumber.trim() !== '';
    const hasAlienRegExpiration = !!data.i9AlienRegistrationExpiration;

    if (hasAlienRegNumber && !hasAlienRegExpiration) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'I-9 Alien Registration Expiration is required when Alien Registration Number is present',
            path: ['i9AlienRegistrationExpiration'],
        });
    }

    if (hasAlienRegExpiration && !hasAlienRegNumber) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'I-9 Alien Registration Number is required when Alien Registration Expiration is present',
            path: ['i9AlienRegistrationNumber'],
        });
    }

    // Passport fields: only required if one of them is present
    const hasPassportNumber = data.i9ForeignPassportNumber && data.i9ForeignPassportNumber.trim() !== '';
    const hasPassportCountry = data.i9PassportIssuingCountry && data.i9PassportIssuingCountry.trim() !== '';

    if (hasPassportCountry && !hasPassportNumber) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'I-9 Foreign Passport Number is required when Passport Issuing Country is present',
            path: ['i9ForeignPassportNumber'],
        });
    }

    if (hasPassportNumber && !hasPassportCountry) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'I-9 Passport Issuing Country is required when Foreign Passport Number is present',
            path: ['i9PassportIssuingCountry'],
        });
    }

    // NOTE: i94AdmissionNumber is NOT validated (PEO doesn't require it)
}
```

### Step 2: Verify Z03 validation unchanged

**Lines**: 88-97

Ensure the Z03 (Permanent Resident) validation remains unchanged:
```typescript
if (data.citizenStatus === 'Z03') {
    if (!data.i9AlienRegistrationNumber || data.i9AlienRegistrationNumber.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'I-9 Alien Registration Number is required for Permanent Resident status',
            path: ['i9AlienRegistrationNumber'],
        });
    }
}
```

### Step 3: Run existing tests

```bash
cd backend && npm test -- --grep "CrossHireSanityCheck"
```

### Step 4: Add/update unit tests

Add test cases for the new conditional logic:

1. Z04 with alienRegNumber + expiration only → PASS
2. Z04 with alienRegNumber but no expiration → FAIL
3. Z04 with expiration but no alienRegNumber → FAIL
4. Z04 with no I-9 fields at all → PASS (both pairs missing is OK)
5. Z04 with passportNumber + country → PASS
6. Z04 with passportNumber but no country → FAIL
7. Z04 with passportCountry but no number → FAIL

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Z04 validation uses conditional paired-fields logic
- [ ] i94AdmissionNumber is no longer validated
- [ ] Z03 validation unchanged (alienRegNumber required)
- [ ] All existing tests pass
- [ ] New test cases added for conditional logic

## Testing

```bash
# Run all entity transfer tests
cd backend && npm test -- --grep "entity_transfer"

# Run specific sanity check tests
cd backend && npm test -- --grep "CrossHireSanityCheck"
```

## Notes

- The PEO service defaults `i9AlienRegistrationNumber` to `'000000000'` if missing. The backend sanity check does NOT need to do this - it just shouldn't reject missing values.
- This change makes backend validation MORE lenient, matching PEO behavior.
