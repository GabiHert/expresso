---
type: work-item
id: "09"
parent: LOCAL-014
title: Fix race condition in file watcher setup
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Fix Race Condition in File Watcher Setup

## Objective

Fix race condition in `CommentManager.setupWatcher()` where concurrent calls can create duplicate watchers before cleanup completes.

## File

`vscode-extension/src/services/CommentManager.ts` lines 220-262

## Problem

If `setupWatcher()` is called multiple times rapidly (e.g., from concurrent file loads), multiple watchers can be created before cleanup completes. The check at line 224 doesn't prevent concurrent execution.

## Implementation

Add a lock mechanism to prevent concurrent watcher setup:

```typescript
private watcherSetupInProgress: Set<string> = new Set();

private setupWatcher(taskId: string, feedbackPath: string): void {
  // Prevent concurrent setup
  if (this.watcherSetupInProgress.has(taskId)) {
    return;
  }

  this.watcherSetupInProgress.add(taskId);
  try {
    const currentPath = this.watchedPaths.get(taskId);

    // Already watching the correct path
    if (currentPath === feedbackPath && this.watchers.has(taskId)) {
      return;
    }

    // Path changed or first setup - clean up old watcher
    if (this.watchers.has(taskId)) {
      this.cleanupWatcher(taskId);
    }

    // ... rest of existing logic
  } finally {
    this.watcherSetupInProgress.delete(taskId);
  }
}
```

## Acceptance Criteria

- [ ] Add `watcherSetupInProgress` Set to track in-progress setups
- [ ] Guard `setupWatcher` against concurrent calls for same taskId
- [ ] Ensure lock is released in finally block
- [ ] No duplicate watchers created under concurrent load
