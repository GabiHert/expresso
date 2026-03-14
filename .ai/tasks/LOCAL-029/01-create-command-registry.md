---
type: work-item
id: "01"
parent: LOCAL-029
title: Create CommandRegistry service
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
branch: feature/command-registry
---

> Parent: [[LOCAL-029]]


# Create CommandRegistry Service

## Objective

Create a new `CommandRegistry` service that dynamically discovers Claude commands from markdown files in the `.ai/_framework/commands/` and `.ai/_project/commands/` directories. This service becomes the single source of truth for all command-related functionality.

## Pre-Implementation

Run an exploration agent to review:
- Existing file watcher patterns in `ExpressoScanner.ts`
- How `vscode.workspace.createFileSystemWatcher` is used
- The VSCode `EventEmitter` pattern

## Implementation Steps

### Step 1: Add CommandInfo Interface

**File**: `src/types/expresso.ts`

Add the following interface near the top of the file:

```typescript
/**
 * Represents a discovered Claude command from markdown files
 */
export interface CommandInfo {
  /** Command name with leading slash (e.g., "/task-start") */
  name: string;
  /** Human-readable description extracted from markdown H1 */
  description: string;
  /** Absolute path to the markdown file */
  filePath: string;
  /** Where the command was discovered from */
  source: 'framework' | 'project';
}
```

### Step 2: Create CommandRegistry Service

**File**: `src/services/CommandRegistry.ts` (NEW FILE)

Create the service with the following structure:

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CommandInfo } from '../types/expresso';

export class CommandRegistry implements vscode.Disposable {
  private commands: Map<string, CommandInfo> = new Map();
  private readonly onChangeEmitter = new vscode.EventEmitter<void>();
  public readonly onChange = this.onChangeEmitter.event;

  private watchers: vscode.FileSystemWatcher[] = [];
  private disposables: vscode.Disposable[] = [];

  constructor(private workspaceRoot: string) {}

  public async initialize(): Promise<void> {
    // Scan both directories
    await this.scanDirectory(
      path.join(this.workspaceRoot, '.ai', '_framework', 'commands'),
      'framework'
    );
    await this.scanDirectory(
      path.join(this.workspaceRoot, '.ai', '_project', 'commands'),
      'project'
    );

    // Set up watchers
    this.setupWatchers();
  }

  private async scanDirectory(dirPath: string, source: 'framework' | 'project'): Promise<void> {
    // Check if directory exists
    // Read all .md files
    // Parse each file and add to commands map
  }

  private parseCommandFile(filePath: string, source: 'framework' | 'project'): CommandInfo | undefined {
    // Extract command name from filename
    // Extract description from H1 header
    // Return CommandInfo or undefined
  }

  private setupWatchers(): void {
    // Watch .ai/_framework/commands/*.md
    // Watch .ai/_project/commands/*.md
    // Handle create, change, delete events
  }

  public getCommands(): CommandInfo[] {
    return Array.from(this.commands.values());
  }

  public getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  public getCommand(name: string): CommandInfo | undefined {
    return this.commands.get(name);
  }

  public hasCommand(name: string): boolean {
    return this.commands.has(name);
  }

  public dispose(): void {
    // Clean up watchers and emitter
  }
}
```

### Step 3: Implement Directory Scanning

**Method**: `scanDirectory`

```typescript
private async scanDirectory(dirPath: string, source: 'framework' | 'project'): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    console.log(`[CommandRegistry] Directory not found: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    if (file.includes('.extend.')) continue; // Skip extension files

    const filePath = path.join(dirPath, file);
    const command = this.parseCommandFile(filePath, source);
    if (command) {
      this.commands.set(command.name, command);
    }
  }
}
```

### Step 4: Implement Markdown Parsing

**Method**: `parseCommandFile`

```typescript
private parseCommandFile(filePath: string, source: 'framework' | 'project'): CommandInfo | undefined {
  try {
    const filename = path.basename(filePath, '.md');
    const commandName = `/${filename}`;

    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract description from H1 header
    // Pattern: # /command-name - Description
    const h1Match = content.match(/^#\s+\/[\w-]+\s+-\s+(.+)$/m);
    let description = h1Match ? h1Match[1].trim() : '';

    // Fallback: convert filename to title case
    if (!description) {
      description = filename
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    return {
      name: commandName,
      description,
      filePath,
      source,
    };
  } catch (error) {
    console.error(`[CommandRegistry] Failed to parse ${filePath}:`, error);
    return undefined;
  }
}
```

### Step 5: Implement File Watchers

**Method**: `setupWatchers`

```typescript
private setupWatchers(): void {
  const patterns = [
    path.join(this.workspaceRoot, '.ai', '_framework', 'commands', '*.md'),
    path.join(this.workspaceRoot, '.ai', '_project', 'commands', '*.md'),
  ];

  for (const pattern of patterns) {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidCreate(uri => this.handleFileChange(uri, 'create'));
    watcher.onDidChange(uri => this.handleFileChange(uri, 'change'));
    watcher.onDidDelete(uri => this.handleFileDelete(uri));

    this.watchers.push(watcher);
  }
}

private handleFileChange(uri: vscode.Uri, type: 'create' | 'change'): void {
  const source = uri.fsPath.includes('_framework') ? 'framework' : 'project';
  const command = this.parseCommandFile(uri.fsPath, source);

  if (command) {
    this.commands.set(command.name, command);
    this.onChangeEmitter.fire();
    console.log(`[CommandRegistry] ${type}: ${command.name}`);
  }
}

private handleFileDelete(uri: vscode.Uri): void {
  const filename = path.basename(uri.fsPath, '.md');
  const commandName = `/${filename}`;

  if (this.commands.has(commandName)) {
    this.commands.delete(commandName);
    this.onChangeEmitter.fire();
    console.log(`[CommandRegistry] deleted: ${commandName}`);
  }
}
```

### Step 6: Implement Disposal

```typescript
public dispose(): void {
  for (const watcher of this.watchers) {
    watcher.dispose();
  }
  this.watchers = [];

  this.onChangeEmitter.dispose();

  for (const disposable of this.disposables) {
    disposable.dispose();
  }
  this.disposables = [];

  this.commands.clear();
}
```

## Acceptance Criteria

- [ ] `CommandInfo` interface is defined in `types/expresso.ts`
- [ ] `CommandRegistry` class is created in `src/services/CommandRegistry.ts`
- [ ] Service discovers commands from `.ai/_framework/commands/`
- [ ] Service discovers commands from `.ai/_project/commands/`
- [ ] Command names are correctly extracted from filenames
- [ ] Descriptions are correctly extracted from H1 headers
- [ ] File watchers detect create/change/delete events
- [ ] `onChange` event fires when command list changes
- [ ] Service handles missing directories gracefully
- [ ] TypeScript compiles without errors

## Testing

```bash
cd /Users/gabriel.herter/Documents/Personal/ai-framework/vscode-extension
npm run compile
```

Test by adding console.log in initialize() and verifying commands are discovered:
```typescript
console.log(`[CommandRegistry] Discovered ${this.commands.size} commands`);
```

## Notes

- Skip `.extend.md` files as they are extensions, not commands
- Project commands should override framework commands with the same name
- Use async/await for file operations where possible
