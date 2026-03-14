

> Parent: [[manifest]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /ctx                                                    ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Refresh framework context and orientation               ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /ctx - Framework Context Refresher

## Description

Quickly refresh your understanding of the Expresso framework. Use this command when you need to re-orient yourself on framework patterns, multi-repo handling, or navigation. Especially useful after context loss or before complex operations.

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ ⛔ READ-ONLY COMMAND — DO NOT MODIFY ANY FILES                  │
│                                                                 │
│ ALLOWED:  Read any file, display output to user                 │
│ FORBIDDEN: Edit, Write, create, or delete ANY files             │
│ TEMP FILES: If you must create scratch files, use .ai/tmp/      │
│                                                                 │
│ This command displays information only. If you find yourself    │
│ about to edit or create a file, STOP — you are off track.       │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/ctx                    # Full context refresh
/ctx git                # Focus on git/multi-repo safety
/ctx nav                # Focus on navigation/docs
/ctx commands           # List available commands
```

## When to Use

- Starting a new session or after context compaction
- Before git operations in multi-repo projects
- When unsure about framework patterns
- After making a mistake (to understand what went wrong)

## Workflow

```
1. READ manifest.yaml for project structure
2. CHECK for active task context
3. DISPLAY relevant context based on argument
4. REMIND critical safety rules
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` for:
   - Project name and root path
   - Repository list and paths
   - Protected repo flags
   - Conventions

2. Check for tasks in progress:
   - List tasks in `.ai/tasks/in_progress/`
   - Note which repos are affected by current tasks

3. **Extension Support**: This command supports compiled extensions
   via `/command-extend ctx --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

### Step 1: Display Context

Based on argument (or full context if none):

#### Full Context (no argument)

```
╔══════════════════════════════════════════════════════════════════╗
║ EXPRESSO FRAMEWORK CONTEXT                                       ║
╚══════════════════════════════════════════════════════════════════╝

PROJECT: {project.name}
ROOT: {project.root}

ARCHITECTURE
══════════════════════════════════════════════════════════════════
Three-layer system:

  DOMAIN LAYER:     .ai/docs/           (Accumulated knowledge)
       ↓
  PROJECT LAYER:    .ai/_project/       (Your configuration)
       ↓
  FRAMEWORK LAYER:  .ai/_framework/     (Reusable commands)

REPOSITORIES
══════════════════════════════════════════════════════════════════
{for each repo in manifest.repos}
  • {repo.name}: {repo.path}
    {if repo.protected}⛔ PROTECTED - No git operations{/if}
    {if repo.is_framework}📦 Framework repo{/if}
{/for}

{if tasks in in_progress/}
TASKS IN PROGRESS
══════════════════════════════════════════════════════════════════
{for each task in .ai/tasks/in_progress/}
  • {task-id}: {title}
    Work items: {done}/{total} complete
{/for}
{/if}

CRITICAL RULES
══════════════════════════════════════════════════════════════════
🛑 NEVER COMMIT OR PUSH WITHOUT USER APPROVAL
🛑 EXTENSIONS: Reading is NOT applying - verify compliance at each step
⚠ GIT OPERATIONS: Always run in correct repo directory
⚠ PROTECTED REPOS: Never modify repos marked protected: true
⚠ SUBMODULES: File edits work from parent, git commands don't

NAVIGATION
══════════════════════════════════════════════════════════════════
Start: .ai/context.md
Index: .ai/INDEX.md
Config: .ai/_project/manifest.yaml

QUICK COMMANDS
══════════════════════════════════════════════════════════════════
/ctx git      - Git safety rules
/ctx ext      - Extension compliance guide
/ctx nav      - Navigation guide
/ctx commands - Available commands
```

#### Git Focus (`/ctx git`)

```
╔══════════════════════════════════════════════════════════════════╗
║ GIT SAFETY - MULTI-REPO HANDLING                                 ║
╚══════════════════════════════════════════════════════════════════╝

🛑 NEVER COMMIT OR PUSH WITHOUT EXPLICIT USER APPROVAL

  Before committing: "Ready to commit? [show diff summary]"
  Before pushing:    "Ready to push to {remote}?"
  WAIT for user confirmation before executing.

⚠ CRITICAL: Git operations MUST run in the correct directory!

THE PROBLEM
══════════════════════════════════════════════════════════════════
In repos with submodules:
  • File edits work from parent directory (paths accessible)
  • Git operations MUST run inside specific submodule directory

WRONG:
  Working dir: /project (parent)
  Edit: backend/src/file.ts     ✓ Works (path accessible)
  Git:  git checkout -b feat    ✗ WRONG REPO!

CORRECT:
  Working dir: /project (parent)
  Edit: backend/src/file.ts     ✓ Works
  Git:  cd backend && git checkout -b feat  ✓ Correct repo!

SAFETY CHECKLIST
══════════════════════════════════════════════════════════════════
Before ANY git operation:

  1. □ Identify which repo the file belongs to
  2. □ cd to that repo's directory (use absolute path)
  3. □ Verify: git rev-parse --show-toplevel
  4. □ Verify: git remote -v (correct remote?)
  5. □ Check: Is repo protected? If yes, STOP.
  6. □ ASK USER before commit/push - NEVER auto-execute

FORBIDDEN WITHOUT APPROVAL
══════════════════════════════════════════════════════════════════
  🛑 git commit      - Always ask first
  🛑 git push        - Always ask first
  🛑 git push --force - NEVER (extremely dangerous)
  🛑 git reset --hard - NEVER without explicit request
  🛑 git rebase      - Always ask on shared branches

PROTECTED REPOSITORIES
══════════════════════════════════════════════════════════════════
{for each repo where protected: true}
  ⛔ {repo.name}: {repo.path}
     DO NOT: create branches, commit, push
     Locked to branch: {repo.locked_branch}
{/for}
```

#### Extension Focus (`/ctx ext`)

```
╔══════════════════════════════════════════════════════════════════╗
║ COMPILED EXTENSIONS - HOW THEY WORK                              ║
╚══════════════════════════════════════════════════════════════════╝

HOW COMPILED EXTENSIONS WORK
══════════════════════════════════════════════════════════════════

Extensions are COMPILED into self-contained documents.
The stub points directly to the compiled file — no runtime
discovery or merging needed.

  1. Source YAML defines overrides (context, hooks, step replacements)
  2. Compilation merges source + base into single authoritative document
  3. Stub points to compiled file directly
  4. AI reads ONLY the compiled file — it IS the command

WHEN A COMPILED EXTENSION IS ACTIVE
══════════════════════════════════════════════════════════════════

  The compiled .active.md file is the COMPLETE instruction set.
  It contains:
    • Authority Notice (confirms it's the authoritative source)
    • Project Context (injected from source YAML)
    • All steps inlined (base + overrides merged)
    • Pre-hooks and post-hooks included
    • Agent configuration embedded

  There is NO separate extension to "discover" or "merge" at
  runtime. The compiled file IS the final command.

FILE LOCATIONS
══════════════════════════════════════════════════════════════════
  .ai/_project/commands/{cmd}.active.md          <- what AI reads
  .ai/_project/commands/{cmd}.variant.{name}.md  <- stored variants
  .ai/_project/commands/{cmd}.source.{name}.yaml <- source overrides

MANAGEMENT COMMANDS
══════════════════════════════════════════════════════════════════
  /command-extend {cmd}                    Create extension
  /command-extend {cmd} --variant {name}   Create named variant
  /command-extend {cmd} --activate {name}  Switch active variant
  /command-extend {cmd} --recompile        Recompile after update
  /command-extend --list                   Show all variants
  /command-extend --migrate                Convert legacy extensions
```

#### Navigation Focus (`/ctx nav`)

```
╔══════════════════════════════════════════════════════════════════╗
║ NAVIGATION - DOCUMENTATION FIRST                                 ║
╚══════════════════════════════════════════════════════════════════╝

PRIORITY ORDER (check in this order):
══════════════════════════════════════════════════════════════════

  1. .ai/context.md
     → Current project state, quick reference

  2. .ai/INDEX.md
     → Find any documentation ("What is X?")

  3. .ai/docs/
     → Repository and feature documentation

  4. .ai/tasks/
     → Current and past task context

  5. .ai/docs/_completed_tasks.md
     → Historical learnings and decisions

  6. ONLY THEN explore code
     → If documentation is insufficient

KEY FILES
══════════════════════════════════════════════════════════════════
  .ai/context.md              - Start here (entry point)
  .ai/INDEX.md                - Navigation hub
  .ai/_project/manifest.yaml  - Project configuration
  .ai/_framework/README.md    - Framework overview
  .ai/_framework/agent-behavior.md - AI guidelines

DOCUMENTATION STRUCTURE
══════════════════════════════════════════════════════════════════
  .ai/
  ├── context.md              # Entry point
  ├── INDEX.md                # Navigation
  ├── _project/
  │   ├── manifest.yaml       # Config (source of truth)
  │   └── commands/           # Project extensions
  ├── _framework/
  │   ├── commands/           # Framework commands
  │   ├── templates/          # Document templates
  │   └── docs/               # Framework docs
  ├── docs/
  │   ├── _completed_tasks.md # Historical learnings
  │   └── {repo}/             # Per-repo docs
  └── tasks/
      ├── todo/               # Pending tasks
      ├── in_progress/        # Active tasks
      └── done/               # Completed tasks
```

#### Commands Focus (`/ctx commands`)

```
╔══════════════════════════════════════════════════════════════════╗
║ AVAILABLE COMMANDS                                               ║
╚══════════════════════════════════════════════════════════════════╝

SETUP
══════════════════════════════════════════════════════════════════
  /init              - Bootstrap project with framework
  /enhance           - Add repos, MCPs, conventions

TASK LIFECYCLE
══════════════════════════════════════════════════════════════════
  /task-create       - Create new development task
  /task-start        - Begin working on task
  /task-work         - Implement work items
  /task-done         - Complete and log task
  /task-resume       - Resume in-progress task
  /task-status       - View task dashboard
  /task-review       - Run code review
  /task-explore      - Explore codebase for context

EXPLORATION & DOCS
══════════════════════════════════════════════════════════════════
  /ask               - Answer questions (docs-first)
  /document          - Create or update documentation
  /ctx               - Framework context refresher

META
══════════════════════════════════════════════════════════════════
  /help              - Show available commands
  /command-create    - Create new command
  /command-extend    - Compile command extensions
  /ai-sync           - Sync .ai/ folder with git
  /expresso-tags     - Execute inline @expresso tasks

{Scan .ai/_project/commands/*.variant.*.md and display if any exist:}

PROJECT VARIANTS
══════════════════════════════════════════════════════════════════
  /{cmd}:{variant1}     [active] {description from source YAML}
  /{cmd}:{variant2}

  Switch: /command-extend {cmd} --activate {variant}
```

### Step 2: Remind Critical Rules

Always end with:

```
REMEMBER
══════════════════════════════════════════════════════════════════
  🛑 NEVER commit or push without user approval
  🛑 COMPILED EXTENSIONS: If stub points to active.md, follow ONLY that
  ⚠ Git commands: Run in correct repo directory
  ⚠ Protected repos: Don't modify (check manifest.yaml)
  ⚠ Extensions: Check for .extend.md files
  ⚠ Docs first: Check documentation before exploring code
```

## Error Handling

If manifest.yaml doesn't exist:
```
⚠ No manifest found. Run /init to set up the framework.
```

## Notes

- This command is read-only (no modifications)
- Safe to run anytime for orientation
- Particularly useful after context compaction
- Can be extended via `/command-extend ctx --variant NAME`
