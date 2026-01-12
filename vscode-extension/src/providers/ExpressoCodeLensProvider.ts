import * as vscode from 'vscode';
import { ExpressoScanner } from '../services/ExpressoScanner';
import { ExpressoTag, EXPRESSO_VARIANT_STYLES } from '../types/expresso';

/**
 * CodeLens provider that displays "Brew this" button above each @expresso tag
 */
export class ExpressoCodeLensProvider implements vscode.CodeLensProvider {
  private readonly onChangeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this.onChangeEmitter.event;

  constructor(private scanner: ExpressoScanner) {
    // Refresh CodeLenses when scanner detects changes
    this.scanner.onChange(() => {
      this.onChangeEmitter.fire();
    });
  }

  /**
   * Provide CodeLenses for a document
   */
  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const config = this.scanner.getConfig();
    if (!config.enabled || !config.showCodeLens) {
      return [];
    }

    const tags = this.scanner.getTagsForFile(document.uri.fsPath);

    return tags.map(tag => this.createCodeLens(tag));
  }

  /**
   * Resolve CodeLens (add command details) - already resolved in provideCodeLenses
   */
  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    _token: vscode.CancellationToken
  ): vscode.CodeLens {
    return codeLens;
  }

  /**
   * Create a CodeLens for a tag
   */
  private createCodeLens(tag: ExpressoTag): vscode.CodeLens {
    // Position CodeLens at the start of the line containing the tag
    const range = new vscode.Range(tag.line - 1, 0, tag.line - 1, 0);

    const style = EXPRESSO_VARIANT_STYLES[tag.variant];

    return new vscode.CodeLens(range, {
      title: style.codeLensText,
      command: 'aiCockpit.brewExpresso',
      arguments: [tag],
      tooltip: `Copy /expresso command to clipboard - ${tag.taskDescription || 'Execute task'}`,
    });
  }

  /**
   * Trigger a refresh of CodeLenses
   */
  public refresh(): void {
    this.onChangeEmitter.fire();
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.onChangeEmitter.dispose();
  }
}
