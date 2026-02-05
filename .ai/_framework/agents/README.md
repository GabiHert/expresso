# Agent Framework

## Overview

The agent framework provides specialized sub-agents that execute with **clean, isolated context**. Each agent receives only the context it needs, preventing pollution from unrelated work and ensuring focused execution.

## Design Principles

1. **Context Isolation** - Each agent starts fresh with minimal, relevant context
2. **Single Responsibility** - One agent, one job
3. **Repo Scoping** - Work items are scoped to single repos
4. **Human Oversight** - Critical decisions require approval
5. **Quality Gates** - Blocking review after implementation

## Agent Catalog

| Agent | Purpose | Model | Blocking |
|-------|---------|-------|----------|
| [explorer](./explorer.yaml) | Codebase exploration | sonnet | No |
| [planner](./planner.yaml) | Break tasks into work items | sonnet | Yes (approval) |
| [implementer](./implementer.yaml) | Execute single work item | sonnet | No |
| [reviewer](./reviewer.yaml) | Validate implementation | sonnet | Yes (quality gate) |
| [documenter](./documenter.yaml) | Capture learnings | sonnet | Yes (approval) |
| [sync](./sync.yaml) | Git operations for .ai/ | haiku | No |

## Orchestration Flow

```
/task-start
     │
     ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Explorer │ ──▶ │ Planner  │ ──▶ │   Sync   │
└──────────┘     └──────────┘     └──────────┘
                      │
                      ▼
              [User approves items]
                      │
/task-work            │
     │                ▼
     │         ┌─────────────┐
     │         │             │
     │         ▼             │
     │   ┌─────────────┐     │
     │   │ Implementer │     │
     │   └──────┬──────┘     │
     │          ▼            │
     │   ┌─────────────┐     │
     │   │  Reviewer   │     │
     │   └──────┬──────┘     │
     │          │            │
     │    Pass? ├── No ──────┤ (fix and retry)
     │          │            │
     │          ▼ Yes        │
     │     Next item ────────┘
     │
/task-done
     │
     ▼
┌────────────┐     ┌──────────┐
│ Documenter │ ──▶ │   Sync   │
└────────────┘     └──────────┘
       │
       ▼
 [User approves docs]
```

## Agent Definition Schema

Each agent is defined in a YAML file with the following structure:

```yaml
# Agent metadata
name: agent-name
version: "1.0"
description: What this agent does
model: sonnet | haiku

# Execution configuration
execution:
  blocking: true | false      # Does it block until approved/completed?
  approval_required: true | false
  max_turns: 50              # Maximum agentic turns

# Context specification
context:
  required:                   # Must be provided
    - task_readme
    - work_item
  optional:                   # May be provided
    - exploration_notes
  builds:                     # Context builder functions
    - name: context_name
      source: path/pattern
      transform: optional_transform

# Tool access control
tools:
  allowed:
    - Read
    - Edit
    - Glob
  denied:
    - Bash:git*              # Pattern-based denial

# Output specification
output:
  format: markdown | yaml | json
  schema: optional_schema_ref
  location: where/to/save.md  # Supports {variables}

# Prompt template
prompt: |
  You are the {name} agent.

  ## Context
  {context}

  ## Your Task
  {task_description}

  ## Constraints
  {constraints}

  ## Output Format
  {output_format}
```

## Context Variables

Available variables for prompt templates:

| Variable | Description |
|----------|-------------|
| `{task_id}` | Current task ID (e.g., LOCAL-028) |
| `{task_readme}` | Contents of task README.md |
| `{work_item}` | Current work item contents |
| `{work_item_id}` | Work item identifier |
| `{exploration}` | Contents of exploration.md |
| `{docs_index}` | Index of .ai/docs/ |
| `{manifest}` | Project manifest.yaml |
| `{git_diff}` | Current git diff |
| `{repo_name}` | Current repository name |

## Invoking Agents

Agents are invoked by the orchestrator (main Claude session) using the Task tool:

```
Task(
  subagent_type: "general-purpose",
  prompt: <agent prompt with context>,
  model: <agent model>
)
```

The orchestrator:
1. Loads agent definition
2. Builds context from specifications
3. Renders prompt template
4. Invokes sub-agent
5. Processes output
6. Handles approval flow if required

## Adding New Agents

1. Create `{agent-name}.yaml` in this directory
2. Follow the schema structure
3. Add to the catalog table above
4. Update relevant commands to use the agent

## File Locations

```
.ai/_framework/agents/
├── README.md           # This file
├── explorer.yaml       # Explorer agent definition
├── planner.yaml        # Planner agent definition
├── implementer.yaml    # Implementer agent definition
├── reviewer.yaml       # Reviewer agent definition
├── documenter.yaml     # Documenter agent definition
└── sync.yaml           # Sync agent definition
```
