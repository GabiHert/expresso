

> Parent: [[commands-index]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /task-review                                            ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Code review workflow                                    ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /task-review - Code Review Workflow

## Description

Run code review on changes for a task. Analyzes all modified files across repositories and reports issues by severity.

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ ⛔ DO NOT EDIT APPLICATION CODE                                 │
│                                                                 │
│ ALLOWED:  Read any file. Write ONLY to .ai/tasks/*/feedback/    │
│ FORBIDDEN: Create, edit, or delete files outside .ai/           │
│ TEMP FILES: Scratch/temporary output goes in .ai/tmp/           │
│                                                                 │
│ This command reviews code and reports findings. It must NEVER    │
│ modify application source code, tests, or config. Code fixes    │
│ happen in /[[task-work]], not here. If you find yourself editing     │
│ code files, STOP — you are off track.                           │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/task-review              # Review current in_progress task
/task-review JIRA-123     # Review specific task
/task-review --staged     # Review only staged changes
/task-review --cross      # Include cross-service review for multi-repo tasks
```

## Workflow

```
1. IDENTIFY CHANGES
   • Find all modified files across repos
   • Get git diff for each repo

2. LAUNCH REVIEWERS
   • Use feature-dev:code-reviewer agent
   • Review for bugs, security, patterns

3. COMPILE FEEDBACK
   • Aggregate issues by severity
   • Group by file/repo

4. OUTPUT REPORT
   • List issues found
   • Suggest fixes
   • Mark blocking vs non-blocking
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand:
   - Available repositories and their paths
   - Code conventions and patterns
   - Available review agents

2. **Extension Support**: This command supports compiled extensions
   via `/command-extend task-review --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

### Step 1: Identify Task and Changes

**If task ID provided:**
- Find task in `.ai/tasks/in_progress/{task-id}/` or `.ai/tasks/done/{task-id}/`
- Read task README.md to identify affected repos

**If no task ID provided:**
- Look for current in_progress task
- If none found, ask: "No task in progress. Would you like to review uncommitted changes? (y/n)"

**Get changed files:**

For each affected repository:
```bash
cd {repo.path}

# Get branch name from task
git diff --name-only main...HEAD    # All changes on branch
# OR
git diff --name-only                 # Uncommitted changes
# OR (if --staged)
git diff --name-only --staged       # Staged changes only
```

If no changes found:
```
No changes found to review.

Options:
  1. Review all files in a specific directory
  2. Review specific files
  3. Cancel

Choice?
```

### Step 2: Announce Scope

```
╔══════════════════════════════════════════════════════════════════╗
║ CODE REVIEW                                                      ║
╚══════════════════════════════════════════════════════════════════╝

Task: {task-id} - {title}

Reviewing {count} files across {repo-count} repos:

{repo-name}:
  • {file1}
  • {file2}
  ...

{repo-name}:
  • {file1}
  ...

Starting review...
```

### Step 3: Launch Code Reviewer

For the changed files, launch a code review agent:

```
Review the following code changes for:

1. BUGS & LOGIC ERRORS
   - Off-by-one errors
   - Null/undefined handling
   - Race conditions
   - Incorrect conditionals

2. SECURITY ISSUES
   - SQL/Command injection
   - XSS vulnerabilities
   - Hardcoded secrets
   - Insecure data handling

3. CODE QUALITY
   - Unclear naming
   - Missing error handling
   - Duplicated code
   - Poor separation of concerns

4. PATTERN ADHERENCE
   - Follow project conventions
   - Consistent with existing code
   - Proper use of framework features

5. TESTING
   - Missing test coverage
   - Edge cases not covered
   - Test quality issues

Files to review:
{list of changed files with content}

Project conventions:
{conventions from manifest}
```

### Step 4: Compile Report

Organize findings by severity:

**Blocking Issues**: Must fix before merging
- Security vulnerabilities
- Bugs that will cause failures
- Breaking changes without migration

**Important Issues**: Should fix
- Missing error handling
- Performance concerns
- Test gaps

**Suggestions**: Nice to have
- Code style improvements
- Refactoring opportunities
- Documentation additions

**Passed Checks**: Things that look good
- Security best practices followed
- Conventions respected
- Tests adequate

### Step 5: Cross-Service Review (Multi-Repo Tasks)

**Trigger conditions:**
- Task affects multiple repositories (check task README), OR
- `--cross` flag is specified

**If cross-service review is needed:**

Launch a dedicated cross-service review agent:

```
Cross-service review for task: {task-id}

Services Involved:
{for each affected repo}
  - {repo}: {summary of changes from exploration}
{/for}

Review for cross-service issues:

1. API CONTRACT ALIGNMENT
   - Are request/response types consistent between caller and callee?
   - Are error codes handled the same way?
   - Do DTOs match across service boundaries?

2. DATA CONSISTENCY
   - Are database changes coordinated across services?
   - Are there potential race conditions between services?
   - Is data validation consistent at each layer?

3. DEPLOYMENT ORDER
   - Can changes be deployed independently?
   - Is there a required deployment order?
   - Are there breaking changes that need coordination?

4. INTEGRATION POINTS
   - Are event payloads consistent (if using messaging)?
   - Are HTTP calls properly configured?
   - Are timeouts and retries appropriate?
   - Are circuit breakers configured correctly?

5. SHARED DEPENDENCIES
   - Are shared libraries/packages version-compatible?
   - Are schema changes backward-compatible?

Report any cross-service issues with:
  - Severity (Blocking/Important/Suggestion)
  - Affected services
  - Specific concern
  - Recommended fix
```

**Cross-Service Report Section:**
```
CROSS-SERVICE REVIEW
══════════════════════════════════════════════════════════════════

Services: {repo1} ↔ {repo2}

{if issues found}
  ⚠ API Contract: {issue description}
    {repo1}/file.ts ← expects X
    {repo2}/file.ts → returns Y

  ⚠ Deployment Order: {issue}
    Recommendation: Deploy {repo1} before {repo2}

  ✓ Data Consistency: Validated
  ✓ Shared Dependencies: Compatible
{else}
  ✓ All cross-service checks passed
{/if}
```

### Step 6: Output Report

```
╔══════════════════════════════════════════════════════════════════╗
║ CODE REVIEW: {task-id}                                           ║
╠══════════════════════════════════════════════════════════════════╣
{if blocking issues}
║ BLOCKING ({count})                                               ║
{for each issue}
║ ├─ {file}:{line}                                                 ║
║ │   {issue description}                                          ║
║ │   Suggestion: {how to fix}                                     ║
{/for}
║                                                                   ║
{/if}
{if important issues}
║ IMPORTANT ({count})                                              ║
{for each issue}
║ ├─ {file}:{line}                                                 ║
║ │   {issue description}                                          ║
{/for}
║                                                                   ║
{/if}
{if suggestions}
║ SUGGESTIONS ({count})                                            ║
{for each issue}
║ ├─ {file}:{line} - {brief description}                           ║
{/for}
║                                                                   ║
{/if}
{if passed checks}
║ PASSED                                                           ║
{for each check}
║ ├─ ✓ {check description}                                         ║
{/for}
{/if}
{if multi-repo or --cross}
║                                                                   ║
║ CROSS-SERVICE                                                    ║
║ ├─ {✓/⚠} API contracts: {status}                                ║
║ ├─ {✓/⚠} Data consistency: {status}                             ║
║ ├─ {✓/⚠} Deployment order: {recommendation}                     ║
{/if}
╚══════════════════════════════════════════════════════════════════╝
```

### Step 7: Offer to Fix Issues

If blocking or important issues found:
```
ACTIONS

Would you like me to:
  1. Fix blocking issues automatically
  2. Fix all issues (blocking + important)
  3. Show detailed fix for a specific issue
  4. Skip fixes (review only)

Choice? (1/2/3/4)
```

If user chooses to fix:
- Make the fixes following the suggestions
- Re-run review to verify
- Show summary of changes made

### Step 8: Final Summary

```
REVIEW COMPLETE

Summary:
  • Blocking: {count} {if fixed: → Fixed}
  • Important: {count}
  • Suggestions: {count}
  • Passed: {count} checks

{if all blocking fixed}
Ready for merge/PR.
{else}
Resolve blocking issues before proceeding.
{/if}

Next Steps:
  • /task-work           Continue implementation
  • /task-done           Complete task (if all items done)
```

Then stop. Do not proceed further.

## Output Format Example

```
╔══════════════════════════════════════════════════════════════════╗
║ CODE REVIEW: JIRA-123                                            ║
╠══════════════════════════════════════════════════════════════════╣
║ BLOCKING (2)                                                     ║
║ ├─ backend/src/auth.ts:45                                        ║
║ │   SQL injection vulnerability in user query                    ║
║ │   Suggestion: Use parameterized query                          ║
║ ├─ backend/src/api.ts:89                                         ║
║ │   Missing error handling for database operations               ║
║ │   Suggestion: Wrap in try-catch, return proper error response  ║
║                                                                   ║
║ IMPORTANT (1)                                                    ║
║ ├─ backend/src/utils.ts:34                                       ║
║ │   Potential performance issue with large arrays                ║
║                                                                   ║
║ SUGGESTIONS (3)                                                  ║
║ ├─ frontend/src/Login.tsx:12 - Consider memoizing callback       ║
║ ├─ backend/src/utils.ts:67 - Could simplify with reduce          ║
║ ├─ backend/tests/auth.test.ts:89 - Add edge case test            ║
║                                                                   ║
║ PASSED                                                           ║
║ ├─ ✓ No hardcoded secrets                                        ║
║ ├─ ✓ Follows naming conventions                                  ║
║ ├─ ✓ Test coverage adequate                                      ║
║ ├─ ✓ No deprecated API usage                                     ║
╚══════════════════════════════════════════════════════════════════╝
```
