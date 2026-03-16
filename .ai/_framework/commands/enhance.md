---
type: command
name: enhance
layer: framework
tags:
  - command
---



> Parent: [[commands-index]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /enhance                                                ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Grow the domain layer with new knowledge                ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /enhance - Evolve Existing Setup

## Description

Grow the project setup with new knowledge. Add repos, update conventions, add MCPs, or modify project configuration.

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ ⛔ DO NOT EDIT APPLICATION CODE                                 │
│                                                                 │
│ ALLOWED:  Read any file. Write ONLY inside .ai/ directory.      │
│ FORBIDDEN: Create, edit, or delete files outside .ai/           │
│ TEMP FILES: Scratch/temporary output goes in .ai/tmp/           │
│                                                                 │
│ This command updates project configuration and documentation.    │
│ It must NEVER modify application source code, tests, or config. │
│ If you find yourself editing code files, STOP — you are off     │
│ track.                                                          │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/enhance                           # Interactive mode
/enhance "Add the payments repo"
/enhance "Update commit conventions"
/enhance "Add context7 MCP"
```

## Workflow

```
1. TAKE USER INPUT
   Examples:
   • "Add the payments repo"
   • "Update conventions for new team rules"
   • "Add new MCP integration"
   • "Change JIRA prefix"

2. DETERMINE WHAT TO CHANGE
   • New repo? → Update manifest.yaml, create docs
   • New convention? → Update manifest.yaml
   • New MCP? → Update manifest.yaml
   • Project identity? → Update manifest.yaml

3. EXPLORE IF NEEDED
   • For new repos: explore to gather tech stack
   • For patterns: find examples in code

4. UPDATE APPROPRIATELY
   • Update _project/manifest.yaml
   • Regenerate context.md
   • Create repo docs if adding repo
   • Update INDEX.md (REQUIRED for new docs)

5. OUTPUT SUMMARY
   • What was changed
   • Links to updated files
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand current configuration.
2. Read `.ai/INDEX.md` to know existing documentation.

3. **Extension Support**: This command supports compiled extensions
   via `/command-extend enhance --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

4. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ ENHANCE PROJECT                                                  ║
╚══════════════════════════════════════════════════════════════════╝

Current Configuration:
  • Project: {project.name}
  • Repos: {count} ({list names})
  • MCPs: {count} ({list names})
```

### Step 1: Parse Request or Ask

**If request provided:**
Determine the type of enhancement:
- Contains "repo" → Adding a repository
- Contains "MCP" or tool name → Adding an MCP
- Contains "convention" or "commit" or "branch" → Updating conventions
- Contains "JIRA" or "prefix" → Updating JIRA config
- Other → Ask for clarification

**If no request (interactive mode):**
```
What would you like to enhance?

  1. Add a new repository
  2. Add or update MCP integrations
  3. Update conventions (commits, branches, code style)
  4. Update project identity or settings
  5. Something else

Choice?
```

### Step 2: Handle Each Enhancement Type

#### 2a. Adding a Repository

Ask for repository details:
```
NEW REPOSITORY

What's the repository name and path?
  • Name: (e.g., payments, mobile-app)
  • Path: (e.g., ./payments, ../mobile)
  • Description: (brief purpose)
```

**Explore the repository:**
Launch an Explore agent on the new repo path:
```
Explore {repo.path} to identify:
- Tech stack (languages, frameworks)
- Project structure
- Entry points
- Test patterns
```

**Update manifest.yaml:**
Add new repo entry:
```yaml
repos:
  # ... existing repos ...
  - name: {name}
    path: {path}
    description: "{description}"
    tech: [{detected tech stack}]
```

**Create repo documentation:**
Create `.ai/docs/{repo}/README.md`:
```markdown
# {repo} Documentation

## Overview

{description}

## Tech Stack

{list of technologies}

## Key Files

{findings from exploration}

## Patterns

{patterns identified}
```

**Update INDEX.md:**
Add entry in Documentation section:
```markdown
| {repo} | [docs/{repo}/README.md](./docs/{repo}/README.md) | {description} |
```

#### 2b. Adding an MCP

Ask for MCP details:
```
NEW MCP INTEGRATION

MCP name: (e.g., sql-query, notification-server)
Description: (what it does)
Availability: (1) Always available, (2) Optional/sometimes available
Any notes?: (e.g., "requires VPN")
```

**Update manifest.yaml:**
Add to appropriate section:
```yaml
mcps:
  available:  # or optional:
    - name: {name}
      description: "{description}"
      notes: "{notes}"  # if provided
```

#### 2c. Updating Conventions

Ask which convention to update:
```
CONVENTIONS

What would you like to update?

  1. Commit message format
  2. Branch naming
  3. JIRA configuration
  4. Code style

Choice?
```

For each choice, gather specifics and update manifest.yaml accordingly.

**Commit conventions:**
```yaml
conventions:
  commits:
    no_coauthor: {true/false}
    require_jira: {true/false}
    pattern: "{pattern}"
    types: [{list}]
```

**Branch conventions:**
```yaml
conventions:
  branches:
    pattern: "{pattern}"
```

**JIRA configuration:**
```yaml
conventions:
  jira:
    prefix: "{prefix}"
    url: "{url}"
```

#### 2d. Updating Project Identity

Ask what to change:
```
PROJECT SETTINGS

What would you like to update?

  1. Project name
  2. Project description
  3. Notification settings
  4. Agent preferences

Choice?
```

Update the appropriate section in manifest.yaml.

### Step 3: Regenerate context.md

After any manifest change, regenerate `.ai/context.md`:
1. Read the updated manifest.yaml
2. Use the template from `_framework/templates/context.md`
3. Fill in current values
4. Update current state (task counts)

### Step 4: Verify Changes

Show what was changed:
```
VERIFICATION

Changes made to:
  ✓ .ai/_project/manifest.yaml
    {show diff or summary of changes}

{if repo added}
  ✓ .ai/docs/{repo}/README.md (created)
  ✓ .ai/INDEX.md (updated)
{/if}

  ✓ .ai/context.md (regenerated)
```

Ask for confirmation:
```
These changes look correct? (y/n)
```

If no, offer to adjust.

### Step 5: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ ENHANCEMENT COMPLETE                                             ║
╚══════════════════════════════════════════════════════════════════╝

Changed:
{list what was changed}

Updated Files:
  • .ai/_project/manifest.yaml
  • .ai/context.md
{if applicable}
  • .ai/docs/{repo}/README.md
  • .ai/INDEX.md
{/if}

To verify:
  • Check manifest: .ai/_project/manifest.yaml
  • Check context: .ai/context.md

Next Steps:
  • /task-create     Create a task using new config
  • /help            Show all commands
```

Then stop. Do not proceed further.
