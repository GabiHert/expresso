<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-codelens-provider.md                              ║
║ TASK: LOCAL-027                                                 ║
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
repo: vscode-extension
---

# ExpressoCodeLensProvider

## Objective

Create a CodeLens provider that displays a "Brew this" button above each @expresso tag. When clicked, it triggers the brew command.

## Pre-Implementation

Research VSCode CodeLens API:
- `vscode.CodeLensProvider` interface
- `vscode.CodeLens` class
- Command arguments passing

## Implementation Steps

### Step 1: Create ExpressoCodeLensProvider

**File**: `vscode-extension/src/providers/ExpressoCodeLensProvider.ts`

**Instructions**:

```typescript
import * as vscode from 'vscode';
import { ExpressoScanner } from '../services/ExpressoScanner';
import { ExpressoTag } from '../types/expresso';

export class ExpressoCodeLensProvider implements vscode.CodeLensProvider {
  private readonly onChangeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this.onChangeEmitter.event;

  constructor(private scanner: ExpressoScanner) {
    // Refresh CodeLenses when scanner detects changes
    this.scanner.onChange(() => {
      this.onChangeEmitter.fire();
    });
  }

  /**
   * Provide CodeLenses for a document
   */
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const tags = this.scanner.getTagsForFile(document.uri.fsPath);

    return tags.map(tag => this.createCodeLens(tag));
  }

  /**
   * Resolve CodeLens (add command) - optional optimization
   */
  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.CodeLens {
    // Already resolved in provideCodeLenses
    return codeLens;
  }

  /**
   * Create a CodeLens for a tag
   */
  private createCodeLens(tag: ExpressoTag): vscode.CodeLens {
    // Position CodeLens at the start of the line containing the tag
    const range = new vscode.Range(
      tag.line - 1, 0,
      tag.line - 1, 0
    );

    // Different titles based on variant
    const titles = {
      normal: '☕ Brew this',
      urgent: '🔥 Brew this NOW',
      question: '❓ Brew this',
    };

    return new vscode.CodeLens(range, {
      title: titles[tag.variant],
      command: 'aiCockpit.brewExpresso',
      arguments: [tag],
      tooltip: `Copy /expresso command to clipboard`,
    });
  }
}
```

### Step 2: Register the CodeLens provider

**File**: `vscode-extension/src/extension.ts` (modify)

**Instructions**:

Add to the `activate` function:

```typescript
// Import at top
import { ExpressoCodeLensProvider } from './providers/ExpressoCodeLensProvider';

// In activate(), after creating scanner:
const expressoCodeLensProvider = new ExpressoCodeLensProvider(expressoScanner);

// Register for all file types (or specific languages)
const codeLensRegistration = vscode.languages.registerCodeLensProvider(
  { scheme: 'file' }, // All files
  expressoCodeLensProvider
);

context.subscriptions.push(codeLensRegistration);
```

### Step 3: Update package.json

**File**: `vscode-extension/package.json` (modify)

**Instructions**:

Add to `contributes` section:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "aiCockpit.brewExpresso",
        "title": "AI Cockpit: Brew Expresso Task",
        "icon": "$(coffee)"
      }
    ],
    "configuration": {
      "title": "AI Cockpit",
      "properties": {
        "aiCockpit.expresso.showCodeLens": {
          "type": "boolean",
          "default": true,
          "description": "Show 'Brew this' CodeLens above @expresso tags"
        }
      }
    }
  }
}
```

### Step 4: Add configuration check (optional)

Update CodeLensProvider to respect configuration:

```typescript
public provideCodeLenses(
  document: vscode.TextDocument,
  token: vscode.CancellationToken
): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
  // Check if CodeLens is enabled
  const config = vscode.workspace.getConfiguration('aiCockpit.expresso');
  if (!config.get('showCodeLens', true)) {
    return [];
  }

  const tags = this.scanner.getTagsForFile(document.uri.fsPath);
  return tags.map(tag => this.createCodeLens(tag));
}
```

## Post-Implementation

Test that CodeLenses appear and are clickable.

## Acceptance Criteria

- [ ] "Brew this" appears above each @expresso tag
- [ ] Different icons/text for each variant
- [ ] Clicking triggers the brew command (to be implemented in item 05)
- [ ] CodeLenses update when tags change
- [ ] Can be disabled via settings
- [ ] Tooltip explains what will happen

## Testing

1. Open a file with @expresso tags
2. Verify "Brew this" buttons appear above each tag
3. Verify different styling for @expresso! and @expresso?
4. Add new tag, verify CodeLens appears
5. Delete tag, verify CodeLens disappears
6. Disable in settings, verify CodeLenses hide

## Notes

- CodeLenses can be slow if many tags exist - consider pagination or limits
- The command will be implemented in work item 05
- Make sure ExpressoTag is passed correctly as argument
