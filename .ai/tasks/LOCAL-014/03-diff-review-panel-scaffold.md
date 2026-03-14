---
type: work-item
id: "03"
parent: LOCAL-014
title: DiffReviewPanel webview scaffold
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# DiffReviewPanel Webview Scaffold

## Objective

Create the webview panel infrastructure for the diff review experience. This establishes the foundation that other work items will build upon.

## Pre-Implementation

Explore existing webview patterns in VSCode extensions:
- Review VSCode Webview API documentation
- Look at how other extensions implement webview panels

## Implementation Steps

### Step 1: Create Panel Class

**File**: `vscode-extension/src/panels/DiffReviewPanel.ts`

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { Shadow } from '../services/ShadowManager';

export class DiffReviewPanel {
  public static readonly viewType = 'aiCockpit.diffReview';
  private static panels: Map<string, DiffReviewPanel> = new Map();

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _shadow: Shadow;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    shadow: Shadow
  ): DiffReviewPanel {
    const key = `${shadow.meta.taskId}:${shadow.meta.filePath}`;

    // Return existing panel if open
    const existing = DiffReviewPanel.panels.get(key);
    if (existing) {
      existing._panel.reveal();
      return existing;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      DiffReviewPanel.viewType,
      `Review: ${path.basename(shadow.meta.filePath)}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'dist')
        ]
      }
    );

    const instance = new DiffReviewPanel(panel, extensionUri, shadow);
    DiffReviewPanel.panels.set(key, instance);
    return instance;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    shadow: Shadow
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._shadow = shadow;

    // Set initial HTML
    this._panel.webview.html = this._getHtmlContent();

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      this._handleMessage.bind(this),
      null,
      this._disposables
    );

    // Handle panel disposal
    this._panel.onDidDispose(
      () => this.dispose(),
      null,
      this._disposables
    );

    // Handle theme changes
    vscode.window.onDidChangeActiveColorTheme(
      () => this._sendThemeUpdate(),
      null,
      this._disposables
    );
  }

  private _getHtmlContent(): string {
    const webview = this._panel.webview;

    // Get URIs for resources
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
  <link href="${styleUri}" rel="stylesheet">
  <title>Diff Review</title>
</head>
<body>
  <div id="app">
    <div id="toolbar">
      <span id="filename">${this._shadow.meta.filePath}</span>
    </div>
    <div id="diff-container">
      <!-- diff2html content will be injected here -->
      <p>Loading diff...</p>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private async _handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'ready':
        await this._sendInitialData();
        break;
      case 'addComment':
        // Will be implemented in WI-06
        console.log('Add comment:', message);
        break;
      case 'resolveComment':
        console.log('Resolve comment:', message);
        break;
    }
  }

  private async _sendInitialData(): Promise<void> {
    // Send diff data to webview
    this._panel.webview.postMessage({
      type: 'loadDiff',
      data: {
        filePath: this._shadow.meta.filePath,
        baseline: this._shadow.baseline,
        accumulated: this._shadow.accumulated,
        comments: [] // Will be populated in WI-06
      }
    });
  }

  private _sendThemeUpdate(): void {
    const theme = vscode.window.activeColorTheme.kind;
    this._panel.webview.postMessage({
      type: 'themeChanged',
      theme: theme === vscode.ColorThemeKind.Dark ? 'dark' : 'light'
    });
  }

  public dispose(): void {
    const key = `${this._shadow.meta.taskId}:${this._shadow.meta.filePath}`;
    DiffReviewPanel.panels.delete(key);

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
```

### Step 2: Create Webview Assets

**File**: `vscode-extension/media/diff-review.css`

```css
:root {
  --bg-color: var(--vscode-editor-background);
  --text-color: var(--vscode-editor-foreground);
  --border-color: var(--vscode-panel-border);
}

body {
  margin: 0;
  padding: 0;
  background: var(--bg-color);
  color: var(--text-color);
  font-family: var(--vscode-font-family);
}

#toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
  font-weight: bold;
}

#diff-container {
  padding: 16px;
  overflow: auto;
}
```

**File**: `vscode-extension/media/diff-review.js`

```javascript
(function() {
  const vscode = acquireVsCodeApi();

  // Notify extension we're ready
  vscode.postMessage({ type: 'ready' });

  // Handle messages from extension
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
    // Placeholder - diff2html integration in WI-04
    container.innerHTML = `
      <pre>Baseline:\n${escapeHtml(data.baseline?.substring(0, 500) || 'No baseline')}</pre>
      <hr>
      <pre>Current:\n${escapeHtml(data.accumulated?.substring(0, 500) || 'No changes')}</pre>
    `;
  }

  function updateTheme(theme) {
    document.body.className = theme;
  }

  function updateComments(comments) {
    // Will be implemented in WI-05
    console.log('Comments:', comments);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
```

### Step 3: Register Command

**File**: `vscode-extension/src/extension.ts`

Add command registration:

```typescript
import { DiffReviewPanel } from './panels/DiffReviewPanel';

// In activate():
const openDiffReview = vscode.commands.registerCommand(
  'aiCockpit.openDiffReview',
  async (shadow: Shadow) => {
    if (!shadow) {
      vscode.window.showWarningMessage('No shadow data provided');
      return;
    }
    DiffReviewPanel.createOrShow(context.extensionUri, shadow);
  }
);
context.subscriptions.push(openDiffReview);
```

**File**: `vscode-extension/package.json`

Add command definition:

```json
{
  "command": "aiCockpit.openDiffReview",
  "title": "AI Cockpit: Open Diff Review"
}
```

### Step 4: Create Directory Structure

```
vscode-extension/
├── src/
│   └── panels/
│       └── DiffReviewPanel.ts
└── media/
    ├── diff-review.css
    └── diff-review.js
```

## Acceptance Criteria

- [ ] `DiffReviewPanel` class created with singleton pattern per file
- [ ] Webview renders with basic HTML/CSS
- [ ] Message passing works (extension ↔ webview)
- [ ] Theme changes handled
- [ ] Panel cleanup on dispose
- [ ] Command registered and callable
- [ ] CSP configured correctly

## Testing

1. Run extension in debug mode
2. Call `aiCockpit.openDiffReview` from command palette with mock shadow
3. Verify panel opens with placeholder content
4. Switch VSCode themes - verify message received
5. Close and reopen - verify singleton behavior

## Notes

This is infrastructure only - actual diff rendering comes in WI-04.
