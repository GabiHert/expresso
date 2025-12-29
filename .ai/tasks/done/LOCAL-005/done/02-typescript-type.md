<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-typescript-type.md                                 ║
║ TASK: LOCAL-005                                                  ║
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
repo: vscode-extension
---

# TypeScript Type Update

## Objective

Add `'env-var'` to the `taskIdSource` union type in the VSCode extension's type definitions. This ensures type safety when handling events created with the new environment variable override.

## Pre-Implementation

The type is defined in `vscode-extension/src/types/index.ts`. Currently it includes:
- `'active-task-file'`
- `'git-branch'`
- `'session-fallback'`

## Implementation Steps

### Step 1: Update CockpitEvent interface

**File**: `vscode-extension/src/types/index.ts`

**Location**: `taskIdSource` property in `CockpitEvent` interface

**Change**:

From:
```typescript
taskIdSource: 'active-task-file' | 'git-branch' | 'session-fallback';
```

To:
```typescript
taskIdSource: 'env-var' | 'active-task-file' | 'git-branch' | 'session-fallback';
```

### Step 2: Verify TypeScript compiles

```bash
cd vscode-extension
npm run compile
# Should complete without errors
```

### Step 3: Optional - Add display logic

If the extension displays task source anywhere, consider adding a label for `'env-var'`:

```typescript
const sourceLabels: Record<string, string> = {
  'env-var': 'Environment Variable',
  'active-task-file': 'Active Task File',
  'git-branch': 'Git Branch',
  'session-fallback': 'Session ID'
};
```

## Acceptance Criteria

- [ ] `'env-var'` added to `taskIdSource` union type
- [ ] TypeScript compiles without errors
- [ ] Extension runs without runtime errors

## Testing

1. Compile the extension: `npm run compile`
2. Run the extension in debug mode (F5)
3. Create an event with `taskIdSource: 'env-var'` (from work item 01)
4. Verify the event displays correctly in the task tree

## Notes

- This is a simple 1-line change
- Must be done after or in parallel with work item 01
- No functional changes needed - just type safety
