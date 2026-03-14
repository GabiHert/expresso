---
type: work-item
id: "01"
parent: LOCAL-013
title: Feedback storage format
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

# Feedback Storage Format

## Objective

Design and document the markdown format for storing diff feedback comments. Create a template file that gets included in new tasks.

## Implementation Steps

### Step 1: Design the feedback format

**File**: `.ai/_framework/templates/feedback-template.md`

The format should be:
- Human-readable and editable
- Parseable by agents (file paths, line numbers)
- Support for resolved/unresolved status
- Grouped by file

**Proposed format**:
```markdown
# Diff Feedback

## How to Use
Add your feedback below. Use the format:
- `### path/to/file.ts:42` for specific line
- `### path/to/file.ts:15-20` for line range
- `### path/to/file.ts` for general file feedback
- `### General` for overall task feedback

Mark resolved items with ~~strikethrough~~ or delete them.

---

### src/services/auth.ts:42
This modifies token refresh - verify it handles concurrent requests

### src/components/Login.tsx:15-20
Consider adding loading state here

### General
Make sure all error messages are user-friendly
```

### Step 2: Create template file

**File**: `.ai/_framework/templates/feedback-template.md`

Create the template with:
- Header explaining format
- Example entries (commented out or as guidance)
- Sections for file-specific and general feedback

### Step 3: Document in framework

**File**: `.ai/docs/feedback-system.md`

Create documentation explaining:
- Purpose of feedback system
- How to add feedback
- How agents consume feedback via /address-feedback
- Best practices

## Acceptance Criteria

- [ ] Template file created at `.ai/_framework/templates/feedback-template.md`
- [ ] Format supports file:line, file:range, file, and general feedback
- [ ] Format is human-readable and agent-parseable
- [ ] Documentation created explaining the system

## Testing

1. Create sample feedback file manually
2. Verify format is intuitive to write
3. Verify agent can parse file paths and lines

## Notes

Keep it simple - this is a markdown file users will edit by hand. Don't over-engineer the format.
