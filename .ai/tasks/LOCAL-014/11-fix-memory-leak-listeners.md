---
type: work-item
id: "11"
parent: LOCAL-014
title: Fix memory leak in event listeners
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-014]]


# Fix Memory Leak in Event Listeners

## Objective

Ensure the `onChange` listener from `commentManager` is properly disposed when the DiffReviewPanel is disposed.

## File

`vscode-extension/src/panels/DiffReviewPanel.ts` lines 107-112

## Problem

The code assumes the returned `changeListener` is a proper `Disposable`, but doesn't verify this. If it's not correctly disposed, it will leak memory.

## Implementation

Verify the disposal pattern or inline the push:

```typescript
// Option 1: Inline the push to ensure it's treated as disposable
this._disposables.push(
  this._commentManager.onChange((e) => {
    if (e.taskId === this._shadow.meta.taskId) {
      this._sendCommentsUpdate();
    }
  })
);

// Option 2: Verify CommentManager.onChange returns proper Disposable
// In CommentManager.ts, ensure onChange returns vscode.Disposable:
public onChange(listener: (e: { taskId: string }) => void): vscode.Disposable {
  return this.onChangeEmitter.event(listener);
}
```

## Acceptance Criteria

- [ ] `onChange` listener is properly disposed when panel closes
- [ ] CommentManager.onChange explicitly returns `vscode.Disposable`
- [ ] No event listener leaks after closing multiple panels
- [ ] Verify with VSCode Developer Tools memory profiler
