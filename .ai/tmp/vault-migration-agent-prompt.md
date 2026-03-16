# Vault Migration — Command Rewrite Prompt

You are rewriting a single framework command file to be vault-native. The `.ai/` folder is now an Obsidian vault accessed via mcpvault MCP server.

## Your Task

Rewrite the command file at the path provided to you. Replace ALL old filesystem patterns with vault-native patterns. The command's logic and purpose stay the same — only the file operations and references change.

## What to Change

### 1. manifest.yaml → manifest.md
- `Read .ai/_project/manifest.yaml` → `Read .ai/_project/manifest.md` or `get_frontmatter("_project/manifest.md")`
- `parseYaml(manifest)` → frontmatter is already YAML, use `get_frontmatter`
- The manifest data is now in frontmatter fields (repos, conventions, mcps, etc.)

### 2. status.yaml → task note frontmatter
- `Read status.yaml` → `get_frontmatter` on the task note (e.g., `tasks/TASK-ID/TASK-ID.md`)
- `Update status.yaml` → `update_frontmatter` on the task note
- Work item status is in each work item's frontmatter, not in status.yaml
- The task note's `summary` frontmatter field has `{total, todo, in_progress, done}` counts
- `work_items` list no longer exists as a separate file — scan the task folder for work-item `.md` files

### 3. Folder-based status → frontmatter status
OLD structure:
```
tasks/
  todo/TASK-ID/
  in_progress/TASK-ID/
  done/TASK-ID/
```

NEW structure:
```
tasks/
  TASK-ID/
    TASK-ID.md          ← frontmatter has status: todo|in_progress|done
    TASK-ID-01.md       ← work item, frontmatter has status
    TASK-ID-02.md
```

- `tasks/todo/` → `search_notes("type: task status: todo")` or scan tasks/ and check frontmatter
- `tasks/in_progress/` → `search_notes("type: task status: in_progress")`
- `tasks/done/` → `search_notes("type: task status: done")`
- "Move file from todo/ to in_progress/" → `update_frontmatter` to change `status` field + update tags
- "Move file from in_progress/ to done/" → same, update frontmatter status

### 4. Work item status subfolders → frontmatter
OLD: `tasks/in_progress/TASK-ID/todo/01-item.md`, `tasks/in_progress/TASK-ID/done/01-item.md`
NEW: `tasks/TASK-ID/01-item.md` with frontmatter `status: todo|in_progress|done`

- "Move work item to in_progress/" → update work item's frontmatter status
- "Move work item to done/" → update work item's frontmatter status
- "Check which items are in todo/" → scan task folder, read frontmatter of each .md, filter by status

### 5. cockpit/ references → remove
- Delete any references to `cockpit/`, `shadows/`, `events/`, session tracking
- `/task-resume` no longer reads cockpit data — it searches for the task via `search_notes`

### 6. .yaml file references → .md
- Agent definitions are now `.md` with frontmatter (were `.yaml`)
- Extension sources are now `.md` with frontmatter (were `.yaml`)
- No `.yaml` files exist in the vault

### 7. Creating new files — vault conventions
When the command creates files, it MUST follow these rules:

**Frontmatter is mandatory** on every new file:
```yaml
---
type: <note-type>
tags: [<type>, ...]
---
```

**Parent link is mandatory** as first line after frontmatter:
```
> Parent: [[parent-note-name]]
```

Parent resolution:
- task → `[[task-index]]`
- work-item → `[[TASK-ID]]` (parent task)
- agent → `[[agents-index]]`
- command → `[[commands-index]]`
- doc → `[[docs-index]]`

**Wikilinks** for all references to other notes: `[[note-name]]`

**Update parent's body** — when creating a new note, add `[[new-note]]` to the parent note's body.

**Tags mirror key fields** — always include the `type` value and status/repo in tags.

### 8. MCP hybrid rule
When the command instructs the AI to read/write files:
- **Searching** (unknown path, finding tasks by status, querying docs) → use mcpvault `search_notes`, `get_frontmatter`
- **Known path** (reading a specific file) → use `Read` tool directly
- **Writing/updating** docs, tasks, work items → use mcpvault `write_note`, `update_frontmatter`, `patch_note`
- **Pattern matching** → use `Glob`/`Grep` tools

### 9. Index nodes
The vault has four index hub notes that commands should reference and update:
- `tasks/task-index.md` — lists all tasks with wikilinks
- `docs/docs-index.md` — lists all documentation
- `_framework/agents/agents-index.md` — lists all agents
- `_framework/commands/commands-index.md` — lists all commands

When creating a new task, add its `[[wikilink]]` to `task-index.md`.
When creating a new doc, add its `[[wikilink]]` to `docs-index.md`.

## What NOT to Change

- The command's purpose, scope constraints, and workflow logic
- The `<!-- header -->` HTML comment block (if present)
- The `## SCOPE CONSTRAINT` block
- Agent invocation patterns (still use "Invoke the {agent} agent")
- Git safety rules and multi-repo handling
- The overall step structure and numbering

## Output

Read the command file, apply all the changes above, and write the updated file back using the Edit tool. Make sure every old pattern reference is updated. Do NOT leave any `status.yaml`, `manifest.yaml`, `todo/`, `in_progress/`, `done/` folder references, or `cockpit/` references.

After editing, list the changes you made as a brief summary.
