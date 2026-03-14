---
type: work-item
id: "01"
parent: LOCAL-027
title: Type Definitions for ExpressoTag
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Type Definitions for ExpressoTag

## Objective

Define TypeScript interfaces and types for the Expresso tag feature. These types will be the foundation for all other components.

## Pre-Implementation

Review existing type patterns:
- `vscode-extension/src/types/feedback.ts` - DiffComment interface pattern
- `vscode-extension/src/types/index.ts` - Re-export pattern

## Implementation Steps

### Step 1: Create expresso.ts types file

**File**: `vscode-extension/src/types/expresso.ts`

**Instructions**:
Create the following type definitions:

```typescript
/**
 * Expresso tag variant types
 * - normal: Standard @expresso tag
 * - urgent: @expresso! for high priority
 * - question: @expresso? for questions/discussions
 */
export type ExpressoVariant = 'normal' | 'urgent' | 'question';

/**
 * Represents a single @expresso tag found in code
 */
export interface ExpressoTag {
  /** Unique identifier for this tag instance */
  id: string;

  /** Absolute file path */
  filePath: string;

  /** Relative file path (to workspace) */
  relativePath: string;

  /** Line number (1-based) */
  line: number;

  /** Column where @expresso starts */
  columnStart: number;

  /** Column where the full tag text ends */
  columnEnd: number;

  /** Tag variant */
  variant: ExpressoVariant;

  /** The task description after @expresso */
  taskDescription: string;

  /** Full text of the comment containing the tag */
  fullCommentText: string;

  /** Whether this is a multi-line comment */
  isMultiLine: boolean;

  /** ISO 8601 timestamp when first detected */
  detectedAt: string;
}

/**
 * Result of scanning workspace or file for tags
 */
export interface ExpressoScanResult {
  /** All tags found */
  tags: ExpressoTag[];

  /** Tags grouped by file path for quick lookup */
  byFile: Map<string, ExpressoTag[]>;

  /** Total count of tags */
  totalCount: number;

  /** Count by variant */
  countByVariant: {
    normal: number;
    urgent: number;
    question: number;
  };

  /** ISO 8601 timestamp of scan completion */
  scannedAt: string;
}

/**
 * Configuration for the expresso scanner
 */
export interface ExpressoConfig {
  /** File extensions to scan */
  fileExtensions: string[];

  /** Directories to exclude from scanning */
  excludePatterns: string[];

  /** Whether to scan on file save */
  scanOnSave: boolean;

  /** Whether to show decorations */
  showDecorations: boolean;

  /** Whether to show CodeLens */
  showCodeLens: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_EXPRESSO_CONFIG: ExpressoConfig = {
  fileExtensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rs', '.rb', '.php', '.c', '.cpp', '.h'],
  excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
  scanOnSave: true,
  showDecorations: true,
  showCodeLens: true,
};
```

### Step 2: Update types index

**File**: `vscode-extension/src/types/index.ts`

**Instructions**:
Add re-exports for the new expresso types:

```typescript
export * from './expresso';
```

### Step 3: Create ID generator utility (if not exists)

**File**: `vscode-extension/src/utils/expressoIdGenerator.ts`

**Instructions**:
Create a simple ID generator for tags (or reuse existing idGenerator.ts pattern):

```typescript
import * as crypto from 'crypto';

/**
 * Generate a unique ID for an expresso tag
 * Format: exp_XXXXXX (6 random alphanumeric chars)
 */
export function generateExpressoId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(6);
  let result = 'exp_';
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Generate a deterministic ID based on file path and line
 * Useful for matching tags across scans
 */
export function generateTagFingerprint(filePath: string, line: number, taskDescription: string): string {
  const content = `${filePath}:${line}:${taskDescription}`;
  return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
}
```

## Post-Implementation

Run TypeScript compiler to verify types:
```bash
cd vscode-extension && npm run compile
```

## Acceptance Criteria

- [ ] `ExpressoTag` interface captures all needed tag data
- [ ] `ExpressoVariant` type supports all three variants
- [ ] `ExpressoScanResult` provides efficient lookup by file
- [ ] `ExpressoConfig` allows customization
- [ ] Types are exported from index.ts
- [ ] TypeScript compiles without errors

## Testing

Verify types compile correctly:
```bash
cd vscode-extension
npm run compile
```

## Notes

- Keep types simple and focused
- Follow existing patterns from feedback.ts
- Consider future extensibility (e.g., priority levels, assignees)
