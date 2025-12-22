<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/in_progress/PEOCM-820/                       ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)            ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                  ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# PEOCM-820: Add EntityTransfer enum value to PeoContractOrigin database enum

## Problem Statement

The `PeoContractOrigin` enum in the TypeScript code already includes `EntityTransfer: 'entity_transfer'`, but this value is missing from the PostgreSQL database enum `peo.enum_peo_contracts_origin`. This causes database errors when:

1. Code attempts to filter contracts by origin including `'entity_transfer'`
2. Code attempts to create contracts with `origin: 'entity_transfer'`

**Error observed in production:**
```
invalid input value for enum enum_peo_contracts_origin: "entity_transfer"
```

**Current state:**
- TypeScript enum in `backend/services/peo/schemas.ts` has `EntityTransfer: 'entity_transfer'` (line 402)
- Database enum `peo.enum_peo_contracts_origin` does NOT have `'entity_transfer'` value
- Code in `create_contract_step.ts` uses `PeoContractOrigin.Hibob` as a placeholder (line 359)
- TODO comments reference PEOCM-660 and need to be removed (lines 356-358)

## Acceptance Criteria

- [ ] Migration created to add `'entity_transfer'` value to `peo.enum_peo_contracts_origin` enum
- [ ] Code updated to use `PeoContractOrigin.EntityTransfer` instead of `PeoContractOrigin.Hibob` in `create_contract_step.ts`
- [ ] TODO comments removed from `create_contract_step.ts`
- [ ] Database queries with `entity_transfer` origin no longer fail
- [ ] Contracts can be created with `EntityTransfer` origin

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Add entity_transfer to database enum | peo | todo |
| 02 | Update code to use EntityTransfer origin | backend | todo |

## Branches

| Repo | Branch |
|------|--------|
| peo | `PEOCM-820-add-entity-transfer-enum` |
| backend | `PEOCM-820-use-entity-transfer-origin` |

## Technical Context

### Current Implementation

**TypeScript Enum** (`backend/services/peo/schemas.ts:363-403`):
```typescript
export const PeoContractOrigin = {
    // ... other values ...
    MassOnboarding: 'massOnboarding',
    EntityTransfer: 'entity_transfer',  // ✅ Already defined
};
```

**Database Enum** (`peo.enum_peo_contracts_origin`):
- Missing `'entity_transfer'` value
- Created in migration `20240612161520-add_origin_peo_contract_table.js`
- Last updated in `20250424133208-add_workday_gpc_in_peo_contracts_origin.js`

**Code Usage** (`backend/services/peo/entity_transfer/steps/create_contract_step.ts:356-359`):
```typescript
// TODO: PEOCM-660 - Update to PeoContractOrigin.EntityTransfer once enum value added to database
// Current: Using PeoContractOrigin.Hibob as placeholder
// Future: origin: PeoContractOrigin.EntityTransfer
origin: PeoContractOrigin.Hibob,
```

### Error Location

The error occurs when filtering contracts by origin. The SQL query includes `'entity_transfer'` in the IN clause, but the database enum doesn't recognize it:

```sql
WHERE "PeoContract"."origin" IN (..., 'entity_transfer')
```

### Migration Pattern

Following the pattern from `peo/migrations/20250424133208-add_workday_gpc_in_peo_contracts_origin.js`:
```javascript
await queryInterface.sequelize.query(
    "ALTER TYPE peo.enum_peo_contracts_origin ADD VALUE IF NOT EXISTS 'entity_transfer';"
);
```

## Implementation Approach

1. **Create migration** in `peo/migrations/` to add `'entity_transfer'` to the database enum
2. **Update code** in `create_contract_step.ts`:
   - Change `origin: PeoContractOrigin.Hibob` to `origin: PeoContractOrigin.EntityTransfer`
   - Remove TODO comments (lines 356-358)
3. **Update test** in `create_contract_step.spec.ts` if it references the Hibob origin

## Risks & Considerations

- **Database migration order**: Migration must run before code deployment
- **Existing data**: No existing contracts use `entity_transfer` yet (using Hibob placeholder)
- **Backward compatibility**: Adding enum value is safe and non-breaking
- **Test updates**: Unit tests may need updates if they assert on the origin value

## Testing Strategy

1. **Migration testing**: Verify migration adds enum value successfully
2. **Code testing**: Verify contracts are created with `EntityTransfer` origin
3. **Integration testing**: Verify filtering by `entity_transfer` origin works
4. **Unit test updates**: Update `create_contract_step.spec.ts` if needed

## Deployment Order

1. **First**: Deploy peo service migration to add enum value
2. **Then**: Deploy backend service code changes

## Workspace

Worktree: `worktrees/PEOCM-820/`

## References

- JIRA: https://letsdeel.atlassian.net/browse/PEOCM-820
- Related: PEOCM-660 (original TODO reference)
- Migration pattern: `peo/migrations/20250424133208-add_workday_gpc_in_peo_contracts_origin.js`
- Error logs: `/Users/gabriel.herter/Downloads/extract-2025-12-22T15_03_46.818Z.csv`

