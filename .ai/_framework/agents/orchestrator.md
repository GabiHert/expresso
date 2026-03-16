---
type: agent
name: orchestrator
scope: unknown
tags:
  - agent
---



> Parent: [[agents-index]]
# Agent Orchestrator Guide

## Overview

This document explains how framework commands invoke agents. The orchestrator (main AI session) loads agent definitions, builds context, and invokes agents using the IDE-appropriate mechanism.

## Multi-IDE Support

The orchestrator adapts to the current IDE environment:

| Step | Claude Code | Cursor |
|------|-------------|--------|
| Load definition | Read YAML file | Read YAML file |
| Build context | Same process | Same process |
| Invoke agent | `Task(subagent_type, prompt, model)` | Reference `.cursor/agents/{name}.md` |
| User approval | `AskUserQuestion(options)` | Conversational prompt |
| Process output | Same process | Same process |

## Agent Scope Enforcement

Every agent has a `scope` field in its YAML definition that constrains what it may do:

| Scope | Meaning | Agents |
|-------|---------|--------|
| `read-only` | Must NEVER create, edit, or delete any files | explorer, planner, reviewer, documenter |
| `can-edit-code` | May modify application source code | implementer |
| `ai-folder-only` | May only run git operations on `.ai/` | sync |

**The orchestrator must enforce scope.** When invoking an agent, the scope constraint is embedded in the agent's prompt template. If an agent attempts to act outside its scope, the orchestrator should stop execution.

## Core Pattern

```
Command executes → Load agent YAML → Check scope → Build context → Invoke agent → Process output
```

### Loading Agent Definition

```python
# Pseudocode - executed by orchestrator
agent_def = read(".ai/_framework/agents/{agent-name}.yaml")
```

### Building Context

Each agent specifies required and optional context in its YAML:

```yaml
context:
  required:
    - task_readme
    - work_item
  optional:
    - exploration
```

The orchestrator must:
1. Read required context sources
2. Include optional context if available
3. Render the prompt template with context variables

### Invoking the Agent

**Claude Code:**
```
Task(
  subagent_type: "general-purpose",
  model: agent_def.model,  # "sonnet" or "haiku"
  prompt: rendered_prompt,
  max_turns: agent_def.execution.max_turns
)
```

**Cursor:**
Invoke the agent by name within the current session. The agent stub in
`.cursor/agents/{name}.md` provides the instructions. Pass the rendered
prompt as context for the agent to execute.

## Command Integration

### /[[task-start]] Integration

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP: EXPLORATION PHASE (after moving task to in_progress)     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. Load explorer.yaml                                           │
│                                                                 │
│ 2. Build context:                                               │
│    task_readme  = Read(.ai/tasks/in_progress/{id}/README.md)    │
│    docs_index   = Glob(.ai/docs/**/README.md) + LS              │
│    user_query   = "Explore codebase for task: {task_title}"     │
│                                                                 │
│ 3. Invoke explorer agent with rendered prompt                    │
│                                                                 │
│ 4. Save output:                                                 │
│    Write(.ai/tasks/in_progress/{id}/exploration.md)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP: PLANNING PHASE (after exploration)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. Load planner.yaml                                            │
│                                                                 │
│ 2. Build context:                                               │
│    task_readme   = Read(.ai/tasks/in_progress/{id}/README.md)   │
│    exploration   = Read(.ai/tasks/in_progress/{id}/exploration.md)
│    manifest      = Read(.ai/_project/manifest.yaml)             │
│    manifest_repos = Extract repos section from manifest         │
│                                                                 │
│ 3. Invoke planner agent with rendered prompt                     │
│                                                                 │
│ 4. Parse output (YAML):                                         │
│    proposed_items = parse_yaml(agent_output)                    │
│                                                                 │
│ 5. Present for approval:                                        │
│    Ask user: "Review proposed work items"                       │
│    Options: Approve All / Edit / Re-plan                        │
│                                                                 │
│ 6. On approval:                                                 │
│    - Create work item files in todo/                            │
│    - Update status.yaml                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### /[[task-work]] Integration

