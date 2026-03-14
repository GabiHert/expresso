---
type: task
id: LOCAL-029
title: Dynamic CommandRegistry for VSCode Extension
status: done
created: 2026-01-13
updated: 2026-01-13
tags:
  - task
  - done
  - vscode-extension
summary:
  total: 6
  todo: 0
  in_progress: 0
  done: 6
repos:
  - vscode-extension
---

# LOCAL-029: Dynamic CommandRegistry for VSCode Extension

## Problem Statement

Both the Expresso highlighting feature and the autocomplete feature use a hardcoded `VALID_CLAUDE_COMMANDS` array defined in `types/expresso.ts`. This means:

1. When new commands are created via `/command-create`, they don't appear in highlighting or autocomplete
2. Users must manually update the hardcoded array when commands change
3. Project-specific commands in `.ai/_project/commands/` are never discovered

**Solution**: Create a `CommandRegistry` service that dynamically discovers commands from:
- `.ai/_framework/commands/*.md` (framework commands)
- `.ai/_project/commands/*.md` (project-specific commands)

## Acceptance Criteria

- [ ] CommandRegistry service discovers commands from `.ai/_framework/commands/` directory
- [ ] CommandRegistry discovers commands from `.ai/_project/commands/` directory
- [ ] Command names are extracted from filenames (e.g., `task-start.md` → `/task-start`)
- [ ] Descriptions are extracted from markdown H1 headers
- [ ] ExpressoScanner uses dynamic command list for highlighting
- [ ] ExpressoCompletionProvider uses dynamic command list for autocomplete
- [ ] File watcher updates command list when files are added/removed/modified
- [ ] Extension compiles and runs without errors
- [ ] Existing tests pass (or are updated to reflect new architecture)

## Work Items


| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Create CommandRegistry service | vscode-extension | todo |
| 02 | Update ExpressoScanner integration | vscode-extension | todo |
| 03 | Update ExpressoCompletionProvider | vscode-extension | todo |
| 04 | Update extension activation | vscode-extension | todo |
| 05 | Cleanup deprecated code | vscode-extension | todo |
| 06 | Add/update tests | vscode-extension | todo |

## Branches

**Protected Repos (no branches created):**
- ⛔ ai-framework - stays on `project/ai-cockpit`

| Repo | Path | Branch |
|------|------|--------|
| vscode-extension | `/Users/gabriel.herter/Documents/Personal/ai-framework/vscode-extension` | `feature/command-registry` |

## Technical Context

### Current Implementation

**VALID_CLAUDE_COMMANDS** is used in 3 locations:
- `types/expresso.ts` (Lines 200-219) - Definition as const array
- `services/ExpressoScanner.ts` (Lines 405-408) - Regex pattern building for highlighting
- `providers/ExpressoCompletionProvider.ts` (Lines 2, 60) - Autocomplete item generation

**Command File Format** (discovered during exploration):
```markdown
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /task-start                                            ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Start working on a task                                ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /task-start - Start Working on a Task

## Description
...
```

**Parsing Strategy**:
- Filename: `task-start.md` → `/task-start`
- Description: Extract from H1 header after command name (e.g., "Start Working on a Task")
- Fallback: Derive description from filename if H1 parsing fails

### Dependencies

```
CommandRegistry (new - source of truth)
    ↓
ExpressoScanner (uses for pattern matching)
    ↓
ExpressoDecorator (highlights commands)

CommandRegistry
    ↓
ExpressoCompletionProvider (provides autocomplete)
```

### Key Interfaces

```typescript
interface CommandInfo {
  name: string;           // e.g., "/task-start"
  description: string;    // e.g., "Start Working on a Task"
  filePath: string;       // Absolute path to the .md file
  source: 'framework' | 'project';  // Origin of the command
}

interface CommandRegistry {
  readonly onChange: vscode.Event<void>;
  initialize(): Promise<void>;
  getCommands(): CommandInfo[];
  getCommandNames(): string[];  // For regex building
  getCommand(name: string): CommandInfo | undefined;
  hasCommand(name: string): boolean;
  dispose(): void;
}
```

## Implementation Approach

**Phase 1: Foundation**
1. Create `CommandRegistry` service (standalone, no dependencies)
2. Add `CommandInfo` interface to types

**Phase 2: Integration**
3. Update `extension.ts` to create and initialize registry first
4. Update `ExpressoScanner` to inject and use registry
5. Update `ExpressoCompletionProvider` to inject and use registry

**Phase 3: Cleanup**
6. Remove/deprecate `VALID_CLAUDE_COMMANDS` from types
7. Remove hardcoded `COMMAND_DESCRIPTIONS` from completion provider

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| `.ai/_project/commands/` may not exist | Check directory existence; handle gracefully |
| Markdown parsing edge cases | Fallback to filename-based description |
| Race condition on startup | Ensure registry init completes before scanner starts |
| File watcher performance | Scope watcher to specific directories only |

## Testing Strategy

### Unit Tests
- CommandRegistry discovers commands from both directories
- Extracts names and descriptions correctly
- Emits onChange events on file changes
- Handles missing directories gracefully

### Integration Tests
- Highlighting works with dynamic commands
- Autocomplete suggests dynamic commands

### Manual Testing
1. Create `.ai/_project/commands/my-custom.md` with header `# /my-custom - My Custom Command`
2. Verify `/my-custom` is highlighted in comments
3. Verify autocomplete shows `/my-custom`
4. Delete file and verify highlighting disappears

## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.

## References

- Related task: [[LOCAL-028]] (Enhanced @expresso Highlighting) - parent feature
- Extension activation: `vscode-extension/src/extension.ts`
- Scanner: `vscode-extension/src/services/ExpressoScanner.ts`
- Completion: `vscode-extension/src/providers/ExpressoCompletionProvider.ts`
