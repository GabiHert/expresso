 import * as vscode from 'vscode';
import * as path from 'path';
import { Shadow } from '../services/ShadowManager';
import { generateUnifiedDiff } from '../utils/diffGenerator';
import { CommentManager } from '../services/CommentManager';

// Message types for webview communication
interface WebviewMessage {
  type: string;
}

interface ReadyMessage extends WebviewMessage {
  type: 'ready';
}

interface AddCommentMessage extends WebviewMessage {
  type: 'addComment';
  filePath: string;
  line: number;
  text: string;
  lineEnd?: number;
}

interface ResolveCommentMessage extends WebviewMessage {
  type: 'resolveComment';
  id: string;
}

interface DeleteCommentMessage extends WebviewMessage {
  type: 'deleteComment';
  id: string;
}

interface EditCommentMessage extends WebviewMessage {
  type: 'editComment';
  id: string;
  text: string;
}

// Type guards for message validation
function isWebviewMessage(msg: unknown): msg is WebviewMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    typeof (msg as WebviewMessage).type === 'string'
  );
}

function isAddCommentMessage(msg: WebviewMessage): msg is AddCommentMessage {
  const m = msg as AddCommentMessage;
  return (
    m.type === 'addComment' &&
    typeof m.filePath === 'string' &&
    typeof m.line === 'number' &&
    typeof m.text === 'string'
  );
}

function isResolveCommentMessage(msg: WebviewMessage): msg is ResolveCommentMessage {
  const m = msg as ResolveCommentMessage;
  return m.type === 'resolveComment' && typeof m.id === 'string';
}

function isDeleteCommentMessage(msg: WebviewMessage): msg is DeleteCommentMessage {
  const m = msg as DeleteCommentMessage;
  return m.type === 'deleteComment' && typeof m.id === 'string';
}

function isEditCommentMessage(msg: WebviewMessage): msg is EditCommentMessage {
  const m = msg as EditCommentMessage;
  return (
    m.type === 'editComment' &&
    typeof m.id === 'string' &&
    typeof m.text === 'string'
  );
}

/**
 * Webview panel for reviewing diffs with inline comments
 * Implements singleton pattern per file (taskId:filePath)
 */
export class DiffReviewPanel {
  public static readonly viewType = 'aiCockpit.diffReview';
  private static panels: Map<string, DiffReviewPanel> = new Map();

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _shadow: Shadow;
  private readonly _commentManager: CommentManager;
  private _disposables: vscode.Disposable[] = [];
  private _isDisposed = false;
  private _webviewReady: Promise<void>;
  private _resolveWebviewReady!: () => void;
  private _readyTimeoutId: NodeJS.Timeout | undefined;

  /**
   * Create or show existing panel for the given shadow
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    shadow: Shadow,
    commentManager: CommentManager
  ): DiffReviewPanel {
    const key = `${shadow.meta.taskId}:${shadow.meta.filePath}`;

    // Return existing panel if open and not disposed
    const existing = DiffReviewPanel.panels.get(key);
    if (existing) {
      if (!existing._isDisposed) {
        existing._panel.reveal();
        return existing;
      }
      // Panel was disposed externally, clean up stale entry
      DiffReviewPanel.panels.delete(key);
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

    const instance = new DiffReviewPanel(panel, extensionUri, shadow, commentManager);
    DiffReviewPanel.panels.set(key, instance);
    return instance;
  }

  /**
   * Get panel for a specific shadow if it exists
   */
  public static getPanel(taskId: string, filePath: string): DiffReviewPanel | undefined {
    const key = `${taskId}:${filePath}`;
    return DiffReviewPanel.panels.get(key);
  }

  /**
   * Close all DiffReviewPanels for a specific task
   * @returns The number of panels that were closed
   */
  public static closeAllForTask(taskId: string): number {
    let closedCount = 0;

    for (const [key, panel] of DiffReviewPanel.panels.entries()) {
      // Key format is "{taskId}:{filePath}"
      if (key.startsWith(`${taskId}:`)) {
        panel.dispose();
        closedCount++;
      }
    }

    return closedCount;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    shadow: Shadow,
    commentManager: CommentManager
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._shadow = shadow;
    this._commentManager = commentManager;

    // Setup ready promise with timeout
    this._webviewReady = new Promise((resolve) => {
      this._resolveWebviewReady = resolve;
    });

    // Timeout after 10 seconds if webview doesn't send ready
    this._readyTimeoutId = setTimeout(() => {
      console.error('Webview failed to initialize within 10 seconds');
      vscode.window.showErrorMessage('Diff review panel failed to initialize. Please close and reopen.');
    }, 10000);

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

    // Listen for external comment changes
    const changeListener = this._commentManager.onChange((e) => {
      if (e.taskId === this._shadow.meta.taskId) {
        this._sendCommentsUpdate();
      }
    });
    this._disposables.push(changeListener);
  }

