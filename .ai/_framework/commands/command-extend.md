<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /command-extend                                         ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Create project-level extensions for framework commands  ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /command-extend - Extend Framework Commands

## Description

Create project-level extensions for existing framework commands. Extensions auto-merge when running the base command, allowing you to inject project-specific agents, workflow steps, and context without modifying framework files.

This enables a layered customization approach:
- **Framework layer**: Generic commands (reusable across projects)
- **Project layer**: Extensions with project-specific workflows (TDD, BDD, custom agents)

## Usage

```
/command-extend task-create         # Extend /task-create for this project
/command-extend task-work           # Extend /task-work with custom workflow
/command-extend --list              # List all project extensions
```

## How Auto-Merge Works

When you run a framework command like `/task-create`:

1. Framework loads `.ai/_framework/commands/task-create.md`
2. Checks for `.ai/_project/commands/task-create.extend.md`
3. If extension exists, merges in this order:
   - Injects **Context** into orientation phase
   - Prepends **Pre-Hooks** before Step 0
   - Replaces steps marked with **Step Overrides**
   - Adds **Agents** to exploration/review phases
   - Appends **Post-Hooks** after final step

## Extension File Structure

Extensions are Markdown files stored in `.ai/_project/commands/`:

```markdown
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: PROJECT                                                   ║
║ EXTENDS: /task-create                                            ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: {project-specific description}                          ║
╚══════════════════════════════════════════════════════════════════╝
-->

# task-create Extension

## Context

{Project-specific context injected into the command's orientation phase}

Example:
- This project uses TDD with BDD-style specs
- All features must have Gherkin scenarios before implementation
- Use the feature-dev agents for exploration

## Agents

{Custom agents to use during exploration and review phases}

### Exploration Phase
- Use `feature-dev:code-explorer` instead of default Explore agent
- Focus on existing test patterns and BDD specs

### Review Phase
- Use `feature-dev:code-reviewer` with strict TDD checks
- Verify test coverage before marking complete

## Pre-Hooks

{Steps to execute BEFORE the base command workflow starts}

### Pre-Hook 1: Check for Existing Specs
Before creating the task, verify if Gherkin specs exist:
1. Search for `.feature` files related to the task
2. If found, include them in the task context
3. If not found, note that specs need to be written first

## Step Overrides

{Replace specific steps from the base command}

### Override Step 3: Explore Codebase
Replace the standard exploration with TDD-focused exploration:

1. Find existing test files for the affected area
2. Identify test patterns used (Jest, Mocha, etc.)
3. Look for BDD specs (.feature files)
4. Document the test structure for work items

### Override Step 7: Create Task Structure
Modify work item creation to include TDD steps:

For each work item, ensure this structure:
1. Write failing test (Red)
2. Implement minimum code (Green)
3. Refactor (Refactor)
4. Update BDD specs if needed

## Post-Hooks

{Steps to execute AFTER the base command workflow completes}

### Post-Hook 1: Generate Test Skeleton
After task creation:
1. Create test file placeholders for each work item
2. Add TODO comments with test scenarios
3. Update task README with testing instructions
```

## Workflow

```
1. VALIDATE BASE COMMAND
   • Check that the base command exists in _framework/commands/
   • Read the base command to understand its workflow

2. GATHER EXTENSION DETAILS
   • Ask about context to inject
   • Ask about custom agents to use
   • Ask about pre-hooks (before workflow)
   • Ask about step overrides (replace steps)
   • Ask about post-hooks (after workflow)

3. CONFIRM EXTENSION
   • Present summary of what will be extended
   • Show how it will merge with base command

4. CREATE EXTENSION FILE
   • Create .ai/_project/commands/{command}.extend.md
   • Use proper header format
   • Include all specified customizations

5. OUTPUT SUMMARY
   • Extension location
   • What was configured
   • How to test it
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand project context.

2. Verify we're in a project with the framework:
   - Check that `.ai/_framework/` exists
   - Check that `.ai/_project/` exists

3. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ EXTEND FRAMEWORK COMMAND                                         ║
╚══════════════════════════════════════════════════════════════════╝

This will create a project-level extension for a framework command.
Extensions auto-merge when you run the base command.
```

### Step 1: Parse Arguments

**If `--list` flag:**
- List all files in `.ai/_project/commands/` matching `*.extend.md`
- Show summary of each extension
- Then stop

**If command name provided:**
- Normalize: remove leading `/`, convert to lowercase
- Check if `.ai/_framework/commands/{command}.md` exists
- If not found, list available commands and ask for valid name

**If no command name:**
```
Which framework command do you want to extend?

Available commands:
  • task-create  - Create a new development task
  • task-work    - Implement work items
  • task-start   - Begin working on a task
  • task-done    - Complete and log a task
  • task-review  - Run code review
  • task-explore - Explore codebase
  • document     - Create documentation
  • (others...)

Command to extend: /
```

### Step 2: Read Base Command

Read `.ai/_framework/commands/{command}.md` and extract:
- Workflow steps
- Key phases (orientation, exploration, review, output)
- What can be extended/overridden

Present understanding:
```
BASE COMMAND: /{command}

Workflow Steps:
  0. Orientation
  1. {step 1}
  2. {step 2}
  ...

Extensible Points:
  • Context injection (orientation phase)
  • Pre-hooks (before Step 0)
  • Step overrides (replace any step)
  • Agent customization (exploration/review)
  • Post-hooks (after final step)
```

### Step 3: Gather Context

```
CONTEXT INJECTION

What project-specific context should be injected into the orientation phase?

Examples:
  • "This project uses TDD - tests must be written first"
  • "All API changes require OpenAPI spec updates"
  • "Use specific agents for exploration"

Your context (or 'skip' to skip this section):
```

