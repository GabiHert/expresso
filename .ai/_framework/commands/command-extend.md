<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /command-extend                                         ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Create compiled project-level extensions for commands   ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /command-extend - Compiled Command Extensions

## Description

Create project-level compiled extensions for existing framework commands. Extensions are compiled into self-contained documents that the stub points to directly — no runtime discovery or merging needed.

This enables a layered customization approach:
- **Framework layer**: Generic commands (reusable across projects)
- **Project layer**: Compiled variants with project-specific workflows (TDD, BDD, custom agents)

## Usage

```
/command-extend task-create                       # Create default variant
/command-extend task-create --variant tdd         # Create named variant
/command-extend task-create --activate tdd        # Switch active variant
/command-extend task-create --recompile           # Recompile all variants from source
/command-extend task-create --recompile tdd       # Recompile specific variant
/command-extend --list                            # Show all variants with [active] indicator
/command-extend --migrate                         # Convert legacy .extend.md to compiled format
```

## File Structure

```
.ai/_framework/commands/task-create.md                → base (never modified by project)
.ai/_project/commands/task-create.active.md           → compiled, authoritative (what AI reads)
.ai/_project/commands/task-create.variant.tdd.md      → stored compiled variant
.ai/_project/commands/task-create.source.tdd.yaml     → source overrides (for recompilation)
.claude/commands/task-create.md                       → stub → points to active.md
.claude/commands/task-create:tdd.md                   → stub → points to variant.tdd.md
```

## How It Works

When you run `/command-extend task-create --variant tdd`:

1. Gathers customization details (context, agents, hooks, step overrides)
2. Saves source as `.ai/_project/commands/task-create.source.tdd.yaml`
3. Reads the full base command from `.ai/_framework/commands/task-create.md`
4. Compiles a fully self-contained document with all steps inlined
5. Writes compiled output to `.ai/_project/commands/task-create.variant.tdd.md`
6. Activates: copies to `.ai/_project/commands/task-create.active.md`
7. Updates stubs in `.claude/commands/` (and `.cursor/commands/` if exists)

When the user runs `/task-create`, the stub points directly to the compiled `active.md` — no runtime extension discovery needed.

## Source YAML Format

```yaml
variant: tdd
extends: task-create
created: 2026-01-23
context: |
  This project uses TDD with BDD-style specs.
pre_hooks:
  - name: "Check for specs"
    content: |
      1. Search for .feature files
      2. Include in task context if found
step_overrides:
  3:
    name: "Explore (TDD)"
    content: |
      1. Find existing test files
      2. Identify test patterns
  7:
    name: "Create Task Structure (TDD)"
    content: |
      For each work item: Red → Green → Refactor
post_hooks:
  - name: "Generate test skeletons"
    content: |
      1. Create test file placeholders
agents:
  exploration: "feature-dev:code-explorer"
  review: "feature-dev:code-reviewer"
step_injections:
  4:
    position: start
    content: |
      ⚠️ MANDATORY: Each work item MUST begin with BDD scenario creation.
      Do NOT design work items that start with "implement" without
      defining expected behavior FIRST.
  6:
    position: start
    content: |
      Before confirming, verify constraint compliance.
validation_checklist:
  step: 6
  items:
    - "Each work item begins with scenario/spec creation"
    - "Implementation steps follow (not precede) behavior definition"
```

## Compiled Output Format

```markdown
<!--
╔══════════════════════════════════════════════════════════════════╗
║ COMPILED COMMAND (DO NOT EDIT DIRECTLY)                          ║
║ Base: .ai/_framework/commands/{cmd}.md                           ║
║ Variant: {variant}                                               ║
║ Compiled: {YYYY-MM-DD}                                           ║
║ Source: .ai/_project/commands/{cmd}.source.{variant}.yaml        ║
║                                                                   ║
║ To modify: Edit source YAML then run                             ║
║   /command-extend {cmd} --recompile                              ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /{cmd} — {description}

## AUTHORITY NOTICE
This is a COMPILED command. It is the COMPLETE and AUTHORITATIVE
instruction set. Do NOT look for .extend.md files or fall back to
default framework behavior. Follow ONLY what is written here.

## Mandatory Constraints
{injected context from source YAML - these are NOT optional guidelines}

## Description
{from base}

## Usage
{from base, plus variant-specific usage}

## Workflow
{from base, adjusted for overrides}

## Implementation

### Pre-Hooks
{pre-hooks from source YAML}

### Step 0: Orientation
{base Step 0 WITHOUT extension check block}

### Step 1: ...
{inherited or overridden}

### Step 4: Design Implementation
{step_injection content if position=start}

{original step content}

{step_injection content if position=end}

### Step 6: Confirm with User
{step_injection content if position=start}

{original step content}

#### Validation Checklist
Before proceeding, verify:
- [ ] {validation item 1}
- [ ] {validation item 2}

...all steps inlined...

### Post-Hooks
{post-hooks from source YAML}
```

