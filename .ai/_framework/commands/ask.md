---
type: command
name: ask
layer: framework
tags:
  - command
---



> Parent: [[commands-index]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /ask                                                    ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Answer questions using documentation before code        ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /ask - Documentation-First Question Answering

## Description

Answer questions by searching the `.ai/` documentation first, before exploring code. This ensures curated knowledge is used before raw code exploration.

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
/ask "How does authentication work?"
/ask "What's the pattern for API endpoints?"
/ask "Where is user validation handled?"
/ask                                    # Interactive mode
```

## Why Use This Command

- **Faster answers**: Documentation is curated and summarized
- **Better context**: Docs include "why" not just "what"
- **Historical knowledge**: Completed tasks have learnings
- **Avoids redundant exploration**: Don't rediscover what's documented

## Workflow

```
1. PARSE QUESTION
   • Extract keywords and intent
   • Identify relevant areas (repos, features, patterns)

2. SEARCH DOCUMENTATION (in order)
   • _project/manifest.md - Project overview and repos (get_frontmatter)
   • docs/docs-index.md - Find relevant doc links
   • docs/ - Feature and repo documentation
   • search_notes("type: task status: in_progress") - Active task context
   • search_notes("type: task status: done") - Historical learnings

3. COMPILE FINDINGS
   • Gather all relevant documentation
   • Note what was found vs what's missing

4. PRESENT ANSWER
   • Answer from documentation
   • Cite sources with file paths
   • Indicate confidence level

5. OFFER NEXT STEPS
   • If answer complete: Done
   • If partial: Offer code exploration
   • If not found: Suggest /task-explore
```

## Implementation

### Step 0: Orientation

1. Use `get_frontmatter("_project/manifest.md")` to understand available repositories (repos, conventions, mcps).

2. **Extension Support**: This command supports compiled extensions
   via `/command-extend ask --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

3. Announce:
   ```
   ╔══════════════════════════════════════════════════════════════════╗
   ║ DOCUMENTATION SEARCH                                             ║
   ╚══════════════════════════════════════════════════════════════════╝
   ```

### Step 1: Parse Question

**If question provided as argument:**
- Extract keywords
- Identify topic area (e.g., "authentication" → auth, security, login)
- Identify scope (specific repo? feature? pattern?)

**If no argument (interactive mode):**
```
What would you like to know?

I'll search the project documentation first, then offer code
exploration if needed.

Your question:
```

### Step 2: Read Project Manifest

Use `get_frontmatter("_project/manifest.md")` for:
- Project overview and repo list
- Conventions and active focus areas
- Any active task references

Note any relevant findings.

### Step 3: Search docs-index

Read `.ai/docs/docs-index.md` to find:
- Relevant documentation links
- Which repos might have docs on this topic
- Related patterns or architecture docs

### Step 4: Search docs/

Based on docs-index findings, read relevant documentation:

**Priority order:**
1. Direct topic match (e.g., `docs/peo/hris_integration/` for HRIS questions)
2. Repo-level README (e.g., `docs/backend/README.md`)
3. Shared patterns (e.g., `docs/_shared/sequelize-patterns.md`)
4. Architecture docs (e.g., `docs/_architecture/overview.md`)

Read up to 5 most relevant files.

### Step 5: Search tasks/

Check for relevant tasks using vault search:

**In Progress:**
Use `search_notes("type: task status: in_progress")` to find active tasks related to the topic.

**Completed:**
Use `search_notes("type: task status: done")` to find completed tasks with relevant historical learnings.

### Step 6: Compile and Present

Output findings:

```
╔══════════════════════════════════════════════════════════════════╗
║ ANSWER: "{question}"                                             ║
╠══════════════════════════════════════════════════════════════════╣

SUMMARY
══════════════════════════════════════════════════════════════════
{Concise answer based on documentation}

SOURCES
══════════════════════════════════════════════════════════════════
  • {file1.md}:{lines} - {what it says}
  • {file2.md}:{lines} - {what it says}
  • {file3.md}:{lines} - {what it says}

{if partial answer}
GAPS
══════════════════════════════════════════════════════════════════
The documentation doesn't cover:
  • {aspect 1}
  • {aspect 2}
{/if}

╚══════════════════════════════════════════════════════════════════╝
```

### Step 7: Offer Next Steps

**If answer is complete:**
```
NEXT STEPS

  1. Done - question answered
  2. Explore code for more details (/task-explore)
  3. Ask a follow-up question

Choice?
```

**If answer is partial:**
```
NEXT STEPS

Documentation partially answers your question. Would you like to:

  1. Explore code for the missing parts (/task-explore "{gaps}")
  2. Accept partial answer
  3. Ask a different question

Choice?
```

**If nothing found:**
```
DOCUMENTATION SEARCH: No Results

The documentation doesn't have information about "{topic}".

Would you like to:

  1. Explore the codebase (/task-explore "{question}")
  2. Create documentation for this topic (/document)
  3. Ask a different question

Choice?
```

Then stop. Wait for user input.

## Output Format Example

```
╔══════════════════════════════════════════════════════════════════╗
║ ANSWER: "How does HRIS integration work?"                        ║
╠══════════════════════════════════════════════════════════════════╣

SUMMARY
══════════════════════════════════════════════════════════════════
HRIS integration syncs employee data between Deel and external HR
systems (BambooHR, HiBob, Workday). The PEO service handles sync
via the HrisSyncService which processes incoming webhooks and
outgoing data pushes. Field mappings are defined per provider.

Key flows:
1. Inbound: Webhook → HrisSyncService → Update PEO contract
2. Outbound: Contract change → Event → Push to HRIS provider

SOURCES
══════════════════════════════════════════════════════════════════
  • docs/peo/hris_integration/README.md:1-50 - Overview and architecture
  • docs/peo/hris_integration/module_overview.md:1-100 - Detailed module structure
  • docs/peo/hris_integration/hibob_testing_guide.md:1-30 - Testing approach

RELATED TASKS
══════════════════════════════════════════════════════════════════
  • [[PEOCM-819]] (status: in_progress) - Removing effectiveDate from HRIS sync

╚══════════════════════════════════════════════════════════════════╝

NEXT STEPS

  1. Done - question answered
  2. Explore code for more details
  3. Ask a follow-up question

Choice?
```
