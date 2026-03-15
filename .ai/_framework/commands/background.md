

> Parent: [[commands-index]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /background                                             ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Run a prompt or task instruction in the background      ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /background - Run Instructions in Background

## Description

Dispatch a prompt or task instruction to run in the background using a background agent. The agent runs asynchronously — you are notified when it completes and can continue other work in the meantime.

Optionally specify a named agent type to match the task's domain (e.g., `general-purpose`, `Explore`, etc.).

## Usage

```
/background <instruction>
/background --agent <agent-type> <instruction>
```

Examples:

```
/background Analyze all test failures and summarize root causes
/background --agent Explore Find all places where retry logic is implemented and document the pattern
```

## Workflow

```
1. PARSE ARGS
   • Extract optional --agent <type> flag
   • Extract the instruction/prompt

2. SELECT AGENT
   • If --agent provided: use specified agent type
   • Otherwise: default to general-purpose

3. LAUNCH BACKGROUND AGENT
   • Call Agent tool with run_in_background: true
   • Pass the instruction as the prompt
   • Report the agent ID to the user

4. NOTIFY COMPLETION
   • You will be automatically notified when the agent finishes
   • Summarize the results once notified
```

## Implementation

### Step 0: Parse Arguments

Parse the arguments provided after `/background`:

1. Check if `--agent <type>` is present:
   - If yes, extract the `<type>` value as the agent type
   - The rest of the argument string is the instruction
   - If no `--agent` flag, agent type defaults to `general-purpose`

2. The instruction is everything that is not part of the `--agent` flag.

**Example parsing:**
- `/background Analyze failures` → agent=`general-purpose`, instruction=`Analyze failures`
- `/background --agent Explore Find retry logic` → agent=`Explore`, instruction=`Find retry logic`

### Step 1: Validate Input

If no instruction is provided, output:

```
Usage: /background [--agent <agent-type>] <instruction>

Examples:
  /background Analyze all test failures and summarize root causes
  /background --agent Explore Find all retry logic implementations
  /background --agent Plan Design the new authentication flow

Available agent types (common):
  general-purpose             General research and multi-step tasks
  Explore                     Fast codebase exploration
  Plan                        Architecture and implementation planning
```

### Step 2: Launch Background Agent

Use the Agent tool with `run_in_background: true`:

```
Agent tool call:
  subagent_type: <agent-type>
  prompt: <instruction>
  run_in_background: true
```

Announce to the user before launching:

```
Launching background agent...
  Agent: <agent-type>
  Task:  <instruction>

You will be notified when it completes. Continue with other work.
```

### Step 3: Report Agent ID

After launching, report:

```
Background agent started.
  Agent ID: <returned-id>

(You will be notified automatically when it finishes.)
```

### Step 4: On Completion

When the agent completes and you are notified, summarize its output concisely for the user. Do not re-run or poll — wait for the notification.

Then stop. Do not proceed further.