  /**
   * Get the shadow data for this panel
   */
  public get shadow(): Shadow {
    return this._shadow;
  }

  /**
   * Send updated comments to the webview
   */
  public updateComments(comments: any[]): void {
    if (this._isDisposed) {
      return;
    }
    this._postMessage({ type: 'updateComments', comments });
  }

  /**
   * Safely post a message to the webview
   */
  private _postMessage(message: unknown): void {
    if (this._isDisposed) {
      return;
    }
    try {
      this._panel.webview.postMessage(message);
    } catch (error) {
      console.error('Failed to send message to webview:', error);
    }
  }

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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <link href="${diff2htmlCss}" rel="stylesheet">
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

  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private async _handleMessage(message: unknown): Promise<void> {
    // Validate base message structure
    if (!isWebviewMessage(message)) {
      console.error('Invalid message received from webview:', message);
      return;
    }

    try {
      switch (message.type) {
        case 'ready':
          // Clear timeout and resolve ready promise
          if (this._readyTimeoutId) {
            clearTimeout(this._readyTimeoutId);
            this._readyTimeoutId = undefined;
          }
          this._resolveWebviewReady();
          await this._sendInitialData();
          break;

        case 'addComment':
          if (!isAddCommentMessage(message)) {
            console.error('Invalid addComment message:', message);
            return;
          }
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
          if (!isResolveCommentMessage(message)) {
            console.error('Invalid resolveComment message:', message);
            return;
          }
          await this._commentManager.resolveComment(
            this._shadow.meta.taskId,
            message.id
          );
          await this._sendCommentsUpdate();
          break;

        case 'deleteComment':
          if (!isDeleteCommentMessage(message)) {
            console.error('Invalid deleteComment message:', message);
            return;
          }
          await this._commentManager.deleteComment(
            this._shadow.meta.taskId,
            message.id
          );
          await this._sendCommentsUpdate();
          break;

        case 'editComment':
          if (!isEditCommentMessage(message)) {
            console.error('Invalid editComment message:', message);
            return;
          }
          await this._commentManager.updateComment(
            this._shadow.meta.taskId,
            message.id,
            message.text
          );
          await this._sendCommentsUpdate();
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error(`Failed to handle ${message.type}:`, error);
      vscode.window.showErrorMessage(`Failed to ${message.type}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async _sendInitialData(): Promise<void> {
    const unifiedDiff = generateUnifiedDiff(
      this._shadow.meta.filePath,
      this._shadow.baseline || '',
      this._shadow.accumulated || ''
    );

    // Load comments for this file
    const comments = await this._commentManager.getCommentsForFile(
      this._shadow.meta.taskId,
      this._shadow.meta.filePath
    );

    this._postMessage({
      type: 'loadDiff',
      data: {
        filePath: this._shadow.meta.filePath,
        taskId: this._shadow.meta.taskId,
        unifiedDiff,
        comments
      }
    });
  }

  private async _sendCommentsUpdate(): Promise<void> {
    if (this._isDisposed) {
      return;
    }

    const comments = await this._commentManager.getCommentsForFile(
      this._shadow.meta.taskId,
      this._shadow.meta.filePath
    );

    this._postMessage({
      type: 'updateComments',
      comments
    });
  }

  private _sendThemeUpdate(): void {
    if (this._isDisposed) {
      return;
    }
    const theme = vscode.window.activeColorTheme.kind;
    this._postMessage({
      type: 'themeChanged',
      theme: theme === vscode.ColorThemeKind.Dark ? 'dark' : 'light'
    });
  }

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;

    // Clear ready timeout if still pending
    if (this._readyTimeoutId) {
      clearTimeout(this._readyTimeoutId);
      this._readyTimeoutId = undefined;
    }

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
