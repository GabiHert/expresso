import * as vscode from 'vscode';
import { ExpressoScanner } from './ExpressoScanner';
import { ExpressoTag, ExpressoVariant, EXPRESSO_VARIANT_STYLES } from '../types/expresso';

/**
 * Manages text decorations (highlighting, gutter icons) for @expresso tags
 */
export class ExpressoDecorator implements vscode.Disposable {
  private normalDecoration: vscode.TextEditorDecorationType;
  private urgentDecoration: vscode.TextEditorDecorationType;
  private questionDecoration: vscode.TextEditorDecorationType;

  private disposables: vscode.Disposable[] = [];

  constructor(
    private scanner: ExpressoScanner,
    private extensionUri: vscode.Uri
  ) {
    // Create decoration types for each variant
    this.normalDecoration = this.createDecorationType('normal');
    this.urgentDecoration = this.createDecorationType('urgent');
    this.questionDecoration = this.createDecorationType('question');

    // Listen for scanner changes
    this.disposables.push(this.scanner.onChange(() => this.refreshAllEditors()));

    // Listen for active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
          this.decorateEditor(editor);
        }
      })
    );

    // Listen for visible editors changes
    this.disposables.push(
      vscode.window.onDidChangeVisibleTextEditors(editors => {
        editors.forEach(editor => this.decorateEditor(editor));
      })
    );

    // Initial decoration of visible editors
    this.refreshAllEditors();
  }

  /**
   * Create decoration type for a variant
   */
  private createDecorationType(variant: ExpressoVariant): vscode.TextEditorDecorationType {
    const style = EXPRESSO_VARIANT_STYLES[variant];

    // Try to use animated GIF, fall back to ThemeIcon if not available
    let gutterIconPath: vscode.Uri | vscode.ThemeIcon;
    try {
      gutterIconPath = vscode.Uri.joinPath(this.extensionUri, 'media', style.gutterIcon);
    } catch {
      // Fallback to theme icon
      gutterIconPath = new vscode.ThemeIcon(
        variant === 'urgent' ? 'flame' : variant === 'question' ? 'question' : 'coffee'
      );
    }

    return vscode.window.createTextEditorDecorationType({
      backgroundColor: style.backgroundColor,
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: style.borderColor,
      borderRadius: '3px',
      // Use theme icon as fallback since we don't have GIFs yet
      gutterIconPath:
        gutterIconPath instanceof vscode.Uri ? gutterIconPath : undefined,
      gutterIconSize: 'contain',
      overviewRulerColor: style.borderColor,
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      // Light theme overrides
      light: {
        backgroundColor: style.backgroundColor.replace('0.15', '0.2'),
        borderColor: style.borderColor.replace('0.4', '0.5'),
      },
      // Dark theme uses default colors (already defined above)
    });
  }

  /**
   * Apply decorations to a single editor
   */
  public decorateEditor(editor: vscode.TextEditor): void {
    const config = this.scanner.getConfig();
    if (!config.showDecorations) {
      this.clearEditor(editor);
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const tags = this.scanner.getTagsForFile(filePath);

    // Group tags by variant
    const normalRanges: vscode.DecorationOptions[] = [];
    const urgentRanges: vscode.DecorationOptions[] = [];
    const questionRanges: vscode.DecorationOptions[] = [];

    for (const tag of tags) {
      // Calculate the full range of the comment block
      const range = this.getCommentRange(editor, tag);

      const decoration: vscode.DecorationOptions = {
        range,
        hoverMessage: this.createHoverMessage(tag),
      };

      switch (tag.variant) {
        case 'urgent':
          urgentRanges.push(decoration);
          break;
        case 'question':
          questionRanges.push(decoration);
          break;
        default:
          normalRanges.push(decoration);
      }
    }

    // Apply decorations
    editor.setDecorations(this.normalDecoration, normalRanges);
    editor.setDecorations(this.urgentDecoration, urgentRanges);
    editor.setDecorations(this.questionDecoration, questionRanges);
  }

  /**
   * Get the full range of the comment block containing the tag
   */
  private getCommentRange(editor: vscode.TextEditor, tag: ExpressoTag): vscode.Range {
    const document = editor.document;
    const tagLineIndex = tag.line - 1;

    // Count lines in the full comment
    const commentLineCount = tag.fullCommentText.split('\n').length;

    if (!tag.isMultiLine || commentLineCount <= 1) {
      // Single line - just highlight that line
      const lineLength = document.lineAt(tagLineIndex).text.length;
      return new vscode.Range(tagLineIndex, 0, tagLineIndex, lineLength);
    }

    // Multi-line comment - find the actual start and end in the document
    const tagLine = document.lineAt(tagLineIndex).text.trim();

    // Determine comment style and find boundaries
    let startLine = tagLineIndex;
    let endLine = tagLineIndex;

    if (tagLine.startsWith('//')) {
      // Consecutive single-line comments
      // Find start (look backwards)
      for (let i = tagLineIndex; i >= 0; i--) {
        if (document.lineAt(i).text.trim().startsWith('//')) {
          startLine = i;
        } else {
          break;
        }
      }
      // Find end (look forwards)
      for (let i = tagLineIndex; i < document.lineCount; i++) {
        if (document.lineAt(i).text.trim().startsWith('//')) {
          endLine = i;
        } else {
          break;
        }
      }
    } else {
      // Block comment - find start and end markers
      // Find start (look backwards for /*)
      for (let i = tagLineIndex; i >= 0; i--) {
        const line = document.lineAt(i).text.trim();
        if (line.startsWith('/*') || line.startsWith('<!--')) {
          startLine = i;
          break;
        }
        if (!line.startsWith('*') && line.length > 0 && !line.includes('@expresso')) {
          startLine = i + 1;
          break;
        }
      }
      // Find end (look forwards for */)
      for (let i = tagLineIndex; i < document.lineCount; i++) {
        const line = document.lineAt(i).text.trim();
        if (line.endsWith('*/') || line.endsWith('-->')) {
          endLine = i;
          break;
        }
      }
    }

    // Get the end column (end of the last line)
    const endLineLength = document.lineAt(endLine).text.length;

    return new vscode.Range(startLine, 0, endLine, endLineLength);
  }

  /**
   * Create hover message for a tag
   */
  private createHoverMessage(tag: ExpressoTag): vscode.MarkdownString {
    const variantLabels = {
      normal: '☕ Task',
      urgent: '🔥 Urgent Task',
      question: '❓ Question',
    };

    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**@expresso** ${variantLabels[tag.variant]}\n\n`);

    if (tag.taskDescription) {
      md.appendMarkdown(`${tag.taskDescription}\n\n`);
    }

    md.appendMarkdown(`---\n`);
    md.appendMarkdown(`*Click "☕ Brew this" above to copy command*`);
    md.isTrusted = true;

    return md;
  }

  /**
   * Clear decorations from an editor
   */
  public clearEditor(editor: vscode.TextEditor): void {
    editor.setDecorations(this.normalDecoration, []);
    editor.setDecorations(this.urgentDecoration, []);
    editor.setDecorations(this.questionDecoration, []);
  }

  /**
   * Refresh decorations on all visible editors
   */
  public refreshAllEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.decorateEditor(editor);
    }
  }

  /**
   * Clear all decorations from all editors
   */
  public clearAll(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.clearEditor(editor);
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.normalDecoration.dispose();
    this.urgentDecoration.dispose();
    this.questionDecoration.dispose();

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
