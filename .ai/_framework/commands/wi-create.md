---
type: command
name: wi-create
layer: framework
tags:
  - command
---



> Parent: [[commands-index]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /wi-create                                              ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Quickly add work items to an existing task              ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /wi-create - Create Work Items for Existing Task

## Description

Quickly add one or more work items to an existing task. Unlike `/task-create` which builds a full task from scratch with exploration and planning, this command adds work items to a task that already exists — useful for ad-hoc fixes, PR review feedback, or new requirements discovered during development.

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ DO NOT EDIT APPLICATION CODE                                     │
│                                                                 │
│ ALLOWED:  Read any file. Write ONLY inside .ai/ directory.      │
│ FORBIDDEN: Create, edit, or delete files outside .ai/           │
│ TEMP FILES: Scratch/temporary output goes in .ai/tmp/           │
│                                                                 │
│ This command creates work item definitions only.                │
│ It must NEVER modify application source code, tests, or config. │
│ If you find yourself editing code files, STOP — you are off     │
│ track.                                                          │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/wi-create TASK-44 fix null dereference in endpoint
/wi-create TASK-44 "fix null dereference" "add missing validation" "update tests"
/wi-create fix the auth bug             # Uses current in-progress task
/wi-create TASK-44 --repo backend fix entity transfer status mapping
```

## Workflow

```
1. RESOLVE TASK
   • Find task by ID or use current in-progress task
   • Read task note frontmatter to get current work item count and repo info

2. PARSE WORK ITEMS
   • Extract descriptions from arguments
   • If multiple items in quotes, create one per quoted string
   • If single description, create one work item

3. DETERMINE REPO & BRANCH
   • If --repo specified, use that
   • If task has only one repo, use that
   • If task has multiple repos, ask which repo per item

4. ASSIGN IDs
   • Continue numbering from last work item in task folder
   • Format: {TASK-ID}-{NN} (2-digit, zero-padded)

5. QUICK EXPLORATION (optional)
   • If work item description mentions specific files/areas,
     do a quick Glob/Grep to find relevant file paths
   • Include file paths in implementation steps

6. CREATE FILES
   • Create work item .md files with frontmatter status: todo
   • Update task note frontmatter summary counts
   • Add wikilink to task note body

7. OUTPUT SUMMARY
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.md` (or use `get_frontmatter("_project/manifest.md")`) to get repo list and paths.

2. **Extension Support**: This command supports compiled extensions
   via `/command-extend wi-create --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

3. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ ADD WORK ITEMS                                                   ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 1: Resolve Task

**Parse arguments to find task ID:**

1. Check if first argument matches a task ID pattern (e.g., `TASK-123`, `LOCAL-001`)
2. If found, locate the task note at `.ai/tasks/{task-id}/{task-id}.md`
3. If NOT found in arguments, use `search_notes("type: task status: in_progress")` to find in-progress tasks
   - If exactly one: use it automatically
   - If multiple: list them and ask which one
   - If none: error — "No task in progress and no task ID provided."

4. Use `get_frontmatter("tasks/{task-id}/{task-id}.md")` to get:
   - `summary` field: `{total, todo, in_progress, done}` counts
   - Repo paths and branch info

5. Read the task note body to get branch naming pattern.

6. Scan `tasks/{task-id}/` for existing work item `.md` files (excluding `{task-id}.md`) to determine current numbering.

### Step 2: Parse Work Item Descriptions

Extract work item descriptions from the remaining arguments (after task ID):

**Parsing rules:**
- Look for `--repo <name>` flag — extract and remove from description
- Multiple quoted strings = multiple work items: `"fix A" "fix B"` → 2 items
- Comma-separated list = multiple work items: `fix A, fix B, update C` → 3 items
- Single unquoted string = one work item: `fix null dereference in tech_ops` → 1 item

**For each work item, extract:**
- `description`: the user's text (cleaned up)
- `repo`: from --repo flag, or to be determined in Step 3
- `slug`: kebab-case version of description (max 6 words)

### Step 3: Determine Repo and Branch

For each work item:

1. **If `--repo` was specified**: Use that repo for all items
2. **If task has only one unique repo across all work items**: Use that repo
3. **If task has multiple repos**: Try to infer from description keywords
   - Look for repo names mentioned in description
   - Look for file paths that match a repo
   - If ambiguous, ask the user:
     ```
     Which repo for "{description}"?
     1. backend
     2. frontend
     3. documents

     Choice?
     ```

4. **Get repo details from manifest.md:**
   - `repo_path`: resolve to absolute path
   - `repo_protected`: check manifest frontmatter for `protected: true`

5. **Get branch from existing work items** in the same repo within this task — read frontmatter of existing work item `.md` files.

### Step 4: Assign IDs and Create Slugs

1. Find the highest work item number by scanning `tasks/{task-id}/` for `.md` files matching `{TASK-ID}-NN` pattern:
   - Parse all filenames: `TASK-44-34-some-slug.md` → 34
   - Next ID starts at max + 1

2. For each new work item:
   - `id`: `{TASK-ID}-{next_number}` (2-digit zero-padded if < 100)
   - `slug`: kebab-case from description, max 6 words
     - Example: "fix null dereference in tech_ops endpoint" → `fix-null-dereference-tech-ops`
   - `filename`: `{id}-{slug}.md`

### Step 5: Quick Context Gathering (Optional, Lightweight)

For each work item, do a **quick** search if the description mentions specific code areas:

- If description mentions a file name → `Glob` for it
- If description mentions a function/class → `Grep` for it
- If description mentions an endpoint → `Grep` for the route

Include any found file paths in the work item's Implementation Steps.

**Keep this fast** — max 2-3 searches per work item. This is NOT a full exploration.

### Step 6: Create Work Item Files

For each new work item, create `tasks/{task-id}/{id}-{slug}.md` using `write_note`:

```markdown
---
type: work-item
tags: [work-item, todo, {repo}]
status: todo
task: {task-id}
repo: {repo}
repo_path: {absolute_path}
branch: {branch_name}
protected: {true|false}
---

> Parent: [[{task-id}]]

# {Work Item Title}

## Objective

{user's description, expanded into a clear objective}

## Pre-Implementation

Before starting, consider running an **exploration agent** to gather context about the affected code areas.

## Implementation Steps

### Step 1: Investigate

**Instructions**:
{if file paths found in Step 5}
Review the following files:
- `{file_path_1}`
- `{file_path_2}`
{else}
Locate the relevant code for: {description}
{/if}

### Step 2: Implement Fix

**Instructions**:
{brief implementation guidance based on the description}

### Step 3: Verify

**Instructions**:
- Run existing tests to ensure no regressions
- Verify the fix addresses the described issue

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] {primary criterion derived from description}
- [ ] No regressions in existing tests

## Testing

Verify by running relevant test suite for the affected area.

## Notes

Created via /wi-create — may need additional detail before implementation.
```

### Step 7: Update Task Note

1. Use `update_frontmatter` on `tasks/{task-id}/{task-id}.md` to update the `summary` field:
   ```yaml
   summary:
     total: {old_total + new_count}
     todo: {old_todo + new_count}
     in_progress: {unchanged}
     done: {unchanged}
   ```

2. Update the `updated` date to today using `update_frontmatter`.

3. Use `patch_note` to add `[[{id}-{slug}]]` wikilinks to the task note body (Work Items section).

### Step 8: Update Task Note Body

Add the new work items to the Work Items table in the task note body using `patch_note`:
```markdown
| [[{id}-{slug}]] | {name} | {repo} | todo |
```

### Step 9: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEMS ADDED                                                 ║
╚══════════════════════════════════════════════════════════════════╝

Task: {task-id} - {title}

Added {count} work item(s):
{for each new item}
  {id}. {name} ({repo})
    → tasks/{task-id}/{id}-{slug}.md
{/for}

Task Progress:
  Done: {done_count}
  In Progress: {in_progress_count}
  Todo: {todo_count}
  ────────────────
  Total: {total_count}

Next:
  • /task-work {first-new-id}   Start working on new item
  • /task-status                View full dashboard
```

### Step 10: Auto-Sync (if enabled)

Check `_project/manifest.md` frontmatter for `auto_sync.enabled`.

**If auto_sync is enabled:**

Use the [[ai-sync]] agent to commit and push changes:
```
Use the ai-sync agent to sync the .ai folder changes
```

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further.
