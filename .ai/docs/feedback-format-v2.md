---
type: doc
tags:
  - doc
---

# Feedback Format v2 Specification

## Overview

The v2 feedback format adds structured metadata to diff review comments, enabling:
- Unique comment identification
- Status tracking (open/resolved)
- Timestamps for audit trail
- File hash tracking for staleness detection
- Machine parsing while remaining human-readable

## Format Structure

### Complete Example

```markdown
# Diff Feedback

## Metadata
<!-- AUTO-GENERATED - DO NOT EDIT -->
version: 2
last_synced: 2025-12-30T10:00:00Z
file_hashes:
  src/services/AuthService.ts: a1b2c3d4
  src/utils/validation.ts: e5f6g7h8
<!-- END METADATA -->

---

### src/services/AuthService.ts:42
<!-- id: c1a2b3 | status: open | created: 2025-12-30T09:30:00Z -->
This validation logic seems incomplete. Should we also check for expired tokens?

### src/services/AuthService.ts:55-60
<!-- id: c4d5e6 | status: resolved | created: 2025-12-30T09:35:00Z -->
~~Consider extracting this into a helper function for reusability.~~

### src/utils/validation.ts
<!-- id: d7e8f9 | status: open | created: 2025-12-30T09:37:00Z -->
General comment about this file - the error messages could be more descriptive.

### General
<!-- id: g1h2i3 | status: open | created: 2025-12-30T09:40:00Z -->
Overall the approach looks good, but we should add more error handling throughout.
```

## Format Components

### 1. Header

Always starts with:
```markdown
# Diff Feedback
```

### 2. Metadata Block

The metadata block stores file-level information:

```markdown
## Metadata
<!-- AUTO-GENERATED - DO NOT EDIT -->
version: 2
last_synced: 2025-12-30T10:00:00Z
file_hashes:
  path/to/file.ts: hash123
  another/file.ts: hash456
<!-- END METADATA -->
```

**Fields:**
- `version`: Format version (always `2` for this spec)
- `last_synced`: ISO timestamp of last sync with webview
- `file_hashes`: Map of file paths to content hashes for staleness detection

**Parsing:**
- Metadata is enclosed in HTML comment markers
- Content is YAML-formatted for easy parsing
- Start marker: `<!-- AUTO-GENERATED - DO NOT EDIT -->`
- End marker: `<!-- END METADATA -->`

### 3. Comment Sections

Each comment is a markdown section with embedded metadata:

```markdown
### path/to/file.ts:42
<!-- id: abc123 | status: open | created: 2025-12-30T09:30:00Z -->
Comment text here. Can be multiple lines.

This is still part of the same comment.
```

**Header Format:**
- `### path/to/file.ts:42` - Single line reference
- `### path/to/file.ts:42-50` - Line range reference
- `### path/to/file.ts` - General file comment (no line)
- `### General` - Task-level comment (no file)

**Metadata Format:**
- Inline HTML comment immediately after header
- Pipe-separated key-value pairs
- Required fields: `id`, `status`, `created`
- Format: `<!-- id: {id} | status: {status} | created: {timestamp} -->`

**Comment Body:**
- Follows the metadata comment
- Can be multi-line markdown
- Ends at the next `###` header or end of file

### 4. Resolved Comments

Resolved comments have:
1. `status: resolved` in metadata
2. Body wrapped in strikethrough (`~~text~~`)

```markdown
### src/auth.ts:42
<!-- id: abc123 | status: resolved | created: 2025-12-30T09:30:00Z -->
~~This issue has been addressed in the latest commit.~~
```

## ID Generation

Comment IDs are:
- 6-character alphanumeric strings
- Generated using first 6 characters of UUID v4 (without hyphens)
- Example: `a1b2c3`, `x9y8z7`

```typescript
function generateCommentId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 6);
}
```

## File Hash Calculation

File hashes are used to detect if the source file has changed since comments were added:

```typescript
import { createHash } from 'crypto';

function calculateFileHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 8);
}
```

