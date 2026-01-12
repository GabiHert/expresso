<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 07-integration-testing.md                            ║
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

# Integration and Testing

## Objective

Wire up all Expresso components in extension.ts, add comprehensive tests, update package.json with all contributions, and document the feature.

## Pre-Implementation

Ensure all previous work items (01-06) are complete and working individually.

## Implementation Steps

### Step 1: Complete extension.ts integration

**File**: `vscode-extension/src/extension.ts`

**Instructions**:

Add all Expresso component initialization:

```typescript
// Imports at top
import { ExpressoScanner } from './services/ExpressoScanner';
import { ExpressoDecorator } from './services/ExpressoDecorator';
import { ExpressoCodeLensProvider } from './providers/ExpressoCodeLensProvider';
import { registerExpressoCommands } from './commands/expresso';

// In activate() function:

// Initialize Expresso components
let expressoScanner: ExpressoScanner | undefined;
let expressoDecorator: ExpressoDecorator | undefined;

if (workspaceRoot) {
  // Create scanner
  expressoScanner = new ExpressoScanner(workspaceRoot);

  // Create decorator
  expressoDecorator = new ExpressoDecorator(expressoScanner, context.extensionUri);

  // Create and register CodeLens provider
  const expressoCodeLensProvider = new ExpressoCodeLensProvider(expressoScanner);
  const codeLensRegistration = vscode.languages.registerCodeLensProvider(
    { scheme: 'file' },
    expressoCodeLensProvider
  );

  // Register commands
  registerExpressoCommands(context);

  // Start scanning workspace
  expressoScanner.scanWorkspace().then(result => {
    console.log(`ExpressoScanner: Found ${result.totalCount} tags`);
  });

  // Start watching for changes
  expressoScanner.startWatching();

  // Add to subscriptions for cleanup
  context.subscriptions.push(
    expressoScanner,
    expressoDecorator,
    codeLensRegistration
  );
}
```

### Step 2: Update package.json comprehensively

**File**: `vscode-extension/package.json`

**Instructions**:

Ensure all Expresso contributions are present:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "aiCockpit.brewExpresso",
        "title": "Brew Expresso Task",
        "category": "AI Cockpit",
        "icon": "$(coffee)"
      },
      {
        "command": "aiCockpit.scanExpresso",
        "title": "Scan for Expresso Tags",
        "category": "AI Cockpit"
      },
      {
        "command": "aiCockpit.listExpresso",
        "title": "List All Expresso Tags",
        "category": "AI Cockpit"
      }
    ],
    "configuration": {
      "title": "AI Cockpit",
      "properties": {
        "aiCockpit.expresso.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable @expresso tag detection and features"
        },
        "aiCockpit.expresso.showCodeLens": {
          "type": "boolean",
          "default": true,
          "description": "Show 'Brew this' CodeLens above @expresso tags"
        },
        "aiCockpit.expresso.showDecorations": {
          "type": "boolean",
          "default": true,
          "description": "Show visual decorations (highlighting, gutter icons) for @expresso tags"
        },
        "aiCockpit.expresso.fileExtensions": {
          "type": "array",
          "default": [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".java", ".rs", ".rb", ".php"],
          "description": "File extensions to scan for @expresso tags"
        }
      }
    }
  }
}
```

### Step 3: Create test file for ExpressoScanner

**File**: `vscode-extension/src/test/suite/expressoScanner.test.ts`

**Instructions**:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { ExpressoScanner } from '../../services/ExpressoScanner';

suite('ExpressoScanner Test Suite', () => {

  test('should detect @expresso tag', async () => {
    // Create a test document
    const content = `
      // @expresso add validation here
      function test() {}
    `;

    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'typescript'
    });

    const scanner = new ExpressoScanner('/test');
    const tags = await scanner.scanDocument(doc);

    assert.strictEqual(tags.length, 1);
    assert.strictEqual(tags[0].variant, 'normal');
    assert.strictEqual(tags[0].taskDescription, 'add validation here');
  });

  test('should detect @expresso! urgent variant', async () => {
    const content = `// @expresso! fix this bug`;

    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'typescript'
    });

    const scanner = new ExpressoScanner('/test');
    const tags = await scanner.scanDocument(doc);

    assert.strictEqual(tags.length, 1);
    assert.strictEqual(tags[0].variant, 'urgent');
  });

  test('should detect @expresso? question variant', async () => {
    const content = `// @expresso? should we refactor this?`;

    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'typescript'
    });

    const scanner = new ExpressoScanner('/test');
    const tags = await scanner.scanDocument(doc);

    assert.strictEqual(tags.length, 1);
    assert.strictEqual(tags[0].variant, 'question');
  });

  test('should detect multiple tags', async () => {
    const content = `
      // @expresso task one
      function foo() {}

      // @expresso! task two
      function bar() {}

      // @expresso? task three
      function baz() {}
    `;

    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'typescript'
    });

    const scanner = new ExpressoScanner('/test');
    const tags = await scanner.scanDocument(doc);

    assert.strictEqual(tags.length, 3);
  });

  test('should handle block comments', async () => {
    const content = `/* @expresso add error handling */`;

    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'typescript'
    });

    const scanner = new ExpressoScanner('/test');
    const tags = await scanner.scanDocument(doc);

    assert.strictEqual(tags.length, 1);
    assert.strictEqual(tags[0].taskDescription, 'add error handling');
  });
});
```

### Step 4: Create integration test

**File**: `vscode-extension/src/test/suite/expressoIntegration.test.ts`

**Instructions**:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Expresso Integration Test Suite', () => {

  test('full flow: tag detection to clipboard', async () => {
    // This test verifies the full integration
    // 1. Create a file with @expresso tag
    // 2. Verify decoration is applied
    // 3. Verify CodeLens appears
    // 4. Execute brew command
    // 5. Check clipboard contains correct format

    // Note: Full integration tests may require extension to be fully activated
  });
});
```

