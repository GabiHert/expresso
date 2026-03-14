---
type: doc
tags:
  - doc
---

> Parent: [[manifest]]


# Diff Feedback System

The diff feedback system allows users to add review comments on task code changes that agents can read and address in any session.

## Overview

When reviewing code diffs from a task, you can add comments to a markdown file in the task folder. These comments are then accessible to agents via the `/address-feedback` command.

## File Location

Feedback is stored at:
```
.ai/tasks/{status}/{taskId}/feedback/diff-review.md
```

For example:
```
.ai/tasks/in_progress/LOCAL-013/feedback/diff-review.md
```

## Feedback Format

The format uses markdown headers to reference code locations:

```markdown
# Diff Feedback

---

### src/services/auth.ts:42
This modifies token refresh - verify it handles concurrent requests

### src/components/Login.tsx:15-20
Consider adding loading state here

### src/utils/api.ts
This file needs better error handling overall

### General
Make sure all error messages are user-friendly
```

### Reference Types

| Format | Description |
|--------|-------------|
| `### path/to/file.ts:42` | Specific line number |
| `### path/to/file.ts:15-20` | Line range |
| `### path/to/file.ts` | Entire file |
| `### General` | Overall task feedback |

### Resolving Feedback

Mark items as resolved using strikethrough:

```markdown
### ~~src/services/auth.ts:42~~
~~This was addressed in commit abc123~~
```

Or simply delete the resolved items.

## Using Feedback

### Adding Feedback

1. Open the feedback file in your editor
2. Add your comments using the format above
3. Save the file

In VSCode with AI Cockpit extension, you can click the feedback button on a task to open the file directly.

### Agent Consumption

Run `/address-feedback` in any Claude session to present the feedback to the agent:

```
/address-feedback              # Current task
/address-feedback LOCAL-013    # Specific task
```

The agent will:
1. Read and parse all feedback entries
2. Optionally show code context for each item
3. Discuss how to address the feedback
4. Help mark items as resolved

## Best Practices

1. **Be specific** - Include line numbers when possible
2. **Be actionable** - Describe what needs to change, not just what's wrong
3. **Prioritize** - Put critical issues first
4. **Clean up** - Delete resolved items to keep the file manageable
5. **Use General sparingly** - Prefer file-specific feedback when possible

## Integration with Workflow

The feedback system integrates with the task workflow:

1. **During development**: Add feedback as you review diffs
2. **Between sessions**: Feedback persists in the task folder
3. **New sessions**: Agent reads feedback via `/address-feedback`
4. **After fixes**: Mark items resolved or delete them

## Template

New tasks include an empty feedback file from the template at:
```
.ai/_framework/templates/feedback-template.md
```
