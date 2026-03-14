---
type: work-item
id: "05"
parent: LOCAL-027
title: Clipboard and Toast Functionality
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Clipboard and Toast Functionality

## Objective

Implement the `brewExpresso` command that:
1. Formats the /expresso command string
2. Copies it to clipboard
3. Shows a toast notification: "Ready to brew! Paste in terminal ☕"

## Pre-Implementation

Review VSCode clipboard and notification APIs:
- `vscode.env.clipboard.writeText()`
- `vscode.window.showInformationMessage()`

## Implementation Steps

### Step 1: Create expresso commands module

**File**: `vscode-extension/src/commands/expresso.ts`

**Instructions**:

```typescript
import * as vscode from 'vscode';
import { ExpressoTag } from '../types/expresso';

/**
 * Format the /expresso command for clipboard
 */
function formatExpressoCommand(tag: ExpressoTag): string {
  // Escape double quotes in task description
  const escapedTask = tag.taskDescription.replace(/"/g, '\\"');

  // Format: /expresso path/to/file.ts:42 "task description"
  return `/expresso ${tag.relativePath}:${tag.line} "${escapedTask}"`;
}

/**
 * Get emoji for variant
 */
function getVariantEmoji(variant: ExpressoTag['variant']): string {
  switch (variant) {
    case 'urgent': return '🔥';
    case 'question': return '❓';
    default: return '☕';
  }
}

/**
 * Register all expresso-related commands
 */
export function registerExpressoCommands(context: vscode.ExtensionContext): void {

  // Main brew command - triggered by CodeLens click
  const brewCommand = vscode.commands.registerCommand(
    'aiCockpit.brewExpresso',
    async (tag: ExpressoTag) => {
      if (!tag) {
        vscode.window.showErrorMessage('No expresso tag provided');
        return;
      }

      try {
        // Format the command
        const command = formatExpressoCommand(tag);

        // Copy to clipboard
        await vscode.env.clipboard.writeText(command);

        // Show toast notification
        const emoji = getVariantEmoji(tag.variant);

        const action = await vscode.window.showInformationMessage(
          `${emoji} Ready to brew! Paste in terminal`,
          'Open Terminal'
        );

        // Optionally open terminal if user clicks the button
        if (action === 'Open Terminal') {
          vscode.commands.executeCommand('workbench.action.terminal.focus');
        }

      } catch (error) {
        vscode.window.showErrorMessage(`Failed to copy: ${error}`);
      }
    }
  );

  // Command to scan workspace manually
  const scanCommand = vscode.commands.registerCommand(
    'aiCockpit.scanExpresso',
    async () => {
      // This will be connected to the scanner
      vscode.window.showInformationMessage('Scanning for @expresso tags...');
    }
  );

  // Command to show all expresso tags (future: opens sidebar)
  const listCommand = vscode.commands.registerCommand(
    'aiCockpit.listExpresso',
    async () => {
      vscode.window.showInformationMessage('Expresso tag list coming soon!');
    }
  );

  context.subscriptions.push(brewCommand, scanCommand, listCommand);
}
```

### Step 2: Register commands in extension.ts

**File**: `vscode-extension/src/extension.ts` (modify)

**Instructions**:

```typescript
// Import at top
import { registerExpressoCommands } from './commands/expresso';

// In activate(), after other initialization:
registerExpressoCommands(context);
```

### Step 3: Update package.json with all commands

**File**: `vscode-extension/package.json` (modify)

**Instructions**:

Add/update in `contributes.commands`:

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
        "category": "AI Cockpit",
        "icon": "$(search)"
      },
      {
        "command": "aiCockpit.listExpresso",
        "title": "List All Expresso Tags",
        "category": "AI Cockpit",
        "icon": "$(list-unordered)"
      }
    ]
  }
}
```

### Step 4: Add keyboard shortcut (optional)

**File**: `vscode-extension/package.json` (modify)

```json
{
  "contributes": {
    "keybindings": [
      {
        "command": "aiCockpit.scanExpresso",
        "key": "ctrl+shift+e",
        "mac": "cmd+shift+e",
        "when": "editorTextFocus"
      }
    ]
  }
}
```

## Post-Implementation

Test the full flow: click CodeLens → clipboard → paste.

## Acceptance Criteria

- [ ] Clicking "Brew this" copies command to clipboard
- [ ] Command format is `/expresso path:line "task"`
- [ ] Toast shows "Ready to brew! Paste in terminal ☕"
- [ ] Toast includes correct emoji for variant
- [ ] "Open Terminal" button focuses terminal
- [ ] Special characters in task are escaped properly
- [ ] Error handling for clipboard failures

## Testing

1. Click "Brew this" on an @expresso tag
2. Verify toast notification appears
3. Paste in terminal, verify command format
4. Test with task containing quotes: `@expresso add "hello" message`
5. Test with all three variants

## Notes

- The toast auto-dismisses after ~5 seconds (VSCode default)
- Consider adding a status bar item showing last copied command
- Future: Could directly open Claude terminal and paste