When a file's current hash doesn't match the stored hash, the UI should warn:
> "File has changed since these comments were added. Line references may be inaccurate."

## TypeScript Interfaces

```typescript
/**
 * A single comment on a diff
 */
interface DiffComment {
  /** Unique 6-character identifier */
  id: string;

  /** File path relative to repo root, or "General" for task-level comments */
  filePath: string;

  /** Starting line number (1-based), or undefined for file/general comments */
  line?: number;

  /** Ending line number for ranges, or undefined for single-line comments */
  lineEnd?: number;

  /** Comment text (markdown supported) */
  text: string;

  /** Current status */
  status: 'open' | 'resolved';

  /** ISO 8601 timestamp when comment was created */
  createdAt: string;
}

/**
 * Complete feedback file structure
 */
interface FeedbackFile {
  /** Format version (2 for this spec) */
  version: number;

  /** ISO 8601 timestamp of last sync */
  lastSynced: string;

  /** Map of file paths to content hashes */
  fileHashes: Record<string, string>;

  /** All comments in the file */
  comments: DiffComment[];
}
```

## Parsing Rules

### Regex Patterns

```typescript
// Metadata block
const METADATA_PATTERN = /## Metadata\n<!-- AUTO-GENERATED - DO NOT EDIT -->\n([\s\S]*?)\n<!-- END METADATA -->/;

// Comment header - "General" is a reserved keyword for task-level comments
const GENERAL_PATTERN = /^### General$/;
const HEADER_PATTERN = /^### (.+?)(?::(\d+)(?:-(\d+))?)?$/;
// Groups: [1] filePath, [2] line (optional), [3] lineEnd (optional)
// Note: Check GENERAL_PATTERN first, then fall back to HEADER_PATTERN

// Comment metadata
const COMMENT_META_PATTERN = /<!-- id: (\w+) \| status: (open|resolved) \| created: ([\d\-T:Z]+) -->/;
// Groups: [1] id, [2] status, [3] createdAt
```

### Parsing Algorithm

1. Extract metadata block using `METADATA_PATTERN`
2. Parse metadata YAML content
3. Split remaining content by `### ` (level 3 headers)
4. For each section:
   a. Parse header with `HEADER_PATTERN`
   b. Extract metadata with `COMMENT_META_PATTERN`
   c. Remaining text is comment body (trim whitespace)

## Migration from v1

### Detection

v1 files are identified by:
- No `## Metadata` section, OR
- No `version:` field in metadata

### Migration Process

1. Parse existing comments using v1 rules (simpler header format)
2. Generate IDs for each comment
3. Set status based on strikethrough presence
4. Set `createdAt` using (in priority order):
   - Git commit timestamp of last modification to feedback file
   - File modification time of feedback file
   - Current timestamp (fallback)
5. Write file in v2 format

### Backward Compatibility

The v2 format is designed to be:
- **Human-readable**: Comments are still plain markdown
- **Git-friendly**: Changes are meaningful diffs
- **Editor-friendly**: Works in any markdown editor
- **v1-compatible**: v1 parsers can still read the basic structure

## Path Normalization

File paths in comments must be:
- Relative to repository root
- Use forward slashes (`/`) as separators
- Not contain `..` (parent directory references)
- Not be absolute paths (no leading `/` or Windows drive letters)

**Valid paths:**
- `src/services/AuthService.ts`
- `packages/core/index.ts`

**Invalid paths:**
- `/Users/user/project/src/file.ts` (absolute)
- `../../../etc/passwd` (path traversal)
- `src\services\AuthService.ts` (backslashes)

The parser should normalize Windows paths to forward slashes and reject absolute or traversal paths.

## Best Practices

1. **Don't edit metadata manually** - Let tooling manage it
2. **Use strikethrough for resolved** - Visual indicator + status flag
3. **Keep comments concise** - One concern per comment
4. **Reference specific lines** - Helps with navigation
5. **Update file hashes** - When syncing after file changes

## Version History

- **v1**: Original format with simple `### file:line` headers, no metadata
- **v2**: Added comment IDs, status tracking, timestamps, file hashes