### Step 5: Update README with feature documentation

**File**: `vscode-extension/README.md` (add section)

**Instructions**:

Add documentation for the Expresso feature:

```markdown
## @expresso Tags

Tag your code with inline tasks that integrate with Claude Code sessions.

### Usage

Add `@expresso` comments anywhere in your code:

```typescript
// @expresso add input validation for email
function createUser(data) {
  // ...
}

/* @expresso! fix security vulnerability */
function authenticate() {
  // ...
}

// @expresso? should we cache this result?
function fetchData() {
  // ...
}
```

### Variants

| Tag | Meaning | Visual |
|-----|---------|--------|
| `@expresso` | Normal task | Brown highlight |
| `@expresso!` | Urgent/priority | Orange highlight |
| `@expresso?` | Question | Blue highlight |

### Workflow

1. Write an `@expresso` comment in your code
2. See the brown highlight and sparkle icon
3. Click "☕ Brew this" above the tag
4. Paste the copied command in your Claude Code session
5. Claude reads the file and executes the task
6. After completion, Claude asks to remove the tag

### Settings

- `aiCockpit.expresso.enabled` - Enable/disable the feature
- `aiCockpit.expresso.showCodeLens` - Show/hide "Brew this" buttons
- `aiCockpit.expresso.showDecorations` - Show/hide highlights and icons
- `aiCockpit.expresso.fileExtensions` - File types to scan
```

### Step 6: Run full test suite

**Commands**:

```bash
cd vscode-extension
npm run compile
npm run test
```

### Step 7: Manual testing checklist

Create a test file and verify:

- [ ] @expresso tag gets brown highlight
- [ ] @expresso! tag gets orange highlight
- [ ] @expresso? tag gets blue highlight
- [ ] Gutter icons appear (animated if GIFs created)
- [ ] "Brew this" CodeLens appears above each tag
- [ ] Clicking CodeLens copies command to clipboard
- [ ] Toast notification appears
- [ ] Pasting in Claude session works
- [ ] Claude reads the file correctly
- [ ] Claude executes the task
- [ ] Claude asks to remove tag
- [ ] Tag removal works correctly

## Post-Implementation

Run code review agent on all new files.

## Acceptance Criteria

- [ ] All components wired together in extension.ts
- [ ] Package.json has all commands and settings
- [ ] Unit tests for ExpressoScanner pass
- [ ] Integration tests pass
- [ ] README documents the feature
- [ ] Manual testing checklist complete
- [ ] No TypeScript compilation errors
- [ ] Extension activates without errors

## Testing

```bash
# Compile
cd vscode-extension && npm run compile

# Run tests
npm run test

# Package extension for testing
npm run package
```

## Notes

- Test across different VSCode themes (dark, light, high contrast)
- Test with large files (performance)
- Test with many tags (CodeLens performance)
- Consider edge cases: empty task, special characters, etc.
