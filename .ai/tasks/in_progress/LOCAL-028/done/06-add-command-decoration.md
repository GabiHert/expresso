<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 06-add-command-decoration.md                          ║
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

# Add Command Decoration

## Objective

Add TextEditorDecorationType for Claude commands and apply purple highlighting to detected commands in the decorateEditor method.

## Pre-Implementation

Depends on: Work Items 04 and 05 (command types and scanning)

Read current decorator:
- `vscode-extension/src/services/ExpressoDecorator.ts`

## Implementation Steps

### Step 1: Import command types

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: Update imports at top

**Instructions**:
Add imports:

```typescript
import {
  ExpressoTag,
  ExpressoVariant,
  EXPRESSO_VARIANT_STYLES,
  COMMAND_DECORATION_STYLE,
  CommandMatch,
} from '../types/expresso';
```

### Step 2: Add command decoration field

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: After keyword decoration fields

**Instructions**:
Add field:

```typescript
private commandDecoration: vscode.TextEditorDecorationType;
```

### Step 3: Create command decoration type in constructor

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: In constructor, after keyword decoration initialization

**Instructions**:
Add initialization:

```typescript
// Create command decoration type
this.commandDecoration = vscode.window.createTextEditorDecorationType({
  color: COMMAND_DECORATION_STYLE.color,
  fontWeight: COMMAND_DECORATION_STYLE.fontWeight,
  backgroundColor: COMMAND_DECORATION_STYLE.backgroundColor,
  borderRadius: COMMAND_DECORATION_STYLE.borderRadius,
});
```

### Step 4: Add createCommandHoverMessage method

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: After createHoverMessage method

**Instructions**:
Add helper for command tooltips:

```typescript
/**
 * Create hover message for a command
 */
private createCommandHoverMessage(cmd: CommandMatch): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**Claude Command**: \`${cmd.command}\`\n\n`);
  md.appendMarkdown(`Run this command in a Claude Code session to execute it.\n\n`);
  md.appendMarkdown(`---\n`);
  md.appendMarkdown(`*Recognized Expresso framework command*`);
  md.isTrusted = true;
  return md;
}
```

### Step 5: Apply command decorations in decorateEditor

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: In decorateEditor method, after applying keyword decorations

**Instructions**:
Add command decoration application:

```typescript
// Get and apply command decorations
const commands = this.scanner.getCommandsForFile(filePath);
const commandRanges: vscode.DecorationOptions[] = commands.map(cmd => ({
  range: new vscode.Range(
    cmd.line - 1,
    cmd.columnStart,
    cmd.line - 1,
    cmd.columnEnd
  ),
  hoverMessage: this.createCommandHoverMessage(cmd),
}));

editor.setDecorations(this.commandDecoration, commandRanges);
```

### Step 6: Clear command decorations in clearEditor

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: In clearEditor method

**Instructions**:
Add clearing:

```typescript
editor.setDecorations(this.commandDecoration, []);
```

### Step 7: Dispose command decoration

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: In dispose method

**Instructions**:
Add disposal:

```typescript
this.commandDecoration.dispose();
```

## Post-Implementation

Run TypeScript compiler and test:
```bash
cd vscode-extension && npm run compile
```

## Acceptance Criteria

- [ ] COMMAND_DECORATION_STYLE imported
- [ ] CommandMatch imported
- [ ] Command decoration field added
- [ ] Command decoration created with purple styling
- [ ] createCommandHoverMessage returns helpful tooltip
- [ ] Commands are decorated in decorateEditor
- [ ] Command decorations cleared in clearEditor
- [ ] Command decoration disposed in dispose()
- [ ] TypeScript compiles without errors

## Testing

1. Compile and run extension
2. Open a file with Claude commands in comments:
   ```typescript
   // Run /task-start to begin
   // Use /task-work for next item
   ```
3. Verify commands appear purple and bold
4. Hover over command to see tooltip
5. Verify commands in strings don't highlight:
   ```typescript
   const cmd = '/task-start'; // Should NOT be purple
   ```

## Notes

- Commands use purple to distinguish from @expresso's brown/orange/blue
- Light background (0.1 opacity) helps visibility
- Tooltip explains the command is recognized
