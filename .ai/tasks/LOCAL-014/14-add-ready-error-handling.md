---
type: work-item
id: "14"
parent: LOCAL-014
title: Add error handling for webview ready message
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-014]]


# Add Error Handling for Webview Ready Message

## Objective

Add timeout and error handling for the webview ready message to prevent silent failures if the webview fails to initialize.

## File

`vscode-extension/src/panels/DiffReviewPanel.ts` - webview initialization

## Problem

The panel waits for the webview to send a "ready" message before sending data, but there's no timeout or error handling if the webview fails to initialize. The panel could wait indefinitely.

## Implementation

Add a timeout mechanism for webview initialization:

```typescript
private _webviewReady: Promise<void>;
private _resolveWebviewReady!: () => void;
private _rejectWebviewReady!: (reason: Error) => void;

constructor(...) {
  // ... existing code ...

  // Setup ready promise with timeout
  this._webviewReady = new Promise((resolve, reject) => {
    this._resolveWebviewReady = resolve;
    this._rejectWebviewReady = reject;
  });

  // Timeout after 10 seconds
  const timeout = setTimeout(() => {
    this._rejectWebviewReady(new Error('Webview failed to initialize within 10 seconds'));
  }, 10000);

  // Clear timeout when ready
  this._webviewReady.then(() => clearTimeout(timeout)).catch(() => clearTimeout(timeout));
}

// In message handler:
case 'ready':
  this._resolveWebviewReady();
  // ... rest of existing code ...
  break;

// When sending messages, wait for ready with error handling:
private async _sendCommentsUpdate(): Promise<void> {
  try {
    await this._webviewReady;
    // ... send message ...
  } catch (error) {
    console.error('Webview not ready:', error);
    vscode.window.showErrorMessage('Diff review panel failed to initialize');
  }
}
```

## Acceptance Criteria

- [ ] Add timeout for webview ready state (10 seconds)
- [ ] Show error message if webview fails to initialize
- [ ] Log error details to output channel
- [ ] Prevent silent failures

