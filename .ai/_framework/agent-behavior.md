<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ FILE: agent-behavior.md                                          ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Instructions for AI agents working with this codebase   ║
╚══════════════════════════════════════════════════════════════════╝
-->

# AI Agent Behavior Guidelines

## Critical: Check Documentation First

**BEFORE exploring code**, ALWAYS check the `.ai/` folder for existing documentation.

The `.ai/` folder contains curated, structured knowledge about this codebase:
- Architecture decisions
- Feature documentation
- Patterns and conventions
- Completed task learnings
- Current task context

## Navigation Priority

When answering questions or exploring context, follow this order:

### 1. Start with `.ai/context.md`
- Project overview and current state
- Active tasks and focus areas
- Quick orientation

### 2. Check `.ai/INDEX.md`
- Navigation hub for all documentation
- "How do I...?" → commands
- "What is...?" → docs
- "What repos?" → manifest

### 3. Search `.ai/docs/`
- Repository-specific documentation
- Feature documentation (e.g., `docs/peo/hris_integration/`)
- Shared patterns (e.g., `docs/_shared/sequelize-patterns.md`)
- Architecture overview (`docs/_architecture/`)

### 4. Check `.ai/tasks/`
- Current tasks in progress (`tasks/in_progress/`)
- Task READMEs contain problem context and findings
- Completed tasks have learnings

### 5. Check `.ai/docs/_completed_tasks.md`
- Historical learnings from past work
- Known pitfalls and solutions
- Patterns discovered

### 6. ONLY THEN explore code
- If documentation doesn't answer the question
- If you need current implementation details
- If documentation might be outdated

## Examples

### User asks: "How does HRIS integration work?"

**DO:**
1. Check `.ai/INDEX.md` for HRIS docs
2. Read `.ai/docs/peo/hris_integration/README.md`
3. Check related files in that folder
4. Only explore code if docs are insufficient

**DON'T:**
- Immediately grep the codebase for "hris"
- Start reading random source files
- Ignore existing documentation

### User asks: "What's the pattern for database models?"

**DO:**
1. Check `.ai/docs/_shared/` for patterns
2. Read `sequelize-patterns.md` if it exists
3. Check repo-specific docs

**DON'T:**
- Immediately explore model files in code
- Guess at patterns without checking docs

### User asks: "I need to work on PEOCM-123"

**DO:**
1. Check `.ai/tasks/` for the task folder
2. Read the task's `README.md`
3. Check `status.yaml` for current state
4. Review any work items in `todo/` or `done/`

**DON'T:**
- Start exploring code without task context
- Ignore existing research in the task folder

## Git Safety Rules

**CRITICAL: Never commit or push without explicit user approval.**

### Before ANY Git Operation

1. **ASK PERMISSION** before:
   - `git commit` - Always ask "Ready to commit these changes?"
   - `git push` - Always ask "Ready to push to remote?"
   - `git checkout -b` - Ask if creating branches in shared repos
   - `git merge` / `git rebase` - Always confirm first

2. **VERIFY CORRECT DIRECTORY** (multi-repo/submodule projects):
   - File edits work from parent directory
   - Git commands MUST run in the specific repo/submodule directory
   - Always `cd` to the correct repo before git operations
   - Verify with `git rev-parse --show-toplevel`

3. **CHECK PROTECTED STATUS**:
   - Read `manifest.yaml` for `protected: true` repos
   - NEVER run git operations on protected repos
   - Protected repos are read-only for the agent

### Safe Workflow Example

```
User: "Commit the changes"

Agent: I'll prepare the commit. Let me show you what will be committed:

[runs git status, git diff --staged]

Ready to commit with message:
"feat: add user authentication"

Proceed with commit? (waiting for approval)

User: "yes"

Agent: [now runs git commit]
```

### Forbidden Without Approval

- `git commit` - NEVER auto-commit
- `git push` - NEVER auto-push
- `git push --force` - NEVER (extremely dangerous)
- `git reset --hard` - NEVER without explicit request
- `git rebase` on shared branches - NEVER without approval

## Worktree Rules

**MANDATORY: Always use the `create-worktree.sh` script when creating git worktrees.**

### Why This Matters

Manual worktree creation leads to:
- Inconsistent directory structures
- Forgotten `.gitignore` entries
- Branch naming inconsistencies
- Cleanup difficulties

### Required Script Usage

```bash
# Script location
scripts/create-worktree.sh <repo-path> <task-id> [base-branch]

# Examples
scripts/create-worktree.sh ~/Projects/backend JIRA-123
scripts/create-worktree.sh ~/Projects/backend JIRA-123 develop
scripts/create-worktree.sh /path/to/repo feature/new-api main
```

### What the Script Does

1. Creates worktree at `.worktrees/{task-id}/` inside the target repo
2. Creates branch `task/{task-id}` from the specified base branch
3. Automatically adds `.worktrees/` to `.gitignore`
4. Fetches latest from remote before branching
5. Validates repo path and handles errors gracefully

### Forbidden Without the Script

- `git worktree add` - NEVER run manually
- Creating worktrees in arbitrary locations
- Creating worktrees without proper `.gitignore` setup

### Cleanup

When done with a worktree:
```bash
git worktree remove .worktrees/{task-id}
```

## For Framework Commands

When the user invokes framework commands (`/task-*`, `/document`, etc.):
1. Read the command definition in `.ai/_framework/commands/`
2. Follow the command's workflow exactly
3. Use existing documentation as context

## Extension Compliance (CRITICAL)

**Reading an extension is NOT the same as applying it.**

When you find a `.extend.md` file:

### 1. Extract and List Requirements

Don't just announce "✓ Project Extension Active". Extract the actual requirements:

```
✓ Project Extension Active

Extension requires:
  • BDD-first: Write tests BEFORE implementation
  • Test file naming: {feature}.test.ts
  • Coverage threshold: 80%
```

### 2. Verify EACH Step Against Extension

Before executing any step, ask yourself:
- "Does this step comply with the extension requirements?"
- "Am I defaulting to habits instead of following the extension?"

### 3. Stop-and-Check at Key Decision Points

When creating work items, plans, or proposals:

```
EXTENSION COMPLIANCE CHECK
══════════════════════════════════════════════════════════════════
Extension requirement: BDD-first (tests before implementation)

My proposed order:
  1. Write tests for feature X        ✓ Compliant
  2. Implement feature X              ✓ Compliant (after tests)
  3. Write integration tests          ✓ Compliant

Proceeding with extension-compliant plan.
```

### Common Failure: "Acknowledge but Don't Apply"

**WRONG:**
```
✓ Project Extension Active
[proceeds to ignore extension and use default habits]
```

**RIGHT:**
```
✓ Project Extension Active

Extension mandates: {specific requirements}

Adjusting my approach to comply:
  • Instead of: design → implement → test
  • I will do:  test → implement → verify
```

### Why This Matters

Extensions exist to override default behavior for project-specific needs.
Acknowledging without applying defeats their entire purpose.

**If you find yourself proposing something that contradicts the extension,
STOP and re-read the extension requirements.**

## Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  QUESTION RECEIVED                                              │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────┐                                           │
│  │ Check .ai/      │ ◄── START HERE                            │
│  │ documentation   │                                            │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Answer found?   │                                            │
│  └────────┬────────┘                                           │
│           │                                                     │
│     YES   │   NO                                                │
│     │     │                                                     │
│     ▼     ▼                                                     │
│  ┌─────┐ ┌─────────────────┐                                   │
│  │Reply│ │ Explore code    │                                    │
│  └─────┘ │ with doc context│                                    │
│          └─────────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
```
