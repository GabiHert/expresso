<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 09-fix-date-validation-rollover.md                   ║
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
priority: BLOCKING
---

# Fix Date Validation to Reject Invalid Dates (Date Rollover Issue)

## Objective

Fix the effectiveDate validation to properly reject invalid dates like `2025-02-30` or `2025-13-01`. The current `Date.parse()` approach is insufficient because JavaScript silently "corrects" invalid dates.

## Background

During code review, it was discovered that the `Date.parse()` validation added in work item 08 does NOT actually reject invalid dates:

```javascript
// These all return VALID timestamps (not NaN):
Date.parse("2025-02-30")  // → March 2, 2025 (rolls over)
Date.parse("2025-13-01")  // → January 1, 2026 (rolls over)
Date.parse("2025-00-01")  // → December 1, 2024 (rolls over)
```

JavaScript's `Date.parse()` is too lenient - it silently "corrects" invalid dates by rolling over to the next valid date.

## Implementation Steps

### Step 1: Update CreateTransferSchema

**File**: `src/controllers/entityTransfer/entityTransferDto.ts`

**Change lines 19-23 from:**
```typescript
effectiveDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date value',
    }),
```

**To:**
```typescript
effectiveDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .refine((dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.getUTCFullYear() === year
            && date.getUTCMonth() === month - 1
            && date.getUTCDate() === day;
    }, {
        message: 'Invalid date value',
    }),
```

### Step 2: Update GetReadyTransfersSchema

**File**: `src/controllers/entityTransfer/entityTransferDto.ts`

**Change lines 38-43 (approximately) from:**
```typescript
effectiveDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date value',
    }),
```

**To:**
```typescript
effectiveDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .refine((dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.getUTCFullYear() === year
            && date.getUTCMonth() === month - 1
            && date.getUTCDate() === day;
    }, {
        message: 'Invalid date value',
    }),
```

## How The Fix Works

1. **Parse components:** Extract year, month, day from the string
2. **Create UTC date:** Use `Date.UTC()` to avoid timezone issues
3. **Verify no rollover:** Check that the resulting date has the SAME year/month/day

**Example for `2025-02-30`:**
```javascript
// Parse: year=2025, month=2, day=30
// Create date: JavaScript "corrects" to March 2, 2025
// Verify: getUTCMonth() returns 2 (March) !== 1 (February-1)
// Result: false → validation fails → date rejected ✓
```

## Acceptance Criteria

- [ ] `2025-02-30` is rejected (February doesn't have 30 days)
- [ ] `2025-13-01` is rejected (Month 13 doesn't exist)
- [ ] `2025-00-01` is rejected (Month 0 doesn't exist)
- [ ] `2025-04-31` is rejected (April only has 30 days)
- [ ] `2025-01-15` is accepted (valid date)
- [ ] `2024-02-29` is accepted (leap year)
- [ ] `2025-02-29` is rejected (not a leap year)
- [ ] No TypeScript compilation errors

## Testing

Manual test in Node.js REPL:
```javascript
const isValidDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
};

console.log(isValidDate('2025-02-30')); // false
console.log(isValidDate('2025-13-01')); // false
console.log(isValidDate('2025-01-15')); // true
console.log(isValidDate('2024-02-29')); // true (leap year)
console.log(isValidDate('2025-02-29')); // false (not leap year)
```

## Notes

- Uses UTC to avoid timezone-related edge cases
- Month is 0-indexed in JavaScript Date (January = 0)
- This approach correctly handles leap years automatically
