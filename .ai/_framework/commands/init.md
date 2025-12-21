<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /init                                                   ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Bootstrap the three-layer system for a new project      ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /init - Bootstrap New Project

## Description

Set up the three-layer AI task framework for a new project. This command gathers project information, explores the codebase, and creates all necessary configuration files.

## Usage

```
/init                    # Bootstrap from scratch
/init --minimal          # Skip exploration, just create structure
```

## Workflow

```
1. ASK QUESTIONS
   • Project name and description
   • What repos/services exist?
   • What's the tech stack?
   • What MCPs are available?
   • Commit/branch conventions?
   • JIRA prefix (or LOCAL)?
   • Which AI tool? (Claude Code, Cursor, Other)
   • Track customizations in ai-framework repo?

2. EXPLORE CODEBASE (unless --minimal)
   • Launch Explore agents on discovered repos
   • Identify patterns, key files, structure
   • Detect tech stack automatically
   • Find existing documentation

3. BUILD LAYERS
   • Create _project/manifest.yaml from answers
   • Create _project/structure.md from exploration
   • Seed docs/ with initial READMEs per repo
   • Create docs/_completed_tasks.md (empty)
   • Generate context.md from all pieces
   • Generate INDEX.md
   • Create tasks/ folder structure

4. INSTALL COMMANDS
   • Create .claude/commands/ or .cursor/commands/
   • Register all 13 slash commands
   • Commands become immediately available

5. CREATE PROJECT BRANCH (if tracking enabled)
   • Create branch project/{project-name} in ai-framework
   • Configure remote for syncing and pushing
   • Enable version control for custom commands

6. OUTPUT SUMMARY
   • What was created
   • Commands installed
   • Version control status
   • Suggested next steps
```

## Implementation

### Step 0: Orientation

Check that the `.ai/_framework/` directory exists (the framework has been copied to the project).

If NOT found:
```
Framework not found. Please copy the .ai/ directory from the ai-framework
repository to your project first, then run /init again.
```

If found, announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ AI TASK FRAMEWORK - INITIALIZATION                               ║
╚══════════════════════════════════════════════════════════════════╝

I'll help you set up the AI Task Framework for this project.
Let me gather some information first.
```

### Step 1: Gather Information

Ask the following questions. Accept answers conversationally - the user can answer multiple questions at once.

**Q1: Project Identity**
```
What's the project name and a brief description?
```

**Q2: Repositories**
```
What repositories/services are in this project?
For each, I need:
- Name (e.g., backend, frontend, mobile)
- Path relative to project root (e.g., ./backend)
- Brief description
- Tech stack (e.g., typescript, react, node, postgresql)
```

**Q3: MCPs**
```
What MCP integrations are available? Common ones include:
- sql-query (database access)
- notification-server (Discord notifications)
- context7 (library documentation)
- playwright (browser automation)

List any that are definitely available, and any that might be available optionally.
```

**Q4: Conventions**
```
What conventions does the team follow?

Commits:
- Pattern? (e.g., "type(scope): description")
- Require JIRA ticket?
- Co-author attribution allowed?

Branches:
- Pattern? (e.g., "{jira}-{short-description}")

JIRA:
- Prefix? (e.g., "PROJ", or "LOCAL" if not using JIRA)
- URL? (if applicable)
```

**Q5: AI Tool**
```
Which AI tool are you using?
  1. Claude Code (CLI)
  2. Cursor
  3. Other (manual setup)
```

**Q6: Framework Version Control**
```
Do you want to track project-specific customizations in the ai-framework repository?

This creates a branch for your project where custom commands (created with /command-create)
can be versioned and shared.

Options:
  1. Yes - Create branch "project/{project-name}" (Recommended)
  2. Yes - Custom branch name
  3. No - Don't track (local only)

If yes, provide:
  - GitHub repo URL (default: GabiHert/ai-framework)
  - Branch name (default: project/{project-name-slug})
```

**Q7: Preferences (Optional)**
```
Any preferences for how I should work?
- Preferred exploration depth (quick/medium/very thorough)?
- Should I send notifications for task events?
- Any special instructions?
```

Collect all answers before proceeding.

### Step 2: Explore Codebase (Optional)

Skip this step if `--minimal` was specified or user requests to skip.

For each repository identified:

1. Launch an Explore agent:
   ```
   Explore {repo.name} repository at {repo.path}:
   - Identify project structure and key directories
   - Find main entry points
   - Detect frameworks and libraries in use
   - Note any existing documentation
   - Identify testing patterns
   - Find configuration files
   ```

2. Compile exploration findings into a summary per repo.

### Step 3: Create Project Layer

Create `.ai/_project/manifest.yaml` using the gathered information.

Template:
```yaml
# .ai/_project/manifest.yaml
#
# ╔══════════════════════════════════════════════════════════════════╗
# ║ LAYER: PROJECT                                                   ║
# ║ STATUS: Generated by /init on {YYYY-MM-DD}                       ║
# ╠══════════════════════════════════════════════════════════════════╣
# ║ This is the project manifest. Commands READ this file.           ║
# ║ Edit manually or run /enhance to update.                         ║
# ╚══════════════════════════════════════════════════════════════════╝