## Workflow

```
1. VALIDATE BASE COMMAND
   • Check that the base command exists in _framework/commands/
   • Read the base command to understand its workflow

2. GATHER EXTENSION DETAILS (if not --recompile/--activate/--migrate)
   • Ask about context to inject
   • Ask about custom agents to use
   • Ask about pre-hooks (before workflow)
   • Ask about step overrides (replace steps)
   • Ask about post-hooks (after workflow)

3. SAVE SOURCE YAML
   • Write source overrides to .ai/_project/commands/{cmd}.source.{variant}.yaml

4. COMPILE
   • Read base command, apply transformations, produce compiled document

5. ACTIVATE & UPDATE STUBS
   • Copy variant to active.md (if first or explicitly activated)
   • Update .claude/commands/ and .cursor/commands/ stubs

6. OUTPUT SUMMARY
   • Show what was created/updated
   • How to use the variant
```

## Implementation

### Questioning Strategy (AI-Agnostic)

This command gathers information through questions. Use the appropriate method for your environment:

**Claude Code (structured questions available):**
Use the `AskUserQuestion` tool with options for guided selection.

**Cursor / Other Editors (plain prompts):**
Use markdown prompts and wait for free-form user responses.

---

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand project context.

2. Verify we're in a project with the framework:
   - Check that `.ai/_framework/` exists
   - Check that `.ai/_project/` exists (create if needed)

3. Ensure `.ai/_project/commands/` directory exists (create if needed).

4. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ COMPILED COMMAND EXTENSIONS                                      ║
╚══════════════════════════════════════════════════════════════════╝

This will create a compiled project-level extension for a framework command.
Extensions are compiled into self-contained documents — no runtime merge needed.
```

### Step 1: Parse Arguments

**If `--list` flag:**
- Scan `.ai/_project/commands/` for:
  - `*.variant.*.md` files (compiled variants)
  - `*.active.md` files (active variants)
  - `*.extend.md` files (legacy, not yet migrated)
- For each command with variants, show:
  ```
  COMMAND VARIANTS
  ══════════════════════════════════════════════════════════════════
    /task-create
      default    [active]
      tdd

    /task-work
      default    [active]

  LEGACY EXTENSIONS (run --migrate to convert)
  ══════════════════════════════════════════════════════════════════
    /document    .ai/_project/commands/document.extend.md  [legacy]
  ```
- Then stop.

**If `--migrate` flag:**
- Go to Step 12 (Migration).

**If `--activate NAME` flag:**
- Validate that `.ai/_project/commands/{cmd}.variant.{NAME}.md` exists
- Copy it to `.ai/_project/commands/{cmd}.active.md`
- Update stub `.claude/commands/{cmd}.md` to point to `active.md`
- Mirror to `.cursor/commands/` if directory exists
- Announce:
  ```
  ✓ Activated variant '{NAME}' for /{cmd}
    .claude/commands/{cmd}.md → .ai/_project/commands/{cmd}.active.md
  ```
- Then stop.

**If `--recompile [NAME]` flag:**
- Go to Step 11 (Recompilation).

**If command name provided (normal flow):**
- Normalize: remove leading `/`, convert to lowercase
- Check if `.ai/_framework/commands/{command}.md` exists
- If not found, list available commands and ask for valid name
- Determine variant name: from `--variant NAME` argument or default to `"default"`

**If no command name:**

<details>
<summary>Claude Code (structured)</summary>

```
AskUserQuestion:
  question: "Which framework command do you want to extend?"
  header: "Command"
  options:
    - label: "task-create"
      description: "Create a new development task"
    - label: "task-work"
      description: "Implement work items"
    - label: "task-start"
      description: "Begin working on a task"
    - label: "task-review"
      description: "Run code review"
```
</details>

<details>
<summary>Cursor / Plain (markdown prompt)</summary>

```
Which framework command do you want to extend?

