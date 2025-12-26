<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ FILE: agent-behavior.md                                          ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Instructions for AI agents working with this codebase   ║
╚══════════════════════════════════════════════════════════════════╝
-->

# AI Agent Behavior Guidelines

## Critical: Check Documentation First

**BEFORE exploring code**, ALWAYS check the `.ai/` folder for existing documentation.

The `.ai/` folder contains curated, structured knowledge about this codebase:
- Architecture decisions
- Feature documentation
- Patterns and conventions
- Completed task learnings
- Current task context

## Navigation Priority

When answering questions or exploring context, follow this order:

### 1. Start with `.ai/context.md`
- Project overview and current state
- Active tasks and focus areas
- Quick orientation

### 2. Check `.ai/INDEX.md`
- Navigation hub for all documentation
- "How do I...?" → commands
- "What is...?" → docs
- "What repos?" → manifest

### 3. Search `.ai/docs/`
- Repository-specific documentation
- Feature documentation (e.g., `docs/peo/hris_integration/`)
- Shared patterns (e.g., `docs/_shared/sequelize-patterns.md`)
- Architecture overview (`docs/_architecture/`)

### 4. Check `.ai/tasks/`
- Current tasks in progress (`tasks/in_progress/`)
- Task READMEs contain problem context and findings
- Completed tasks have learnings

### 5. Check `.ai/docs/_completed_tasks.md`
- Historical learnings from past work
- Known pitfalls and solutions
- Patterns discovered

### 6. ONLY THEN explore code
- If documentation doesn't answer the question
- If you need current implementation details
- If documentation might be outdated

## Examples

### User asks: "How does HRIS integration work?"

**DO:**
1. Check `.ai/INDEX.md` for HRIS docs
2. Read `.ai/docs/peo/hris_integration/README.md`
3. Check related files in that folder
4. Only explore code if docs are insufficient

**DON'T:**
- Immediately grep the codebase for "hris"
- Start reading random source files
- Ignore existing documentation

### User asks: "What's the pattern for database models?"

**DO:**
1. Check `.ai/docs/_shared/` for patterns
2. Read `sequelize-patterns.md` if it exists
3. Check repo-specific docs

**DON'T:**
- Immediately explore model files in code
- Guess at patterns without checking docs

### User asks: "I need to work on PEOCM-123"

**DO:**
1. Check `.ai/tasks/` for the task folder
2. Read the task's `README.md`
3. Check `status.yaml` for current state
4. Review any work items in `todo/` or `done/`

**DON'T:**
- Start exploring code without task context
- Ignore existing research in the task folder

## For Framework Commands

When the user invokes framework commands (`/task-*`, `/document`, etc.):
1. Read the command definition in `.ai/_framework/commands/`
2. Follow the command's workflow exactly
3. Use existing documentation as context

## Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  QUESTION RECEIVED                                              │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────┐                                           │
│  │ Check .ai/      │ ◄── START HERE                            │
│  │ documentation   │                                            │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Answer found?   │                                            │
│  └────────┬────────┘                                           │
│           │                                                     │
│     YES   │   NO                                                │
│     │     │                                                     │
│     ▼     ▼                                                     │
│  ┌─────┐ ┌─────────────────┐                                   │
│  │Reply│ │ Explore code    │                                    │
│  └─────┘ │ with doc context│                                    │
│          └─────────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
```
