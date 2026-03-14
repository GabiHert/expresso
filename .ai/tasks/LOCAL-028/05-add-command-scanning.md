---
type: work-item
id: "05"
parent: LOCAL-028
title: Add command scanning
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
branch: main
---

> Parent: [[LOCAL-028]]


# Add Command Scanning

## Objective

Add functionality to ExpressoScanner to detect valid Claude commands in comment lines and provide command matches to the decorator.

## Pre-Implementation

Depends on: Work Item 04 (command types defined)

Read the current scanner implementation:
- `vscode-extension/src/services/ExpressoScanner.ts`

## Implementation Steps

### Step 1: Import command types

**File**: `vscode-extension/src/services/ExpressoScanner.ts`
**Location**: At the top, update imports

**Instructions**:
Add imports for command types:

```typescript
import {
  ExpressoTag,
  ExpressoScanResult,
  ExpressoConfig,
  DEFAULT_EXPRESSO_CONFIG,
  ExpressoVariant,
  VALID_CLAUDE_COMMANDS,
  CommandMatch,
  ClaudeCommand,
} from '../types/expresso';
```

### Step 2: Add command cache

**File**: `vscode-extension/src/services/ExpressoScanner.ts`
**Location**: In class, after existing caches (around line 20)

**Instructions**:
Add command cache:

```typescript
/** Cache of command matches by file path */
private commandCache: Map<string, CommandMatch[]> = new Map();
```

### Step 3: Add isCommentLine helper

**File**: `vscode-extension/src/services/ExpressoScanner.ts`
**Location**: Add as a private method

**Instructions**:
Add helper to detect comment lines:

```typescript
/**
 * Check if a line is a comment (supports //, /*, *, #, /**, <!--)
 */
private isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('<!--') ||
    trimmed.includes('*/') ||
    trimmed.includes('-->')
  );
}
```

### Step 4: Add scanDocumentForCommands method

**File**: `vscode-extension/src/services/ExpressoScanner.ts`
**Location**: After scanDocument method

**Instructions**:
Add command scanning method:

```typescript
/**
 * Scan a document for valid Claude commands in comments
 */
public scanDocumentForCommands(document: vscode.TextDocument): CommandMatch[] {
  const matches: CommandMatch[] = [];
  const text = document.getText();
  const lines = text.split('\n');
  const filePath = document.uri.fsPath;

  // Build regex pattern from valid commands
  // Escape forward slashes and join with OR
  const commandPattern = new RegExp(
    `(${VALID_CLAUDE_COMMANDS.map(cmd => cmd.replace('/', '\\/')).join('|')})(?=\\s|$|[^a-zA-Z0-9-])`,
    'g'
  );

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // Only scan comment lines
    if (!this.isCommentLine(line)) {
      continue;
    }

    // Reset regex lastIndex for each line
    commandPattern.lastIndex = 0;

    let match;
    while ((match = commandPattern.exec(line)) !== null) {
      matches.push({
        command: match[1] as ClaudeCommand,
        line: lineIndex + 1, // 1-based
        columnStart: match.index,
        columnEnd: match.index + match[1].length,
        filePath,
      });
    }
  }

  return matches;
}
```

### Step 5: Add getCommandsForFile method

**File**: `vscode-extension/src/services/ExpressoScanner.ts`
**Location**: After scanDocumentForCommands

**Instructions**:
Add method to get cached commands:

```typescript
/**
 * Get command matches for a specific file
 */
public getCommandsForFile(filePath: string): CommandMatch[] {
  return this.commandCache.get(filePath) || [];
}
```

### Step 6: Update scanDocument to also scan commands

**File**: `vscode-extension/src/services/ExpressoScanner.ts`
**Location**: In the existing scanDocument method, after scanning for tags

**Instructions**:
Add command scanning after tag scanning:

```typescript
// Also scan for commands in this document
const commands = this.scanDocumentForCommands(document);
this.commandCache.set(document.uri.fsPath, commands);
```

### Step 7: Clear command cache when appropriate

**File**: `vscode-extension/src/services/ExpressoScanner.ts`
**Location**: In any cache-clearing methods (like when file is deleted)

**Instructions**:
Ensure command cache is cleared when tag cache is cleared:

```typescript
// When clearing file from cache
this.commandCache.delete(filePath);
```

## Post-Implementation

Run TypeScript compiler:
```bash
cd vscode-extension && npm run compile
```

## Acceptance Criteria

- [ ] VALID_CLAUDE_COMMANDS imported from types
- [ ] CommandMatch imported from types
- [ ] Command cache initialized
- [ ] isCommentLine helper works for //, /*, #, <!--
- [ ] scanDocumentForCommands finds commands in comments
- [ ] scanDocumentForCommands ignores commands outside comments
- [ ] getCommandsForFile returns cached commands
- [ ] scanDocument updates command cache
- [ ] TypeScript compiles without errors

## Testing

Test with a file containing:
```typescript
// Run /task-start to begin
// Use /task-work for next steps
const cmd = '/task-start'; // This should NOT be found (not in comment)
/* /task-done when finished */
```

Expected: Only commands in comments are detected.

## Notes

- The regex uses lookahead `(?=\\s|$|[^a-zA-Z0-9-])` to avoid matching partial words
- Commands must be in comment context to be highlighted
- Cache is updated on each document scan for performance
