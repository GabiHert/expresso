import * as vscode from 'vscode';
import * as path from 'path';
import {
  ExpressoTag,
  ExpressoScanResult,
  ExpressoVariant,
  ExpressoConfig,
  DEFAULT_EXPRESSO_CONFIG,
  CommandMatch,
} from '../types/expresso';
import { generateTagFingerprint } from '../utils/expressoIdGenerator';
import { CommandRegistry } from './CommandRegistry';

/**
 * Scans workspace files for @expresso tags, caches results, and watches for changes
 */
export class ExpressoScanner implements vscode.Disposable {
  private cache: Map<string, ExpressoTag[]> = new Map();
  private commandCache: Map<string, CommandMatch[]> = new Map();
  private disposables: vscode.Disposable[] = [];
  private config: ExpressoConfig;
  private commandPattern: RegExp | null = null;

  private readonly onChangeEmitter = new vscode.EventEmitter<ExpressoScanResult>();
  public readonly onChange: vscode.Event<ExpressoScanResult> = this.onChangeEmitter.event;

  constructor(
    private workspaceRoot: string,
    private commandRegistry: CommandRegistry,
    config?: Partial<ExpressoConfig>
  ) {
    this.config = { ...DEFAULT_EXPRESSO_CONFIG, ...config };

    // Subscribe to registry changes to invalidate command pattern
    this.disposables.push(
      this.commandRegistry.onChange(() => {
        this.commandPattern = null;
        this.emitCurrentState();
      })
    );
  }

  /**
   * Build regex pattern from command registry
   */
  private buildCommandPattern(): RegExp {
    const commands = this.commandRegistry.getCommandNames();
    if (commands.length === 0) {
      return /(?!)/g; // Pattern that matches nothing
    }
    return new RegExp(
      `(${commands.map(cmd => cmd.replace('/', '\\/')).join('|')})(?=\\s|$|[^a-zA-Z0-9-])`,
      'g'
    );
  }

  /**
   * Scan a single document for expresso tags
   */
  public async scanDocument(document: vscode.TextDocument): Promise<ExpressoTag[]> {
    if (!this.config.enabled) {
      return [];
    }

    const text = document.getText();
    const filePath = document.uri.fsPath;
    const relativePath = vscode.workspace.asRelativePath(filePath);
    const tags: ExpressoTag[] = [];

    const lines = text.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineNumber = lineIndex + 1;

      // Match @expresso, @expresso!, @expresso? with optional task description
      const match = /@expresso([!?])?\s*(.*)/.exec(line);
      if (match) {
        const variantChar = match[1];
        const variant: ExpressoVariant =
          variantChar === '!' ? 'urgent' : variantChar === '?' ? 'question' : 'normal';

        const columnStart = line.indexOf('@expresso');
        const matchEndIndex = columnStart + match[0].length;

        // Extract the full comment and task description
        const { fullComment, taskDescription, isMultiLine } = this.extractFullComment(
          lines,
          lineIndex
        );

        const tag: ExpressoTag = {
          id: generateTagFingerprint(relativePath, lineNumber, taskDescription),
          filePath,
          relativePath,
          line: lineNumber,
          columnStart,
          columnEnd: matchEndIndex,
          variant,
          taskDescription,
          fullCommentText: fullComment,
          isMultiLine,
          detectedAt: new Date().toISOString(),
        };

        tags.push(tag);
      }
    }

    // Update cache
    this.cache.set(filePath, tags);

    // Also scan for commands in this document
    const commands = this.scanDocumentForCommands(document);
    this.commandCache.set(filePath, commands);

