

> Parent: [[manifest]]
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

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ ⛔ DO NOT EDIT APPLICATION CODE                                 │
│                                                                 │
│ ALLOWED:  Git operations on .ai/ folder ONLY                    │
│ FORBIDDEN: Create, edit, or delete application source code      │
│ FORBIDDEN: Git operations on files outside .ai/                 │
│ TEMP FILES: Scratch/temporary output goes in .ai/tmp/           │
│                                                                 │
│ This command syncs the .ai/ folder with git only.               │
│ It must NEVER modify or commit application source code.         │
│ If you find yourself staging non-.ai/ files, STOP.              │
└─────────────────────────────────────────────────────────────────┘

This command supports two modes:
- **Standalone mode**: `.ai-framework/` git repository with `.ai` as symlink
- **Embedded mode**: `.ai/` as a regular directory within the main project repo

## Usage

```
/ai-sync                           # Full sync (commit, push, pull, merge main)
/ai-sync --message "my message"    # Custom commit message
/ai-sync --pull-only               # Only pull updates, don't commit/push
/ai-sync --push-only               # Only commit and push, don't pull
```

## Supported Configurations

### Standalone Mode (separate repo)
```
project/
├── .ai -> .ai-framework/.ai       # Symlink
└── .ai-framework/                 # Git repository
    ├── .git/
    └── .ai/
```

### Embedded Mode (within project repo)
```
project/
├── .git/                          # Main project git repo
└── .ai/                           # Regular directory (tracked by main repo)
```

## Workflow

```
1. DETECT MODE
   • Check if .ai-framework/ exists → Standalone mode
   • Otherwise check if .ai/ is in a git repo → Embedded mode
   • Determine GIT_DIR and PATH_PREFIX accordingly

2. CHECK STATUS
   • Run git status to see .ai/ changes
   • Report what will be committed

3. COMMIT CHANGES (if any)
   • Stage all changes in .ai/
   • Commit with message (auto or custom)

4. PULL FROM ORIGIN
   • Pull current branch from origin
   • Handle merge conflicts if any

5. MERGE MAIN (framework updates) [Standalone mode only]
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

1. **Extension Support**: This command supports compiled extensions
   via `/command-extend ai-sync --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

2. Announce:
   ```
   ╔══════════════════════════════════════════════════════════════════╗
   ║ AI-SYNC                                                          ║
   ╚══════════════════════════════════════════════════════════════════╝
   ```

### Step 1: Detect Mode and Verify Setup

Detect which mode the project uses:

```bash
# Check for standalone mode first
if [ -d ".ai-framework" ] && [ -d ".ai-framework/.git" ]; then
    MODE="standalone"
    GIT_DIR=".ai-framework"
    PATH_PREFIX=""
# Check for embedded mode (main project is a git repo with .ai/ directory)
elif [ -d ".git" ] && [ -d ".ai" ]; then
    MODE="embedded"
    GIT_DIR="."
    PATH_PREFIX=".ai/"
else
    # No valid configuration found
    MODE="none"
fi
```

**Output the detected mode:**
```
MODE: {standalone|embedded}

Standalone: .ai-framework/ is a separate git repository
Embedded: .ai/ is tracked within the main project repository
```

**If no valid configuration found:**
```
ERROR: No valid git configuration found for .ai/

Expected one of:
  1. Standalone: .ai-framework/ directory with .git/
  2. Embedded: Project root has .git/ and .ai/ directory

Run /init or manually set up the git repository.
```

**If git repo exists but no remote configured:**
```
WARNING: No remote 'origin' configured.

Add a remote to enable push/pull:
  git remote add origin <git-url>

Continuing with local-only sync...
```

### Step 2: Check Current State

```bash
# For standalone mode:
git -C $GIT_DIR status
git -C $GIT_DIR branch -v

# For embedded mode, filter to .ai/ changes only:
git status -- .ai/
git branch -v
```

Output:
```
CURRENT STATE

Mode: {standalone|embedded}
Branch: {branch-name}
Remote: {origin-url}

Changes in .ai/:
  {list of modified/added/deleted files}

  OR

  No uncommitted changes in .ai/
```

### Step 3: Parse Arguments

- `--message "text"` → Use custom commit message
- `--pull-only` → Skip commit/push, only pull and merge
- `--push-only` → Skip pull/merge, only commit and push
- No args → Full sync

### Step 4: Commit Changes

**If `--pull-only`, skip this step.**

**If no changes in .ai/:**
```
No changes to commit in .ai/
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
# For standalone mode:
git -C .ai-framework add -A
git -C .ai-framework commit -m "{message}"

# For embedded mode (only stage .ai/ changes):
git add .ai/
git commit -m "{message}"
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

**If no remote configured, skip this step with warning.**

```bash
# For standalone mode:
git -C .ai-framework pull origin {current-branch}

# For embedded mode:
git pull origin {current-branch}
```

**If conflicts:**
```
CONFLICT: Merge conflicts detected.

Conflicting files:
  • {file1}
  • {file2}

Please resolve conflicts manually and run /ai-sync again.
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

**STANDALONE MODE ONLY - Skip entirely for embedded mode.**

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

**For embedded mode:**
```
MERGE MAIN: Skipped (embedded mode)

  In embedded mode, .ai/ is part of the main project.
  Framework updates come through normal project git workflow.
```

### Step 7: Push to Origin

**If `--pull-only`, skip this step.**

**If no remote configured, skip this step with warning.**

```bash
# For standalone mode:
git -C .ai-framework push origin {current-branch}

# For embedded mode:
git push origin {current-branch}
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
║ Mode: {standalone|embedded}                                      ║
║ Branch: {branch}                                                 ║
║                                                                  ║
║ Actions:                                                         ║
║   ✓ Committed {n} files                                         ║
║   ✓ Pulled from origin                                          ║
║   ✓ Merged main (framework updates)  [standalone only]          ║
║   ✓ Pushed to origin                                            ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

Then stop. Do not proceed further.

## Error Handling

### Remote not configured
```
WARNING: No remote 'origin' configured.

For standalone mode:
  git -C .ai-framework remote add origin <git-url>

For embedded mode:
  git remote add origin <git-url>

Continuing with local-only operations...
```

### Authentication failed
```
ERROR: Authentication failed.

Check your git credentials for the remote repository.
```

### Not on a branch
```
ERROR: HEAD is detached.

Checkout a branch first:
  git checkout <branch-name>
```

### No .ai/ directory
```
ERROR: No .ai/ directory found.

Run /init to set up the AI framework for this project.
```
