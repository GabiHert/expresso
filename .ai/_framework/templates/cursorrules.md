

> Parent: [[manifest]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ TEMPLATE: .cursorrules                                           ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Cursor IDE configuration for AI agent behavior          ║
║ USAGE: Copy this file to your project root as .cursorrules      ║
╚══════════════════════════════════════════════════════════════════╝
-->

# Cursor Rules Template

Copy the content below (excluding this header) to your project's `.cursorrules` file.

---

```
# AI Agent Behavior for This Project

## Critical: Check Documentation First

BEFORE exploring code, ALWAYS check the `.ai/` folder for existing documentation.

## Navigation Priority

When answering questions, follow this order:

1. **Read `.ai/context.md`** - Project overview, current state, active tasks
2. **Check `.ai/INDEX.md`** - Navigation hub for all documentation
3. **Search `.ai/docs/`** - Feature docs, patterns, architecture
4. **Check `.ai/tasks/`** - Current task context and findings
5. **ONLY THEN** explore source code if documentation is insufficient

## Documentation Structure

```
.ai/
├── context.md          # START HERE - Project overview
├── INDEX.md            # Navigation to all docs
├── _framework/         # Command definitions
├── _project/           # Project configuration
│   └── manifest.yaml   # Repositories and settings
├── docs/               # Curated documentation
│   ├── _architecture/  # System architecture
│   ├── _shared/        # Cross-repo patterns
│   ├── {repo}/         # Per-repository docs
│   └── _completed_tasks.md  # Historical learnings
└── tasks/              # Task management
    ├── in_progress/    # Current work
    ├── todo/           # Planned work
    └── done/           # Completed work
```

## Examples

### User asks: "How does X work?"
1. Check `.ai/INDEX.md` for X documentation
2. Read relevant docs in `.ai/docs/`
3. Check completed tasks for learnings
4. Only explore code if docs don't answer

### User asks about a task
1. Find task in `.ai/tasks/`
2. Read task README.md for context
3. Check status.yaml and work items
4. Use this context before touching code

## Framework Commands

This project uses the AI Task Framework. Key commands:
- `/ask` - Answer questions using documentation first
- `/task-explore` - Explore codebase for context
- `/task-start` - Begin working on a task
- `/ai-sync` - Sync .ai/ folder with git (commit, push, pull, merge main)
- `/help` - Show all commands

See `.ai/_framework/commands/` for full command definitions.
```