Available commands:
  task-create, task-work, task-start, task-done, task-review,
  task-explore, task-resume, task-status, ctx, help, init,
  document, enhance, ask, command-create, ai-sync, expresso-tags

Command to extend: /
```
</details>

### Step 2: Read Base Command

Read `.ai/_framework/commands/{command}.md` and extract:
- Title and description
- All workflow steps (Step 0, Step 1, ..., Step N)
- Key phases (orientation, exploration, review, output)

Present understanding:
```
BASE COMMAND: /{command}

Workflow Steps:
  0. Orientation
  1. {step 1}
  2. {step 2}
  ...

Variant: {variant_name}

Extensible Points:
  - Context injection (orientation phase)
  - Pre-hooks (before Step 0)
  - Step overrides (replace any step)
  - Agent customization (exploration/review)
  - Post-hooks (after final step)
```

### Step 3: Gather Context

<details>
<summary>Claude Code (structured)</summary>

```
AskUserQuestion:
  question: "What project-specific context should be injected into the orientation phase?"
  header: "Context"
  multiSelect: true
  options:
    - label: "TDD/BDD workflow"
      description: "Tests must be written first, use testing agents"
    - label: "API documentation"
      description: "OpenAPI specs required for API changes"
    - label: "Custom agents"
      description: "Use specific agents for exploration/review"
    - label: "Custom (describe)"
      description: "I'll describe my own context"
```

If user selects options, follow up for details on each.
</details>

<details>
<summary>Cursor / Plain (markdown prompt)</summary>

```
CONTEXT INJECTION

What project-specific context should be injected into the orientation phase?

Examples:
  - "This project uses TDD - tests must be written first"
  - "All API changes require OpenAPI spec updates"
  - "Use specific agents for exploration"

Your context (or 'skip' to skip this section):
```
</details>

### Step 4: Gather Agents

<details>
<summary>Claude Code (structured)</summary>

```
AskUserQuestion (Question 1):
  question: "Which agent should handle exploration phases?"
  header: "Exploration"
  options:
    - label: "Default (Explore)"
      description: "Use the standard Explore agent"
    - label: "feature-dev:code-explorer"
      description: "Feature development explorer with deeper analysis"
    - label: "Custom agent"
      description: "I'll specify a custom agent"

AskUserQuestion (Question 2):
  question: "Which agent should handle review phases?"
  header: "Review"
  options:
    - label: "Default (code-reviewer)"
      description: "Use the standard code-reviewer agent"
    - label: "feature-dev:code-reviewer"
      description: "Feature development reviewer with stricter checks"
    - label: "Custom agent"
      description: "I'll specify a custom agent"
```
</details>

<details>
<summary>Cursor / Plain (markdown prompt)</summary>

```
CUSTOM AGENTS

Exploration Phase:
  Default: Explore agent
  Your choice (or 'default'):

Review Phase:
  Default: code-reviewer agent
  Your choice (or 'default'):
```
</details>

### Step 5: Gather Pre-Hooks

<details>
<summary>Claude Code (structured)</summary>

```
AskUserQuestion:
  question: "What should happen BEFORE the base command workflow starts?"
  header: "Pre-Hooks"
  multiSelect: true
  options:
    - label: "Check for tests/specs"
      description: "Verify existing tests or BDD specs before proceeding"
    - label: "Validate branch"
      description: "Check branch naming conventions"
    - label: "Check prerequisites"
      description: "Verify required files or dependencies exist"
    - label: "None"
      description: "No pre-hooks needed"
```

If user selects hooks, follow up for specific details on each.
</details>

<details>
<summary>Cursor / Plain (markdown prompt)</summary>

```
PRE-HOOKS

What should happen BEFORE the base command workflow starts?

Examples:
  - Check for existing specs/tests
  - Verify branch naming conventions
  - Validate prerequisites

Pre-hooks (describe steps, or 'none'):
```
</details>

### Step 6: Gather Step Overrides

<details>
<summary>Claude Code (structured)</summary>

```
AskUserQuestion:
  question: "Do you want to override any steps in the base workflow?"
  header: "Overrides"
  options:
    - label: "Yes, select steps"
      description: "I want to replace specific workflow steps"
    - label: "No overrides"
      description: "Keep all base workflow steps as-is"
```

If "Yes", present the base workflow steps and ask:
```
AskUserQuestion:
  question: "Which steps do you want to override?"
  header: "Steps"
  multiSelect: true
  options:
    - label: "Step {N}: {name}"
      description: "{brief description}"
    # ... dynamic based on base command
