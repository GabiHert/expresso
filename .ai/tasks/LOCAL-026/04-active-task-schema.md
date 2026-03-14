---
type: work-item
id: "04"
parent: LOCAL-026
title: Enhance active-task.json schema
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

# Enhance active-task.json Schema

## Objective

Extend the `active-task.json` schema to include detailed repository context with absolute paths, git roots, and protection status. This enables agents to always know exactly where to run git commands.

## Pre-Implementation

Review current schema at `.ai/cockpit/active-task.json`.

## Implementation Steps

### Step 1: Document New Schema

**File**: `.ai/docs/_architecture/active-task-schema.md` (create)

**Instructions**:
Document the enhanced schema:

```markdown
# active-task.json Schema

## Location
`.ai/cockpit/active-task.json`

## Purpose
Persists the currently active task context, including all repository paths
and git information needed for safe git operations.

## Schema

```json
{
  "taskId": "string",           // Required: Task identifier (e.g., "LOCAL-026")
  "title": "string",            // Required: Task title
  "frameworkPath": "string",    // Required: Path to task folder in .ai/tasks/
  "startedAt": "string",        // Required: ISO timestamp
  "sessionId": "string",        // Required: Session identifier

  // DEPRECATED - kept for backward compatibility
  "branch": "string",           // Deprecated: Use affectedRepos[].branch instead

  // NEW FIELDS
  "affectedRepos": [            // Required: Array of affected repositories
    {
      "name": "string",         // Repo name from manifest
      "absolutePath": "string", // Resolved absolute filesystem path
      "gitRoot": "string",      // Absolute path to .git directory parent
      "branch": "string",       // Branch created/used for this task
      "remote": "string",       // Git remote name (usually "origin")
      "remoteUrl": "string",    // Git remote URL
      "protected": false        // From manifest - if true, git ops blocked
    }
  ],
  "currentWorkRepo": "string"   // Optional: Name of repo currently being worked
}
```

## Example

```json
{
  "taskId": "JIRA-123",
  "title": "Fix validation bug",
  "frameworkPath": ".ai/tasks/in_progress/JIRA-123",
  "startedAt": "2026-01-08T12:00:00Z",
  "sessionId": "abc123",
  "affectedRepos": [
    {
      "name": "backend",
      "absolutePath": "/Users/gabi/Projects/deel/backend",
      "gitRoot": "/Users/gabi/Projects/deel/backend",
      "branch": "JIRA-123-fix-validation",
      "remote": "origin",
      "remoteUrl": "git@github.com:letsdeel/backend.git",
      "protected": false
    }
  ],
  "currentWorkRepo": "backend"
}
```

## Usage

Before any git operation:
1. Read `active-task.json`
2. Find repo in `affectedRepos` by name
3. Use `absolutePath` to `cd` into correct directory
4. Verify `gitRoot` matches `git rev-parse --show-toplevel`
5. If `protected: true`, block the operation
```

### Step 2: Update task-start.md to Write New Schema

**File**: `.ai/_framework/commands/task-start.md`

**Location**: Lines 310-326 (Step 7: Activate Cockpit Tracking)

**Instructions**:
Replace the active-task.json writing logic:

```markdown
6. Write `active-task.json` atomically with new schema:
   ```bash
   # Build affectedRepos array from manifest + created branches
   cat > .ai/cockpit/active-task.json.tmp << 'EOF'
   {
     "taskId": "{task-id}",
     "title": "{task-title}",
     "frameworkPath": ".ai/tasks/in_progress/{task-id}",
     "startedAt": "{ISO-timestamp}",
     "sessionId": "{generated-session-id}",
     "branch": "{current-git-branch}",
     "affectedRepos": [
       {for each non-protected repo with branch created}
       {
         "name": "{repo-name}",
         "absolutePath": "{resolved-absolute-path}",
         "gitRoot": "{git-root-path}",
         "branch": "{created-branch-name}",
         "remote": "origin",
         "remoteUrl": "{git-remote-url}",
         "protected": false
       }
       {/for}
     ],
     "currentWorkRepo": "{first-non-protected-repo}"
   }
   EOF

   # Atomic rename
   mv .ai/cockpit/active-task.json.tmp .ai/cockpit/active-task.json
   ```
```

### Step 3: Update task-resume.md to Read New Schema

**File**: `.ai/_framework/commands/task-resume.md`

**Location**: Add after reading task context

**Instructions**:
Add repo context announcement:

```markdown
### Repository Context

Read `active-task.json` and announce repository information:

```
REPOSITORY CONTEXT

Active repos for this task:
{for each repo in affectedRepos}
  {if protected}
  ⛔ {name} (PROTECTED - read only)
     Path: {absolutePath}
  {else}
  ✓ {name}
     Path: {absolutePath}
     Branch: {branch}
  {/if}
{/for}

Current work repo: {currentWorkRepo}
```
```

### Step 4: Add Backward Compatibility

**File**: `.ai/_framework/commands/task-start.md`

**Instructions**:
Keep the deprecated `branch` field for tools that haven't updated:

```markdown
**Backward Compatibility**:

The `branch` field is kept at the root level for backward compatibility
with tools that read it directly. New code should use `affectedRepos[].branch`.

If `affectedRepos` is empty or missing, tools should fall back to:
- `branch` field for git branch name
- Manifest `repos` for paths
```

## Post-Implementation

Verify the schema is valid JSON and can be parsed by VSCode extension.

## Acceptance Criteria

- [ ] Schema documented in architecture docs
- [ ] task-start.md writes new schema format
- [ ] task-resume.md reads and announces repo context
- [ ] Backward compatibility maintained with `branch` field
- [ ] Example shows nested repo scenario

## Testing

1. Run `/task-start` on a task
2. Check `.ai/cockpit/active-task.json` has new fields
3. Verify `absolutePath` is correct
4. Run `/task-resume` and see repo context announced

## Notes

This is the central piece - WI-05 (git guardrails) depends on this schema.
