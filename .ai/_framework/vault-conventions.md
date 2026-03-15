---
type: command
name: vault-conventions
layer: framework
scope: reference
tags: [command, vault, conventions]
---

> Parent: [[commands-index]]

# Vault Conventions

Every `.md` file in the `.ai/` vault MUST follow these rules. Any command that
creates or modifies files (`/task-create`, `/task-work`, `/task-done`, `/document`,
`/command-create`, `/command-extend`, `/init`, `/enhance`) MUST comply.

## Rule 1: Frontmatter is mandatory

Every file MUST have YAML frontmatter with at minimum:

```yaml
---
type: <note-type>
tags: [<type>, <status-or-category>, ...]
---
```

### Frontmatter schemas by type

#### manifest
```yaml
type: manifest
project: "Project Name"
root: /absolute/path
repos: [...]
tags: [manifest, config]
```

#### task
```yaml
type: task
id: TASK-ID
title: "Task title"
status: todo | in_progress | done
priority: low | medium | high
created: YYYY-MM-DD
updated: YYYY-MM-DD
worktree: /path/to/worktree  # if applicable
repos: [repo1, repo2]
summary:
  total: N
  todo: N
  in_progress: N
  done: N
tags: [task, <status>, <repos...>]
```

#### [[work-item]]
```yaml
type: work-item
id: TASK-ID-NN
parent: TASK-ID
title: "Work item title"
status: todo | in_progress | done
repo: repo-name
depends_on: []
tags: [work-item, <status>, <repo>]
```

#### agent
```yaml
type: agent
name: agent-name
scope: read-only | ai-only | execution | git
tags: [agent, <scope>]
```

#### command
```yaml
type: command
name: command-name
layer: framework | project
scope: read-only | ai-only | execution | framework
tags: [command, <category>]
```

#### extension-source
```yaml
type: extension-source
variant: variant-name
extends: command-name
step_overrides: {...}
tags: [extension, <command>, <variant>]
```

#### doc
```yaml
type: doc
repo: repo-name        # if repo-specific
domain: domain-name    # if domain-specific
tags: [doc, <repo>, <domain>]
```

#### pattern
```yaml
type: pattern
domain: domain-name
applies_to: [repo1, repo2]
tags: [pattern, <domain>]
```

## Rule 2: Parent link is mandatory

Every file MUST have a parent link as the first line after frontmatter.
This ensures every node is reachable in the Obsidian graph view.

```markdown
---
frontmatter...
---

> Parent: [[parent-note-name]]
```

### Parent resolution

The vault has four **index nodes** that serve as hubs:
- `[[task-index]]` — all tasks
- `[[docs-index]]` — all documentation
- `[[agents-index]]` — all agent definitions
- `[[commands-index]]` — all commands and extensions

| File type | Parent |
|-----------|--------|
| task | `[[task-index]]` |
| [[work-item]] | `[[TASK-ID]]` (the parent task) |
| agent | `[[agents-index]]` |
| command | `[[commands-index]]` |
| extension-source | `[[command-it-extends]]` |
| doc | `[[docs-index]]` |
| pattern | `[[docs-index]]` |
| index | NONE (hub node) |
| manifest | NONE (config node) |

When creating a new note, also add a `[[wikilink]]` to the new note
in its parent's body (e.g., add `[[TASK-01]]` to `task-index.md`).

## Rule 3: Wikilinks for relationships

Use `[[wikilinks]]` to connect related notes. Never use plain text for
references to other notes in the vault.

### Required links

- **Tasks** MUST link to all their work items: `[[TASK-ID-01]]`
- **Work items** MUST link to their parent task via the parent link
- **Docs** SHOULD link to related tasks, patterns, and other docs
- **Extensions** MUST link to the command they extend via the parent link

### Where to add links

- First line after frontmatter: `> Parent: [[parent]]`
- In body text: reference other notes with `[[note-name]]`
- In "Related" or "References" sections at the bottom
- Do NOT add wikilinks inside code blocks or inline code

## Rule 4: Tags mirror key frontmatter fields

Tags MUST include:
1. The `type` value (e.g., `task`, `work-item`, `doc`)
2. The `status` value for tasks/work-items (e.g., `in_progress`, `done`)
3. The `repo` name for repo-scoped notes
4. Any domain or category identifiers

This enables BM25 search filtering via mcpvault's `search_notes`.

## Rule 5: No YAML files

Everything is `.md`. No `.yaml` files in the vault. Structured data goes in
frontmatter. Prose goes in the body.

## Rule 6: No status folders

Task/[[work-item]] status lives in frontmatter, NOT in folder structure.
There are no `todo/`, `in_progress/`, `done/` folders.

- To change status: update frontmatter `status` field and the corresponding tag
- To query by status: use `search_notes` with the status tag

## Rule 7: MCP hybrid rule

When mcpvault is available:
- **Searching** (unknown path) → use `search_notes`, `get_frontmatter`
- **Known path** → use `Read` tool directly
- **Writing docs/tasks** → use `write_note`, `update_frontmatter`, `patch_note`
- **Pattern matching** → use `Glob`/`Grep` tools

## Rule 8: Update links when creating/modifying

When creating a new note:
1. Add parent link
2. Add the note's wikilink to its parent's body (e.g., add `[[TASK-01]]` to the task note)

When changing status:
1. Update frontmatter `status` field
2. Update the status tag in the `tags` array
