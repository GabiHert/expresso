---
type: command
name: document
layer: framework
tags:
  - command
---



> Parent: [[commands-index]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /document                                               ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Create documentation                                    ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /document - Create Documentation

## Description

Create or update documentation in the domain layer. Documentation helps future AI sessions and developers understand patterns, architecture, and conventions.

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ ⛔ DO NOT EDIT APPLICATION CODE                                 │
│                                                                 │
│ ALLOWED:  Read any file. Write ONLY inside .ai/ directory.      │
│ FORBIDDEN: Create, edit, or delete files outside .ai/           │
│ TEMP FILES: Scratch/temporary output goes in .ai/tmp/           │
│                                                                 │
│ This command creates and updates documentation files.            │
│ It must NEVER modify application source code, tests, or config. │
│ If you find yourself editing code files, STOP — you are off     │
│ track. Only .ai/docs/ and .ai/docs/docs-index.md may be written to. │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/document "authentication flow" in backend
/document "shared patterns" in _shared
/document "system architecture"
/document                          # Interactive mode
/document "auth flow"              # No repo → comprehensive analysis across ALL repos
/document "NATS patterns" --autopilot   # Auto-analyze and auto-decide structure
```

## Execution Modes

### Interactive Mode (Default)
- Asks clarifying questions about scope and location
- Confirms document structure before creating
- Good for: When you want control over documentation decisions

### Autopilot Mode (`--autopilot`)
- Automatically analyzes ALL repositories for the topic
- Auto-decides documentation structure based on findings
- Creates docs without asking for confirmation
- Good for: Quick documentation with trusted auto-decisions

### Comprehensive Analysis (No repo specified)
When no repository is specified, the command automatically:
1. Searches ALL repositories in the manifest
2. Analyzes which repos contain relevant code
3. Determines if topic is: single-repo, multi-repo, or shared pattern
4. Proposes appropriate documentation structure
5. In autopilot: auto-creates; In interactive: asks for approval

## Workflow

```
1. PARSE REQUEST
   • Identify topic and target location
   • Determine if new doc or update

2. EXPLORE CONTEXT
   • Launch Explore agents for topic
   • Find relevant code and patterns
   • Check existing docs for overlap

3. GENERATE DOCUMENTATION
   • Use doc.md template
   • Follow standard structure
   • Include code references

4. PLACE APPROPRIATELY
   • If repo-specific: .ai/docs/{repo}/
   • If shared: .ai/docs/_shared/
   • If architecture: .ai/docs/_architecture/

5. UPDATE INDEX (REQUIRED)
   • Add [[wikilink]] to docs-index.md
   • Link from related docs
   • This step is MANDATORY - do not skip
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.md` (or use `get_frontmatter("_project/manifest.md")`) to understand:
   - Available repositories (frontmatter field `repos`)
   - Project structure

2. Read `.ai/docs/docs-index.md` to see existing documentation and avoid duplicates.

3. **Extension Support**: This command supports compiled extensions
   via `/command-extend document --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

### Step 1: Parse Request

**If topic and location provided:**
- Parse topic from first argument
- Parse location from "in {location}" phrase

**If only topic provided:**
- Ask where to place it:
  ```
  Where should this documentation live?
    1. {repo} - Repository-specific docs
    2. {repo} - Repository-specific docs
    3. _shared - Cross-cutting patterns
    4. _architecture - System architecture

  Choice?
  ```

**If no arguments provided (interactive mode):**
Ask questions to understand what to document:
```
What would you like to document?
  1. A pattern or convention I learned
  2. Architecture or system design
  3. A specific feature or module
  4. How something works in the codebase
  5. Something else

Choice?
```

Follow up with:
- What specifically should be documented?
- Which repos/areas does it relate to?
- Any existing docs it should link to?

### Step 2: Comprehensive Analysis (When No Repo Specified)

**If no repository was specified in the request**, perform comprehensive analysis:

1. **Search ALL repositories** listed in `manifest.md` frontmatter (`repos` field):
   - For each repo, search for files related to the topic
   - Count occurrences and file types
   - Identify primary vs secondary implementations

2. **Analyze and categorize findings**:

```
COMPREHENSIVE ANALYSIS
══════════════════════════════════════════════════════════════════

Topic: "{topic}"

Searching repositories...

FINDINGS:
{for each repo with matches}
  {repo}: {count} files, ~{lines} lines
    • {primary file types and purposes}
{/for}

{for repos with no matches}
  {repo}: No matches found
{/for}
```

3. **Determine documentation type**:

| Finding | Documentation Type | Structure |
|---------|-------------------|-----------|
| One repo dominant (>80%) | Single-repo doc | `.ai/docs/{repo}/{topic}/` |
| 2-3 repos involved | Multi-repo (Hybrid) | `.ai/docs/_architecture/{topic}.md` + per-repo docs |
| Pattern across many repos | Shared pattern | `.ai/docs/_shared/{topic}.md` |
| System-level concept | Architecture | `.ai/docs/_architecture/{topic}.md` |

4. **Report analysis and propose structure**:

```
ANALYSIS COMPLETE
══════════════════════════════════════════════════════════════════

Pattern Type: {Single-repo | Multi-repo | Shared | Architecture}

{if single-repo}
Primary: {repo} ({percentage}% of implementation)
Structure: .ai/docs/{repo}/{topic}/README.md
{/if}

{if multi-repo}
Primary: {repo1} (core implementation)
Secondary: {repo2}, {repo3} (integrations)

Structure:
  .ai/docs/_architecture/{topic}.md (system overview)
  .ai/docs/{repo1}/{topic}/README.md (primary impl)
  .ai/docs/{repo2}/{topic}/README.md (integration)
{/if}

{if shared}
Found across: {list of repos}
Structure: .ai/docs/_shared/{topic}.md
{/if}

{if not autopilot}
Proceed with this structure? (y/n/adjust)
{/if}
```

5. **In autopilot mode**: Skip confirmation, proceed with proposed structure
6. **In interactive mode**: Wait for user approval or adjustment

### Step 3: Check for Existing Documentation

Search existing docs for overlap using vault search:
```
# Check if similar doc exists
search_notes("type: doc {topic keywords}")
# Or use Glob/Grep for pattern matching:
Glob(".ai/docs/**/*.md")
Grep("{topic keywords}", glob="*.md", path=".ai/docs/")
```

If similar doc found:
```
Found existing documentation that might overlap:
  • .ai/docs/{repo}/{existing-doc}.md - {title}

Options:
  1. Update existing doc
  2. Create new doc (will link to existing)
  3. Cancel

Choice?
```

### Step 4: Explore Context

Launch an Explore agent to gather information:
```
Explore the codebase to document: {topic}

Gather:
1. Key files and their purposes
2. Patterns and conventions used
3. How components interact
4. Common usage examples
5. Potential pitfalls or gotchas
```

Compile exploration findings for documentation.

### Step 5: Generate Documentation

Create the documentation file using the template from `_framework/templates/doc.md`.

**Determine file name:**
- Convert topic to kebab-case: "authentication flow" → `authentication-flow.md`
- Place in appropriate directory

**Fill in template sections:**

```markdown
---
type: doc
tags: [doc, {topic-kebab-case}]
---

> Parent: [[docs-index]]

# {Topic Name}

{Brief one-sentence description from exploration}

---

## Overview

- **What**: {What this topic covers}
- **Why**: {Why it exists or matters}
- **When**: {When to use or reference this}

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| {term} | {definition from exploration} |

---

## Architecture / Structure

{Diagram or structure overview from exploration}

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| {component} | `{path}` | {purpose} |

---

## Patterns & Conventions

### Pattern: {Name}

**When to use**: {scenario}

**Example from codebase**: `{path}:{lines}`

---

## Examples

{Real code examples from exploration}

---

## Common Pitfalls

{Issues discovered during exploration}

---

## Related Documentation

- [[{related-note-name}]]

---

_Created: {YYYY-MM-DD}_
_Last Updated: {YYYY-MM-DD}_
```

### Step 6: Update docs-index.md (MANDATORY)

Add the new documentation to `.ai/docs/docs-index.md` using `patch_note` or `write_note`.

**Add a wikilink** to the new doc in the docs-index body:
```markdown
- [[{topic-kebab-case}]] — {Brief description}
```

If no Documentation list exists in `docs-index.md`, append one:
```markdown
## Documentation

- [[{topic-kebab-case}]] — {description}
```

Use `patch_note("docs/docs-index.md", content_to_append)` to add the wikilink without overwriting existing entries.

### Step 7: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ DOCUMENTATION CREATED                                            ║
╚══════════════════════════════════════════════════════════════════╝

Topic: {topic}
Location: .ai/docs/{location}/{filename}.md

Sections:
  ✓ Overview
  ✓ Key Concepts ({count} terms)
  ✓ Architecture
  ✓ Patterns ({count} patterns)
  ✓ Examples ({count} examples)
  ✓ Common Pitfalls

Updated:
  ✓ .ai/docs/docs-index.md - Added [[wikilink]] entry

Related Docs:
  • {related doc 1}
  • {related doc 2}

View: .ai/docs/{location}/{filename}.md
```

### Step 8: Auto-Sync (if enabled)

Use `get_frontmatter("_project/manifest.md")` and check the `auto_sync` field for `enabled: true`.

**If auto_sync is enabled:**

Use the [[ai-sync]] agent to commit and push changes:
```
Use the ai-sync agent to sync the .ai folder changes
```

This ensures new documentation is tracked in version control automatically.

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further.

## Template Structure

See `.ai/_framework/templates/doc.md` for full template.

Key sections:
- Overview (what, why, when)
- Key Concepts
- Architecture/Structure
- Patterns & Conventions
- Examples
- Common Pitfalls
- Related Documentation