### Step 4: Gather Agents

```
CUSTOM AGENTS

What agents should be used instead of defaults?

Current project agents (from manifest or describe):
{list available agents if known}

Exploration Phase:
  Default: Explore agent
  Your choice (or 'default'):

Review Phase:
  Default: code-reviewer agent
  Your choice (or 'default'):

Additional agents to invoke:
  (e.g., "Run BDD validator after exploration")
```

### Step 5: Gather Pre-Hooks

```
PRE-HOOKS

What should happen BEFORE the base command workflow starts?

Examples:
  • Check for existing specs/tests
  • Verify branch naming conventions
  • Validate prerequisites

Pre-hooks (describe steps, or 'none'):
```

### Step 6: Gather Step Overrides

```
STEP OVERRIDES

Do you want to replace any steps in the base workflow?

Base Workflow Steps:
  0. Orientation
  {list steps from base command}

Which steps to override? (list step numbers, or 'none')
For each, I'll ask for the replacement workflow.
```

If user selects steps, for each one:
```
OVERRIDE STEP {N}: {step name}

Original behavior:
{summarize what the step does}

Your replacement workflow:
(describe what should happen instead)
```

### Step 7: Gather Post-Hooks

```
POST-HOOKS

What should happen AFTER the base command workflow completes?

Examples:
  • Generate test skeletons
  • Update documentation
  • Run additional validations

Post-hooks (describe steps, or 'none'):
```

### Step 8: Confirm Extension

Present summary:
```
╔══════════════════════════════════════════════════════════════════╗
║ EXTENSION SUMMARY                                                ║
╚══════════════════════════════════════════════════════════════════╝

Extends: /{command}
Location: .ai/_project/commands/{command}.extend.md

CONTEXT
{context summary or "None"}

AGENTS
  Exploration: {agent or "Default"}
  Review: {agent or "Default"}
  Additional: {list or "None"}

PRE-HOOKS
{list or "None"}

STEP OVERRIDES
{list steps being overridden or "None"}

POST-HOOKS
{list or "None"}

Create this extension? (y/n)
```

### Step 9: Create Extension File

Create `.ai/_project/commands/{command}.extend.md`:

```markdown
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: PROJECT                                                   ║
║ EXTENDS: /{command}                                              ║
║ CREATED: {YYYY-MM-DD}                                            ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: {brief description of customization}                    ║
╚══════════════════════════════════════════════════════════════════╝
-->

# {command} Extension

{if context}
## Context

{user's context}

{/if}

{if agents configured}
## Agents

{if exploration agent}
### Exploration Phase
{exploration agent config}
{/if}

{if review agent}
### Review Phase
{review agent config}
{/if}

{if additional agents}
### Additional Agents
{additional agents}
{/if}

{/if}

{if pre-hooks}
## Pre-Hooks

{for each pre-hook}
### Pre-Hook {N}: {name}
{hook content}
{/for}

{/if}

{if step overrides}
## Step Overrides

{for each override}
### Override Step {N}: {step name}
{override content}
{/for}

{/if}

{if post-hooks}
## Post-Hooks

{for each post-hook}
### Post-Hook {N}: {name}
{hook content}
{/for}

{/if}
```

### Step 10: Create Commands Directory if Needed

If `.ai/_project/commands/` doesn't exist:
- Create the directory
- Add a README.md explaining project commands:

```markdown
# Project Commands

This directory contains project-level command extensions.

## How Extensions Work

Extensions in this directory automatically merge with framework commands:

| Extension File | Extends |
|---------------|---------|
| task-create.extend.md | /task-create |
| task-work.extend.md | /task-work |

When you run `/task-create`, the framework:
1. Loads `.ai/_framework/commands/task-create.md`
2. Finds `.ai/_project/commands/task-create.extend.md`
3. Merges the extension (context, hooks, overrides, agents)

## Creating Extensions

Use `/command-extend <command>` to create new extensions.
```

### Step 11: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ EXTENSION CREATED                                                ║
╚══════════════════════════════════════════════════════════════════╝

Created:
  ✓ .ai/_project/commands/{command}.extend.md

How It Works:
  When you run /{command}, your extensions will auto-merge:
  {if context}• Context injected into orientation{/if}
  {if pre-hooks}• Pre-hooks run before workflow{/if}
  {if overrides}• Steps {list} replaced with your versions{/if}
  {if agents}• Custom agents used for exploration/review{/if}
  {if post-hooks}• Post-hooks run after workflow{/if}

Test It:
  Run /{command} and verify your customizations are applied.

Manage Extensions:
  • /command-extend --list     View all extensions
  • Edit the file directly     Modify the extension
  • Delete the file            Remove the extension

View: .ai/_project/commands/{command}.extend.md
```

Then stop. Do not proceed further.

---

## Loading Extensions (For Command Implementers)

When implementing a framework command that supports extensions, add this to Step 0:

```markdown
### Step 0: Orientation (with Extension Support)

1. Read `.ai/_project/manifest.yaml`

2. Check for project extension:
   - Look for `.ai/_project/commands/{this-command}.extend.md`
   - If exists, read and parse the extension

3. If extension found:
   - Merge Context into orientation announcements
   - Queue Pre-Hooks to run before Step 1
   - Note Step Overrides for later
   - Configure Agents for exploration/review phases
   - Queue Post-Hooks to run after final step

4. Announce (include extension notice if applicable):
   ```
   ╔══════════════════════════════════════════════════════════════════╗
   ║ {COMMAND NAME}                                                    ║
   {if extension}║ + Project Extension Active                                       ║{/if}
   ╚══════════════════════════════════════════════════════════════════╝

   {merged context from extension}
   ```
```

This ensures extensions are discovered and applied automatically when users run framework commands.
