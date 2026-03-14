---
type: work-item
id: "04"
parent: LOCAL-029
title: Update extension activation
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
branch: feature/command-registry
---

# Update Extension Activation

## Objective

Update `extension.ts` to properly initialize the `CommandRegistry` before other services that depend on it, and wire up the dependencies correctly.

## Pre-Implementation

Read the current activation flow in `extension.ts`, particularly the order of service initialization around lines 90-120.

## Implementation Steps

### Step 1: Add Import

**File**: `src/extension.ts`

Add import for `CommandRegistry`:

```typescript
import { CommandRegistry } from './services/CommandRegistry';
```

### Step 2: Create CommandRegistry Before Other Services

The initialization order is critical. The registry must be created and initialized before `ExpressoScanner` and `ExpressoCompletionProvider`.

Find the section where `ExpressoScanner` is created (around line 98) and add registry initialization before it:

```typescript
// Create and initialize CommandRegistry FIRST
const commandRegistry = new CommandRegistry(workspaceRoot);
await commandRegistry.initialize();
console.log('[Expresso] CommandRegistry initialized');

// NOW create ExpressoScanner with registry
expressoScanner = new ExpressoScanner(workspaceRoot, commandRegistry, config);
```

### Step 3: Update ExpressoScanner Instantiation

Change the scanner instantiation to pass the registry:

```typescript
// BEFORE:
expressoScanner = new ExpressoScanner(workspaceRoot, config);

// AFTER:
expressoScanner = new ExpressoScanner(workspaceRoot, commandRegistry, config);
```

### Step 4: Update ExpressoCompletionProvider Instantiation

Find where `ExpressoCompletionProvider` is created (around line 110) and pass the registry:

```typescript
// BEFORE:
const expressoCompletionProvider = new ExpressoCompletionProvider();

// AFTER:
const expressoCompletionProvider = new ExpressoCompletionProvider(commandRegistry);
```

### Step 5: Add Registry to Subscriptions

Ensure the registry is properly disposed when the extension deactivates:

```typescript
context.subscriptions.push(
  commandRegistry,  // ADD THIS
  expressoScanner,
  expressoDecorator,
  expressoCodeLensProvider,
  expressoCodeLensRegistration,
  expressoCompletionRegistration
);
```

### Step 6: Handle Async Initialization

The `activate` function needs to handle async initialization. If it's not already async, make it async:

```typescript
// Ensure the function is async
export async function activate(context: vscode.ExtensionContext) {
  // ...

  // CommandRegistry initialization is async
  await commandRegistry.initialize();

  // ... rest of activation
}
```

### Full Integration Example

```typescript
export async function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  // Read config
  const config = { /* ... */ };

  // 1. Create and initialize CommandRegistry FIRST
  const commandRegistry = new CommandRegistry(workspaceRoot);
  await commandRegistry.initialize();
  console.log('[Expresso] CommandRegistry initialized with',
    commandRegistry.getCommandNames().length, 'commands');

  // 2. Create ExpressoScanner with registry
  const expressoScanner = new ExpressoScanner(workspaceRoot, commandRegistry, config);

  // 3. Create decorator (depends on scanner)
  const expressoDecorator = new ExpressoDecorator(expressoScanner, context.extensionUri);

  // 4. Create completion provider with registry
  const expressoCompletionProvider = new ExpressoCompletionProvider(commandRegistry);
  const expressoCompletionRegistration = vscode.languages.registerCompletionItemProvider(
    { scheme: 'file' },
    expressoCompletionProvider,
    '/'
  );

  // 5. Add all to subscriptions
  context.subscriptions.push(
    commandRegistry,
    expressoScanner,
    expressoDecorator,
    expressoCompletionRegistration
  );
}
```

## Acceptance Criteria

- [ ] `CommandRegistry` import is added
- [ ] Registry is created and initialized before other services
- [ ] `ExpressoScanner` receives registry in constructor
- [ ] `ExpressoCompletionProvider` receives registry in constructor
- [ ] Registry is added to `context.subscriptions` for proper disposal
- [ ] Activation function handles async initialization
- [ ] Extension activates without errors
- [ ] TypeScript compiles without errors

## Testing

1. Compile: `npm run compile`
2. Run extension in debug mode (F5 in VSCode)
3. Check debug console for:
   - `[Expresso] CommandRegistry initialized with X commands`
4. Verify highlighting works
5. Verify autocomplete works

## Notes

- Initialization order is critical: Registry → Scanner → Decorator/CompletionProvider
- The activate function should be `async` to allow awaiting registry initialization
- Add logging to verify initialization sequence during debugging
