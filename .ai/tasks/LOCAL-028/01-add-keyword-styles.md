---
type: work-item
id: "01"
parent: LOCAL-028
title: Add keyword styles to types
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
branch: main
---

> Parent: [[LOCAL-028]]


# Add Keyword Styles to Types

## Objective

Extend the `ExpressoVariantStyle` interface with keyword-specific styling properties, and update `EXPRESSO_VARIANT_STYLES` constant with colors for the @expresso keyword.

## Pre-Implementation

Read the current types file to understand the existing structure:
- `vscode-extension/src/types/expresso.ts:135-176`

## Implementation Steps

### Step 1: Extend ExpressoVariantStyle interface

**File**: `vscode-extension/src/types/expresso.ts`
**Location**: Lines 138-149

**Instructions**:
Add new properties to the interface after `emoji`:

```typescript
export interface ExpressoVariantStyle {
  /** Background color (rgba format) */
  backgroundColor: string;
  /** Border color (rgba format) */
  borderColor: string;
  /** Gutter icon filename */
  gutterIcon: string;
  /** CodeLens button text */
  codeLensText: string;
  /** Emoji for toast notification */
  emoji: string;
  // NEW: Keyword-specific styling
  /** Text color for @expresso keyword (rgba format, full opacity) */
  keywordColor: string;
  /** Font weight for keyword ('bold' | 'normal') */
  keywordFontWeight: string;
}
```

### Step 2: Update EXPRESSO_VARIANT_STYLES

**File**: `vscode-extension/src/types/expresso.ts`
**Location**: Lines 154-176

**Instructions**:
Add keyword styling to each variant:

```typescript
export const EXPRESSO_VARIANT_STYLES: Record<ExpressoVariant, ExpressoVariantStyle> = {
  normal: {
    backgroundColor: 'rgba(139, 90, 43, 0.15)',
    borderColor: 'rgba(139, 90, 43, 0.4)',
    gutterIcon: 'expresso-sparkle.gif',
    codeLensText: '☕ Brew this',
    emoji: '☕',
    // NEW: Solid brown, bold for keyword
    keywordColor: 'rgba(139, 90, 43, 1)',
    keywordFontWeight: 'bold',
  },
  urgent: {
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
    borderColor: 'rgba(255, 87, 34, 0.4)',
    gutterIcon: 'expresso-sparkle-urgent.gif',
    codeLensText: '🔥 Brew this NOW',
    emoji: '🔥',
    // NEW: Solid orange-red, bold for keyword
    keywordColor: 'rgba(255, 87, 34, 1)',
    keywordFontWeight: 'bold',
  },
  question: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderColor: 'rgba(33, 150, 243, 0.4)',
    gutterIcon: 'expresso-sparkle-question.gif',
    codeLensText: '❓ Brew this',
    emoji: '❓',
    // NEW: Solid blue, bold for keyword
    keywordColor: 'rgba(33, 150, 243, 1)',
    keywordFontWeight: 'bold',
  },
};
```

## Post-Implementation

Run TypeScript compiler to verify no type errors:
```bash
cd vscode-extension && npm run compile
```

## Acceptance Criteria

- [ ] ExpressoVariantStyle interface has `keywordColor` property
- [ ] ExpressoVariantStyle interface has `keywordFontWeight` property
- [ ] All 3 variants in EXPRESSO_VARIANT_STYLES have keyword properties
- [ ] TypeScript compiles without errors

## Testing

```bash
cd vscode-extension
npm run compile
```

## Notes

- Using full opacity (1.0) for keyword color so it's more prominent than the background
- Font weight 'bold' makes the keyword stand out
- These styles will be consumed by ExpressoDecorator in work item 02
