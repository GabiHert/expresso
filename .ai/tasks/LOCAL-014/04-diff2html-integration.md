---
type: work-item
id: "04"
parent: LOCAL-014
title: Integrate diff2html rendering
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-014]]


# Integrate diff2html Rendering

## Objective

Add the diff2html library to render beautiful, GitHub-style diffs in the webview panel. This replaces the placeholder content from WI-03.

## Pre-Implementation

- Complete WI-03 (webview scaffold)
- Review diff2html documentation: https://diff2html.xyz/
- Understand unified diff format

## Implementation Steps

### Step 1: Install diff2html

```bash
cd vscode-extension
npm install diff2html diff
npm install --save-dev @types/diff
```

Note: `diff` package is used to generate unified diff from two strings.

### Step 2: Add Vendor Files to Media

Since webviews can't use npm modules directly, we need to bundle or copy the library.

**Option A: Copy minified files**
```bash
cp node_modules/diff2html/bundles/css/diff2html.min.css media/vendor/
cp node_modules/diff2html/bundles/js/diff2html.min.js media/vendor/
```

**Option B: Use a bundler (esbuild)**
Create a separate bundle for webview code.

For simplicity, use Option A initially.

### Step 3: Generate Unified Diff

**File**: `vscode-extension/src/utils/diffGenerator.ts`

```typescript
import { createTwoFilesPatch } from 'diff';

export function generateUnifiedDiff(
  filePath: string,
  oldContent: string,
  newContent: string
): string {
  return createTwoFilesPatch(
    `a/${filePath}`,
    `b/${filePath}`,
    oldContent || '',
    newContent || '',
    'original',
    'modified'
  );
}
```

### Step 4: Update Panel to Send Unified Diff

**File**: `vscode-extension/src/panels/DiffReviewPanel.ts`

```typescript
import { generateUnifiedDiff } from '../utils/diffGenerator';

private async _sendInitialData(): Promise<void> {
  const unifiedDiff = generateUnifiedDiff(
    this._shadow.meta.filePath,
    this._shadow.baseline || '',
    this._shadow.accumulated || ''
  );

  this._panel.webview.postMessage({
    type: 'loadDiff',
    data: {
      filePath: this._shadow.meta.filePath,
      unifiedDiff,
      comments: []
    }
  });
}
```

### Step 5: Update Webview HTML

**File**: `vscode-extension/src/panels/DiffReviewPanel.ts` (in `_getHtmlContent`)

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
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(this._extensionUri, 'media', 'diff-review.js')
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(this._extensionUri, 'media', 'diff-review.css')
  );

  const nonce = this._getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link href="${diff2htmlCss}" rel="stylesheet">
  <link href="${styleUri}" rel="stylesheet">
  <title>Review: ${this._shadow.meta.filePath}</title>
</head>
<body>
  <div id="app">
    <div id="toolbar">
      <span id="filename">${this._shadow.meta.filePath}</span>
      <span id="stats"></span>
    </div>
    <div id="diff-container"></div>
  </div>
  <script nonce="${nonce}" src="${diff2htmlJs}"></script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
```

### Step 6: Update Webview JavaScript

**File**: `vscode-extension/media/diff-review.js`

```javascript
(function() {
  const vscode = acquireVsCodeApi();

  vscode.postMessage({ type: 'ready' });

  window.addEventListener('message', event => {
    const message = event.data;

    switch (message.type) {
      case 'loadDiff':
        renderDiff(message.data);
        break;
      case 'themeChanged':
        updateTheme(message.theme);
        break;
      case 'updateComments':
        updateComments(message.comments);
        break;
    }
  });

  function renderDiff(data) {
    const container = document.getElementById('diff-container');

    if (!data.unifiedDiff || data.unifiedDiff.trim() === '') {
      container.innerHTML = '<p class="no-changes">No changes detected</p>';
      return;
    }

    // Use diff2html to render
    const diffHtml = Diff2Html.html(data.unifiedDiff, {
      drawFileList: false,
      matching: 'lines',
      outputFormat: 'side-by-side',  // or 'line-by-line'
      renderNothingWhenEmpty: false,
      rawTemplates: {
        // Custom templates can be added here for comment buttons
      }
    });

    container.innerHTML = diffHtml;

    // Update stats
    const stats = document.getElementById('stats');
    const additions = (data.unifiedDiff.match(/^\+[^+]/gm) || []).length;
    const deletions = (data.unifiedDiff.match(/^-[^-]/gm) || []).length;
    stats.innerHTML = `<span class="additions">+${additions}</span> <span class="deletions">-${deletions}</span>`;

    // Setup line hover handlers for comments (WI-05)
    setupLineHandlers();
  }

  function setupLineHandlers() {
    // Will be implemented in WI-05
    // Add click handlers to line numbers for adding comments
  }

  function updateTheme(theme) {
    document.body.className = theme;
    // diff2html has its own theme classes
    const container = document.getElementById('diff-container');
    if (theme === 'dark') {
      container.classList.add('d2h-dark-color-scheme');
    } else {
      container.classList.remove('d2h-dark-color-scheme');
    }
  }

  function updateComments(comments) {
    // Will be implemented in WI-05
  }
})();
```

### Step 7: Add Dark Theme Support

**File**: `vscode-extension/media/diff-review.css`

```css
/* Dark theme overrides for diff2html */
.d2h-dark-color-scheme .d2h-file-header {
  background: var(--vscode-editor-background);
}

.d2h-dark-color-scheme .d2h-code-line {
  background: var(--vscode-editor-background);
}

.d2h-dark-color-scheme .d2h-ins {
  background: rgba(35, 134, 54, 0.2);
}

.d2h-dark-color-scheme .d2h-del {
  background: rgba(248, 81, 73, 0.2);
}

/* Stats styling */
#stats {
  margin-left: 16px;
  font-size: 12px;
}

.additions {
  color: var(--vscode-gitDecoration-addedResourceForeground, #3fb950);
}

.deletions {
  color: var(--vscode-gitDecoration-deletedResourceForeground, #f85149);
}

.no-changes {
  color: var(--vscode-descriptionForeground);
  text-align: center;
  padding: 48px;
}
```

## Acceptance Criteria

- [ ] diff2html library added to project
- [ ] Unified diff generated from baseline/accumulated
- [ ] Diff renders in webview with syntax highlighting
- [ ] Side-by-side view working
- [ ] Addition/deletion stats shown
- [ ] Dark theme supported
- [ ] Empty diff handled gracefully

## Testing

1. Open diff review for a file with changes
2. Verify diff renders with syntax highlighting
3. Verify additions shown in green, deletions in red
4. Switch to dark theme - verify colors adapt
5. Test with file that has no changes

## Notes

- diff2html bundle is ~50KB gzipped
- Side-by-side view is default; can add toggle for line-by-line
- Line handlers (for comments) prepared but not implemented yet
