<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/todo/LOCAL-014/                              ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)           ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                  ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-014: GitHub-style PR review diff viewer

## Problem Statement

Users want to add inline comments on diff views like GitHub PR reviews. Currently, the AI Cockpit uses VSCode's native `vscode.diff` command which doesn't support comment annotations. Users must manually edit a markdown file with file:line references, which is cumbersome compared to clicking directly on diff lines.

The goal is to replace the native diff viewer with a custom webview that renders diffs using diff2html and allows inline commenting with a GitHub-familiar UX (hover → "+" button → comment input).

## Acceptance Criteria

- [ ] Click "+" button on any diff line to add inline comment
- [ ] Comments display inline in diff view (like GitHub PR reviews)
- [ ] Comments sync bidirectionally to `feedback/diff-review.md`
- [ ] `/address-feedback` command can read structured comments with metadata
- [ ] Works with existing shadow copy system (baseline → accumulated)
- [ ] Matches VSCode theme (light/dark)
- [ ] Supports line ranges (e.g., lines 42-50)
- [ ] Resolved comments show with strikethrough

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Enhanced feedback format design | ai-framework | todo |
| 02 | Feedback parsing library | ai-framework | todo |
| 03 | DiffReviewPanel webview scaffold | vscode-extension | todo |
| 04 | Integrate diff2html rendering | vscode-extension | todo |
| 05 | Comment UI overlay system | vscode-extension | todo |
| 06 | CommentManager service | vscode-extension | todo |
| 07 | Wire tree view to webview | vscode-extension | todo |
| 08 | Styling and polish | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| ai-framework | `LOCAL-014-pr-review-diff` |
| vscode-extension | `LOCAL-014-pr-review-diff` |

## Technical Context

### Current Architecture
- Shadow copies stored in `.ai/cockpit/shadows/{taskId}/{hash}/`
- Each shadow has: `baseline.txt`, `accumulated.txt`, `meta.json`
- Diff viewing uses `vscode.diff` command with virtual document providers
- Feedback stored in `.ai/tasks/{taskId}/feedback/diff-review.md`

### Key Files
- `vscode-extension/src/services/DiffViewer.ts` - Current diff logic
- `vscode-extension/src/services/ShadowManager.ts` - Shadow data source
- `vscode-extension/src/providers/TaskTreeProvider.ts` - Tree view integration
- `.ai/_framework/templates/feedback-template.md` - Current feedback format

### Technology Choice: diff2html
Chosen over Monaco Editor because:
- Smaller bundle (~50KB vs ~2MB)
- GitHub-familiar UX out of the box
- Easier DOM injection for comment widgets
- Goal is review/commenting, not editing

## Architecture Diagrams

### Component Overview

```mermaid
flowchart TB
    subgraph VSCode["VSCode Extension"]
        TV[Tree View<br/>Files Changed]
        DRP[DiffReviewPanel<br/>Webview]
        CM[CommentManager]
        SM[ShadowManager]
        FP[FeedbackParser]
    end

    subgraph Storage["File System"]
        SC[Shadow Copies<br/>.ai/cockpit/shadows/]
        FF[Feedback File<br/>diff-review.md]
    end

    TV -->|click file| DRP
    DRP -->|get diff| SM
    SM -->|read| SC
    DRP -->|add/edit comment| CM
    CM -->|parse/serialize| FP
    CM -->|sync| FF
    FP -->|read| FF
```

### Message Flow: Adding a Comment

```mermaid
sequenceDiagram
    participant U as User
    participant WV as Webview
    participant EXT as Extension
    participant CM as CommentManager
    participant FS as Feedback File

    U->>WV: Hover line 42
    WV->>WV: Show "+" button
    U->>WV: Click "+"
    WV->>WV: Show comment input
    U->>WV: Type comment, submit
    WV->>EXT: postMessage(addComment)
    EXT->>CM: addComment(file, line, text)
    CM->>CM: Generate comment ID
    CM->>FS: Append to markdown
    CM->>EXT: Comment added
    EXT->>WV: postMessage(updateComments)
    WV->>WV: Render inline comment
```

### Webview Architecture

```mermaid
flowchart LR
    subgraph Webview["Webview Panel"]
        HTML[diff-review.html]
        CSS[diff-review.css]
        JS[diff-review.js]
        D2H[diff2html]
    end

    subgraph Extension["Extension Host"]
        DRP[DiffReviewPanel.ts]
        MSG[Message Handler]
    end

    DRP -->|postMessage| JS
    JS -->|postMessage| MSG
    D2H -->|render| HTML
    CSS -->|style| HTML
```

## Implementation Approach

### Phase 1: Foundation (WI 01-03)
1. Define enhanced feedback format with metadata
2. Create parsing library for structured comments
3. Scaffold webview panel with message passing

### Phase 2: Core Features (WI 04-06)
1. Integrate diff2html for diff rendering
2. Build comment UI overlay (hover button, input, display)
3. Implement CommentManager for CRUD and file sync

### Phase 3: Integration & Polish (WI 07-08)
1. Wire tree view to open webview instead of native diff
2. Style to match VSCode themes, add keyboard shortcuts

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Line numbers shift after edits | Store file hash, warn if stale |
| Theme mismatch | Custom CSS variables matching VSCode |
| External edit conflicts | File watcher with debounced reload |
| Bundle size | Lazy-load diff2html only when panel opens |

## Testing Strategy

### Unit Tests
- FeedbackParser: Parse/serialize markdown correctly
- CommentManager: CRUD operations, file sync

### Integration Tests
- Webview loads with correct diff
- Comment added → appears in markdown
- External edit → webview updates

### Manual Testing
1. Open diff review with 0 comments
2. Add comment on specific line
3. Add comment on line range
4. Resolve comment (verify strikethrough)
5. Switch themes (verify colors)
6. Run `/address-feedback` (verify agent sees comments)

## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.

## References

- [diff2html documentation](https://diff2html.xyz/)
- [VSCode Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- Existing shadow system: `.ai/docs/_architecture/shadow-copy-system.md`
