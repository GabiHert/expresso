<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-move-client-service.md                            ║
║ TASK: EEXPR-12-5                                                ║
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
branch: EEXPR-12
protected: false
---

# Work Item 03: Move entity_transfer_client_service.ts

## Objective

Move `entity_transfer_client_service.ts` from `services/peo/` root into `services/peo/entity_transfer/services/` to co-locate it with related entity transfer services.

## Current Location

```
services/peo/
├── entity_transfer_client_service.ts    <-- HERE (wrong place)
└── entity_transfer/
    └── services/
        ├── transfer_enrichment_service.ts
        ├── transfer_resources_service.ts
        └── time_off_service.ts
```

## Target Location

```
services/peo/entity_transfer/
└── services/
    ├── entity_transfer_client_service.ts  <-- MOVE HERE
    ├── transfer_enrichment_service.ts
    ├── transfer_resources_service.ts
    └── time_off_service.ts
```

## Implementation Steps

### Step 1: Move the file

```bash
cd /Users/gabriel.herter/Documents/Projects/deel/backend
mv services/peo/entity_transfer_client_service.ts services/peo/entity_transfer/services/
```

### Step 2: Update imports in the moved file

**File**: `services/peo/entity_transfer/services/entity_transfer_client_service.ts`

Update relative imports:
```typescript
// OLD
import {BasePEOService, PEOEndpoints} from './base_peo_service';
import {...} from './entity_transfer/types';

// NEW
import {BasePEOService, PEOEndpoints} from '../../base_peo_service';
import {...} from '../types';
```

### Step 3: Find and update all files that import entity_transfer_client_service

Search for imports:
```bash
grep -r "entity_transfer_client_service" --include="*.ts" --include="*.js" | grep -v node_modules
```

**Files to update:**

| File | Old Import | New Import |
|------|-----------|------------|
| `controllers/peo_integration/index.js` | `../../services/peo/entity_transfer_client_service` | `../../services/peo/entity_transfer/services/entity_transfer_client_service` |
| `controllers/admin/peo/tech_ops.ts` | `../../../services/peo/entity_transfer_client_service` | `../../../services/peo/entity_transfer/services/entity_transfer_client_service` |
| Any other files found | Update accordingly | |

### Step 4: Run TypeScript compilation

```bash
cd /Users/gabriel.herter/Documents/Projects/deel/backend
npm run build
```

Fix any compilation errors related to imports.

### Step 5: Run lint

```bash
npm run lint
```

## Acceptance Criteria

- [ ] File moved to `services/peo/entity_transfer/services/`
- [ ] All imports updated across the codebase
- [ ] TypeScript compiles without errors
- [ ] Lint passes
- [ ] No runtime import errors

## Notes

- This is a pure refactoring - no logic changes
- Must be done before work item 04 (create query service)
