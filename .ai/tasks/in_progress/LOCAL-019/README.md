<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/in_progress/LOCAL-019/                      ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)          ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                 ║
║ 4. Work on ONE item at a time from todo/                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-019: Add Syntax Highlighting to Diff Review Panel

## Problem Statement

The diff review panel displays code without syntax highlighting. While diff2html correctly shows added/deleted lines with green/red backgrounds, the actual code tokens (keywords, strings, functions, comments) are all displayed in the same color - making code harder to read and review compared to VSCode's native editor.

## Acceptance Criteria

- [ ] Code in diff view has syntax highlighting matching file type
- [ ] Highlighting works for common languages: TypeScript, JavaScript, Python, Go, JSON, CSS, HTML, Markdown
- [ ] Theme colors integrate with VSCode's current theme (dark/light)
- [ ] Diff backgrounds (green/red) are preserved alongside syntax highlighting
- [ ] No CSP errors or security warnings
- [ ] Bundle size increase is reasonable (~30KB for Prism.js)

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Add Prism.js vendor files | vscode-extension | todo |
| 02 | Create VSCode-compatible Prism theme | vscode-extension | todo |
| 03 | Update DiffReviewPanel HTML template | vscode-extension | todo |
| 04 | Implement syntax highlighting in diff-review.js | vscode-extension | todo |
| 05 | Test and verify highlighting | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `LOCAL-019-prism-syntax-highlighting` |

## Technical Context

### Current Implementation

The diff review panel uses **diff2html** library to render unified diffs as HTML:

```
vscode-extension/
├── src/panels/DiffReviewPanel.ts    # Webview panel, HTML template
├── media/
│   ├── diff-review.js               # Webview script, calls Diff2Html.html()
│   ├── diff-review.css              # VSCode theme integration
│   └── vendor/
│       ├── diff2html.min.js         # Diff rendering library
│       └── diff2html.min.css        # Diff styles
```

### Key Files

- `DiffReviewPanel.ts:269-292` - HTML template with CSP header
- `diff-review.js:111-119` - Diff rendering with `Diff2Html.html()`
- `diff-review.css:158-232` - diff2html color overrides

### Why No Syntax Highlighting Currently

diff2html renders code in `.d2h-code-line-ctn` elements as **plain text**. It's a diff formatter, not a syntax highlighter. It has no knowledge of programming languages or token types.

### Prism.js Integration Approach

1. **Load Prism.js** as vendor file (like diff2html)
2. **Post-process** diff2html output after rendering
3. **Highlight each line** using `Prism.highlight(code, language)`
4. **Map file extensions** to Prism language identifiers

```javascript
// After diff2html renders
const codeLines = document.querySelectorAll('.d2h-code-line-ctn');
codeLines.forEach(el => {
  const highlighted = Prism.highlight(el.textContent, Prism.languages[lang], lang);
  el.innerHTML = highlighted;
});
```

## Implementation Approach

### Phase 1: Add Prism.js (Work Items 01-02)
- Download Prism.js with common languages bundled
- Create VSCode-compatible CSS theme using CSS variables

### Phase 2: Integration (Work Items 03-04)
- Update HTML template to load Prism assets
- Add `highlightDiffCode()` function to diff-review.js
- Add language detection from file path

### Phase 3: Verification (Work Item 05)
- Test with various file types
- Verify theme switching works
- Check bundle size impact

## Risks & Considerations

- **Line-by-line highlighting**: Each line is highlighted independently, so multi-line constructs (template strings, block comments) may not highlight perfectly across diff chunks
- **Performance**: For very large diffs (1000+ lines), consider debouncing or using requestIdleCallback
- **Language support**: Need to include language definitions in Prism bundle; some exotic languages may not be supported

## Testing Strategy

1. Open diff review panel for TypeScript file - verify keywords are colored
2. Open diff review panel for Python file - verify different language works
3. Switch VSCode theme (light/dark) - verify colors adapt
4. Check that added/deleted line backgrounds are still visible
5. Open browser dev tools - verify no CSP errors

## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.

## References

- Prism.js: https://prismjs.com/
- diff2html: https://diff2html.xyz/
- VSCode Theme Colors: https://code.visualstudio.com/api/references/theme-color