```
┌─────────────────────────────────────────────────────────────────┐
│ FOR EACH WORK ITEM:                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ IMPLEMENTATION PHASE                                        │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │                                                             │ │
│ │ 1. Load implementer.yaml                                    │ │
│ │                                                             │ │
│ │ 2. Build context:                                           │ │
│ │    work_item    = Read(work_item_file)                      │ │
│ │    task_readme  = Read(task_readme_file)                    │ │
│ │    prev_feedback = Read(feedback_file) if exists            │ │
│ │                                                             │ │
│ │ 3. Invoke implementer agent with rendered prompt             │ │
│ │                                                             │ │
│ │ 4. Capture output:                                          │ │
│ │    implementation_summary = agent_output                    │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ REVIEW PHASE                                                │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │                                                             │ │
│ │ 1. Load reviewer.yaml                                       │ │
│ │                                                             │ │
│ │ 2. Get git diff:                                            │ │
│ │    git_diff = Bash("git diff HEAD")                         │ │
│ │                                                             │ │
│ │ 3. Build context:                                           │ │
│ │    implementer_summary = from previous phase                │ │
│ │    git_diff           = captured diff                       │ │
│ │    work_item          = Read(work_item_file)                │ │
│ │    task_readme        = Read(task_readme_file)              │ │
│ │    docs_patterns      = Read(.ai/docs/_shared/patterns.md)  │ │
│ │                                                             │ │
│ │ 4. Invoke reviewer agent with rendered prompt                │ │
│ │                                                             │ │
│ │ 5. Parse verdict:                                           │ │
│ │    If "NEEDS CHANGES":                                      │ │
│ │      - Save feedback to task/feedback/                      │ │
│ │      - Ask user: "Fix" or "Override"                        │ │
│ │      - If Fix: Re-run implementer with feedback             │ │
│ │      - If Override: Continue anyway                         │ │
│ │    If "APPROVED":                                           │ │
│ │      - Continue to next work item                           │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### /[[task-done]] Integration

```
┌─────────────────────────────────────────────────────────────────┐
│ DOCUMENTATION PHASE (before moving task to done)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. Load documenter.yaml                                         │
│                                                                 │
│ 2. Get full git diff:                                           │
│    git_diff_full = Bash("git diff {task_start_commit}..HEAD")   │
│                                                                 │
│ 3. Build context:                                               │
│    task_readme      = Read(task_readme_file)                    │
│    work_items       = Read all work item files                  │
│    feedback_files   = Read all feedback files                   │
│    git_diff_full    = captured diff                             │
│    existing_docs    = Glob + Read relevant .ai/docs/ files      │
│    completed_tasks_log = Read(_completed_tasks.md)              │
│                                                                 │
│ 4. Invoke documenter agent with rendered prompt                  │
│                                                                 │
│ 5. Parse proposals and present:                                 │
│    Ask user: "Documentation proposals ready"                    │
│    Options: Apply All / Review Each / Skip                      │
│                                                                 │
│ 6. On approval:                                                 │
│    - Apply each proposed change                                 │
│    - Update INDEX.md if new docs created                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Sync Agent (Auto-triggered)

```
┌─────────────────────────────────────────────────────────────────┐
│ SYNC PHASE (after task state changes)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. Check manifest: auto_sync.enabled == true ?                  │
│                                                                 │
│ 2. Load sync.yaml                                               │
│                                                                 │
│ 3. Get .ai/ status:                                             │
│    ai_folder_status = Bash("git status .ai/ --porcelain")       │
│                                                                 │
│ 4. Build context:                                               │
│    ai_folder_status = captured status                           │
│    task_id         = current task ID                            │
│    sync_trigger    = "task-start" | "task-work" | "task-done"   │
│                                                                 │
│ 5. Invoke sync agent with rendered prompt                        │
│                                                                 │
│ 6. Agent executes git operations for .ai/ only                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Context Building Helpers

### Task README

```bash
# Path pattern
.ai/tasks/{status}/{task-id}/README.md

# Status = todo | in_progress | done
```

### Work Item

```bash
# Path pattern
.ai/tasks/{status}/{task-id}/{item-status}/{id}-{name}.md

# Item status = todo | in_progress | done
```

### Docs Index

```bash
# Generate index of available documentation
Glob(".ai/docs/**/*.md") | map to { path, first_heading }
```

### Git Diff

```bash
# For current changes
git diff HEAD

# For full task changes (requires tracking start commit)
git diff {task_start_commit}..HEAD
```

## Error Handling

### Agent Timeout
If agent exceeds max_turns:
- Capture partial output
- Report to user
- Offer to resume or skip

### Agent Failure
If agent returns error:
- Log error details
- Present options: Retry | Skip | Manual intervention

### Approval Rejection
If user rejects proposal:
- Re-run agent with feedback
- Or skip the phase

## Extending Agents

Projects can override agent behavior via extensions:

```
.ai/_project/agents/{agent-name}.override.yaml
```

Override file structure:
```yaml
# Extends the base agent definition
extends: explorer

# Override specific fields
context:
  required:
    - task_readme
    - docs_index
    - custom_context  # Added

# Append to prompt
prompt_append: |
  ## Project-Specific Rules
  - Always check for X
  - Never do Y
```

The orchestrator merges base + override before spawning.


## Agent Notes

- [[documenter]]
- [[explorer]]
- [[implementer]]
- [[planner]]
- [[reviewer]]
- [[sync]]
