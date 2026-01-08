# ai-framework Documentation

## Overview

Core AI task framework providing commands, templates, and agent behavior definitions.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Markdown | Command definitions, templates, documentation |
| YAML | Configuration (manifest.yaml) |
| TypeScript | Hook scripts, future tooling |

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `.ai/_framework/commands/` | 16 slash command definitions |
| `.ai/_framework/templates/` | 9 reusable templates |
| `.ai/_project/` | Project-specific configuration |
| `.ai/docs/` | Accumulated domain knowledge |
| `.ai/tasks/` | Task management (todo/in_progress/done) |

## Key Patterns

### Three-Layer Architecture
1. **Framework Layer** - Reusable, project-agnostic
2. **Project Layer** - Project-specific configuration
3. **Domain Layer** - Accumulated knowledge

### Documentation-First
AI agents check `.ai/` documentation before exploring code.

### Manifest-Driven
Single `manifest.yaml` is source of truth for project configuration.

## Available Commands

| Command | Purpose |
|---------|---------|
| `/init` | Bootstrap new project |
| `/task-create` | Create development task |
| `/task-start` | Begin working on task |
| `/task-work` | Implement work items |
| `/task-done` | Complete and log task |
| `/task-status` | View task dashboard |
| `/help` | Show available commands |

## Related Documentation

- [Architecture Overview](../_architecture/README.md)
- [Shared Patterns](../_shared/README.md)