    return tags;
  }

  /**
   * Extract the full comment text including multi-line comments
   */
  private extractFullComment(
    lines: string[],
    tagLineIndex: number
  ): { fullComment: string; taskDescription: string; isMultiLine: boolean } {
    const tagLine = lines[tagLineIndex];
    const trimmedTagLine = tagLine.trim();

    // Check if this is a block comment (/* ... */ or <!-- ... -->)
    const isBlockComment =
      trimmedTagLine.startsWith('/*') ||
      trimmedTagLine.startsWith('*') ||
      trimmedTagLine.startsWith('<!--');

    // Check if this is a single-line comment (//)
    const isSingleLineComment = trimmedTagLine.startsWith('//');

    if (isBlockComment) {
      return this.extractBlockComment(lines, tagLineIndex);
    } else if (isSingleLineComment) {
      return this.extractSingleLineComments(lines, tagLineIndex);
    }

    // Fallback: just return the current line
    const taskMatch = /@expresso[!?]?\s*(.*)/.exec(tagLine);
    const taskDescription = this.cleanTaskDescription(taskMatch?.[1] || '');
    return {
      fullComment: trimmedTagLine,
      taskDescription,
      isMultiLine: false,
    };
  }

  /**
   * Extract a block comment (multi-line or HTML comment)
   */
  private extractBlockComment(
    lines: string[],
    tagLineIndex: number
  ): { fullComment: string; taskDescription: string; isMultiLine: boolean } {
    const commentLines: string[] = [];
    let startIndex = tagLineIndex;
    let endIndex = tagLineIndex;

    // Find the start of the block comment (look backwards)
    for (let i = tagLineIndex; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('/*') || line.startsWith('<!--')) {
        startIndex = i;
        break;
      }
      // Stop if we hit a line that's not part of a block comment
      if (!line.startsWith('*') && !line.startsWith('//') && line.length > 0) {
        startIndex = i + 1;
        break;
      }
    }

    // Find the end of the block comment (look forwards)
    for (let i = tagLineIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.endsWith('*/') || line.endsWith('-->')) {
        endIndex = i;
        break;
      }
      // Stop if we hit the end of file
      if (i === lines.length - 1) {
        endIndex = i;
        break;
      }
    }

    // Collect all lines in the block comment
    for (let i = startIndex; i <= endIndex; i++) {
      commentLines.push(lines[i]);
    }

    const fullComment = commentLines.join('\n');
    const taskDescription = this.extractTaskFromBlockComment(commentLines, tagLineIndex - startIndex);

    return {
      fullComment,
      taskDescription,
      isMultiLine: endIndex > startIndex,
    };
  }

  /**
   * Extract consecutive single-line comments (//)
   */
  private extractSingleLineComments(
    lines: string[],
    tagLineIndex: number
  ): { fullComment: string; taskDescription: string; isMultiLine: boolean } {
    const commentLines: string[] = [];
    let startIndex = tagLineIndex;
    let endIndex = tagLineIndex;

    // Find the start of consecutive // comments (look backwards)
    for (let i = tagLineIndex; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('//')) {
        startIndex = i;
      } else {
        break;
      }
    }

    // Find the end of consecutive // comments (look forwards)
    for (let i = tagLineIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//')) {
        endIndex = i;
      } else {
        break;
      }
    }

    // Collect all lines
    for (let i = startIndex; i <= endIndex; i++) {
      commentLines.push(lines[i]);
    }

    const fullComment = commentLines.join('\n');
    const taskDescription = this.extractTaskFromSingleLineComments(commentLines, tagLineIndex - startIndex);

    return {
      fullComment,
      taskDescription,
      isMultiLine: endIndex > startIndex,
    };
  }

  /**
   * Extract task description from block comment lines
   */
  private extractTaskFromBlockComment(commentLines: string[], tagLineOffset: number): string {
    const taskParts: string[] = [];
    let foundExpresso = false;

    for (let i = 0; i < commentLines.length; i++) {
      const line = commentLines[i].trim();

      if (!foundExpresso) {
        // Look for @expresso tag
        const match = /@expresso[!?]?\s*(.*)/.exec(line);
        if (match) {
          foundExpresso = true;
          const text = match[1]
            .replace(/\*\/\s*$/, '')
            .replace(/-->\s*$/, '')
            .trim();
          if (text) {
            taskParts.push(text);
          }
        }
      } else {
        // Continue collecting text after @expresso
        let text = line
          .replace(/^\*\s*/, '') // Remove leading *
          .replace(/^\*$/, '')   // Remove standalone *
          .replace(/\*\/\s*$/, '') // Remove closing */
          .replace(/-->\s*$/, '') // Remove closing -->
          .trim();

        // Stop if we hit the end of comment
        if (line.endsWith('*/') || line.endsWith('-->')) {
          if (text) {
            taskParts.push(text);
          }
          break;
        }

        if (text) {
          taskParts.push(text);
        }
      }
    }

    return taskParts.join(' ').trim();
  }

  /**
   * Extract task description from single-line comments
   */
  private extractTaskFromSingleLineComments(commentLines: string[], tagLineOffset: number): string {
    const taskParts: string[] = [];
    let foundExpresso = false;

    for (const line of commentLines) {
      const trimmed = line.trim();

      if (!foundExpresso) {
        // Look for @expresso tag
        const match = /@expresso[!?]?\s*(.*)/.exec(trimmed);
        if (match) {
          foundExpresso = true;
          const text = match[1].trim();
          if (text) {
            taskParts.push(text);
          }
        }
      } else {
        // Continue collecting text after @expresso (remove // prefix)
        const text = trimmed.replace(/^\/\/\s*/, '').trim();
        if (text) {
          taskParts.push(text);
        }
      }
    }

    return taskParts.join(' ').trim();
  }

  /**
   * Clean up task description
   */
  private cleanTaskDescription(text: string): string {
    return text
      .replace(/\*\/\s*$/, '')
      .replace(/-->\s*$/, '')
      .replace(/\*\s*$/, '')
      .trim();
  }

  /**
   * Scan entire workspace for expresso tags
   */
  public async scanWorkspace(): Promise<ExpressoScanResult> {
    if (!this.config.enabled) {
      return this.createEmptyResult();
    }

    const allTags: ExpressoTag[] = [];
    const byFile = new Map<string, ExpressoTag[]>();

    // Build glob pattern from config
    const includePattern = `**/*{${this.config.fileExtensions.join(',')}}`;
    const excludePattern = `{${this.config.excludePatterns.join(',')}}`;

    try {
      const files = await vscode.workspace.findFiles(includePattern, excludePattern, 1000);

      for (const fileUri of files) {
        try {
          const document = await vscode.workspace.openTextDocument(fileUri);
          const tags = await this.scanDocument(document);

          if (tags.length > 0) {
            allTags.push(...tags);
            byFile.set(fileUri.fsPath, tags);
          }
        } catch {
          // Skip files that can't be opened (binary, too large, etc.)
        }
      }
    } catch (error) {
      console.error('ExpressoScanner: Error scanning workspace:', error);
    }

    const result = this.createResult(allTags, byFile);
    this.onChangeEmitter.fire(result);
    return result;
  }

  /**
   * Get cached tags for a specific file
   */
  public getTagsForFile(filePath: string): ExpressoTag[] {
    return this.cache.get(filePath) || [];
  }

  /**
   * Get command matches for a specific file
   */
  public getCommandsForFile(filePath: string): CommandMatch[] {
    return this.commandCache.get(filePath) || [];
  }

  /**
   * Check if a line is a comment (supports //, /*, *, #, /**, <!--)
   */
  private isCommentLine(line: string): boolean {
    const trimmed = line.trim();
    return (
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('<!--') ||
      trimmed.includes('*/') ||
      trimmed.includes('-->')
    );
  }

  /**
   * Scan a document for valid Claude commands in comments
   */
  public scanDocumentForCommands(document: vscode.TextDocument): CommandMatch[] {
    const matches: CommandMatch[] = [];
    const text = document.getText();
    const lines = text.split('\n');
    const filePath = document.uri.fsPath;

    // Use cached pattern, rebuild if needed
    if (!this.commandPattern) {
      this.commandPattern = this.buildCommandPattern();
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Only scan comment lines
      if (!this.isCommentLine(line)) {
        continue;
      }

      // Reset regex lastIndex for each line
      this.commandPattern.lastIndex = 0;

      let match;
      while ((match = this.commandPattern.exec(line)) !== null) {
        matches.push({
          command: match[1],
          line: lineIndex + 1, // 1-based
          columnStart: match.index,
          columnEnd: match.index + match[1].length,
          filePath,
        });
      }
    }

    return matches;
  }

  /**
   * Get all cached tags
   */
  public getAllTags(): ExpressoTag[] {
    const all: ExpressoTag[] = [];
    for (const tags of this.cache.values()) {
      all.push(...tags);
    }
    return all;
  }

  /**
   * Start watching for file changes
   */
  public startWatching(): void {
    if (!this.config.enabled) {
      return;
    }

    // Watch for file changes in workspace
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    this.disposables.push(
      watcher.onDidChange(async uri => {
        if (this.shouldScanFile(uri.fsPath)) {
          try {
            const document = await vscode.workspace.openTextDocument(uri);
            await this.scanDocument(document);
            this.emitCurrentState();
          } catch {
            // File might be deleted or inaccessible
          }
        }
      })
    );

    this.disposables.push(
      watcher.onDidCreate(async uri => {
        if (this.shouldScanFile(uri.fsPath)) {
          try {
            const document = await vscode.workspace.openTextDocument(uri);
            await this.scanDocument(document);
            this.emitCurrentState();
          } catch {
            // File might be deleted or inaccessible
          }
        }
      })
    );

    this.disposables.push(
      watcher.onDidDelete(uri => {
        if (this.cache.has(uri.fsPath)) {
          this.cache.delete(uri.fsPath);
          this.commandCache.delete(uri.fsPath);
          this.emitCurrentState();
        }
      })
    );

    this.disposables.push(watcher);

    // Watch for document changes in open editors (real-time updates)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(async event => {
        if (this.shouldScanFile(event.document.uri.fsPath)) {
          await this.scanDocument(event.document);
          this.emitCurrentState();
        }
      })
    );

    // Scan when a new document is opened
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument(async document => {
        if (this.shouldScanFile(document.uri.fsPath)) {
          await this.scanDocument(document);
        }
      })
    );
  }

  /**
   * Check if a file should be scanned based on config
   */
  private shouldScanFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    if (!this.config.fileExtensions.includes(ext)) {
      return false;
    }

    // Check exclude patterns
    const relativePath = vscode.workspace.asRelativePath(filePath);
    for (const pattern of this.config.excludePatterns) {
      // Simple pattern matching (could use minimatch for better glob support)
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\//g, '\\/');
      if (new RegExp(regexPattern).test(relativePath)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create an empty scan result
   */
  private createEmptyResult(): ExpressoScanResult {
    return {
      tags: [],
      byFile: new Map(),
      totalCount: 0,
      countByVariant: { normal: 0, urgent: 0, question: 0 },
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Create a scan result from tags
   */
  private createResult(
    tags: ExpressoTag[],
    byFile: Map<string, ExpressoTag[]>
  ): ExpressoScanResult {
    return {
      tags,
      byFile,
      totalCount: tags.length,
      countByVariant: {
        normal: tags.filter(t => t.variant === 'normal').length,
        urgent: tags.filter(t => t.variant === 'urgent').length,
        question: tags.filter(t => t.variant === 'question').length,
      },
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Emit the current state as a scan result
   */
  private emitCurrentState(): void {
    const allTags = this.getAllTags();
    const byFile = new Map(this.cache);
    const result = this.createResult(allTags, byFile);
    this.onChangeEmitter.fire(result);
  }

  /**
   * Clear the cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.commandCache.clear();
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ExpressoConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ExpressoConfig {
    return { ...this.config };
  }

  /**
   * Dispose of watchers and resources
   */
  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    this.cache.clear();
    this.commandCache.clear();
    this.onChangeEmitter.dispose();
  }
}
