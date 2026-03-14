---
type: work-item
id: "02"
parent: LOCAL-014
title: Feedback parsing library
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

> Parent: [[LOCAL-014]]


# Feedback Parsing Library

## Objective

Create a TypeScript library for parsing and serializing the enhanced feedback markdown format. This library will be used by both the VSCode extension (CommentManager) and potentially by framework commands.

## Pre-Implementation

- Complete WI-01 (format specification)
- Review format specification in `.ai/docs/feedback-format-v2.md`

## Implementation Steps

### Step 1: Create Parser Module

**File**: `vscode-extension/src/services/FeedbackParser.ts`

Implement the parsing logic:

```typescript
import { DiffComment, FeedbackFile } from '../types/feedback';

export class FeedbackParser {
  /**
   * Parse a feedback markdown file into structured data
   */
  static parse(content: string): FeedbackFile {
    // 1. Extract metadata block
    // 2. Parse each comment section
    // 3. Return structured object
  }

  /**
   * Serialize structured data back to markdown
   */
  static serialize(feedback: FeedbackFile): string {
    // 1. Generate metadata block
    // 2. Generate comment sections
    // 3. Return markdown string
  }

  /**
   * Parse a single comment header (e.g., "src/auth.ts:42-50")
   */
  static parseCommentHeader(header: string): {
    filePath: string;
    line: number;
    lineEnd?: number
  } | null {
    // Handle: "file.ts:42", "file.ts:42-50", "General"
  }

  /**
   * Parse comment metadata from HTML comment
   */
  static parseCommentMeta(metaComment: string): {
    id: string;
    status: 'open' | 'resolved';
    createdAt: string;
  } | null {
    // Parse: <!-- id: abc123 | status: open | created: 2025-12-30T09:30:00Z -->
  }

  /**
   * Detect format version
   */
  static detectVersion(content: string): number {
    // Return 1 for legacy, 2 for new format
  }

  /**
   * Migrate v1 format to v2
   */
  static migrateV1ToV2(content: string): FeedbackFile {
    // Parse legacy format and convert to structured data
  }
}
```

### Step 2: Create Type Definitions

**File**: `vscode-extension/src/types/feedback.ts`

```typescript
export interface DiffComment {
  id: string;
  filePath: string;
  line: number;
  lineEnd?: number;
  text: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

export interface FeedbackFile {
  version: number;
  lastSynced: string;
  fileHashes: Record<string, string>;
  comments: DiffComment[];
}
```

### Step 3: Implement ID Generator

**File**: `vscode-extension/src/utils/idGenerator.ts`

```typescript
/**
 * Generate short unique IDs for comments
 * Format: 6 character alphanumeric (e.g., "c1a2b3")
 */
export function generateCommentId(): string {
  // Use crypto.randomUUID() and take first 6 chars
  // Or use nanoid if available
}
```

### Step 4: Write Unit Tests

**File**: `vscode-extension/src/test/FeedbackParser.test.ts`

Test cases:
1. Parse empty file
2. Parse v1 format (legacy)
3. Parse v2 format with multiple comments
4. Parse comment with line range
5. Parse "General" comment (no file reference)
6. Serialize and re-parse (round-trip)
7. Handle malformed input gracefully

## Acceptance Criteria

- [ ] `FeedbackParser.parse()` correctly parses v2 format
- [ ] `FeedbackParser.serialize()` produces valid markdown
- [ ] Round-trip (parse → serialize → parse) preserves data
- [ ] Legacy v1 files detected and migrated
- [ ] Edge cases handled (empty file, malformed input)
- [ ] Unit tests passing

## Testing

```bash
cd vscode-extension
npm test -- --grep "FeedbackParser"
```

## Notes

- Keep parser simple - regex-based is fine for this format
- Don't over-engineer - this is internal tooling
- Consider extracting to shared package if framework commands need it
