<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /ai-sync                                                ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Sync .ai/ folder with git repository                    ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /ai-sync - Sync AI Framework Repository

## Description

Sync the `.ai/` folder with its git repository. Commits local changes, pushes to origin, pulls updates, and merges the main branch for framework updates.

This command manages the `.ai-framework/` git repository that contains your `.ai/` content.

## Usage

```
/ai-sync                           # Full sync (commit, push, pull, merge main)
/ai-sync --message "my message"    # Custom commit message
/ai-sync --pull-only               # Only pull updates, don't commit/push
/ai-sync --push-only               # Only commit and push, don't pull
```

## Prerequisites

The project must have `.ai/` set up as a symlink to a git repository:
```
project/
├── .ai -> .ai-framework/.ai       # Symlink
└── .ai-framework/                 # Git repository
    ├── .git/
    └── .ai/
```

## Workflow

```
1. VERIFY SETUP
   • Check .ai-framework/ exists and is a git repo
   • Identify current branch

2. CHECK STATUS
   • Run git status to see changes
   • Report what will be committed

3. COMMIT CHANGES (if any)
   • Stage all changes in .ai/
   • Commit with message (auto or custom)

4. PULL FROM ORIGIN
   • Pull current branch from origin
   • Handle merge conflicts if any

5. MERGE MAIN (framework updates)
   • Fetch main branch
   • Merge main into current branch
   • Handle conflicts if any

6. PUSH TO ORIGIN
   • Push current branch to origin

7. REPORT STATUS
   • Show what was synced
   • Show current state
```

## Implementation

### Step 0: Orientation

Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ AI-SYNC                                                          ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 1: Verify Setup

Check that the git repository exists:

```bash
# Find the .ai-framework directory (relative to project root)
# It should be at the same level as .ai symlink
```

**If `.ai-framework/` doesn't exist:**
```
ERROR: .ai-framework/ directory not found.

This command requires .ai/ to be set up as a git repository.
Expected structure:
  project/.ai-framework/    ← Git repo
  project/.ai -> .ai-framework/.ai

Run /init or manually set up the git repository.
```

**If not a git repo:**
```
ERROR: .ai-framework/ is not a git repository.

Initialize it with:
  git -C .ai-framework init
  git -C .ai-framework remote add origin <url>
```

### Step 2: Check Current State

```bash
git -C .ai-framework status
git -C .ai-framework branch -v
```

Output:
```
CURRENT STATE

Branch: {branch-name}
Remote: {origin-url}

Changes:
  {list of modified/added/deleted files}

  OR

  No uncommitted changes.
```

### Step 3: Parse Arguments

- `--message "text"` → Use custom commit message
- `--pull-only` → Skip commit/push, only pull and merge
- `--push-only` → Skip pull/merge, only commit and push
- No args → Full sync

### Step 4: Commit Changes

**If `--pull-only`, skip this step.**

**If no changes:**
```
No changes to commit.
```

**If changes exist:**

Generate commit message (if not provided):
```
Auto-generated based on changes:
- "docs: update {file}" for single file
- "docs: update documentation" for multiple doc changes
- "tasks: update {task-id}" for task changes
- "sync: update .ai content" for mixed changes
```

Execute:
```bash
git -C .ai-framework add -A
git -C .ai-framework commit -m "{message}"
```

Output:
```
COMMITTED

  {commit hash} {message}

  Files:
    • {file1}
    • {file2}
```

### Step 5: Pull from Origin

**If `--push-only`, skip this step.**

```bash
git -C .ai-framework pull origin {current-branch}
```

**If conflicts:**
```
CONFLICT: Merge conflicts detected.

Conflicting files:
  • {file1}
  • {file2}

Please resolve conflicts manually in .ai-framework/ and run /ai-sync again.
```

Then stop.

**If successful:**
```
PULLED

  {number} commits from origin/{branch}

  OR

  Already up to date.
```

### Step 6: Merge Main Branch

**If `--push-only`, skip this step.**

**If already on main, skip this step.**

```bash
git -C .ai-framework fetch origin main
git -C .ai-framework merge origin/main -m "merge: framework updates from main"
```

**If conflicts:**
```
CONFLICT: Merge conflicts with main branch.

Conflicting files:
  • {file1}
  • {file2}

Please resolve conflicts manually in .ai-framework/ and run /ai-sync again.
```

Then stop.

**If successful:**
```
MERGED MAIN

  Framework updates merged successfully.

  OR

  Already up to date with main.
```

### Step 7: Push to Origin

**If `--pull-only`, skip this step.**

```bash
git -C .ai-framework push origin {current-branch}
```

**If push fails (remote has changes):**
```
PUSH FAILED

Remote has changes. Run /ai-sync --pull-only first, then try again.
```

**If successful:**
```
PUSHED

  {branch} → origin/{branch}
```

### Step 8: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ AI-SYNC COMPLETE                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║ Branch: {branch}                                                 ║
║                                                                  ║
║ Actions:                                                         ║
║   ✓ Committed {n} files                                         ║
║   ✓ Pulled from origin                                          ║
║   ✓ Merged main (framework updates)                             ║
║   ✓ Pushed to origin                                            ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

Then stop. Do not proceed further.

## Error Handling

### Remote not configured
```
ERROR: No remote 'origin' configured.

Add a remote:
  git -C .ai-framework remote add origin <git-url>
```

### Authentication failed
```
ERROR: Authentication failed.

Check your git credentials for the remote repository.
```

### Not on a branch
```
ERROR: HEAD is detached.

Checkout a branch:
  git -C .ai-framework checkout deel
```
