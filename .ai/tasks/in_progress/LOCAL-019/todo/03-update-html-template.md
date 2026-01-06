<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-update-html-template.md                           ║
║ TASK: LOCAL-019                                                  ║
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
repo: vscode-extension
---

# Update DiffReviewPanel HTML Template

## Objective

Update the DiffReviewPanel to load Prism.js and its VSCode theme CSS in the webview HTML template.

## Pre-Implementation

Review the current HTML template structure:
- `src/panels/DiffReviewPanel.ts:250-292` - `_getHtmlContent()` method
- Current assets: diff2htmlCss, diff2htmlJs, scriptUri, styleUri

## Implementation Steps

### Step 1: Add Prism Asset URIs

**File**: `vscode-extension/src/panels/DiffReviewPanel.ts`

In the `_getHtmlContent()` method (around line 253), add URIs for Prism assets:

```typescript
private _getHtmlContent(): string {
  const webview = this._panel.webview;

  // Get URIs for resources
  const diff2htmlCss = webview.asWebviewUri(
    vscode.Uri.joinPath(this._extensionUri, 'media', 'vendor', 'diff2html.min.css')
  );
  const diff2htmlJs = webview.asWebviewUri(
    vscode.Uri.joinPath(this._extensionUri, 'media', 'vendor', 'diff2html.min.js')
  );

  // ADD: Prism.js for syntax highlighting
  const prismJs = webview.asWebviewUri(
    vscode.Uri.joinPath(this._extensionUri, 'media', 'vendor', 'prism.min.js')
  );
  const prismCss = webview.asWebviewUri(
    vscode.Uri.joinPath(this._extensionUri, 'media', 'prism-vscode.css')
  );

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(this._extensionUri, 'media', 'diff-review.js')
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(this._extensionUri, 'media', 'diff-review.css')
  );

  const nonce = this._getNonce();
  // ... rest of method
```

### Step 2: Update HTML Template

In the same method, update the HTML template to include Prism assets:

**Add CSS link** (after diff2htmlCss, before styleUri):
```html
<link href="${prismCss}" rel="stylesheet">
```

**Add script tag** (after diff2htmlJs, before scriptUri):
```html
<script nonce="${nonce}" src="${prismJs}"></script>
```

The updated template should look like:

```typescript
return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <link href="${diff2htmlCss}" rel="stylesheet">
  <link href="${prismCss}" rel="stylesheet">
  <link href="${styleUri}" rel="stylesheet">
  <title>Review: ${this._escapeHtml(path.basename(this._shadow.meta.filePath))}</title>
</head>
<body>
  <div id="app">
    <div id="toolbar">
      <span id="filename">${this._escapeHtml(this._shadow.meta.filePath)}</span>
      <span id="stats"></span>
    </div>
    <div id="diff-container">
      <p class="loading">Loading diff...</p>
    </div>
  </div>
  <script nonce="${nonce}" src="${diff2htmlJs}"></script>
  <script nonce="${nonce}" src="${prismJs}"></script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
```

### Step 3: Verify Load Order

The load order is important:
1. **CSS first**: diff2html CSS, then prism CSS, then custom styles
2. **JS last**: diff2html, then prism, then our script

This ensures:
- Prism is available when our script runs
- Our CSS can override Prism defaults if needed

## Post-Implementation

Run TypeScript compilation to verify no errors:
```bash
cd vscode-extension && npm run compile
```

## Acceptance Criteria

- [ ] Prism JS and CSS URIs are created using `asWebviewUri()`
- [ ] Prism CSS is loaded in `<head>` section
- [ ] Prism JS is loaded before `diff-review.js`
- [ ] All script tags have the nonce attribute
- [ ] TypeScript compiles without errors

## Testing

1. Reload the extension window
2. Open a diff review panel
3. Open browser dev tools (Help > Toggle Developer Tools)
4. Check Network tab - verify prism.min.js and prism-vscode.css load
5. Check Console - verify no 404 errors or CSP violations

## Notes

- CSP does NOT need to be changed - Prism.js is CSP-safe
- The nonce attribute is already applied correctly
- Script load order matters for dependency resolution
