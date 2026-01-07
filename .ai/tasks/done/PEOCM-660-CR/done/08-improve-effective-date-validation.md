<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 08-improve-effective-date-validation.md              ║
║ TASK: PEOCM-660-CR                                               ║
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
repo: peo
priority: IMPORTANT
---

# Improve Effective Date Validation

## Objective

Enhance the `effectiveDate` validation in the entity transfer DTOs to reject invalid dates like `2025-02-30` or `2025-13-01`.

## Background

During code review, it was identified that the current regex validation only checks the format (`YYYY-MM-DD`), not whether the date is actually valid.

**Current Implementation:**
```typescript
effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
```

**Problem:** This accepts invalid dates:
- `2025-02-30` (February doesn't have 30 days)
- `2025-13-01` (Month 13 doesn't exist)
- `2025-00-01` (Month 00 doesn't exist)

## Implementation Steps

### Step 1: Update CreateTransferSchema

**File**: `src/controllers/entityTransfer/entityTransferDto.ts`

**Change line 19 from:**
```typescript
effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
```

**To:**
```typescript
effectiveDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date value',
    }),
```

### Step 2: Update GetReadyTransfersSchema

**File**: `src/controllers/entityTransfer/entityTransferDto.ts`

**Change line 35 from:**
```typescript
effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
```

**To:**
```typescript
effectiveDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date value',
    }),
```

### Step 3: Add Unit Tests (Optional but Recommended)

**File**: `src/controllers/entityTransfer/entityTransferController.spec.ts`

Add test cases for invalid dates:
```typescript
it('should reject invalid date 2025-02-30', async () => {
    const body = {
        // ... valid body
        effectiveDate: '2025-02-30',
    };

    const validation = CreateTransferSchema.safeParse(body);
    expect(validation.success).toBe(false);
});

it('should reject invalid month 2025-13-01', async () => {
    const body = {
        // ... valid body
        effectiveDate: '2025-13-01',
    };

    const validation = CreateTransferSchema.safeParse(body);
    expect(validation.success).toBe(false);
});
```

## Acceptance Criteria

- [ ] CreateTransferSchema rejects invalid dates
- [ ] GetReadyTransfersSchema rejects invalid dates
- [ ] Valid dates still pass validation
- [ ] Error messages are descriptive
- [ ] No TypeScript compilation errors
- [ ] Unit tests pass (if added)

## Testing

```bash
cd peo
npm run build
npm test -- --testPathPattern="entityTransfer"
```

## Notes

- The `Date.parse()` function handles date validity checking
- Invalid dates return `NaN` which fails the refine check
- Keep the regex check first for performance (fails fast on format)
