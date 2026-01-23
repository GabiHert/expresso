<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-fix-work-locations-filter.md                       ║
║ TASK: EEXPR-67                                                   ║
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
# Repository Context (EEXPR-67)
repo: backend
repo_path: /Users/gabriel.herter/Documents/Projects/deel/backend
branch: EEXPR-67-fix-transfer-resources
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Projects/deel/backend
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Fix Work Locations Filter

## Objective

Update the work locations filter to include both ACTIVE and UNDERWRITING status locations, instead of only ACTIVE.

## Pre-Implementation

Status enum values (from `peo/src/models/WorkLocation/Enum.ts`):
- `ACTIVE` - Location is ready for use
- `OBSOLETE` - Location no longer used
- `UNDERWRITING` - Location still under prism resource request review
- `CANCELLED` - Location was cancelled

## Implementation Steps

### Step 1: Update Status Filter

**File**: `backend/services/peo/entity_transfer/services/transfer_resources_service.ts`
**Line**: ~191

**Current Code**:
```typescript
const activeLocations = workLocations.filter((wl) => wl.status === 'ACTIVE');
```

**Replace With**:
```typescript
const activeLocations = workLocations.filter((wl) => wl.status === 'ACTIVE' || wl.status === 'UNDERWRITING');
```

## Post-Implementation

After completing, verify:
1. No TypeScript errors
2. The filter correctly includes both statuses

## Acceptance Criteria

- [ ] Filter includes ACTIVE status locations
- [ ] Filter includes UNDERWRITING status locations
- [ ] Filter excludes OBSOLETE and CANCELLED status locations

## Testing

Test with a legal entity that has:
1. Work locations with ACTIVE status - should be included
2. Work locations with UNDERWRITING status - should be included
3. Work locations with OBSOLETE status - should be excluded
4. Work locations with CANCELLED status - should be excluded

## Notes

- This is a simple one-line change
- UNDERWRITING locations are those still pending approval in Prism
- Business requirement is to allow transfers to locations that are in underwriting process
