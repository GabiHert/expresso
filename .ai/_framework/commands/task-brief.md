<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /task-brief                                             ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Interactive pre-task scoping — explore, gap-fill,      ║
║          brainstorm, and produce a brief ready for /task-create  ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /task-brief — Pre-Task Scoping

## Description

An interactive scoping session that runs before `/task-create`. You bring
a ticket ID, a feature idea, or a bug description. The agent explores the
codebase, identifies gaps and unknowns, asks clarifying questions one at a
time, and — when everything is clear — produces a structured brief that
`/task-create` can directly consume to generate detailed work items.

Use `--quick` to skip the dialogue and get a passive investigation report only
(replaces the old `/task-explore` behaviour).

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ READ + WRITE TO .ai/ ONLY                                       │
│                                                                 │
│ ALLOWED:  Read any file. Write only to .ai/tasks/todo/ and      │
│           .ai/tmp/                                              │
│ FORBIDDEN: Edit application source code, tests, or config       │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/task-brief JIRA-123                  # Scope a known ticket
/task-brief "add cancellation flow"   # Scope a feature idea
/task-brief                           # Interactive — agent asks what to scope
/task-brief JIRA-123 --quick          # Passive investigation, no Q&A loop
```

## Modes

### Interactive Mode (default)
- Explores codebase, then opens a dialogue to fill gaps
- Asks questions one at a time (or in small thematic batches when related)
- Proposes approaches with tradeoffs
- Ends with a save prompt → produces `brief.md` → optionally chains to `/task-create`

### Quick Mode (`--quick`)
- Read-only codebase investigation, no dialogue
- Returns a structured report in the conversation
- Does not save a file or chain to `/task-create`
- Use when you just want to understand an area, not plan work

---

## Implementation

### Step 0: Orientation

Read `.ai/_project/manifest.yaml` to understand available repos and paths.

### Step 1: Parse Input

**If JIRA/task ID**: extract ticket description and context from the ID.
Ask the user for any description they can share if only an ID is given:
```
Tell me what JIRA-123 is about (or paste the ticket description).
I'll use that alongside the codebase to scope the work.
```

**If feature description**: use it directly as the starting point.

**If no input**:
```
What do you want to scope?

Give me a ticket ID, a feature description, or just describe the problem.
```

### Step 2: Codebase Exploration

Launch Explore agents across relevant repos. Focus on:
- Existing code that would be affected
- Related patterns and conventions
- Current behaviour vs desired behaviour
- Entry points, data flows, integration points
- Tests that reveal how things currently work

Run agents in parallel across repos when scope spans multiple.

Announce while running:
```
╔══════════════════════════════════════════════════════════════════╗
║ EXPLORING CODEBASE                                               ║
╚══════════════════════════════════════════════════════════════════╝

{list repos being explored}

Investigating...
```

### Step 3: Internal Analysis (do not show to user yet)

Before presenting anything, internally build:

**A. Impact Map**
- Which files/services are touched
- What currently exists vs what needs to change
- Dependencies between changes

**B. Gap List**
Things that are ambiguous or unknown:
- Missing requirements ("what should happen when X?")
- Technical unknowns ("no clear pattern for Y in this codebase")
- Decision points ("two ways to do this — needs a call")
- Out-of-scope boundaries ("does this include Z or not?")

**C. Approach Options**
Think through 2-3 ways to implement this. For each:
- What it involves
- Tradeoffs (complexity, risk, reusability, time)
- When it's the right choice

Only surface an unconventional approach if it's genuinely worth considering —
not to fill space. If there's clearly one right way, present that and move on.

**D. Question Queue**
Ordered list of questions to ask the user, prioritised by:
1. Blockers (can't proceed without this)
2. Approach decisions (shapes the whole implementation)
3. Edge cases and details (can be filled later if needed)

### Step 4: Present Initial Analysis

```
╔══════════════════════════════════════════════════════════════════╗
║ BRIEF: {topic}                                                   ║
╠══════════════════════════════════════════════════════════════════╣

