---
type: work-item
id: "05"
parent: LOCAL-029
title: Cleanup deprecated code
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
branch: feature/command-registry
---

> Parent: [[LOCAL-029]]


# Cleanup Deprecated Code

## Objective

Remove or deprecate the hardcoded `VALID_CLAUDE_COMMANDS` array and related code from `types/expresso.ts` now that the dynamic `CommandRegistry` is in place.

## Pre-Implementation

Verify that all usages of `VALID_CLAUDE_COMMANDS` have been updated to use `CommandRegistry`.

Search for remaining usages:
```bash
grep -r "VALID_CLAUDE_COMMANDS" src/
```

## Implementation Steps

### Step 1: Evaluate VALID_CLAUDE_COMMANDS Usage

**File**: `src/types/expresso.ts`

Check if `VALID_CLAUDE_COMMANDS` is still used anywhere. If not, remove it. If there are external dependencies or tests, mark it as deprecated.

### Step 2: Option A - Remove Entirely (Preferred)

If no external code depends on `VALID_CLAUDE_COMMANDS`:

```typescript
// REMOVE this entire block (lines ~200-219):
export const VALID_CLAUDE_COMMANDS = [
  '/task-start',
  '/task-work',
  // ... etc
] as const;

// REMOVE this type (line ~224):
export type ClaudeCommand = (typeof VALID_CLAUDE_COMMANDS)[number];
```

### Step 2: Option B - Deprecate with Warning

If keeping for backward compatibility:

```typescript
/**
 * @deprecated Use CommandRegistry.getCommandNames() instead.
 * This static list will be removed in a future version.
 */
export const VALID_CLAUDE_COMMANDS = [
  '/task-start',
  '/task-work',
  // ... keep the list for now
] as const;

/**
 * @deprecated Use CommandRegistry.hasCommand() or CommandInfo.name instead.
 */
export type ClaudeCommand = (typeof VALID_CLAUDE_COMMANDS)[number];
```

### Step 3: Remove COMMAND_DECORATION_STYLE (if unused)

Check if `COMMAND_DECORATION_STYLE` is still used:

```bash
grep -r "COMMAND_DECORATION_STYLE" src/
```

If not used anywhere (since we use inline styles now), remove it:

```typescript
// REMOVE this block (lines ~230-239):
export const COMMAND_DECORATION_STYLE = {
  color: '#00FFFF',
  fontWeight: 'bold',
  backgroundColor: 'rgba(0, 255, 255, 0.15)',
  borderRadius: '2px',
};
```

### Step 4: Clean Up Unused Imports

Check all files that previously imported these constants and remove unused imports:

Files to check:
- `src/services/ExpressoScanner.ts`
- `src/providers/ExpressoCompletionProvider.ts`
- `src/test/suite/expressoHighlighting.test.ts`

### Step 5: Update ClaudeCommand Type (if keeping)

If the `ClaudeCommand` type is used in `CommandMatch` interface, update it:

```typescript
// In types/expresso.ts, the CommandMatch interface uses ClaudeCommand
export interface CommandMatch {
  command: ClaudeCommand;  // <-- This needs to be updated
  // ...
}

// Option A: Change to string
export interface CommandMatch {
  command: string;  // Now accepts any command from registry
  // ...
}

// Option B: Keep ClaudeCommand as string alias
export type ClaudeCommand = string;
```

### Step 6: Verify No Breaking Changes

After cleanup, compile and check for errors:

```bash
cd /Users/gabriel.herter/Documents/Personal/ai-framework/vscode-extension
npm run compile
```

## Acceptance Criteria

- [ ] `VALID_CLAUDE_COMMANDS` is removed or deprecated
- [ ] `ClaudeCommand` type is updated or removed
- [ ] `COMMAND_DECORATION_STYLE` is removed if unused
- [ ] All unused imports are removed
- [ ] `CommandMatch` interface updated if needed
- [ ] TypeScript compiles without errors
- [ ] No runtime errors when extension runs

## Testing

1. Run `npm run compile` to check for TypeScript errors
2. Run extension in debug mode
3. Verify highlighting works
4. Verify autocomplete works
5. Run any existing tests: `npm test`

## Notes

- Prefer complete removal over deprecation unless there are known external dependencies
- The `CommandInfo` interface added in work item 01 replaces the need for `ClaudeCommand` type
- Keep `CommandMatch` interface but update the `command` field type
