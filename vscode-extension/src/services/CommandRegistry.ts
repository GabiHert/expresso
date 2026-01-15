import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CommandInfo } from '../types/expresso';

/**
 * Service that dynamically discovers Claude commands from markdown files
 * in .ai/_framework/commands/ and .ai/_project/commands/ directories.
 *
 * Provides the command list to ExpressoScanner (for highlighting) and
 * ExpressoCompletionProvider (for autocomplete).
 */
export class CommandRegistry implements vscode.Disposable {
  private commands: Map<string, CommandInfo> = new Map();
  private readonly onChangeEmitter = new vscode.EventEmitter<void>();
  public readonly onChange = this.onChangeEmitter.event;

  private watchers: vscode.FileSystemWatcher[] = [];
  private disposables: vscode.Disposable[] = [];

  constructor(private workspaceRoot: string) {}

  /**
   * Initialize the registry by scanning command directories and setting up watchers
   */
  public async initialize(): Promise<void> {
    await this.scanDirectory(
      path.join(this.workspaceRoot, '.ai', '_framework', 'commands'),
      'framework'
    );
    await this.scanDirectory(
      path.join(this.workspaceRoot, '.ai', '_project', 'commands'),
      'project'
    );

    this.setupWatchers();

    console.log(`[CommandRegistry] Initialized with ${this.commands.size} commands`);
  }

  /**
   * Scan a directory for command markdown files
   */
  private async scanDirectory(dirPath: string, source: 'framework' | 'project'): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      console.log(`[CommandRegistry] Directory not found: ${dirPath}`);
      return;
    }

    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        if (file.includes('.extend.')) continue;

        const filePath = path.join(dirPath, file);
        const command = this.parseCommandFile(filePath, source);
        if (command) {
          this.commands.set(command.name, command);
        }
      }
    } catch (error) {
      console.error(`[CommandRegistry] Error scanning ${dirPath}:`, error);
    }
  }

  /**
   * Parse a command markdown file to extract command info
   */
  private parseCommandFile(filePath: string, source: 'framework' | 'project'): CommandInfo | undefined {
    try {
      const filename = path.basename(filePath, '.md');
      const commandName = `/${filename}`;

      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract description from H1 header: # /command-name - Description
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

  /**
   * Set up file system watchers for command directories
   */
  private setupWatchers(): void {
    const patterns = [
      new vscode.RelativePattern(this.workspaceRoot, '.ai/_framework/commands/*.md'),
      new vscode.RelativePattern(this.workspaceRoot, '.ai/_project/commands/*.md'),
    ];

    for (const pattern of patterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);

      watcher.onDidCreate(uri => this.handleFileChange(uri, 'create'));
      watcher.onDidChange(uri => this.handleFileChange(uri, 'change'));
      watcher.onDidDelete(uri => this.handleFileDelete(uri));

      this.watchers.push(watcher);
      this.disposables.push(watcher);
    }
  }

  /**
   * Handle file create or change events
   */
  private handleFileChange(uri: vscode.Uri, type: 'create' | 'change'): void {
    const filename = path.basename(uri.fsPath);
    if (filename.includes('.extend.')) return;

    const source = uri.fsPath.includes('_framework') ? 'framework' : 'project';
    const command = this.parseCommandFile(uri.fsPath, source);

    if (command) {
      this.commands.set(command.name, command);
      this.onChangeEmitter.fire();
      console.log(`[CommandRegistry] ${type}: ${command.name}`);
    }
  }

  /**
   * Handle file delete events
   */
  private handleFileDelete(uri: vscode.Uri): void {
    const filename = path.basename(uri.fsPath, '.md');
    const commandName = `/${filename}`;

    if (this.commands.has(commandName)) {
      this.commands.delete(commandName);
      this.onChangeEmitter.fire();
      console.log(`[CommandRegistry] deleted: ${commandName}`);
    }
  }

  /**
   * Get all discovered commands
   */
  public getCommands(): CommandInfo[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get all command names (for regex building)
   */
  public getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Get a specific command by name
   */
  public getCommand(name: string): CommandInfo | undefined {
    return this.commands.get(name);
  }

  /**
   * Check if a command exists
   */
  public hasCommand(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Dispose of resources
   */
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
}