```

For each selected step, ask for the replacement workflow.
</details>

<details>
<summary>Cursor / Plain (markdown prompt)</summary>

```
STEP OVERRIDES

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
</details>

### Step 7: Gather Step Injections

Step injections add constraint reminders INTO existing steps without replacing them entirely.

<details>
<summary>Claude Code (structured)</summary>

```
AskUserQuestion:
  question: "Do you want to inject constraint reminders into specific workflow steps?"
  header: "Injections"
  options:
    - label: "Yes, add injections"
      description: "Add mandatory constraint reminders at specific steps"
    - label: "No injections"
      description: "Steps will run as-is (or as overridden)"
```

If "Yes", present the base workflow steps and ask:
```
AskUserQuestion:
  question: "Which steps should have constraint reminders injected?"
  header: "Steps"
  multiSelect: true
  options:
    - label: "Step 4: Design Implementation"
      description: "Add constraints before designing work items"
    - label: "Step 6: Confirm with User"
      description: "Add constraints before confirmation"
    # ... dynamic based on base command
```

For each selected step, ask:
```
AskUserQuestion:
  question: "Where should the constraint appear in Step {N}?"
  header: "Position"
  options:
    - label: "Start of step"
      description: "Constraint appears before step instructions"
    - label: "End of step"
      description: "Constraint appears after step instructions"
```

Then ask for the constraint content.
</details>

<details>
<summary>Cursor / Plain (markdown prompt)</summary>

```
STEP INJECTIONS

Step injections add constraint reminders INTO existing steps without replacing them.
This is useful for enforcing project constraints at decision points.

Base Workflow Steps:
  0. Orientation
  {list steps from base command}

Which steps should have constraints injected? (list step numbers, or 'none')
For each, specify:
  - Position: start or end
  - Content: the constraint reminder text
```
</details>

### Step 8: Gather Validation Checklist

Validation checklists add mandatory checkpoints that must be verified before proceeding.

<details>
<summary>Claude Code (structured)</summary>

```
AskUserQuestion:
  question: "Do you want to add a validation checklist at any step?"
  header: "Validation"
  options:
    - label: "Yes, add checklist"
      description: "Add mandatory verification items before a step can proceed"
    - label: "No checklist"
      description: "No validation checkpoints needed"
```

If "Yes":
```
AskUserQuestion:
  question: "At which step should validation occur?"
  header: "Step"
  options:
    - label: "Step 6: Confirm with User"
      description: "Validate before user confirmation (recommended)"
    - label: "Step 4: Design Implementation"
      description: "Validate after designing work items"
    # ... dynamic
```

Then ask:
```
What items must be verified at this checkpoint?

Examples:
  - "Each work item begins with scenario/spec creation"
  - "No implementation without test specification first"
  - "All API changes have OpenAPI spec updates"

Enter checklist items (one per line):
```
</details>

<details>
<summary>Cursor / Plain (markdown prompt)</summary>

```
VALIDATION CHECKLIST

Validation checklists add mandatory checkpoints.
The AI must verify ALL items before proceeding past that step.

At which step should validation occur? (step number, or 'none')

What items must be verified? (one per line)
Examples:
  - "Each work item begins with scenario/spec creation"
  - "Implementation steps follow behavior definition"
```
</details>

### Step 9: Gather Post-Hooks

<details>
<summary>Claude Code (structured)</summary>

```
AskUserQuestion:
  question: "What should happen AFTER the base command workflow completes?"
  header: "Post-Hooks"
  multiSelect: true
  options:
    - label: "Generate test skeletons"
      description: "Create test file placeholders with TODOs"
    - label: "Update documentation"
      description: "Auto-update relevant docs"
    - label: "Run validations"
      description: "Execute additional checks or linting"
    - label: "None"
      description: "No post-hooks needed"
```

If user selects hooks, follow up for specific details on each.
</details>

<details>
<summary>Cursor / Plain (markdown prompt)</summary>

```
POST-HOOKS

What should happen AFTER the base command workflow completes?

Examples:
  - Generate test skeletons
  - Update documentation
  - Run additional validations

Post-hooks (describe steps, or 'none'):
```
</details>

### Step 10: Confirm and Compile

