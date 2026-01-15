<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-update-expresso-scanner.md                        ║
║ TASK: LOCAL-029                                                  ║
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
# Repository Context (LOCAL-029)
repo: vscode-extension
repo_path: /Users/gabriel.herter/Documents/Personal/ai-framework/vscode-extension
branch: feature/command-registry
protected: false

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Personal/ai-framework/vscode-extension
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Update ExpressoScanner Integration

## Objective

Update `ExpressoScanner` to use the `CommandRegistry` instead of the hardcoded `VALID_CLAUDE_COMMANDS` array. The scanner should rebuild its command pattern when the registry changes.

## Pre-Implementation

Read the current implementation of `scanDocumentForCommands()` in `ExpressoScanner.ts` (around line 397).

## Implementation Steps

### Step 1: Update Imports

**File**: `src/services/ExpressoScanner.ts`

Remove import of `VALID_CLAUDE_COMMANDS` and add import for `CommandRegistry`:

```typescript
// REMOVE:
import { VALID_CLAUDE_COMMANDS, ... } from '../types/expresso';

// ADD:
import { CommandRegistry } from './CommandRegistry';
```

### Step 2: Update Constructor

Modify the constructor to accept `CommandRegistry` as a dependency:

```typescript
// Current constructor signature
constructor(
  private workspaceRoot: string,
  config?: Partial<ExpressoConfig>
)

// New constructor signature
constructor(
  private workspaceRoot: string,
  private commandRegistry: CommandRegistry,
  config?: Partial<ExpressoConfig>
)
```

### Step 3: Add Command Pattern Property

Add a private property to cache the command regex and a method to rebuild it:

```typescript
private commandPattern: RegExp | null = null;

private buildCommandPattern(): RegExp {
  const commands = this.commandRegistry.getCommandNames();
  if (commands.length === 0) {
    // Return a pattern that matches nothing
    return /(?!)/g;
  }
  return new RegExp(
    `(${commands.map(cmd => cmd.replace('/', '\\/')).join('|')})(?=\\s|$|[^a-zA-Z0-9-])`,
    'g'
  );
}
```

### Step 4: Subscribe to Registry Changes

In the constructor, after setting up other watchers, subscribe to registry changes:

```typescript
// In constructor, after setupWatchers():
this.disposables.push(
  this.commandRegistry.onChange(() => {
    // Invalidate cached pattern
    this.commandPattern = null;
    // Trigger re-scan of visible documents
    this.onChangeEmitter.fire(this.getEmptyScanResult());
  })
);
```

### Step 5: Update scanDocumentForCommands Method

**Location**: Around line 397 in `ExpressoScanner.ts`

Replace the hardcoded regex building with the cached pattern:

```typescript
// BEFORE:
public scanDocumentForCommands(document: vscode.TextDocument): CommandMatch[] {
  // ... existing code ...
  const commandPattern = new RegExp(
    `(${VALID_CLAUDE_COMMANDS.map(cmd => cmd.replace('/', '\\/')).join('|')})(?=\\s|$|[^a-zA-Z0-9-])`,
    'g'
  );
  // ... rest of method
}

// AFTER:
public scanDocumentForCommands(document: vscode.TextDocument): CommandMatch[] {
  // ... existing code ...

  // Use cached pattern, rebuild if needed
  if (!this.commandPattern) {
    this.commandPattern = this.buildCommandPattern();
  }

  // Reset lastIndex for global regex
  this.commandPattern.lastIndex = 0;

  // ... rest of method (use this.commandPattern instead of commandPattern)
}
```

### Step 6: Update ClaudeCommand Type Check (if applicable)

If there's a type check against `ClaudeCommand`, update it to use the registry:

```typescript
// BEFORE:
if (VALID_CLAUDE_COMMANDS.includes(match[1] as ClaudeCommand)) {

// AFTER:
if (this.commandRegistry.hasCommand(match[1])) {
```

## Acceptance Criteria

- [ ] `ExpressoScanner` constructor accepts `CommandRegistry` parameter
- [ ] `VALID_CLAUDE_COMMANDS` import is removed
- [ ] Command pattern is built dynamically from registry
- [ ] Pattern is cached and invalidated on registry changes
- [ ] Re-scan triggers when registry changes
- [ ] TypeScript compiles without errors
- [ ] Existing highlighting behavior is preserved

## Testing

1. Compile the extension: `npm run compile`
2. Open a file with `/task-start` in a comment
3. Verify the command is highlighted
4. Add a new command file to `.ai/_project/commands/test-cmd.md`
5. Add `// /test-cmd` to a file
6. Verify `/test-cmd` becomes highlighted (after file save)

## Notes

- The `commandPattern` must have `lastIndex` reset before each use since it's a global regex
- Consider logging when pattern is rebuilt for debugging
- Handle edge case where registry has no commands
