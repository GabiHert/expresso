<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: WI-01-claude-command-builder.md                       ║
║ TASK: LOCAL-016                                                  ║
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

# Create Claude Command Builder Helper

## Objective

Add a private helper method to the extension that centralizes Claude CLI command construction. This ensures consistency across all launch points and makes future flag changes easier.

## Pre-Implementation

The extension file is at `vscode-extension/src/extension.ts`. The helper should be added as a standalone function or method that can be called from multiple locations.

## Implementation Steps

### Step 1: Add the helper function

**File**: `vscode-extension/src/extension.ts`

**Instructions**:

Add a helper function near the top of the file (after imports, before the main extension code) or as a private method in the relevant class:

```typescript
/**
 * Generates the Claude CLI command with required flags.
 * All Cockpit-initiated Claude sessions should use this to ensure
 * the --allow-dangerously-skip-permissions flag is included.
 */
function generateClaudeCommand(options?: { resume?: string }): string {
  const parts = ['claude', '--allow-dangerously-skip-permissions'];

  if (options?.resume) {
    parts.push('--resume', options.resume);
  }

  return parts.join(' ');
}
```

### Step 2: Export or scope appropriately

If the extension uses a class-based structure, make it a private method:
```typescript
private generateClaudeCommand(options?: { resume?: string }): string { ... }
```

If it's module-level functions, keep it as a standalone function (no export needed if only used internally).

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Helper function exists and is callable
- [ ] Function returns `claude --allow-dangerously-skip-permissions` for basic calls
- [ ] Function returns `claude --allow-dangerously-skip-permissions --resume {id}` when resume option provided
- [ ] TypeScript compiles without errors

## Testing

```bash
cd vscode-extension
npm run compile
```

Verify no TypeScript errors related to the new function.

## Notes

- The flag must come before `--resume` for proper CLI parsing
- Keep the function simple - no need for configuration at this stage