WHAT I FOUND
{2-3 sentences on current state — what exists, what's missing}

AFFECTED AREAS
{repo}: {files/services involved}
{repo}: {files/services involved}

APPROACH
{If one clear approach}: {describe it and why it fits}

{If multiple approaches worth comparing}:
  Option A — {name}: {description}
    + {pro}
    - {con}

  Option B — {name}: {description}
    + {pro}
    - {con}

  {If genuinely creative option exists}:
  Option C — {name} (unconventional): {description}
    + {pro}
    - {con}

{N} open questions to resolve before we can create work items.
```

### Step 5: Q&A Loop

Ask questions **one at a time** (or group 2-3 if they're tightly related and answering one answers the others).

Format:
```
QUESTION {n}/{total}

{question}

{if helpful, provide options}:
  A) {option}
  B) {option}
  C) Other — tell me
```

After each answer:
- Acknowledge and incorporate into understanding
- If the answer raises a new question, add it to the queue
- Show remaining count: `({n} questions remaining)`

When all questions are answered:
```
All gaps resolved. Ready to write the brief.
```

### Step 6: Brief Summary (before saving)

Present a summary for user confirmation:

```
╔══════════════════════════════════════════════════════════════════╗
║ BRIEF SUMMARY                                                    ║
╠══════════════════════════════════════════════════════════════════╣

PROBLEM
{what and why}

CHOSEN APPROACH
{approach name}: {rationale}

SCOPE
  In:  {what's included}
  Out: {what's explicitly excluded}

AFFECTED REPOS
  • {repo}: {what changes}
  • {repo}: {what changes}

KEY DECISIONS
  • {decision 1 — from Q&A}
  • {decision 2 — from Q&A}

RISKS / NOTES
  • {any remaining concern or caveat}

Does this look right? (y / adjust)
```

If user adjusts, update accordingly and re-present.

### Step 7: Save and Chain

When confirmed:
```
What should this task be called?
(This becomes the folder name and task title)

Task name:
```

Save the brief to:
```
.ai/tasks/todo/{slugified-task-name}/brief.md
```

Brief file format:
```markdown
---
title: "{task name}"
source: "{JIRA-ID or description}"
created: "{YYYY-MM-DD}"
status: brief
---

## Problem

{what and why}

## Chosen Approach

{approach name and rationale}

## Scope

**In scope:**
{list}

**Out of scope:**
{list}

## Affected Areas

{repo}:
- {file/service}: {what changes}

## Key Decisions

{decision 1}
{decision 2}

## Risks / Notes

{risks or caveats}

## Open Questions (resolved)

**Q: {question}**
A: {answer}

**Q: {question}**
A: {answer}
```

Then offer:
```
╔══════════════════════════════════════════════════════════════════╗
║ BRIEF SAVED                                                      ║
╠══════════════════════════════════════════════════════════════════╣

Saved to: .ai/tasks/todo/{task-name}/brief.md

What next?
  1. Create work items now  →  /task-create {task-name}
  2. Review the brief first →  open the file
  3. Done for now
```

If user picks 1, instruct them to run `/task-create {task-name}` —
`/task-create` will detect the `brief.md` and use it as input.

---

## Quick Mode Implementation (`--quick`)

Skip Steps 5–7. After Step 4 (initial analysis), output:

```
╔══════════════════════════════════════════════════════════════════╗
║ INVESTIGATION: "{query}"                                         ║
╠══════════════════════════════════════════════════════════════════╣

SUMMARY
{executive summary}

KEY FILES
{grouped by repo, with line numbers}

PATTERNS
{relevant conventions observed}

OPEN QUESTIONS
{gaps that would need resolving to implement this}

╚══════════════════════════════════════════════════════════════════╝
```

Then stop. No saving, no chaining.
