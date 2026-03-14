# Expresso Project Instructions

## Vault Conventions (MANDATORY)

The `.ai/` folder is an Obsidian vault accessed via mcpvault MCP.
**Before creating or modifying ANY file in `.ai/`, read `.ai/_framework/vault-conventions.md`.**

Key rules:
- Every file MUST have frontmatter with `type` and `tags`
- Every file MUST have a `> Parent: [[parent]]` link after frontmatter
- Use `[[wikilinks]]` for all references to other notes
- No `.yaml` files — everything is `.md` with frontmatter
- No status folders — status lives in frontmatter
- Search with mcpvault `search_notes`, read known paths with `Read`

## Expresso Integration

- All your edits are tracked by the Expresso VSCode extension
- Use `/task-start TASK-ID` to begin work on a task
- Use `/task-work` to work through task items
- Use `/task-done` when complete

## @expresso Tags

Look for `@expresso` tags in code comments - these are inline task annotations:
- `@expresso` - Standard task, execute normally
- `@expresso!` - Urgent task, prioritize
- `@expresso?` - Question, explain first then offer options
