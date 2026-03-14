---
type: work-item
id: "01"
parent: LOCAL-014
title: Enhanced feedback format design
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

# Enhanced Feedback Format Design

## Objective

Design and document the enhanced markdown format for storing diff comments with metadata. This format must support:
- Comment identification (unique IDs)
- Status tracking (open/resolved)
- Timestamps
- File and line references (single line and ranges)
- Human readability AND machine parseability

## Pre-Implementation

Review the current feedback format:
- `.ai/_framework/templates/feedback-template.md`
- `.ai/docs/feedback-system.md`

## Implementation Steps

### Step 1: Define Format Specification

**File**: `.ai/docs/feedback-format-v2.md`

Design the enhanced format with these requirements:

```markdown
# Diff Feedback

## Metadata
<!-- AUTO-GENERATED - DO NOT EDIT -->
version: 2
last_synced: 2025-12-30T10:00:00Z
file_hashes:
  src/auth.ts: abc123
  src/user.ts: def456
<!-- END METADATA -->

---

### src/services/AuthService.ts:42
<!-- id: c1a2b3 | status: open | created: 2025-12-30T09:30:00Z -->
This validation logic seems incomplete.

### src/services/AuthService.ts:55-60
<!-- id: c4d5e6 | status: resolved | created: 2025-12-30T09:35:00Z -->
~~Consider extracting this into a helper function.~~

### General
<!-- id: c7f8g9 | status: open | created: 2025-12-30T09:40:00Z -->
Overall approach looks good.
```

Key design decisions to document:
1. Metadata block format (HTML comments for invisibility)
2. Comment header format (`### file:line` or `### file:line-line`)
3. Comment metadata format (inline HTML comment)
4. ID generation strategy (short unique IDs)
5. Resolution marking (strikethrough + status change)
6. File hash storage for staleness detection

### Step 2: Update Feedback Template

**File**: `.ai/_framework/templates/feedback-template.md`

Update the template to include the new metadata block structure while maintaining backward compatibility.

### Step 3: Document Migration Path

**File**: `.ai/docs/feedback-format-v2.md`

Document how to handle existing v1 feedback files:
- Detection: No `version:` in metadata = v1
- Migration: Auto-upgrade on first webview open
- Backward compat: v1 files still readable

### Step 4: Define TypeScript Interfaces

Document the TypeScript interfaces that WI-02 will implement:

```typescript
interface DiffComment {
  id: string;
  filePath: string;
  line: number;
  lineEnd?: number;  // For ranges
  text: string;
  status: 'open' | 'resolved';
  createdAt: string; // ISO timestamp
}

interface FeedbackFile {
  version: number;
  lastSynced: string;
  fileHashes: Record<string, string>;
  comments: DiffComment[];
}
```

## Acceptance Criteria

- [ ] Format specification documented in `.ai/docs/feedback-format-v2.md`
- [ ] Template updated with new structure
- [ ] TypeScript interfaces defined for WI-02
- [ ] Migration strategy documented
- [ ] Human-readable AND machine-parseable
- [ ] Backward compatible with existing v1 files

## Testing

- Create sample files in both v1 and v2 format
- Verify v1 files are still human-readable
- Verify v2 format can be parsed with regex/simple parser

## Notes

This work item is foundational - WI-02 (parsing library) and WI-06 (CommentManager) depend on this format specification.
