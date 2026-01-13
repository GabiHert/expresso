<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-define-commands-list.md                            ║
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

# Define Valid Commands List

## Objective

Create constants for the list of valid Claude commands and the decoration style for command highlighting.

## Pre-Implementation

Reference: Commands are defined in `.ai/_framework/commands/`:
- /task-start, /task-work, /task-done, /task-explore, /task-status
- /task-review, /task-resume, /task-create
- /init, /help, /ask, /enhance, /document, /ai-sync
- /address-feedback, /command-create, /command-extend, /expresso

## Implementation Steps

### Step 1: Add valid commands constant

**File**: `vscode-extension/src/types/expresso.ts`
**Location**: At the end of the file (after EXPRESSO_VARIANT_STYLES)

**Instructions**:
Add the commands array:

```typescript
/**
 * Valid Claude slash commands that should be highlighted in comments
 * These correspond to commands in .ai/_framework/commands/
 */
export const VALID_CLAUDE_COMMANDS = [
  '/task-start',
  '/task-work',
  '/task-done',
  '/task-explore',
  '/task-status',
  '/task-review',
  '/task-resume',
  '/task-create',
  '/init',
  '/help',
  '/ask',
  '/enhance',
  '/document',
  '/ai-sync',
  '/address-feedback',
  '/command-create',
  '/command-extend',
  '/expresso',
] as const;

/**
 * Type for valid Claude command names
 */
export type ClaudeCommand = typeof VALID_CLAUDE_COMMANDS[number];
```

### Step 2: Add command decoration style

**File**: `vscode-extension/src/types/expresso.ts`
**Location**: After VALID_CLAUDE_COMMANDS

**Instructions**:
Add the command styling:

```typescript
/**
 * Decoration style for Claude command highlighting
 * Uses purple to distinguish from @expresso variants
 */
export const COMMAND_DECORATION_STYLE = {
  /** Text color for commands (purple) */
  color: 'rgba(156, 39, 176, 1)',
  /** Font weight */
  fontWeight: 'bold',
  /** Light background to make commands pop */
  backgroundColor: 'rgba(156, 39, 176, 0.1)',
  /** Rounded corners */
  borderRadius: '2px',
};
```

### Step 3: Add CommandMatch interface

**File**: `vscode-extension/src/types/expresso.ts`
**Location**: After COMMAND_DECORATION_STYLE

**Instructions**:
Add interface for command matches:

```typescript
/**
 * Represents a matched Claude command in code
 */
export interface CommandMatch {
  /** The command text (e.g., '/task-start') */
  command: ClaudeCommand;
  /** Line number (1-based) */
  line: number;
  /** Column where command starts */
  columnStart: number;
  /** Column where command ends */
  columnEnd: number;
  /** File path */
  filePath: string;
}
```

## Post-Implementation

Run TypeScript compiler to verify no type errors:
```bash
cd vscode-extension && npm run compile
```

## Acceptance Criteria

- [ ] VALID_CLAUDE_COMMANDS array contains all 18 commands
- [ ] ClaudeCommand type is exported
- [ ] COMMAND_DECORATION_STYLE has color, fontWeight, backgroundColor, borderRadius
- [ ] CommandMatch interface is exported with all required fields
- [ ] TypeScript compiles without errors

## Testing

```bash
cd vscode-extension
npm run compile
```

## Notes

- Using purple (rgba(156, 39, 176, 1)) to distinguish from expresso's brown/orange/blue
- Light background (0.1 opacity) helps commands stand out in dense comments
- The commands list can be extended later; it's a const array for type safety
- CommandMatch interface will be used by ExpressoScanner in work item 05
