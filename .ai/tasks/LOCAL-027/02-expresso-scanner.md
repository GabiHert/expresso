---
type: work-item
id: "02"
parent: LOCAL-027
title: ExpressoScanner Service
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-027]]


# ExpressoScanner Service

## Objective

Create a service that scans workspace files for `@expresso` tags, caches results, watches for file changes, and emits events when tags are found or updated.

## Pre-Implementation

Review existing service patterns:
- `vscode-extension/src/services/CommentManager.ts` - Caching, file watching, event emitters
- `vscode-extension/src/watchers/FileWatcher.ts` - File system watcher setup

## Implementation Steps

### Step 1: Create ExpressoScanner service

**File**: `vscode-extension/src/services/ExpressoScanner.ts`

**Instructions**:

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { ExpressoTag, ExpressoScanResult, ExpressoVariant, ExpressoConfig, DEFAULT_EXPRESSO_CONFIG } from '../types/expresso';
import { generateExpressoId, generateTagFingerprint } from '../utils/expressoIdGenerator';

export class ExpressoScanner implements vscode.Disposable {
  // Regex pattern to match @expresso variants
  // Matches: @expresso, @expresso!, @expresso? followed by optional text
  private static readonly EXPRESSO_REGEX = /@expresso([!?])?\s*(.*?)(?=\*\/|-->|$)/gi;

  // Comment patterns for different languages
  private static readonly COMMENT_PATTERNS = {
    singleLine: /\/\/.*@expresso.*$/gm,           // // comment
    blockSingle: /\/\*.*@expresso.*?\*\//gs,      // /* comment */
    blockMulti: /\/\*[\s\S]*?@expresso[\s\S]*?\*\//gm,  // /* multi-line */
    hash: /#.*@expresso.*$/gm,                     // # comment (Python, Ruby)
    html: /<!--[\s\S]*?@expresso[\s\S]*?-->/gm,   // <!-- HTML -->
  };

  private cache: Map<string, ExpressoTag[]> = new Map();
  private watchers: vscode.Disposable[] = [];
  private config: ExpressoConfig;

  private readonly onChangeEmitter = new vscode.EventEmitter<ExpressoScanResult>();
  public readonly onChange: vscode.Event<ExpressoScanResult> = this.onChangeEmitter.event;

  constructor(
    private workspaceRoot: string,
    config?: Partial<ExpressoConfig>
  ) {
    this.config = { ...DEFAULT_EXPRESSO_CONFIG, ...config };
  }

  /**
   * Scan a single document for expresso tags
   */
  public async scanDocument(document: vscode.TextDocument): Promise<ExpressoTag[]> {
    const text = document.getText();
    const filePath = document.uri.fsPath;
    const relativePath = vscode.workspace.asRelativePath(filePath);
    const tags: ExpressoTag[] = [];

    // Find all comments containing @expresso
    const lines = text.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineNumber = lineIndex + 1; // 1-based

      // Check for @expresso in this line
      const match = /@expresso([!?])?\s*(.*)/.exec(line);
      if (match) {
        const variantChar = match[1];
        const taskDescription = match[2]?.trim() || '';

        const variant: ExpressoVariant =
          variantChar === '!' ? 'urgent' :
          variantChar === '?' ? 'question' : 'normal';

        const columnStart = line.indexOf('@expresso');
        const columnEnd = columnStart + match[0].length;

        const tag: ExpressoTag = {
          id: generateTagFingerprint(relativePath, lineNumber, taskDescription),
          filePath,
          relativePath,
          line: lineNumber,
          columnStart,
          columnEnd,
          variant,
          taskDescription,
          fullCommentText: line.trim(),
          isMultiLine: false, // TODO: detect multi-line comments
          detectedAt: new Date().toISOString(),
        };

        tags.push(tag);
      }
    }

    // Update cache
    this.cache.set(filePath, tags);

