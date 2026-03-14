---
type: work-item
id: "05"
parent: LOCAL-026
title: Add git guardrails to task-work
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

> Parent: [[LOCAL-026]]


# Add Git Guardrails to [[task-work]]

## Objective

Add mandatory verification steps before any git operation in `/task-work` to prevent commits to wrong repos, especially in nested repo scenarios.

## Pre-Implementation

Review `.ai/_framework/commands/task-work.md` lines 298-315 (Step 9: Offer Commit).

## Implementation Steps

### Step 1: Add Pre-Git Verification Section

**File**: `.ai/_framework/commands/task-work.md`

**Location**: Add new step BEFORE Step 9 (Offer Commit)

**Instructions**:
Add mandatory verification:

```markdown
### Step 8.5: Pre-Git Verification (MANDATORY)

Before any git operation, you MUST verify you're in the correct repository:

**1. Read active-task.json:**
```bash
cat .ai/cockpit/active-task.json
```

**2. Identify target repo from current work item:**
- Get `repo` from work item YAML frontmatter
- Find matching entry in `affectedRepos` array
- Get `absolutePath` and `gitRoot`

**3. Navigate and verify:**
```bash
# Navigate to the ABSOLUTE path
cd {absolutePath}

# Verify git root matches
ACTUAL_ROOT=$(git rev-parse --show-toplevel)
EXPECTED_ROOT="{gitRoot}"

if [ "$ACTUAL_ROOT" != "$EXPECTED_ROOT" ]; then
  echo "⛔ GIT ROOT MISMATCH"
  echo "Expected: $EXPECTED_ROOT"
  echo "Actual: $ACTUAL_ROOT"
  echo ""
  echo "You may be in a nested repo. Aborting git operation."
  exit 1
fi

# Verify correct branch
CURRENT_BRANCH=$(git branch --show-current)
EXPECTED_BRANCH="{branch from affectedRepos}"

if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
  echo "⚠️ BRANCH MISMATCH"
  echo "Expected: $EXPECTED_BRANCH"
  echo "Actual: $CURRENT_BRANCH"
  echo ""
  echo "Switch to correct branch before proceeding."
fi

# Verify remote
git remote -v | grep origin
```

**4. Show verification result:**
```
GIT CONTEXT VERIFIED

Repository: {repo}
Path: {absolutePath}
Git Root: ✓ Matches expected
Branch: {branch}
Remote: origin → {remoteUrl}

Ready for git operations.
```

**5. If verification fails:**
```
⛔ GIT CONTEXT VERIFICATION FAILED

Cannot proceed with git operations. Issues found:
  • {list issues}

Please manually verify your working directory and try again.
```

STOP and do not proceed with git operations if verification fails.
```

### Step 2: Update Commit Section with Path Awareness

**File**: `.ai/_framework/commands/task-work.md`

**Location**: Lines 298-315 (Step 9: Offer Commit)

**Replace with**:
```markdown
### Step 9: Offer Commit

**IMPORTANT**: All git commands must be run from the verified repo path.

If changes were made:
```
COMMIT

Repository: {repo}
Path: {absolutePath}
Branch: {branch}

Would you like to commit these changes?

Files changed:
  • {file1}
  • {file2}

Suggested message: {type}({scope}): {description}

Commit now? (y/n)
```

**If yes**, run git commands using absolute path:
```bash
cd {absolutePath}

# Verify one more time
pwd
git rev-parse --show-toplevel

# Stage and commit
git add {files}
git commit -m "{message}"
```

**If the repo is protected** (check `affectedRepos[].protected`):
```
⛔ COMMIT BLOCKED - PROTECTED REPO

{repo} is marked as protected in manifest.yaml.
Changes cannot be committed to this repo via task workflow.

If you need to make changes here, commit manually after
careful review.
```
```

### Step 3: Add Protection Check for All Git Operations

**File**: `.ai/_framework/commands/task-work.md`

**Location**: Add near the top of Implementation section

**Instructions**:
Add a reminder box:

```markdown
```
┌─────────────────────────────────────────────────────────────────┐
│ GIT SAFETY CHECKLIST                                            │
│                                                                 │
│ Before ANY git operation (add, commit, push, checkout):         │
│                                                                 │
│ 1. Read active-task.json for repo paths                         │
│ 2. cd to {absolutePath} from affectedRepos                      │
│ 3. Verify: git rev-parse --show-toplevel                        │
│ 4. Verify: git remote -v (correct remote?)                      │
│ 5. Check: Is repo protected? If yes, STOP.                      │
│                                                                 │
│ NEVER run git commands from the project root when working       │
│ on nested repos - you'll commit to the wrong repo!              │
└─────────────────────────────────────────────────────────────────┘
```
```

### Step 4: Update Autopilot Mode Safety

**File**: `.ai/_framework/commands/task-work.md`

**Location**: Autopilot section (around line 383)

**Instructions**:
Add verification to autopilot execution:

```markdown
**Execution flow per item (autopilot):**
1. Launch code-explorer agent for context
2. Move work item to in_progress/
3. **PRE-GIT VERIFICATION** (same as Step 8.5)
4. Read and implement all steps from work item file
5. **VERIFY GIT CONTEXT AGAIN** before commit
6. Launch code-reviewer agent
7. If review passes: commit and move to done/
8. Update status.yaml after each item

**If git verification fails in autopilot:**
- STOP autopilot immediately
- Report which repo had the issue
- Do NOT attempt to auto-fix
```

## Post-Implementation

Review the full [[task-work]].md flow to ensure verification is called at all git touchpoints.

## Acceptance Criteria

- [ ] Pre-git verification step added before commits
- [ ] Verification checks absolutePath, gitRoot, and branch
- [ ] Clear error message on verification failure
- [ ] Protected repo check blocks commits
- [ ] Autopilot mode includes verification
- [ ] Git safety checklist visible in command docs

## Testing

1. Create a task with nested repo scenario
2. Run `/task-work` and intentionally be in wrong directory
3. Verify the verification step catches the mismatch
4. Test protected repo blocking

## Notes

This is the critical safety feature. It depends on WI-04 (active-task.json schema).
