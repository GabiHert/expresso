---
type: work-item
id: "02"
parent: LOCAL-026
title: Update task-start branch creation
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

> Parent: [[LOCAL-026]]


# Update [[task-start]] Branch Creation

## Objective

Modify `/task-start` to skip branch creation for protected repos and store absolute paths for non-protected repos.

## Pre-Implementation

Review `.ai/_framework/commands/task-start.md` lines 234-258 (branch creation section).

## Implementation Steps

### Step 1: Add Protected Repo Check

**File**: `.ai/_framework/commands/task-start.md`

**Location**: Replace lines 234-258 (Step 5: Prepare Branches or Worktrees)

**Instructions**:
Add filtering logic to skip protected repos:

```markdown
### Step 5: Prepare Branches or Worktrees

**First, identify protected repos:**

Read `manifest.yaml` and separate repos into:
- Protected repos: `protected: true` - NEVER modify git state
- Work repos: `protected: false` or not specified - can create branches

**Show protection status:**
```
REPOSITORY PROTECTION STATUS

Protected (git operations blocked):
  ⛔ ai-framework (locked to: project/ai-cockpit)

Available for branch creation:
  ✓ backend
  ✓ frontend
```

**If `--worktree` mode AND `conventions.worktrees.enabled`:**

{existing worktree logic, but ONLY for non-protected repos}

**Otherwise (normal branch mode):**

For each affected repo WHERE `protected != true`, offer to create the branch:
```
BRANCHES

The following branches will be created (protected repos excluded):

  {repo}: git checkout -b {branch-name}
  {repo}: git checkout -b {branch-name}

⛔ Skipped (protected):
  ai-framework (stays on: project/ai-cockpit)

Would you like me to create these branches now? (y/n)
```

**If yes**, for each non-protected repo:
1. **Resolve absolute path** from manifest (relative to project.root)
2. Navigate to the repo directory using absolute path
3. **Verify git root** matches expected:
   ```bash
   cd {absolute_path}
   actual_root=$(git rev-parse --show-toplevel)
   if [ "$actual_root" != "{expected_git_root}" ]; then
     echo "ERROR: Git root mismatch. Expected {expected_git_root}, got $actual_root"
     exit 1
   fi
   ```
4. Ensure on main/master branch and up to date
5. Create the feature branch:
   ```bash
   git checkout main && git pull
   git checkout -b {conventions.branches.pattern}
   ```
6. **Store the created branch info** for later use in active-task.json
```

### Step 2: Add Absolute Path Resolution Helper

**File**: `.ai/_framework/commands/task-start.md`

**Location**: Add after Step 0 (Orientation)

**Instructions**:
Add path resolution guidance:

```markdown
### Path Resolution

When working with repos from manifest:

1. If `path` is relative (starts with `./`):
   - Resolve against `project.root` from manifest
   - Example: `./backend` + `/Users/gabi/deel` = `/Users/gabi/deel/backend`

2. If `path` is absolute:
   - Use as-is

3. If `git_root` is specified:
   - Use it for git operations (handles nested repos)
   - Otherwise assume `git_root` = resolved `path`

**Store resolved paths** in the affectedRepos array for active-task.json.
```

### Step 3: Update Error Messages

**File**: `.ai/_framework/commands/task-start.md`

**Instructions**:
Add clear error message when attempting protected repo operation:

```markdown
**If user attempts to force branch in protected repo:**

```
⛔ PROTECTED REPO - OPERATION BLOCKED

Cannot create branch in 'ai-framework':
  • This repo is marked as protected: true
  • It is locked to branch: project/ai-cockpit
  • Task branches must be created in work repos only

This protection prevents accidental commits to the framework repo
when working on nested repositories.
```
```

## Post-Implementation

Run through `/task-start` mentally with a protected and non-protected repo scenario.

## Acceptance Criteria

- [ ] Protected repos are identified and skipped
- [ ] Clear message shows which repos are protected vs available
- [ ] Absolute paths are resolved before git operations
- [ ] Git root is verified before creating branches
- [ ] Created branch info is stored for active-task.json

## Testing

1. Add a test repo to manifest with `protected: true`
2. Run `/task-start` on a task affecting that repo
3. Verify no branch is created in protected repo
4. Verify branch IS created in non-protected repos

## Notes

This work item depends on WI-01 (manifest schema) being complete.
