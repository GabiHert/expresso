---
type: work-item
id: "03"
parent: LOCAL-027
title: ExpressoDecorator Service
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-027]]


# ExpressoDecorator Service

## Objective

Create a service that applies visual decorations to `@expresso` tags in the editor:
- Brown/coffee-themed background highlight
- Animated sparkle/shine gutter icon
- Different styling for each variant (@expresso, @expresso!, @expresso?)

## Pre-Implementation

Research VSCode decoration capabilities:
- TextEditorDecorationType API
- Gutter icon support (including animated GIFs)
- Theme-aware colors

## Implementation Steps

### Step 1: Create animated gutter icon assets

**Files to create**:
- `vscode-extension/media/expresso-sparkle.gif` - Normal variant icon
- `vscode-extension/media/expresso-sparkle-urgent.gif` - Urgent variant icon
- `vscode-extension/media/expresso-sparkle-question.gif` - Question variant icon

**Icon Design Spec**:
- Size: 16x16 pixels
- Format: Animated GIF
- Animation: Subtle sparkle/shine effect (4-8 frames, ~500ms loop)
- Color: Coffee brown base with white/gold sparkles
- Urgent: Orange/red tint sparkles
- Question: Blue tint sparkles

**Note**: Can create simple placeholder icons first, then enhance later. A static PNG works as fallback.

### Step 2: Create ExpressoDecorator service

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`

**Instructions**:

```typescript
import * as vscode from 'vscode';
import { ExpressoScanner } from './ExpressoScanner';
import { ExpressoTag, ExpressoVariant } from '../types/expresso';

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
    this.disposables.push(
      this.scanner.onChange(() => this.refreshAllEditors())
    );

    // Listen for editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.decorateEditor(editor);
        }
      })
    );

    // Listen for visible editors changes
    this.disposables.push(
      vscode.window.onDidChangeVisibleTextEditors((editors) => {
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
    const colors = {
      normal: {
        background: 'rgba(139, 90, 43, 0.15)',    // Coffee brown
        border: 'rgba(139, 90, 43, 0.4)',
        icon: 'expresso-sparkle.gif',
      },
      urgent: {
        background: 'rgba(255, 87, 34, 0.15)',    // Orange-red
        border: 'rgba(255, 87, 34, 0.4)',
        icon: 'expresso-sparkle-urgent.gif',
      },
      question: {
        background: 'rgba(33, 150, 243, 0.15)',   // Blue
        border: 'rgba(33, 150, 243, 0.4)',
        icon: 'expresso-sparkle-question.gif',
      },
    };

    const config = colors[variant];
    const iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', config.icon);

    return vscode.window.createTextEditorDecorationType({
      backgroundColor: config.background,
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: config.border,
      borderRadius: '3px',
      gutterIconPath: iconPath,
      gutterIconSize: 'contain',
      overviewRulerColor: config.border,
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      // Add some padding for visual clarity
      before: {
        contentText: '',
        margin: '0 4px 0 0',
      },
    });
  }

  /**
   * Apply decorations to a single editor
   */
  public decorateEditor(editor: vscode.TextEditor): void {
    const filePath = editor.document.uri.fsPath;
    const tags = this.scanner.getTagsForFile(filePath);

    // Group tags by variant
    const normalRanges: vscode.DecorationOptions[] = [];
    const urgentRanges: vscode.DecorationOptions[] = [];
    const questionRanges: vscode.DecorationOptions[] = [];

    for (const tag of tags) {
      const range = new vscode.Range(
        tag.line - 1, tag.columnStart,
        tag.line - 1, tag.columnEnd
      );

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
   * Create hover message for a tag
   */
  private createHoverMessage(tag: ExpressoTag): vscode.MarkdownString {
    const variantLabel = {
      normal: 'Task',
      urgent: 'Urgent Task',
      question: 'Question',
    }[tag.variant];

    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**@expresso** ${variantLabel}\n\n`);
    md.appendMarkdown(`${tag.taskDescription}\n\n`);
    md.appendMarkdown(`---\n`);
    md.appendMarkdown(`*Click "Brew this" above to copy command*`);
    md.isTrusted = true;

    return md;
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
   * Clear all decorations
   */
  public clearAll(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      editor.setDecorations(this.normalDecoration, []);
      editor.setDecorations(this.urgentDecoration, []);
      editor.setDecorations(this.questionDecoration, []);
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
```

### Step 3: Create placeholder icons (if not creating animated GIFs yet)

**Alternative**: Use VSCode ThemeIcon as fallback:

```typescript
// In createDecorationType, if animated GIF not available:
gutterIconPath: new vscode.ThemeIcon('coffee'), // or 'sparkle', 'zap'
```

Or create simple static SVG icons first.

## Post-Implementation

Test decorations in different color themes (dark, light, high contrast).

## Acceptance Criteria

- [ ] @expresso tags get brown background highlight
- [ ] @expresso! tags get orange-red highlight
- [ ] @expresso? tags get blue highlight
- [ ] Gutter icons display next to tagged lines
- [ ] Icons are animated (sparkle effect)
- [ ] Hover shows tag details
- [ ] Decorations update in real-time as user types
- [ ] Works in all VSCode themes

## Testing

1. Open a file with @expresso tags
2. Verify background colors are visible
3. Verify gutter icons appear
4. Add new @expresso tag, verify decoration appears
5. Switch themes, verify colors adapt

## Notes

- Animated GIFs: VSCode supports them natively in gutter
- Theme colors: Consider using theme-aware colors for better integration
- Performance: Decoration application should be fast
- Fallback: If GIFs don't work, use static icons