# ============================================================
# PROJECT IDENTITY
# ============================================================
project:
  name: "{project_name}"
  description: "{project_description}"
  root: "{project_root}"

# ============================================================
# REPOSITORIES
# ============================================================
repos:
{for each repo}
  - name: {repo.name}
    path: {repo.path}
    description: "{repo.description}"
    tech: [{repo.tech}]
{/for}

# ============================================================
# MCP INTEGRATIONS
# ============================================================
mcps:
  available:
{for each mcp in available}
    - name: {mcp.name}
      description: "{mcp.description}"
{/for}
  optional:
{for each mcp in optional}
    - name: {mcp.name}
      description: "{mcp.description}"
{/for}

# ============================================================
# CONVENTIONS
# ============================================================
conventions:
  commits:
    no_coauthor: {true/false}
    require_jira: {true/false}
    pattern: "{pattern}"
    types: [feat, fix, chore, refactor, test, docs]

  branches:
    pattern: "{pattern}"

  jira:
    prefix: "{prefix}"
    url: "{url}"

# ============================================================
# AGENT PREFERENCES
# ============================================================
agents:
  exploration: Explore
  explore:
    default_thoroughness: "{thoroughness}"

# ============================================================
# NOTIFICATIONS
# ============================================================
notifications:
  on_task_create: {true/false}
  on_task_done: {true/false}
  on_error: true
  mention_user: false

# ============================================================
# FRAMEWORK VERSION CONTROL
# ============================================================
framework:
  repo: "{github_repo_url}"           # e.g., "GabiHert/ai-framework"
  branch: "{project_branch}"          # e.g., "project/my-project"
  track_customizations: {true/false}  # Push custom commands to branch
```

### Step 4: Create Domain Layer

**4a. Create docs/_completed_tasks.md:**
```markdown
# Completed Tasks Log

Tasks completed in this project, for reference and learning.

| Date | Task | Summary |
|------|------|---------|
| _No tasks completed yet_ | | |
```

**4b. Create docs/_shared/README.md:**
```markdown
# Shared Documentation

Cross-cutting patterns and conventions used across repositories.

## Contents

_Add documentation as you learn patterns that apply across repos._
```

**4c. Create docs/_architecture/README.md:**
```markdown
# Architecture Documentation

System-level architecture and design decisions.

## Contents

_Add architecture documentation as the system evolves._
```

**4d. Create per-repo documentation** (if exploration was done):
For each repo, create `docs/{repo.name}/README.md`:
```markdown
# {repo.name} Documentation

## Overview

{repo.description}

## Tech Stack

{list of technologies}

## Key Files

{findings from exploration}

## Patterns

{patterns identified during exploration}
```

### Step 5: Create Task Structure

Ensure these directories exist:
- `.ai/tasks/todo/`
- `.ai/tasks/in_progress/`
- `.ai/tasks/done/`

### Step 6: Install Commands

Based on the AI tool selected in Q5, install the framework commands.

**For Claude Code (Option 1):**

Create command skill files in `.claude/commands/` directory:

```bash
mkdir -p .claude/commands
```

For each framework command, create a skill file that references our command prompt:

**`.claude/commands/init.md`:**
```markdown
Follow the instructions in .ai/_framework/commands/init.md
```

**`.claude/commands/task-create.md`:**
```markdown
Follow the instructions in .ai/_framework/commands/task-create.md

Arguments: $ARGUMENTS
```

**`.claude/commands/task-start.md`:**
```markdown
Follow the instructions in .ai/_framework/commands/task-start.md

Arguments: $ARGUMENTS
```

**`.claude/commands/task-work.md`:**
```markdown
Follow the instructions in .ai/_framework/commands/task-work.md

Arguments: $ARGUMENTS
```

**`.claude/commands/task-done.md`:**
```markdown
Follow the instructions in .ai/_framework/commands/task-done.md

Arguments: $ARGUMENTS
```

**`.claude/commands/task-status.md`:**
```markdown
Follow the instructions in .ai/_framework/commands/task-status.md

Arguments: $ARGUMENTS
```

**`.claude/commands/task-resume.md`:**
```markdown
Follow the instructions in .ai/_framework/commands/task-resume.md

Arguments: $ARGUMENTS
```

**`.claude/commands/task-review.md`:**
```markdown
Follow the instructions in .ai/_framework/commands/task-review.md

Arguments: $ARGUMENTS
```

**`.claude/commands/task-explore.md`:**
```markdown
Follow the instructions in .ai/_framework/commands/task-explore.md