Present the summary:
```
╔══════════════════════════════════════════════════════════════════╗
║ EXTENSION SUMMARY                                                ║
╚══════════════════════════════════════════════════════════════════╝

Extends: /{command}
Variant: {variant_name}

CONTEXT
{context summary or "None"}

AGENTS
  Exploration: {agent or "Default"}
  Review: {agent or "Default"}

PRE-HOOKS
{list or "None"}

STEP OVERRIDES
{list steps being overridden or "None"}

STEP INJECTIONS
{list steps with injections and position, or "None"}

VALIDATION CHECKLIST
{step number and items, or "None"}

POST-HOOKS
{list or "None"}
```

<details>
<summary>Claude Code (structured)</summary>

```
AskUserQuestion:
  question: "Does this extension configuration look correct?"
  header: "Confirm"
  options:
    - label: "Yes, compile it"
      description: "Proceed with compilation"
    - label: "No, make changes"
      description: "Go back and modify the configuration"
```
</details>

If confirmed, proceed to compilation:

**10a. Save Source YAML:**

Write `.ai/_project/commands/{command}.source.{variant}.yaml`:
```yaml
variant: {variant_name}
extends: {command}
created: {YYYY-MM-DD}
context: |
  {user's context - will become "Mandatory Constraints" section}
pre_hooks:
  - name: "{hook name}"
    content: |
      {hook content}
step_overrides:
  {step_number}:
    name: "{step name}"
    content: |
      {override content}
step_injections:
  {step_number}:
    position: start|end
    content: |
      {constraint reminder to inject}
validation_checklist:
  step: {step_number}
  items:
    - "{item 1}"
    - "{item 2}"
post_hooks:
  - name: "{hook name}"
    content: |
      {hook content}
agents:
  exploration: "{agent}"
  review: "{agent}"
```

**10b. Compile the variant:**

Execute the Compilation Algorithm (see below).

**10c. Activate (if first variant or explicitly requested):**

- If no `{command}.active.md` exists yet, copy the compiled variant to `active.md`
- Update stubs

**10d. Update stubs:**

Write `.claude/commands/{command}.md`:
```
Follow the instructions in .ai/_project/commands/{command}.active.md

Arguments: $ARGUMENTS
```

Write `.claude/commands/{command}:{variant}.md`:
```
Follow the instructions in .ai/_project/commands/{command}.variant.{variant}.md

Arguments: $ARGUMENTS
```

If `.cursor/commands/` exists, mirror both stubs there.

### Compilation Algorithm

Given a base command file and a source YAML, produce a compiled document:

1. **Read** the full base command (`.ai/_framework/commands/{cmd}.md`)

2. **Parse** into sections:
   - Header comment block
   - Title and Description
   - Usage
   - Workflow summary
   - Implementation steps (Step 0, Step 1, ..., Step N)

3. **Apply transformations:**

   a. **Remove** the EXTENSION CHECK block from Step 0:
      - Find the block starting with `**EXTENSION CHECK (MANDATORY)**:` or similar
      - Remove everything from that line through the closing `└───...┘` box
      - Remove the numbered item that contained it

   b. **Inject** context as a new `## Mandatory Constraints` section before Description
      - Use header "Mandatory Constraints" NOT "Context (Project)"
      - This signals these are requirements, not optional background

   c. **Insert** pre-hooks as `### Pre-Hooks` section before Step 0

   d. **Replace** overridden steps entirely:
      - Match by step number first
      - If step numbers don't match (drift), try matching by step name
      - Replace the entire step content with override content

   e. **Apply step injections** (without replacing the step):
      - For each entry in `step_injections`:
        - If `position: start`, prepend the content at the beginning of that step
        - If `position: end`, append the content at the end of that step
      - Format injected content with a warning box:
        ```
        ┌─────────────────────────────────────────────────────────────────┐
        │ ⚠️ PROJECT CONSTRAINT                                           │
        ├─────────────────────────────────────────────────────────────────┤
        │ {injection content}                                             │
        └─────────────────────────────────────────────────────────────────┘
        ```

   f. **Insert validation checklist** at specified step:
      - If `validation_checklist` is defined:
        - At the end of the specified step, add:
          ```
          #### Validation Checklist (MANDATORY)
          Before proceeding to the next step, verify ALL items:
          - [ ] {item 1}
          - [ ] {item 2}

          ⛔ Do NOT proceed if any item is unchecked.
          ```

   g. **Insert** post-hooks as `### Post-Hooks` section after the final step

   h. **Inject** agent config:
      - In exploration steps, replace default agent references with configured agent
      - In review steps, replace default agent references with configured agent

