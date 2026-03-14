---
type: work-item
id: "10"
parent: LOCAL-014
title: Fix circular update loop in CommentManager
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Fix Circular Update Loop in CommentManager

## Objective

Prevent circular update loops where `saveFeedback()` triggers a file change event that in turn triggers a listener that calls save again.

## File

`vscode-extension/src/services/CommentManager.ts` lines 100-114 and 235-251

## Problem

The `processingExternalChange` flag only prevents *external* change re-entry, but `saveFeedback()` doesn't set this flag. If a save triggers a file change event, it could cause a loop.

## Implementation

Mark saves as internal operations by setting the flag:

```typescript
async saveFeedback(taskId: string, feedback: FeedbackFile): Promise<void> {
  // Mark as internal operation to prevent file watcher from triggering
  this.processingExternalChange.add(taskId);
  try {
    let feedbackPath = await this.findFeedbackPath(taskId);

    if (!feedbackPath) {
      feedbackPath = path.join(
        this.workspaceRoot,
        '.ai',
        'tasks',
        'in_progress',
        taskId,
        'feedback',
        'diff-review.md'
      );
      await fs.mkdir(path.dirname(feedbackPath), { recursive: true });
    }

    const content = FeedbackParser.serialize(feedback);
    await fs.writeFile(feedbackPath, content, 'utf-8');
    this.cache.set(taskId, feedback);
  } finally {
    // Small delay to ensure file watcher doesn't pick up our own change
    setTimeout(() => {
      this.processingExternalChange.delete(taskId);
    }, 100);
  }
}
```

## Acceptance Criteria

- [ ] Set `processingExternalChange` flag before writing file
- [ ] Clear flag after write completes (with small delay for watcher debounce)
- [ ] No infinite loops when saving feedback
- [ ] External changes still detected correctly
