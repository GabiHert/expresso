---
type: work-item
id: "03"
parent: LOCAL-026
title: Update task-create to exclude protected repos
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

# Update task-create to Exclude Protected Repos

## Objective

Modify `/task-create` to exclude protected repos from the Branches table in generated task READMEs, preventing any suggestion that branches should be created in protected repos.

## Pre-Implementation

Review `.ai/_framework/commands/task-create.md` lines 325-331 (Branches section generation).

## Implementation Steps

### Step 1: Filter Protected Repos from Branches Table

**File**: `.ai/_framework/commands/task-create.md`

**Location**: Lines 325-331 (inside Step 7c: Create README.md)

**Current code**:
```markdown
## Branches

| Repo | Branch |
|------|--------|
{for each affected repo}
| {repo} | `{ticket-id}-{short-description}` |
{/for}
```

**Replace with**:
```markdown
## Branches

| Repo | Path | Branch |
|------|------|--------|
{for each affected repo WHERE protected != true}
| {repo} | `{absolute_path}` | `{ticket-id}-{short-description}` |
{/for}

{if any protected repos in affected list}
**Protected Repos (no branches created):**
{for each affected repo WHERE protected == true}
- {repo} - stays on `{locked_branch}`
{/for}
{/if}
```

### Step 2: Update Status.yaml Generation

**File**: `.ai/_framework/commands/task-create.md`

**Location**: Lines 392-399 (work_items section in status.yaml)

**Instructions**:
Add repo metadata to work items:

```yaml
work_items:
{for each work item}
  - id: "{id}"
    name: "{name}"
    repo: "{repo}"
    repo_path: "{absolute_path}"      # NEW: resolved absolute path
    repo_protected: {true|false}      # NEW: protection status
    status: todo
    file: "todo/{id}-{slug}.md"
{/for}
```

### Step 3: Update Output Summary

**File**: `.ai/_framework/commands/task-create.md`

**Location**: Lines 497-499 (Branches to Create section in output)

**Current code**:
```markdown
Branches to Create:
  {repo}: git checkout -b {branch-name}
```

**Replace with**:
```markdown
Branches to Create:
{for each non-protected repo}
  {repo}: cd {absolute_path} && git checkout -b {branch-name}
{/for}

{if protected repos exist}
Protected (no branches):
  {protected_repo}: stays on {locked_branch}
{/if}
```

### Step 4: Add Protection Warning During Repo Selection

**File**: `.ai/_framework/commands/task-create.md`

**Location**: Step 2 (Gather Context), after asking which repos

**Instructions**:
Add validation when user selects repos:

```markdown
**After user specifies affected repos:**

Check each specified repo against manifest:
- If repo has `protected: true`:
  ```
  Note: {repo} is a protected repo (no task branches will be created there).
  Work items can still target this repo for documentation/config changes
  that will be committed to the existing branch.

  Continue? (y/n)
  ```
```

## Post-Implementation

Verify the task-create command generates correct README with protected repos excluded from branches table.

## Acceptance Criteria

- [ ] Branches table only shows non-protected repos
- [ ] Absolute paths included in Branches table
- [ ] Protected repos listed separately with explanation
- [ ] status.yaml includes repo_path and repo_protected
- [ ] Output summary shows correct branch commands with paths
- [ ] Warning shown when protected repo is selected

## Testing

1. Run `/task-create` for a task affecting both ai-framework and another repo
2. Verify generated README shows ai-framework in "Protected" section
3. Verify only non-protected repos have branch commands

## Notes

This work item can be done in parallel with WI-02 after WI-01 is complete.