4. **Prepend** the compiled header comment and Authority Notice

5. **Write** to `.ai/_project/commands/{cmd}.variant.{variant}.md`

### Step 11: Recompilation (`--recompile`)

When `--recompile [NAME]` is specified:

1. If NAME provided, recompile only that variant:
   - Read `.ai/_project/commands/{cmd}.source.{NAME}.yaml`
   - Read the base command
   - Run Compilation Algorithm
   - Write to `.ai/_project/commands/{cmd}.variant.{NAME}.md`
   - If this was the active variant, update `active.md` too

2. If no NAME, recompile all variants for the command:
   - Scan for `.ai/_project/commands/{cmd}.source.*.yaml`
   - For each, run Compilation Algorithm
   - Update `active.md` if the active variant was recompiled

3. Output:
   ```
   ╔══════════════════════════════════════════════════════════════════╗
   ║ RECOMPILATION COMPLETE                                           ║
   ╚══════════════════════════════════════════════════════════════════╝

   Recompiled:
     ✓ {cmd}.variant.{name1}.md
     ✓ {cmd}.variant.{name2}.md
     ✓ {cmd}.active.md (updated)

   Source: .ai/_framework/commands/{cmd}.md (current version)
   ```

Then stop.

### Step 12: Migration (`--migrate`)

When `--migrate` is specified:

1. Scan `.ai/_project/commands/` for `*.extend.md` files

2. If none found:
   ```
   No legacy extensions found. Nothing to migrate.
   ```
   Then stop.

3. For each legacy extension file:

   a. **Parse** the `.extend.md` sections:
      - Context section
      - Agents section (Exploration Phase, Review Phase)
      - Pre-Hooks section
      - Step Overrides section (parse "Override Step N:" patterns)
      - Step Injections section (if present - parse "Inject Step N:" patterns)
      - Validation Checklist section (if present)
      - Post-Hooks section

   b. **Generate** source YAML from parsed sections:
      ```yaml
      variant: default
      extends: {command}
      created: {YYYY-MM-DD}
      migrated_from: "{command}.extend.md"
      context: |
        {extracted context}
      pre_hooks:
        {extracted pre-hooks}
      step_overrides:
        {extracted step overrides, keyed by step number}
      step_injections:
        {extracted step injections, keyed by step number}
      validation_checklist:
        step: {step number if found}
        items: {extracted items}
      post_hooks:
        {extracted post-hooks}
      agents:
        exploration: "{extracted agent or null}"
        review: "{extracted agent or null}"
      ```

   c. **Compile** the variant using the Compilation Algorithm

   d. **Activate** it (copy to `active.md`)

   e. **Update** stubs

   f. **Rename** the legacy file: `{cmd}.extend.md` → `{cmd}.extend.md.migrated`

4. Output migration summary:
   ```
   ╔══════════════════════════════════════════════════════════════════╗
   ║ MIGRATION COMPLETE                                               ║
   ╚══════════════════════════════════════════════════════════════════╝

   Migrated:
     ✓ task-create.extend.md → compiled (variant: default, activated)
     ✓ task-work.extend.md → compiled (variant: default, activated)

   Legacy files renamed to .extend.md.migrated (safe to delete after verification).

   Verify:
     Run /{command} and confirm your customizations still apply.
   ```

Then stop.

### Step 13: Output Summary (Normal Flow)

After successful compilation:

```
╔══════════════════════════════════════════════════════════════════╗
║ EXTENSION COMPILED                                               ║
╚══════════════════════════════════════════════════════════════════╝

Created:
  ✓ .ai/_project/commands/{command}.source.{variant}.yaml
  ✓ .ai/_project/commands/{command}.variant.{variant}.md
  ✓ .ai/_project/commands/{command}.active.md
  ✓ .claude/commands/{command}.md → points to active.md
  ✓ .claude/commands/{command}:{variant}.md → points to variant

How It Works:
  Running /{command} now reads the compiled active.md directly.
  No runtime extension discovery needed.

Manage:
  • /command-extend {command} --list          View all variants
  • /command-extend {command} --activate X    Switch active variant
  • /command-extend {command} --recompile     Recompile after framework update
  • /command-extend {command} --variant new   Create another variant
  • Edit source YAML directly, then --recompile

View: .ai/_project/commands/{command}.active.md
```

Then stop. Do not proceed further.
