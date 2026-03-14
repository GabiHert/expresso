

> Parent: [[manifest]]
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

---
repo: "{repo-name}"
repo_path: "{absolute-path}"
branch: "{branch-name}"
protected: false
---

# {Work Item Title}

## Objective

What this specific work item accomplishes.

## Pre-Implementation

Before starting, consider running an **exploration agent** to gather context about the affected code areas.

## Implementation Steps

### Step 1: {Step Name}

**File**: `path/to/file.ts`

**Instructions**:
[Detailed instructions]

**Reference**: Similar implementation at `other/file.ts:45-67`

### Step 2: {Step Name}

...

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Specific criterion for this work item

## Testing

How to verify this work item is complete.

## Notes

Any additional context or warnings.