    return tags;
  }

  /**
   * Scan entire workspace for expresso tags
   */
  public async scanWorkspace(): Promise<ExpressoScanResult> {
    const allTags: ExpressoTag[] = [];
    const byFile = new Map<string, ExpressoTag[]>();

    // Build glob pattern from config
    const includePattern = `**/*{${this.config.fileExtensions.join(',')}}`;
    const excludePattern = `{${this.config.excludePatterns.join(',')}}`;

    const files = await vscode.workspace.findFiles(includePattern, excludePattern);

    for (const fileUri of files) {
      try {
        const document = await vscode.workspace.openTextDocument(fileUri);
        const tags = await this.scanDocument(document);

        if (tags.length > 0) {
          allTags.push(...tags);
          byFile.set(fileUri.fsPath, tags);
        }
      } catch (error) {
        // Skip files that can't be opened
        console.warn(`ExpressoScanner: Could not scan ${fileUri.fsPath}:`, error);
      }
    }

    const result: ExpressoScanResult = {
      tags: allTags,
      byFile,
      totalCount: allTags.length,
      countByVariant: {
        normal: allTags.filter(t => t.variant === 'normal').length,
        urgent: allTags.filter(t => t.variant === 'urgent').length,
        question: allTags.filter(t => t.variant === 'question').length,
      },
      scannedAt: new Date().toISOString(),
    };

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
    // Watch for file changes in workspace
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    watcher.onDidChange(async (uri) => {
      if (this.shouldScanFile(uri.fsPath)) {
        const document = await vscode.workspace.openTextDocument(uri);
        await this.scanDocument(document);
        this.emitCurrentState();
      }
    });

    watcher.onDidCreate(async (uri) => {
      if (this.shouldScanFile(uri.fsPath)) {
        const document = await vscode.workspace.openTextDocument(uri);
        await this.scanDocument(document);
        this.emitCurrentState();
      }
    });

    watcher.onDidDelete((uri) => {
      if (this.cache.has(uri.fsPath)) {
        this.cache.delete(uri.fsPath);
        this.emitCurrentState();
      }
    });

    this.watchers.push(watcher);

    // Also watch for document changes in open editors (real-time updates)
    const textChangeWatcher = vscode.workspace.onDidChangeTextDocument(async (event) => {
      if (this.shouldScanFile(event.document.uri.fsPath)) {
        await this.scanDocument(event.document);
        this.emitCurrentState();
      }
    });

    this.watchers.push(textChangeWatcher);
  }

  /**
   * Check if a file should be scanned based on config
   */
  private shouldScanFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    return this.config.fileExtensions.includes(ext);
  }

  /**
   * Emit the current state as a scan result
   */
  private emitCurrentState(): void {
    const allTags = this.getAllTags();
    const byFile = new Map(this.cache);

    const result: ExpressoScanResult = {
      tags: allTags,
      byFile,
      totalCount: allTags.length,
      countByVariant: {
        normal: allTags.filter(t => t.variant === 'normal').length,
        urgent: allTags.filter(t => t.variant === 'urgent').length,
        question: allTags.filter(t => t.variant === 'question').length,
      },
      scannedAt: new Date().toISOString(),
    };

    this.onChangeEmitter.fire(result);
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Dispose of watchers and resources
   */
  public dispose(): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.watchers = [];
    this.cache.clear();
    this.onChangeEmitter.dispose();
  }
}
```

### Step 2: Add utility for ID generation

If not already created in Step 1 of work item 01, create:

**File**: `vscode-extension/src/utils/expressoIdGenerator.ts`

(See work item 01 for implementation)

## Post-Implementation

Run code review agent to check for issues.

## Acceptance Criteria

- [ ] Scanner detects `@expresso`, `@expresso!`, `@expresso?` variants
- [ ] Scanner extracts task description correctly
- [ ] Scanner works with single-line and block comments
- [ ] Results cached per file for performance
- [ ] File watcher updates cache on changes
- [ ] Event emitter fires when tags change
- [ ] Configurable file extensions and exclude patterns

## Testing

Create test file with various expresso tags:
```typescript
// @expresso normal task here
/* @expresso! urgent task */
// @expresso? is this the right approach?
```

Verify scanner finds all three with correct variants.

## Notes

- Performance: Consider debouncing file change events
- Multi-line comments: May need more complex parsing
- Edge cases: Empty task descriptions, nested comments
