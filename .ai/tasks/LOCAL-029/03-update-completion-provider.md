---
type: work-item
id: "03"
parent: LOCAL-029
title: Update ExpressoCompletionProvider
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
branch: feature/command-registry
---

> Parent: [[LOCAL-029]]


# Update ExpressoCompletionProvider

## Objective

Update `ExpressoCompletionProvider` to use the `CommandRegistry` instead of the hardcoded `VALID_CLAUDE_COMMANDS` array and `COMMAND_DESCRIPTIONS` record. This allows autocomplete to dynamically show newly created commands.

## Pre-Implementation

Read the current implementation in `providers/ExpressoCompletionProvider.ts`.

## Implementation Steps

### Step 1: Update Imports and Remove Hardcoded Data

**File**: `src/providers/ExpressoCompletionProvider.ts`

```typescript
// REMOVE these imports:
import { VALID_CLAUDE_COMMANDS, ClaudeCommand } from '../types/expresso';

// ADD this import:
import { CommandRegistry } from '../services/CommandRegistry';
```

Also remove the `COMMAND_DESCRIPTIONS` constant (lines 7-26):

```typescript
// REMOVE this entire block:
const COMMAND_DESCRIPTIONS: Record<ClaudeCommand, string> = {
  '/task-start': 'Start working on a task',
  // ... etc
};
```

### Step 2: Add Constructor with Registry Dependency

**Current implementation** has no constructor. Add one:

```typescript
export class ExpressoCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private commandRegistry: CommandRegistry) {}

  // ... rest of class
}
```

### Step 3: Update provideCompletionItems Method

Replace the loop over `VALID_CLAUDE_COMMANDS` with `commandRegistry.getCommands()`:

```typescript
provideCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position,
  _token: vscode.CancellationToken,
  _context: vscode.CompletionContext
): vscode.CompletionItem[] | undefined {
  const linePrefix = document.lineAt(position).text.substring(0, position.character);

  if (!this.isInComment(linePrefix)) {
    return undefined;
  }

  const slashMatch = linePrefix.match(/\/([a-z-]*)$/);
  if (!slashMatch) {
    return undefined;
  }

  const partialCommand = slashMatch[1];
  const completionItems: vscode.CompletionItem[] = [];

  // Use dynamic command list from registry
  for (const commandInfo of this.commandRegistry.getCommands()) {
    const commandName = commandInfo.name.substring(1); // Remove leading '/'

    if (!commandName.startsWith(partialCommand)) {
      continue;
    }

    const item = new vscode.CompletionItem(
      commandInfo.name,
      vscode.CompletionItemKind.Function
    );

    item.insertText = commandName;

    const startPos = new vscode.Position(
      position.line,
      position.character - partialCommand.length - 1
    );
    item.range = new vscode.Range(startPos, position);

    // Use description from registry
    item.detail = commandInfo.description;
    item.documentation = new vscode.MarkdownString(
      `**${commandInfo.name}**\n\n${commandInfo.description}\n\n*${commandInfo.source === 'project' ? 'Project' : 'Framework'} command*`
    );

    // Sort priority - task commands first
    if (commandInfo.name.startsWith('/task')) {
      item.sortText = `0_${commandInfo.name}`;
    } else {
      item.sortText = `1_${commandInfo.name}`;
    }

    completionItems.push(item);
  }

  return completionItems;
}
```

### Step 4: Keep isInComment Method

The `isInComment` method should remain unchanged as it's still needed.

## Acceptance Criteria

- [ ] `VALID_CLAUDE_COMMANDS` import is removed
- [ ] `COMMAND_DESCRIPTIONS` constant is removed
- [ ] Constructor accepts `CommandRegistry` parameter
- [ ] Commands are fetched dynamically from registry
- [ ] Descriptions come from registry instead of hardcoded
- [ ] Documentation shows whether command is from framework or project
- [ ] Sort order is preserved (task commands first)
- [ ] TypeScript compiles without errors
- [ ] Autocomplete works with existing commands

## Testing

1. Compile the extension: `npm run compile`
2. In a comment, type `// /task`
3. Verify autocomplete dropdown appears with task-related commands
4. Verify descriptions appear correctly
5. Select a command and verify it inserts correctly

## Notes

- The documentation markdown now indicates whether command is from "Framework" or "Project"
- This provides visual feedback about command origin in autocomplete
- The `isInComment` method is unchanged - no modifications needed
