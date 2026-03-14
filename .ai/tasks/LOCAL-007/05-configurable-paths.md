---
type: work-item
id: "05"
parent: LOCAL-007
title: Make Claude history path configurable
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Make Claude History Path Configurable

## Objective

Remove hardcoded path to Claude's history.jsonl file. Make it configurable via VS Code settings with a sensible default.

## Pre-Implementation

Research:
- Where different Claude installations store history
- Standard path patterns across OS (macOS, Linux, Windows)
- How to detect Claude installation location

## Implementation Steps

### Step 1: Add Configuration Settings

**File**: `vscode-extension/package.json`

**Instructions**:
1. Add settings under the configuration section (create if needed):

```json
"configuration": {
  "title": "AI Cockpit",
  "properties": {
    "aiCockpit.claude.historyPath": {
      "type": "string",
      "default": "",
      "description": "Path to Claude's history.jsonl file. Leave empty to use default (~/.claude/history.jsonl)"
    },
    "aiCockpit.claude.autoDetect": {
      "type": "boolean",
      "default": true,
      "description": "Automatically detect Claude history location"
    }
  }
}
```

### Step 2: Create Claude Path Utility

**File**: `vscode-extension/src/utils/claudePaths.ts` (NEW)

**Instructions**:
1. Create utility to find Claude history path
2. Support multiple OS patterns
3. Allow override from settings

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

const DEFAULT_PATHS = {
  darwin: [
    path.join(os.homedir(), '.claude', 'history.jsonl'),
    path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'history.jsonl')
  ],
  linux: [
    path.join(os.homedir(), '.claude', 'history.jsonl'),
    path.join(os.homedir(), '.config', 'claude', 'history.jsonl')
  ],
  win32: [
    path.join(os.homedir(), '.claude', 'history.jsonl'),
    path.join(process.env.APPDATA || '', 'Claude', 'history.jsonl')
  ]
};

export async function getClaudeHistoryPath(): Promise<string | null> {
  const config = vscode.workspace.getConfiguration('aiCockpit');

  // Check for manual override
  const manualPath = config.get<string>('claude.historyPath', '');
  if (manualPath) {
    try {
      await fs.promises.access(manualPath);
      return manualPath;
    } catch {
      console.warn(`AI Cockpit: Configured path not found: ${manualPath}`);
    }
  }

  // Auto-detect if enabled
  if (config.get<boolean>('claude.autoDetect', true)) {
    const platform = process.platform as keyof typeof DEFAULT_PATHS;
    const candidates = DEFAULT_PATHS[platform] || DEFAULT_PATHS.linux;

    for (const candidate of candidates) {
      try {
        await fs.promises.access(candidate);
        return candidate;
      } catch {
        continue;
      }
    }
  }

  // Fallback to default path
  return path.join(os.homedir(), '.claude', 'history.jsonl');
}

export function getDefaultHistoryPath(): string {
  return path.join(os.homedir(), '.claude', 'history.jsonl');
}
```

### Step 3: Update Session Capture to Use Utility

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
1. Import the new utility
2. Update `captureLatestSessionId` to use configurable path
3. Handle case where history file not found

```typescript
import { getClaudeHistoryPath } from './utils/claudePaths';

const captureLatestSessionId = async (
  knownSessionIds: Set<string>
): Promise<string | null> => {
  const historyPath = await getClaudeHistoryPath();

  if (!historyPath) {
    console.warn('AI Cockpit: Claude history file not found');
    return null;
  }

  const maxAttempts = 10;
  const pollInterval = 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const content = await fs.promises.readFile(historyPath, 'utf8');
      // ... rest of parsing logic
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`AI Cockpit: History file not found at ${historyPath}`);
        return null;
      }
      // Continue polling on other read errors
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  return null;
};
```

### Step 4: Add Path Validation Command

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
1. Add command to validate Claude path configuration
2. Show user feedback about detected path

```typescript
const validateClaudePath = vscode.commands.registerCommand(
  'aiCockpit.validateClaudePath',
  async () => {
    const historyPath = await getClaudeHistoryPath();

    if (!historyPath) {
      vscode.window.showErrorMessage(
        'AI Cockpit: Could not find Claude history file. ' +
        'Check your aiCockpit.claude.historyPath setting.'
      );
      return;
    }

    try {
      await fs.promises.access(historyPath);
      vscode.window.showInformationMessage(
        `AI Cockpit: Found Claude history at ${historyPath}`
      );
    } catch {
      vscode.window.showWarningMessage(
        `AI Cockpit: Path configured but file not found: ${historyPath}`
      );
    }
  }
);

context.subscriptions.push(validateClaudePath);
```

### Step 5: Add Command to package.json

**File**: `vscode-extension/package.json`

**Instructions**:
1. Add the validation command

```json
{
  "command": "aiCockpit.validateClaudePath",
  "title": "AI Cockpit: Validate Claude Path"
}
```

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Claude history path is configurable via settings
- [ ] Auto-detection works on macOS, Linux, and Windows
- [ ] Manual path override works
- [ ] Validation command shows current path status
- [ ] Graceful handling when path not found

## Testing

1. Test with default path
2. Test with custom path setting
3. Test with invalid path (should fall back gracefully)
4. Test on different OS (if possible) or mock paths
5. Run validation command with various configurations

## Notes

- Consider watching for settings changes and reconfiguring
- Windows paths may need special handling
- Future: could add button to browse for file
