---
type: task
id: LOCAL-028
title: Enhanced @expresso Highlighting
status: in_progress
created: 2026-01-13
updated: 2026-01-13
tags:
  - task
  - in_progress
  - vscode-extension
summary:
  total: 8
  todo: 0
  in_progress: 0
  done: 8
repos:
  - vscode-extension
---

# LOCAL-028: Enhanced @expresso Highlighting

## Problem Statement

The current @expresso highlighting in the VSCode extension uses a brown background for the entire comment block, but the "@expresso" word itself shares the same color - there's no visual distinction for the keyword. Additionally, valid Claude commands (like `/task-start`, `/task-work`, etc.) mentioned in comments are not highlighted at all.

Users want:
1. The "@expresso" keyword to stand out with a different/more prominent color than the background
2. Valid Claude registered commands to be highlighted when mentioned in comments

## Acceptance Criteria

- [ ] @expresso word appears bold and distinctly colored (not just brown background)
- [ ] @expresso! (urgent) keyword has orange-red distinct styling
- [ ] @expresso? (question) keyword has blue distinct styling
- [ ] Keyword color contrasts clearly with comment background
- [ ] All 18 valid Claude commands highlight in comments with purple styling
- [ ] Commands outside comments do NOT highlight
- [ ] Hover on commands shows helpful tooltip
- [ ] Both features can be enabled/disabled via settings
- [ ] Performance remains good with large files

## Work Items


| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Add keyword styles to types | vscode-extension | todo |
| 02 | Create keyword decoration types | vscode-extension | todo |
| 03 | Apply keyword decorations | vscode-extension | todo |
| 04 | Define valid commands list | vscode-extension | todo |
| 05 | Add command scanning | vscode-extension | todo |
| 06 | Add command decoration | vscode-extension | todo |
| 07 | Add configuration options | vscode-extension | todo |
| 08 | Unit tests | vscode-extension | todo |

## Branches

**Note:** All affected repos are protected. No task branches will be created.
Work will be done on existing branches in the protected repos.

**Protected Repos:**
- vscode-extension - stays on current branch

## Technical Context

Key findings from exploration:

### Current Implementation
- Colors defined in: `vscode-extension/src/types/expresso.ts:154-176` (EXPRESSO_VARIANT_STYLES)
- Decoration logic in: `vscode-extension/src/services/ExpressoDecorator.ts`
- Scanner in: `vscode-extension/src/services/ExpressoScanner.ts`
- Current behavior: Highlights entire comment block with brown background rgba(139, 90, 43, 0.15)

### Color Scheme
| Variant | Current Color | RGB Values |
|---------|--------------|------------|
| normal | Brown | (139, 90, 43) |
| urgent | Orange-Red | (255, 87, 34) |
| question | Blue | (33, 150, 243) |

### Valid Claude Commands (18 total)
```
/task-start, /task-work, /task-done, /task-explore, /task-status,
/task-review, /task-resume, /task-create, /init, /help, /ask,
/enhance, /document, /ai-sync, /address-feedback, /command-create,
/command-extend, /expresso
```

## Implementation Approach

### Phase 1: @expresso Keyword Highlighting
1. Add `keywordColor` and `keywordFontWeight` properties to `ExpressoVariantStyle`
2. Create 3 new decoration types (one per variant) for keyword-only styling
3. Modify `decorateEditor()` to apply two decoration ranges per tag:
   - Background decoration for entire comment (existing)
   - Keyword decoration for just "@expresso" text (new)

### Phase 2: Command Highlighting
1. Define `VALID_CLAUDE_COMMANDS` array with all 18 commands
2. Add `COMMAND_DECORATION_STYLE` with purple theme
3. Add `scanDocumentForCommands()` method to ExpressoScanner
4. Create command decoration type and apply in decorateEditor()

### Phase 3: Configuration & Testing
1. Add `highlightKeyword` and `highlightCommands` settings
2. Create unit tests for decoration ranges and command detection

## Risks & Considerations

- **Multiple decorations overlap**: VSCode handles this well; keyword uses text color only (no bg) to avoid conflicts
- **Performance**: Command scanning uses simple regex on already-parsed lines; caching prevents rescanning
- **Command list updates**: Commands defined as const array - easy to update; could add dynamic loading later

## Testing Strategy

### Manual Testing
Create test file with various @expresso tags and commands:
```typescript
// @expresso Normal task - should have brown keyword
// @expresso! Urgent task - should have orange keyword
// @expresso? Question task - should have blue keyword

// Run /task-start to begin working on this
// Use /task-work to continue
// When done, run /task-done

const cmd = '/task-start'; // Should NOT highlight (string literal)
```

### Unit Tests
- Test keyword decoration range calculations
- Test command regex matching
- Test configuration respect

## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.

## References

- VSCode Decoration API: https://code.visualstudio.com/api/references/vscode-api#TextEditorDecorationType
- Existing types: `vscode-extension/src/types/expresso.ts`
- Existing decorator: `vscode-extension/src/services/ExpressoDecorator.ts`


## Linked Work Items

- [[01-add-keyword-styles]] — Add keyword styles to types (done)
- [[02-create-keyword-decorations]] — Create keyword decoration types (done)
- [[03-apply-keyword-decorations]] — Apply keyword decorations (done)
- [[04-define-commands-list]] — Define valid commands list (done)
- [[05-add-command-scanning]] — Add command scanning (done)
- [[06-add-command-decoration]] — Add command decoration (done)
- [[07-add-config-options]] — Add configuration options (done)
- [[08-unit-tests]] — Unit tests (done)