Arguments: $ARGUMENTS
```

**`.claude/commands/document.md`:**
```markdown
Follow the instructions in .ai/_framework/commands/document.md

Arguments: $ARGUMENTS
```

**`.claude/commands/enhance.md`:**
```markdown
Follow the instructions in .ai/_framework/commands/enhance.md

Arguments: $ARGUMENTS
```

**`.claude/commands/help.md`:**
```markdown
Follow the instructions in .ai/_framework/commands/help.md

Arguments: $ARGUMENTS
```

**`.claude/commands/command-create.md`:**
```markdown
Follow the instructions in .ai/_framework/commands/command-create.md

Arguments: $ARGUMENTS
```

**For Cursor (Option 2):**

Create command files in `.cursor/commands/` directory:

```bash
mkdir -p .cursor/commands
```

Create the same command files as above, but in `.cursor/commands/` instead.

**For Other (Option 3):**

Inform the user:
```
Commands are available in .ai/_framework/commands/

To use them, reference the command file when invoking:
  "Run /task-create following .ai/_framework/commands/task-create.md"

Or configure your AI tool to recognize these as slash commands.
```

### Step 7: Generate context.md

Create `.ai/context.md` from the template at `_framework/templates/context.md`, filling in all values from the manifest and current state.

### Step 8: Update INDEX.md

Update `.ai/INDEX.md` to reflect any new documentation created. Add entries to the Documentation table for each repo doc created.

### Step 9: Create Project Branch (If Tracking Enabled)

If user chose to track customizations (Q6 option 1 or 2):

**9a. Configure remote:**
```bash
# Check if inside the .ai directory
cd .ai

# Initialize git if not already
git init 2>/dev/null || true

# Add ai-framework as remote (or verify it exists)
git remote add ai-framework https://github.com/{repo_url}.git 2>/dev/null || \
git remote set-url ai-framework https://github.com/{repo_url}.git

# Fetch latest
git fetch ai-framework main
```

**9b. Create project branch:**
```bash
# Create branch from main
git checkout -b {project_branch} ai-framework/main

# Push and set upstream
git push -u ai-framework {project_branch}
```

**9c. Announce success:**
```
╔══════════════════════════════════════════════════════════════════╗
║ PROJECT BRANCH CREATED                                           ║
╚══════════════════════════════════════════════════════════════════╝

Repository: {repo_url}
Branch: {project_branch}

Your project-specific customizations (commands, templates) will be
tracked in this branch. To sync with framework updates:

  cd .ai
  git fetch ai-framework main
  git merge ai-framework/main

To push custom commands after using /command-create:

  cd .ai
  git add .
  git commit -m "feat: add custom command"
  git push ai-framework {project_branch}
```

**If user chose not to track (option 3):**
Skip this step and note in output that customizations are local only.

### Step 10: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ INITIALIZATION COMPLETE                                          ║
╚══════════════════════════════════════════════════════════════════╝

Created:
  ✓ .ai/_project/manifest.yaml     - Project configuration
  ✓ .ai/context.md                 - Entry point for AI sessions
  ✓ .ai/tasks/                     - Task management structure
  ✓ .ai/docs/_completed_tasks.md   - Task history log
  ✓ .ai/docs/_shared/              - Cross-cutting documentation
  ✓ .ai/docs/_architecture/        - System architecture docs
{if repos explored}
  ✓ .ai/docs/{repo}/              - Per-repo documentation
{/if}

Commands Installed:
{if Claude Code}
  ✓ .claude/commands/             - 13 slash commands registered
    Available: /init, /task-create, /task-start, /task-work,
               /task-done, /task-status, /task-resume, /task-review,
               /task-explore, /document, /enhance, /help, /command-create
{/if}
{if Cursor}
  ✓ .cursor/commands/             - 13 slash commands registered
{/if}
{if Other}
  ℹ Commands available in .ai/_framework/commands/
    Invoke manually: "Follow .ai/_framework/commands/{command}.md"
{/if}

{if tracking enabled}
Version Control:
  ✓ Project branch created        - {project_branch}
  ✓ Remote configured             - ai-framework → {repo_url}

  Sync framework updates:  git fetch ai-framework main && git merge ai-framework/main
  Push customizations:     git push ai-framework {project_branch}
{else}
Version Control:
  ℹ Local only - customizations not tracked in remote repository
{/if}

Next Steps:
  1. Review .ai/_project/manifest.yaml and adjust if needed
  2. Try /help to verify commands are working
  3. Use /task-create to start your first task

Quick Reference:
  • /task-create     Create a new development task
  • /task-status     View all tasks
  • /help            Show all commands
```

Then stop. Do not proceed further.

## Output

- Fully configured `.ai/` directory
- Ready-to-use task management system
