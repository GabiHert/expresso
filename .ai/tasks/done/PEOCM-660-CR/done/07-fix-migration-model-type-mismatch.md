<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 07-fix-migration-model-type-mismatch.md              ║
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

# Fix Migration/Model Type Mismatch for newEmploymentPayrollSettingId

## Objective

Fix the type mismatch between the migration and model for the `new_employment_payroll_setting_id` column. The migration uses `STRING(50)` but the model uses `TEXT`.

## Background

During code review, this issue was identified as **BLOCKING** because it violates the migration best practice:

> "Any change you make in the migration must reflect in the model and vice versa - they must be aligned"

**Current State:**
- Migration (line 79): `type: new Sequelize.STRING(50)`
- Model (line 82): `type: DataTypes.TEXT`

**Impact:**
- Schema drift between database and application layer
- Potential runtime errors
- Confusion for future developers

## Implementation Steps

### Step 1: Update the Model

**File**: `src/models/entityTransfer/PeoEmployeeTransferItem.ts`

**Change line 80-84 from:**
```typescript
newEmploymentPayrollSettingId: {
    field: 'new_employment_payroll_setting_id',
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'FK to employment.payroll_settings.id - Destination pay group (TEXT to support UUIDs and CUIDs)',
},
```

**To:**
```typescript
newEmploymentPayrollSettingId: {
    field: 'new_employment_payroll_setting_id',
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'FK to employment.payroll_settings.id - Destination pay group (supports UUIDs and CUIDs)',
},
```

**Rationale:** 50 characters is sufficient for both UUIDs (36 chars) and CUIDs v1 (~25 chars).

## Acceptance Criteria

- [ ] Model type matches migration type: `STRING(50)`
- [ ] Comment updated to remove "TEXT" reference
- [ ] No TypeScript compilation errors
- [ ] Unit tests still pass

## Testing

```bash
cd peo
npm run build
npm test -- --testPathPattern="entityTransfer"
```

## Notes

- Do NOT modify the migration - the migration is correct
- The model must align with the migration, not vice versa
