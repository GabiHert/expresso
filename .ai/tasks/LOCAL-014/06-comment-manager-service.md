---
type: work-item
id: "06"
parent: LOCAL-014
title: CommentManager service
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# CommentManager Service

## Objective

Create the service that manages comment CRUD operations and synchronizes comments with the feedback markdown file. This is the bridge between the webview UI and persistent storage.

## Pre-Implementation

- Complete WI-01 (feedback format)
- Complete WI-02 (FeedbackParser)
- Complete WI-05 (comment UI sends messages)

## Implementation Steps

### Step 1: Create CommentManager Class

**File**: `vscode-extension/src/services/CommentManager.ts`

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FeedbackParser } from './FeedbackParser';
import { DiffComment, FeedbackFile } from '../types/feedback';
import { generateCommentId } from '../utils/idGenerator';

export class CommentManager {
  private workspaceRoot: string;
  private cache: Map<string, FeedbackFile> = new Map();
  private watchers: Map<string, vscode.FileSystemWatcher> = new Map();
  private onChangeEmitter = new vscode.EventEmitter<{ taskId: string }>();

  public readonly onChange = this.onChangeEmitter.event;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Get the feedback file path for a task
   */
  private getFeedbackPath(taskId: string, status: string = 'in_progress'): string {
    return path.join(
      this.workspaceRoot,
      '.ai/tasks',
      status,
      taskId,
      'feedback/diff-review.md'
    );
  }

  /**
   * Find feedback file across all status folders
   */
  private async findFeedbackPath(taskId: string): Promise<string | null> {
    const statuses = ['in_progress', 'todo', 'done'];

    for (const status of statuses) {
      const feedbackPath = this.getFeedbackPath(taskId, status);
      try {
        await fs.access(feedbackPath);
        return feedbackPath;
      } catch {
        // File doesn't exist in this status folder
      }
    }

    return null;
  }

  /**
   * Load feedback file for a task
   */
  async loadFeedback(taskId: string): Promise<FeedbackFile> {
    // Check cache first
    if (this.cache.has(taskId)) {
      return this.cache.get(taskId)!;
    }

    const feedbackPath = await this.findFeedbackPath(taskId);

    if (!feedbackPath) {
      // Return empty feedback
      const empty: FeedbackFile = {
        version: 2,
        lastSynced: new Date().toISOString(),
        fileHashes: {},
        comments: []
      };
      return empty;
    }

    try {
      const content = await fs.readFile(feedbackPath, 'utf-8');
      const feedback = FeedbackParser.parse(content);
      this.cache.set(taskId, feedback);
      this.setupWatcher(taskId, feedbackPath);
      return feedback;
    } catch (error) {
      console.error(`Failed to load feedback for ${taskId}:`, error);
      return {
        version: 2,
        lastSynced: new Date().toISOString(),
        fileHashes: {},
        comments: []
      };
    }
  }

  /**
   * Save feedback file for a task
   */
  async saveFeedback(taskId: string, feedback: FeedbackFile): Promise<void> {
    let feedbackPath = await this.findFeedbackPath(taskId);

    if (!feedbackPath) {
      // Create in in_progress by default
      feedbackPath = this.getFeedbackPath(taskId, 'in_progress');
      await fs.mkdir(path.dirname(feedbackPath), { recursive: true });
    }

    feedback.lastSynced = new Date().toISOString();
    const content = FeedbackParser.serialize(feedback);

    await fs.writeFile(feedbackPath, content, 'utf-8');
    this.cache.set(taskId, feedback);
  }

  /**
   * Get all comments for a specific file in a task
   */
  async getCommentsForFile(taskId: string, filePath: string): Promise<DiffComment[]> {
    const feedback = await this.loadFeedback(taskId);
    return feedback.comments.filter(c => c.filePath === filePath);
  }

  /**
   * Get all comments for a task
   */
  async getAllComments(taskId: string): Promise<DiffComment[]> {
    const feedback = await this.loadFeedback(taskId);
    return feedback.comments;
  }

  /**
   * Add a new comment
   */
  async addComment(
    taskId: string,
    filePath: string,
    line: number,
    text: string,
    lineEnd?: number
  ): Promise<DiffComment> {
    const feedback = await this.loadFeedback(taskId);

    const comment: DiffComment = {
      id: generateCommentId(),
      filePath,
      line,
      lineEnd,
      text,
      status: 'open',
      createdAt: new Date().toISOString()
    };

    feedback.comments.push(comment);
    await this.saveFeedback(taskId, feedback);

    this.onChangeEmitter.fire({ taskId });
    return comment;
  }

  /**
   * Update comment text
   */
  async updateComment(
    taskId: string,
    commentId: string,
    text: string
  ): Promise<void> {
    const feedback = await this.loadFeedback(taskId);
    const comment = feedback.comments.find(c => c.id === commentId);

    if (comment) {
      comment.text = text;
      await this.saveFeedback(taskId, feedback);
      this.onChangeEmitter.fire({ taskId });
    }
  }

  /**
   * Resolve a comment
   */
  async resolveComment(taskId: string, commentId: string): Promise<void> {
    const feedback = await this.loadFeedback(taskId);
    const comment = feedback.comments.find(c => c.id === commentId);

    if (comment) {
      comment.status = 'resolved';
      await this.saveFeedback(taskId, feedback);
      this.onChangeEmitter.fire({ taskId });
    }
  }

