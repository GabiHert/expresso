---
type: work-item
id: "06"
parent: LOCAL-026
title: Update work-item template
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

> Parent: [[LOCAL-026]]


# Update Work-Item Template

## Objective

Enhance the [[work-item]] template to include explicit repository path and branch information in the YAML frontmatter, so agents always have context about where to work.

## Pre-Implementation

Review `.ai/_framework/templates/work-item.md` lines 15-17 (YAML frontmatter).

## Implementation Steps

### Step 1: Update Work-Item Template

**File**: `.ai/_framework/templates/work-item.md`

**Current frontmatter (lines 15-17)**:
```yaml
---
repo: {repo-name}
---
```

**Replace with**:
```yaml
---
# Repository Context
repo: {repo-name}
repo_path: {absolute-path}           # Resolved at task-create time
branch: {branch-name}                # Branch for this work item
protected: {true|false}              # From manifest

# Git Safety Reminder
# Before any git operation:
#   1. cd {repo_path}
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---
```

### Step 2: Add Header Reminder Box

**File**: `.ai/_framework/templates/work-item.md`

**Location**: After the YAML frontmatter, before the title

**Instructions**:
Add a visible reminder:

```markdown
<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: {number}-{name}.md                                    ║
║ TASK: {task-name}                                                ║
╠══════════════════════════════════════════════════════════════════╣
║ GIT CONTEXT:                                                     ║
║   Repo: {repo}                                                   ║
║   Path: {repo_path}                                              ║
║   Branch: {branch}                                               ║
║                                                                  ║
║ BEFORE GIT OPERATIONS:                                           ║
║   cd {repo_path} && git rev-parse --show-toplevel               ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->
```

### Step 3: Update [[task-create]].md Work Item Generation

**File**: `.ai/_framework/commands/task-create.md`

**Location**: Lines 420-424 (work item file creation)

**Instructions**:
Update the work item generation to include new fields:

```markdown
**7e. Create work item files** in `todo/`:
For each work item, create `{id}-{slug}.md`:

1. Get repo info from manifest (path, protected status)
2. Resolve absolute path
3. Get branch from task branches table

```markdown
---
# Repository Context
repo: {repo}
repo_path: {absolute_path}
branch: {branch_name}
protected: {true|false}

# Git Safety Reminder
# Before any git operation:
#   1. cd {repo_path}
#   2. Verify: git rev-parse --show-toplevel
#   3. Verify: git branch --show-current
---

# {Work Item Title}
...
```
```

### Step 4: Update [[task-work]].md to Use New Fields

**File**: `.ai/_framework/commands/task-work.md`

**Location**: Step 3 (Read Work Item)

**Instructions**:
Read and use the new frontmatter fields:

```markdown
### Step 3: Read Work Item

1. Read the work item file completely.

2. **Parse YAML frontmatter for repo context:**
   ```yaml
   repo: backend
   repo_path: /Users/gabi/Projects/deel/backend
   branch: JIRA-123-fix-validation
   protected: false
   ```

3. **Validate against active-task.json:**
   - Ensure `repo` exists in `affectedRepos`
   - Verify `repo_path` matches `absolutePath`
   - Check `protected` status

4. Announce understanding with repo context:
```
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: {id} - {name}                                         ║
║ REPO: {repo}                                                     ║
║ PATH: {repo_path}                                                ║
║ BRANCH: {branch}                                                 ║
╠══════════════════════════════════════════════════════════════════╣

OBJECTIVE
{summarize the objective}

IMPLEMENTATION STEPS
  1. {step 1 summary}
  2. {step 2 summary}
  ...

{if protected}
⚠️ NOTE: This is a protected repo. Git operations will be blocked.
{/if}
```
```

### Step 5: Add Migration Note

**File**: `.ai/_framework/templates/work-item.md`

**Location**: Add at bottom

**Instructions**:
Add note about existing work items:

```markdown
<!--
MIGRATION NOTE:
Existing work items may only have `repo:` field.
When reading old work items:
1. Fall back to manifest for path resolution
2. Fall back to active-task.json for branch info
3. Assume protected: false if not specified
-->
```

## Post-Implementation

Verify template renders correctly and fields are populated during [[task-create]].

## Acceptance Criteria

- [ ] Work-item template has repo_path, branch, protected fields
- [ ] Header box shows git context clearly
- [ ] task-create.md populates new fields
- [ ] [[task-work]].md reads and uses new fields
- [ ] Migration note handles old work items

## Testing

1. Run `/task-create` for a new task
2. Check generated work items have all new fields
3. Verify paths are absolute and correct
4. Run `/task-work` and confirm context is shown

## Notes

This is the final piece that ensures every work item carries its full context.
Can be done after WI-01, WI-03, and WI-04.
