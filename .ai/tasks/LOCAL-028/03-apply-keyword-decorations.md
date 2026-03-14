---
type: work-item
id: "03"
parent: LOCAL-028
title: Apply keyword decorations
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
branch: main
---

# Apply Keyword Decorations

## Objective

Modify the `decorateEditor()` method to calculate and apply keyword-specific decoration ranges for the "@expresso" text within each tag.

## Pre-Implementation

Depends on: Work Items 01 and 02

Read the current decorateEditor implementation:
- `vscode-extension/src/services/ExpressoDecorator.ts:88-128`

## Implementation Steps

### Step 1: Add getKeywordRange method

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: After getCommentRange method (after line 199)

**Instructions**:
Add new method to calculate the precise range for "@expresso[!?]" text:

```typescript
/**
 * Get the range for just the @expresso keyword (including variant suffix)
 */
private getKeywordRange(editor: vscode.TextEditor, tag: ExpressoTag): vscode.Range {
  const lineIndex = tag.line - 1;
  const line = editor.document.lineAt(lineIndex).text;

  // Find @expresso in the line
  const keywordMatch = line.indexOf('@expresso');
  if (keywordMatch === -1) {
    // Fallback to tag's column position
    return new vscode.Range(lineIndex, tag.columnStart, lineIndex, tag.columnStart + 9);
  }

  // Determine keyword length based on variant
  // @expresso = 9 chars, @expresso! or @expresso? = 10 chars
  const keywordLength = tag.variant === 'normal' ? 9 : 10;

  return new vscode.Range(
    lineIndex,
    keywordMatch,
    lineIndex,
    keywordMatch + keywordLength
  );
}
```

### Step 2: Add keyword range arrays in decorateEditor

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: In decorateEditor method, after line 101 (after existing range arrays)

**Instructions**:
Add arrays for keyword ranges:

```typescript
// Keyword-only ranges (for distinct @expresso styling)
const normalKeywordRanges: vscode.DecorationOptions[] = [];
const urgentKeywordRanges: vscode.DecorationOptions[] = [];
const questionKeywordRanges: vscode.DecorationOptions[] = [];
```

### Step 3: Populate keyword ranges in the tag loop

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: In decorateEditor method, inside the for loop (after adding to normal/urgent/question ranges)

**Instructions**:
Add keyword range for each tag. Modify the switch statement:

```typescript
for (const tag of tags) {
  // Calculate the full range of the comment block
  const range = this.getCommentRange(editor, tag);

  // Calculate the keyword-only range
  const keywordRange = this.getKeywordRange(editor, tag);

  const decoration: vscode.DecorationOptions = {
    range,
    hoverMessage: this.createHoverMessage(tag),
  };

  const keywordDecoration: vscode.DecorationOptions = {
    range: keywordRange,
    // No hover for keyword - the comment hover is sufficient
  };

  switch (tag.variant) {
    case 'urgent':
      urgentRanges.push(decoration);
      urgentKeywordRanges.push(keywordDecoration);
      break;
    case 'question':
      questionRanges.push(decoration);
      questionKeywordRanges.push(keywordDecoration);
      break;
    default:
      normalRanges.push(decoration);
      normalKeywordRanges.push(keywordDecoration);
  }
}
```

### Step 4: Apply keyword decorations

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: After applying existing decorations (after line 127)

**Instructions**:
Add application of keyword decorations:

```typescript
// Apply keyword decorations (on top of comment background)
editor.setDecorations(this.normalKeywordDecoration, normalKeywordRanges);
editor.setDecorations(this.urgentKeywordDecoration, urgentKeywordRanges);
editor.setDecorations(this.questionKeywordDecoration, questionKeywordRanges);
```

### Step 5: Clear keyword decorations in clearEditor

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: In clearEditor method (after line 231)

**Instructions**:
Add clearing of keyword decorations:

```typescript
editor.setDecorations(this.normalKeywordDecoration, []);
editor.setDecorations(this.urgentKeywordDecoration, []);
editor.setDecorations(this.questionKeywordDecoration, []);
```

## Post-Implementation

Run TypeScript compiler and test in extension:
```bash
cd vscode-extension && npm run compile
```

## Acceptance Criteria

- [ ] getKeywordRange method returns correct range for @expresso text
- [ ] getKeywordRange handles all variants (@expresso, @expresso!, @expresso?)
- [ ] Keyword decorations are applied after comment decorations
- [ ] Keyword decorations are cleared when clearing editor
- [ ] TypeScript compiles without errors
- [ ] @expresso word visually distinct from comment background

## Testing

1. Compile and run extension
2. Open a file with @expresso tags
3. Verify the "@expresso" word appears bold and colored
4. Verify the rest of the comment has the background color
5. Test all 3 variants

## Notes

- The keyword decoration uses only `color` and `fontWeight`, so it layers on top of the background
- VSCode handles overlapping decorations correctly
- The keyword range is calculated from the actual line text to handle any indentation