  /**
   * Reopen a resolved comment
   */
  async reopenComment(taskId: string, commentId: string): Promise<void> {
    const feedback = await this.loadFeedback(taskId);
    const comment = feedback.comments.find(c => c.id === commentId);

    if (comment) {
      comment.status = 'open';
      await this.saveFeedback(taskId, feedback);
      this.onChangeEmitter.fire({ taskId });
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(taskId: string, commentId: string): Promise<void> {
    const feedback = await this.loadFeedback(taskId);
    feedback.comments = feedback.comments.filter(c => c.id !== commentId);
    await this.saveFeedback(taskId, feedback);
    this.onChangeEmitter.fire({ taskId });
  }

  /**
   * Set up file watcher for external changes
   */
  private setupWatcher(taskId: string, feedbackPath: string): void {
    if (this.watchers.has(taskId)) {
      return; // Already watching
    }

    const watcher = vscode.workspace.createFileSystemWatcher(feedbackPath);

    watcher.onDidChange(async () => {
      // Invalidate cache
      this.cache.delete(taskId);
      // Reload and notify
      await this.loadFeedback(taskId);
      this.onChangeEmitter.fire({ taskId });
    });

    watcher.onDidDelete(() => {
      this.cache.delete(taskId);
      this.watchers.get(taskId)?.dispose();
      this.watchers.delete(taskId);
    });

    this.watchers.set(taskId, watcher);
  }

  /**
   * Clear cache for a task
   */
  clearCache(taskId: string): void {
    this.cache.delete(taskId);
  }

  /**
   * Dispose all watchers
   */
  dispose(): void {
    for (const watcher of this.watchers.values()) {
      watcher.dispose();
    }
    this.watchers.clear();
    this.cache.clear();
    this.onChangeEmitter.dispose();
  }
}
```

### Step 2: Wire CommentManager to DiffReviewPanel

**File**: `vscode-extension/src/panels/DiffReviewPanel.ts`

Update constructor and message handlers:

```typescript
import { CommentManager } from '../services/CommentManager';

export class DiffReviewPanel {
  private readonly _commentManager: CommentManager;

  public static createOrShow(
    extensionUri: vscode.Uri,
    shadow: Shadow,
    commentManager: CommentManager  // Add parameter
  ): DiffReviewPanel {
    // ... existing code
    const instance = new DiffReviewPanel(panel, extensionUri, shadow, commentManager);
    // ...
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    shadow: Shadow,
    commentManager: CommentManager
  ) {
    // ... existing setup
    this._commentManager = commentManager;

    // Listen for external comment changes
    this._commentManager.onChange((e) => {
      if (e.taskId === this._shadow.meta.taskId) {
        this._sendCommentsUpdate();
      }
    });
  }

  private async _handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'ready':
        await this._sendInitialData();
        break;

      case 'addComment':
        await this._commentManager.addComment(
          this._shadow.meta.taskId,
          message.filePath,
          message.line,
          message.text,
          message.lineEnd
        );
        await this._sendCommentsUpdate();
        break;

      case 'resolveComment':
        await this._commentManager.resolveComment(
          this._shadow.meta.taskId,
          message.id
        );
        await this._sendCommentsUpdate();
        break;

      case 'deleteComment':
        await this._commentManager.deleteComment(
          this._shadow.meta.taskId,
          message.id
        );
        await this._sendCommentsUpdate();
        break;

      case 'editComment':
        await this._commentManager.updateComment(
          this._shadow.meta.taskId,
          message.id,
          message.text
        );
        await this._sendCommentsUpdate();
        break;
    }
  }

  private async _sendCommentsUpdate(): Promise<void> {
    const comments = await this._commentManager.getCommentsForFile(
      this._shadow.meta.taskId,
      this._shadow.meta.filePath
    );

    this._panel.webview.postMessage({
      type: 'updateComments',
      comments
    });
  }
}
```

### Step 3: Initialize CommentManager in Extension

**File**: `vscode-extension/src/extension.ts`

```typescript
import { CommentManager } from './services/CommentManager';

export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return;

  // Create comment manager
  const commentManager = new CommentManager(workspaceRoot);
  context.subscriptions.push({ dispose: () => commentManager.dispose() });

  // Update openDiffReview command
  const openDiffReview = vscode.commands.registerCommand(
    'aiCockpit.openDiffReview',
    async (shadow: Shadow) => {
      if (!shadow) {
        vscode.window.showWarningMessage('No shadow data provided');
        return;
      }
      DiffReviewPanel.createOrShow(context.extensionUri, shadow, commentManager);
    }
  );
  context.subscriptions.push(openDiffReview);
}
```

## Acceptance Criteria

- [ ] CommentManager loads feedback from markdown file
- [ ] Comments are cached for performance
- [ ] addComment creates new comment and saves
- [ ] resolveComment updates status and saves
- [ ] deleteComment removes and saves
- [ ] File watcher detects external changes
- [ ] onChange event fires on any change
- [ ] DiffReviewPanel receives comment updates
- [ ] Comments sync bidirectionally

## Testing

1. Add comment via UI - verify appears in markdown file
2. Edit markdown file externally - verify UI updates
3. Resolve comment - verify strikethrough in file
4. Delete comment - verify removed from file
5. Multiple panels open - verify all update

## Notes

- Cache invalidation happens on file change detection
- Consider debouncing saves if performance is an issue
- File watcher may miss rapid changes - consider polling fallback
