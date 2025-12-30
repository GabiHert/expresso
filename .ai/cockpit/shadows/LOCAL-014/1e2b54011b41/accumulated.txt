import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FeedbackParser } from './FeedbackParser';
import { DiffComment, FeedbackFile } from '../types/feedback';
import { generateCommentId } from '../utils/idGenerator';

/**
 * Manages comment CRUD operations and synchronizes with feedback markdown files
 */
export class CommentManager {
  private static readonly MAX_CACHE_SIZE = 50;

  private workspaceRoot: string;
  private cache: Map<string, FeedbackFile> = new Map();
  private cacheAccessOrder: string[] = [];
  private watchers: Map<string, vscode.FileSystemWatcher> = new Map();
  private watchedPaths: Map<string, string> = new Map();
  private onChangeEmitter = new vscode.EventEmitter<{ taskId: string }>();
  private changeListeners: Map<string, vscode.Disposable> = new Map();
  private processingExternalChange: Set<string> = new Set();
  private watcherSetupInProgress: Set<string> = new Set();

  /**
   * Event that fires when comments change for a task.
   * Returns a Disposable that must be disposed to unsubscribe.
   */
  public readonly onChange: vscode.Event<{ taskId: string }> = this.onChangeEmitter.event;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Update cache access order for LRU eviction
   */
  private updateCacheAccess(taskId: string): void {
    // Remove existing entry if present
    const index = this.cacheAccessOrder.indexOf(taskId);
    if (index !== -1) {
      this.cacheAccessOrder.splice(index, 1);
    }
    // Add to end (most recently used)
    this.cacheAccessOrder.push(taskId);

    // Evict oldest entries if over limit
    while (this.cacheAccessOrder.length > CommentManager.MAX_CACHE_SIZE) {
      const oldest = this.cacheAccessOrder.shift()!;
      this.cache.delete(oldest);
      this.cleanupWatcher(oldest);
    }
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
      this.updateCacheAccess(taskId);
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
      this.updateCacheAccess(taskId);
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
    // Mark as internal operation to prevent file watcher from triggering
    this.processingExternalChange.add(taskId);
    try {
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
      this.updateCacheAccess(taskId);
    } finally {
      // Small delay to ensure file watcher doesn't pick up our own change
      setTimeout(() => {
        this.processingExternalChange.delete(taskId);
      }, 100);
    }
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
    // Prevent concurrent setup for same taskId
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

      const watcher = vscode.workspace.createFileSystemWatcher(feedbackPath);

      const changeDisposable = watcher.onDidChange(async () => {
        // Skip if we're already processing an external change
        if (this.processingExternalChange.has(taskId)) {
          return;
        }

        this.processingExternalChange.add(taskId);
        try {
          // Invalidate cache
          this.cache.delete(taskId);
          // Reload and notify
          await this.loadFeedback(taskId);
          this.onChangeEmitter.fire({ taskId });
        } finally {
          this.processingExternalChange.delete(taskId);
        }
      });

      const deleteDisposable = watcher.onDidDelete(() => {
        this.cache.delete(taskId);
        this.cleanupWatcher(taskId);
      });

      this.watchers.set(taskId, watcher);
      this.watchedPaths.set(taskId, feedbackPath);
      this.changeListeners.set(`${taskId}-change`, changeDisposable);
      this.changeListeners.set(`${taskId}-delete`, deleteDisposable);
    } finally {
      this.watcherSetupInProgress.delete(taskId);
    }
  }

  /**
   * Clean up watcher for a task
   */
  private cleanupWatcher(taskId: string): void {
    const watcher = this.watchers.get(taskId);
    if (watcher) {
      watcher.dispose();
      this.watchers.delete(taskId);
    }

    this.watchedPaths.delete(taskId);

    const changeListener = this.changeListeners.get(`${taskId}-change`);
    if (changeListener) {
      changeListener.dispose();
      this.changeListeners.delete(`${taskId}-change`);
    }

    const deleteListener = this.changeListeners.get(`${taskId}-delete`);
    if (deleteListener) {
      deleteListener.dispose();
      this.changeListeners.delete(`${taskId}-delete`);
    }
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
    this.watchedPaths.clear();

    for (const listener of this.changeListeners.values()) {
      listener.dispose();
    }
    this.changeListeners.clear();

    this.cache.clear();
    this.cacheAccessOrder = [];
    this.processingExternalChange.clear();
    this.watcherSetupInProgress.clear();
    this.onChangeEmitter.dispose();
  }
}
