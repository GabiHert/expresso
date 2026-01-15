<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 07-add-config-options.md                              ║
║ TASK: LOCAL-028                                                  ║
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
# Repository Context (LOCAL-028)
repo: vscode-extension
repo_path: /Users/gabriel.herter/Documents/Personal/ai-framework/vscode-extension
branch: main
protected: true

# Git Safety Reminder
# Before any git operation:
#   1. cd /Users/gabriel.herter/Documents/Personal/ai-framework/vscode-extension
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# Add Configuration Options

## Objective

Add VSCode settings to enable/disable keyword highlighting and command highlighting features independently.

## Pre-Implementation

Read current configuration:
- `vscode-extension/package.json` (contributes.configuration section)
- `vscode-extension/src/types/expresso.ts` (ExpressoConfig interface)

## Implementation Steps

### Step 1: Add settings to package.json

**File**: `vscode-extension/package.json`
**Location**: In `contributes.configuration.properties` section (around line 159-202)

**Instructions**:
Add new configuration properties after existing expresso settings:

```json
"aiCockpit.expresso.highlightKeyword": {
  "type": "boolean",
  "default": true,
  "description": "Highlight the @expresso keyword with distinct styling (bold, colored text)"
},
"aiCockpit.expresso.highlightCommands": {
  "type": "boolean",
  "default": true,
  "description": "Highlight valid Claude commands (/task-start, /task-work, etc.) in comments"
}
```

### Step 2: Update ExpressoConfig interface

**File**: `vscode-extension/src/types/expresso.ts`
**Location**: In ExpressoConfig interface (lines 79-97)

**Instructions**:
Add new config fields:

```typescript
export interface ExpressoConfig {
  /** Whether the feature is enabled */
  enabled: boolean;

  /** File extensions to scan */
  fileExtensions: string[];

  /** Directories to exclude from scanning */
  excludePatterns: string[];

  /** Whether to scan on file save */
  scanOnSave: boolean;

  /** Whether to show decorations (highlighting, gutter icons) */
  showDecorations: boolean;

  /** Whether to show CodeLens ("Brew this" buttons) */
  showCodeLens: boolean;

  /** Whether to highlight @expresso keyword distinctly */
  highlightKeyword: boolean;

  /** Whether to highlight Claude commands in comments */
  highlightCommands: boolean;
}
```

### Step 3: Update DEFAULT_EXPRESSO_CONFIG

**File**: `vscode-extension/src/types/expresso.ts`
**Location**: In DEFAULT_EXPRESSO_CONFIG (lines 102-133)

**Instructions**:
Add defaults:

```typescript
export const DEFAULT_EXPRESSO_CONFIG: ExpressoConfig = {
  enabled: true,
  fileExtensions: [
    '.ts',
    '.tsx',
    // ... existing extensions ...
  ],
  excludePatterns: [
    '**/node_modules/**',
    // ... existing patterns ...
  ],
  scanOnSave: true,
  showDecorations: true,
  showCodeLens: true,
  highlightKeyword: true,    // NEW
  highlightCommands: true,   // NEW
};
```

### Step 4: Read config in ExpressoDecorator.decorateEditor

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: In decorateEditor method

**Instructions**:
Check config before applying keyword/command decorations:

```typescript
public decorateEditor(editor: vscode.TextEditor): void {
  const config = this.scanner.getConfig();
  if (!config.showDecorations) {
    this.clearEditor(editor);
    return;
  }

  // ... existing tag decoration code ...

  // Apply keyword decorations (if enabled)
  if (config.highlightKeyword) {
    editor.setDecorations(this.normalKeywordDecoration, normalKeywordRanges);
    editor.setDecorations(this.urgentKeywordDecoration, urgentKeywordRanges);
    editor.setDecorations(this.questionKeywordDecoration, questionKeywordRanges);
  } else {
    // Clear keyword decorations if disabled
    editor.setDecorations(this.normalKeywordDecoration, []);
    editor.setDecorations(this.urgentKeywordDecoration, []);
    editor.setDecorations(this.questionKeywordDecoration, []);
  }

  // Apply command decorations (if enabled)
  if (config.highlightCommands) {
    const commands = this.scanner.getCommandsForFile(filePath);
    const commandRanges: vscode.DecorationOptions[] = commands.map(cmd => ({
      range: new vscode.Range(cmd.line - 1, cmd.columnStart, cmd.line - 1, cmd.columnEnd),
      hoverMessage: this.createCommandHoverMessage(cmd),
    }));
    editor.setDecorations(this.commandDecoration, commandRanges);
  } else {
    editor.setDecorations(this.commandDecoration, []);
  }
}
```

### Step 5: Update config reading in ExpressoScanner

**File**: `vscode-extension/src/services/ExpressoScanner.ts`
**Location**: In loadConfig method (or wherever VSCode config is read)

**Instructions**:
Ensure new settings are read from VSCode config:

```typescript
private loadConfig(): ExpressoConfig {
  const vscodeConfig = vscode.workspace.getConfiguration('aiCockpit.expresso');

  return {
    enabled: vscodeConfig.get('enabled', DEFAULT_EXPRESSO_CONFIG.enabled),
    fileExtensions: vscodeConfig.get('fileExtensions', DEFAULT_EXPRESSO_CONFIG.fileExtensions),
    excludePatterns: vscodeConfig.get('excludePatterns', DEFAULT_EXPRESSO_CONFIG.excludePatterns),
    scanOnSave: vscodeConfig.get('scanOnSave', DEFAULT_EXPRESSO_CONFIG.scanOnSave),
    showDecorations: vscodeConfig.get('showDecorations', DEFAULT_EXPRESSO_CONFIG.showDecorations),
    showCodeLens: vscodeConfig.get('showCodeLens', DEFAULT_EXPRESSO_CONFIG.showCodeLens),
    highlightKeyword: vscodeConfig.get('highlightKeyword', DEFAULT_EXPRESSO_CONFIG.highlightKeyword),
    highlightCommands: vscodeConfig.get('highlightCommands', DEFAULT_EXPRESSO_CONFIG.highlightCommands),
  };
}
```

## Post-Implementation

Run TypeScript compiler:
```bash
cd vscode-extension && npm run compile
```

## Acceptance Criteria

- [ ] package.json has `aiCockpit.expresso.highlightKeyword` setting
- [ ] package.json has `aiCockpit.expresso.highlightCommands` setting
- [ ] ExpressoConfig interface has both new boolean fields
- [ ] DEFAULT_EXPRESSO_CONFIG has both defaults as true
- [ ] decorateEditor checks highlightKeyword before applying
- [ ] decorateEditor checks highlightCommands before applying
- [ ] Settings are read from VSCode configuration
- [ ] TypeScript compiles without errors

## Testing

1. Open VSCode settings
2. Search for "expresso"
3. Verify new settings appear
4. Toggle highlightKeyword off - keyword styling should disappear
5. Toggle highlightCommands off - command highlighting should disappear
6. Toggle back on - styling returns

## Notes

- Both settings default to true for best out-of-box experience
- Settings integrate with existing aiCockpit.expresso namespace
- Clearing decorations when disabled ensures clean toggle behavior
