---
type: work-item
id: "02"
parent: LOCAL-028
title: Create keyword decoration types
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
branch: main
---

# Create Keyword Decoration Types

## Objective

Add new TextEditorDecorationType instances for @expresso keyword styling in ExpressoDecorator. These decorations will style just the "@expresso" text, not the entire comment.

## Pre-Implementation

Depends on: Work Item 01 (keyword styles in types)

Read the current decorator implementation:
- `vscode-extension/src/services/ExpressoDecorator.ts:1-45`

## Implementation Steps

### Step 1: Add private fields for keyword decorations

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: After line 11 (after questionDecoration field)

**Instructions**:
Add 3 new private fields:

```typescript
private normalKeywordDecoration: vscode.TextEditorDecorationType;
private urgentKeywordDecoration: vscode.TextEditorDecorationType;
private questionKeywordDecoration: vscode.TextEditorDecorationType;
```

### Step 2: Add createKeywordDecorationType method

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: After createDecorationType method (after line 83)

**Instructions**:
Add new method:

```typescript
/**
 * Create decoration type for keyword styling (just the @expresso text)
 */
private createKeywordDecorationType(variant: ExpressoVariant): vscode.TextEditorDecorationType {
  const style = EXPRESSO_VARIANT_STYLES[variant];

  return vscode.window.createTextEditorDecorationType({
    color: style.keywordColor,
    fontWeight: style.keywordFontWeight,
    // No background - just text styling to overlay on comment background
  });
}
```

### Step 3: Initialize keyword decorations in constructor

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: In constructor, after line 22 (after creating normal decorations)

**Instructions**:
Add initialization:

```typescript
// Create keyword decoration types for each variant
this.normalKeywordDecoration = this.createKeywordDecorationType('normal');
this.urgentKeywordDecoration = this.createKeywordDecorationType('urgent');
this.questionKeywordDecoration = this.createKeywordDecorationType('question');
```

### Step 4: Dispose keyword decorations

**File**: `vscode-extension/src/services/ExpressoDecorator.ts`
**Location**: In dispose() method, after line 258 (after disposing question decoration)

**Instructions**:
Add disposal:

```typescript
this.normalKeywordDecoration.dispose();
this.urgentKeywordDecoration.dispose();
this.questionKeywordDecoration.dispose();
```

## Post-Implementation

Run TypeScript compiler to verify no type errors:
```bash
cd vscode-extension && npm run compile
```

## Acceptance Criteria

- [ ] 3 new private fields for keyword decorations exist
- [ ] createKeywordDecorationType method creates decoration with color and fontWeight
- [ ] Constructor initializes all 3 keyword decorations
- [ ] dispose() cleans up all 3 keyword decorations
- [ ] TypeScript compiles without errors

## Testing

```bash
cd vscode-extension
npm run compile
```

## Notes

- Keyword decorations only set `color` and `fontWeight`, no background
- This allows the keyword to appear bold and colored on top of the existing comment background
- The actual application of these decorations happens in work item 03
