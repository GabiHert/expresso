---
type: command
name: command-create
layer: framework
tags:
  - command
---



> Parent: [[commands-index]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /command-create                                         ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Create a new framework command with proper structure    ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /command-create - Create New Framework Command

## Description

Create a new command with proper structure, ensuring consistency across the framework. This command gathers context through questions before creating the command skeleton.

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ ⛔ DO NOT EDIT APPLICATION CODE                                 │
│                                                                 │
│ ALLOWED:  Read any file. Write to .ai/, .claude/, .cursor/      │
│ FORBIDDEN: Create, edit, or delete application source code      │
│ TEMP FILES: Scratch/temporary output goes in .ai/tmp/           │
│                                                                 │
│ This command creates framework command definitions only.         │
│ It must NEVER modify application source code, tests, or config. │
│ If you find yourself editing code files, STOP — you are off     │
│ track.                                                          │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/command-create
/command-create validate
```

## Workflow

```
1. GATHER BASIC INFO
   • Command name (if not provided)
   • One-line description

2. CLARIFY CATEGORY
   Ask: "Which category does this command belong to?"
   • Setup (init, enhance)
   • Tasks (task-*)
   • Exploration (task-explore)
   • Documentation (document)
   • Meta (help, command-create)

3. CLARIFY SCOPE
   Ask: "What does this command do?"
   • What is the primary goal?
   • What problem does it solve?
   • When should someone use this vs another command?

4. CLARIFY INPUTS
   Ask: "What inputs does this command need?"
   • Required arguments?
   • Optional arguments?
   • Does it need user confirmation for anything?

5. CLARIFY DEPENDENCIES
   Ask: "What does this command read?"
   • manifest.md (project config via get_frontmatter)?
   • context.md?
   • Specific task notes?
   • Other commands' output?

6. CLARIFY OUTPUTS
   Ask: "What does this command create or modify?"
   • New files?
   • Updates to existing files?
   • Updates to [[commands-index]]?
   • Updates to context.md?

7. CLARIFY WORKFLOW STEPS
   Ask: "Walk me through the steps"
   • What happens first?
   • What decisions need to be made?
   • What's the expected output?

8. CONFIRM UNDERSTANDING
   Present summary:
   "I understand you want a command that:
    - Name: /command-name
    - Category: X
    - Purpose: Y
    - Inputs: Z
    - Creates: A
    - Workflow: B"

   Ask: "Is this correct? Any changes?"

9. CREATE COMMAND
   • Generate skeleton in _framework/commands/{name}.md
   • Use gathered info to pre-fill sections
   • Include proper header

10. UPDATE INDEXES
    • Add [[{name}]] to [[commands-index]] body
    • Add to _framework/README.md command table
    • Add to /help output (in correct category)

11. OUTPUT SUMMARY
    • Command file location
    • What was updated
    • Next steps (implement the TODO sections)
```

## Implementation

### Step 0: Orientation

1. Verify we're in a project with the framework:
   - Check that `.ai/_framework/` exists
   - Read existing commands to understand patterns

2. **Extension Support**: This command supports compiled extensions
   via `/command-extend command-create --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

3. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ CREATE NEW COMMAND                                               ║
╚══════════════════════════════════════════════════════════════════╝

Let me gather some information about the command you want to create.
```

### Step 1: Get Command Name

**If name provided as argument:**
- Normalize: remove leading `/`, convert to lowercase, use hyphens
- Example: "/MyCommand" → "my-command"

**If no name provided:**
```
What should the command be called?
(Use lowercase with hyphens, e.g., "task-validate", "repo-add")

Command name: /
```

### Step 2: Get Category

```
CATEGORY

Which category does this command belong to?

  1. Setup     - Project initialization and configuration
  2. Tasks     - Task lifecycle management
  3. Explore   - Codebase exploration and context gathering
  4. Docs      - Documentation creation and management
  5. Meta      - Framework utilities and help

Choice? (1-5)
```

### Step 3: Get Description and Scope

```
SCOPE

Describe what this command does:

  1. What is its primary goal?
     (one sentence)

  2. What problem does it solve?
     (when would someone use this?)

  3. How is it different from existing commands?
     (what makes it unique?)

Your description:
```

### Step 4: Get Inputs

```
INPUTS

What inputs does this command need?

Required arguments:
  (e.g., task ID, file path, name)
  List them or say "none":

Optional arguments:
  (e.g., --verbose, --force)
  List them or say "none":

User prompts during execution:
  (questions to ask the user)
  List them or say "none":
```

### Step 5: Get Dependencies

```
DEPENDENCIES

What does this command need to read?

  [ ] manifest.md (project config via get_frontmatter)
  [ ] context.md (current state)
  [ ] Task notes (TASK-ID.md frontmatter)
  [ ] Documentation files
  [ ] Other: ___

Which ones? (list numbers or describe)
```

### Step 6: Get Outputs

```
OUTPUTS

What does this command create or modify?

  [ ] Creates new files
  [ ] Modifies existing files
  [ ] Updates [[commands-index]] or other index notes
  [ ] Regenerates context.md
  [ ] Sends notifications
  [ ] Other: ___

Which ones? (list numbers or describe)
```

### Step 7: Get Workflow

```
WORKFLOW

Describe the step-by-step workflow:

  1. First, it should...
  2. Then...
  3. After that...
  4. Finally...

(List the main steps in order)
```

### Step 8: Confirm Understanding

Present a summary:
```
╔══════════════════════════════════════════════════════════════════╗
║ COMMAND SUMMARY                                                  ║
╚══════════════════════════════════════════════════════════════════╝

Name: /{command-name}
Category: {category}

PURPOSE
{description}

INPUTS
  Required: {required args}
  Optional: {optional args}
  Prompts: {user prompts}

DEPENDENCIES
  Reads: {files it reads}

OUTPUTS
  Creates/Modifies: {files it affects}

WORKFLOW
  1. {step 1}
  2. {step 2}
  ...

Is this correct? (y/n, or describe changes)
```

If user says no or requests changes, iterate.

### Step 9: Create Command File

Create `.ai/_framework/commands/{name}.md` with the following structure:

```markdown
---
type: command
name: {name}
layer: framework
tags:
  - command
---

> Parent: [[commands-index]]

<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /{name}                                                 ║
║ STATUS: Skeleton - TODO: Complete implementation                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: {one-line description}                                  ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /{name} - {Title}

## Description

{scope description from Step 3}

## Usage

\`\`\`
/{name} {required_args}
/{name} {optional_example}
\`\`\`

## Workflow

\`\`\`
{workflow steps from Step 7}
\`\`\`

## Implementation

TODO: Implement the full /{name} command prompt.

### Step 0: Orientation

Use `get_frontmatter("_project/manifest.md")` to read project config (repos, conventions, mcps, etc.).

{additional orientation based on dependencies}

### Step 1: {First workflow step}

```markdown
<!-- TODO: Implement this step -->
```

### Step 2: {Second workflow step}

```markdown
<!-- TODO: Implement this step -->
```

{additional steps based on workflow}

### Final Step: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ {COMMAND_NAME} COMPLETE                                          ║
╚══════════════════════════════════════════════════════════════════╝

{Summary of what was done}

Next Steps:
  • {relevant next command}
  • {relevant next command}
```

Then stop. Do not proceed further.
```

### Step 10: Update Indexes

**Update [[commands-index]]:**
Use `patch_note("_framework/commands/commands-index.md", ...)` to add a wikilink entry:
```markdown
- [[{name}]] — {description}
```

**Update _framework/README.md:**
Add entry in Commands table:
```markdown
| `/{name}` | {description} |
```

**Update help.md:**
Add entry in the appropriate category section.

### Step 11: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ COMMAND CREATED                                                  ║
╚══════════════════════════════════════════════════════════════════╝

Created:
  ✓ .ai/_framework/commands/{name}.md

Updated:
  ✓ .ai/_framework/commands/commands-index.md - Added [[{name}]] wikilink
  ✓ .ai/_framework/README.md - Added to command table
  ✓ .ai/_framework/commands/help.md - Added to {category} section

Next Steps:
  1. Open .ai/_framework/commands/{name}.md
  2. Implement the TODO sections
  3. Test the command
  4. Update help.md if needed

View: .ai/_framework/commands/{name}.md
```

### Step 12: Auto-Sync (if enabled)

Check `auto_sync.enabled` via `get_frontmatter("_project/manifest.md")`.

**If auto_sync is enabled:**

Use the [[ai-sync]] agent to commit and push changes:
```
Use the ai-sync agent to sync the .ai folder changes
```

This ensures new commands are tracked in version control automatically.

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further.
