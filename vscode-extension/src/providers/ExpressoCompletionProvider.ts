import * as vscode from 'vscode';
import { CommandRegistry } from '../services/CommandRegistry';

/**
 * Provides autocomplete suggestions for Claude commands in comments
 */
export class ExpressoCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private commandRegistry: CommandRegistry) {}

  /**
   * Provide completion items for Claude commands
   */
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem[] | undefined {
    // Get the current line text up to the cursor
    const linePrefix = document.lineAt(position).text.substring(0, position.character);

    // Check if we're in a comment
    if (!this.isInComment(linePrefix)) {
      return undefined;
    }

    // Check if user just typed '/' or is typing a command
    const slashMatch = linePrefix.match(/\/([a-z-]*)$/);
    if (!slashMatch) {
      return undefined;
    }

    const partialCommand = slashMatch[1]; // Text after the '/'

    // Create completion items for matching commands
    const completionItems: vscode.CompletionItem[] = [];

    for (const commandInfo of this.commandRegistry.getCommands()) {
      // Filter by partial match (without the leading '/')
      const commandName = commandInfo.name.substring(1); // Remove leading '/'
      if (!commandName.startsWith(partialCommand)) {
        continue;
      }

      const item = new vscode.CompletionItem(commandInfo.name, vscode.CompletionItemKind.Function);

      // Set the text to insert (just the command name without the '/' since user already typed it)
      item.insertText = commandName;

      // Set the range to replace (from the '/' to current position)
      const startPos = new vscode.Position(position.line, position.character - partialCommand.length - 1);
      item.range = new vscode.Range(startPos, position);

      // Add description from registry
      item.detail = commandInfo.description;
      item.documentation = new vscode.MarkdownString(
        `**${commandInfo.name}**\n\n${commandInfo.description}\n\n*${commandInfo.source === 'project' ? 'Project' : 'Framework'} command*`
      );

      // Sort priority - task commands first
      if (commandInfo.name.startsWith('/task')) {
        item.sortText = `0_${commandInfo.name}`;
      } else {
        item.sortText = `1_${commandInfo.name}`;
      }

      completionItems.push(item);
    }

    return completionItems;
  }

  /**
   * Check if the current position is inside a comment
   */
  private isInComment(linePrefix: string): boolean {
    const trimmed = linePrefix.trim();

    // Single-line comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      return true;
    }

    // Block comments - check if we're inside /* */ or /** */
    if (trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return true;
    }

    // HTML comments
    if (trimmed.startsWith('<!--')) {
      return true;
    }

    // Check for inline comment after code: const x = 1; // comment
    if (linePrefix.includes('//')) {
      return true;
    }

    return false;
  }
}
