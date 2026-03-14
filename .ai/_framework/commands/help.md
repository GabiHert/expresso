

> Parent: [[manifest]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /help                                                   ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Display available commands and usage information        ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /help - Command Reference

## Description

Display available commands grouped by category.

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ ⛔ READ-ONLY COMMAND — DO NOT MODIFY ANY FILES                  │
│                                                                 │
│ ALLOWED:  Read any file, display output to user                 │
│ FORBIDDEN: Edit, Write, create, or delete ANY files             │
│ TEMP FILES: If you must create scratch files, use .ai/tmp/      │
│                                                                 │
│ This command displays information only. If you find yourself    │
│ about to edit or create a file, STOP — you are off track.       │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/help                  # Show all commands
/help task-create      # Show details for specific command
```

## Output Format

```
╔══════════════════════════════════════════════════════════════════╗
║ AI TASK FRAMEWORK - COMMAND REFERENCE                            ║
╠══════════════════════════════════════════════════════════════════╣
║ SETUP                                                            ║
║   /init        Bootstrap project with framework                  ║
║   /enhance     Add repos, conventions, or documentation          ║
║                                                                   ║
║ TASKS                                                             ║
║   /task-create Create a new development task                     ║
║   /task-start  Begin working on a task                           ║
║   /task-resume Resume an in-progress task                        ║
║   /task-work   Implement work items                              ║
║   /task-done   Complete and log a task                           ║
║   /task-status View task dashboard                               ║
║   /task-review Run code review                                   ║
║   /task-orchestrate Orchestrate WIs with background agents       ║
║                                                                   ║
║ EXPLORATION                                                       ║
║   /ask         Answer questions (docs first)                     ║
║   /task-explore Explore codebase for context                     ║
║                                                                   ║
║ DOCUMENTATION                                                     ║
║   /document    Create or update documentation                    ║
║                                                                   ║
║ META                                                              ║
║   /help           Show this help (or /help <cmd> for details)   ║
║   /command-create Create a new framework command                 ║
║   /command-extend Extend commands at project level               ║
║   /ai-sync        Sync .ai/ folder with git repository           ║
╠══════════════════════════════════════════════════════════════════╣
║ START: Read .ai/context.md for project overview                 ║
║ NAV:   See .ai/INDEX.md for full navigation                     ║
╚══════════════════════════════════════════════════════════════════╝
```

## Implementation

### Step 0: Parse Arguments

1. **Extension Support**: This command supports compiled extensions
   via `/command-extend help --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

2. Determine if the user provided a command name:
   - `/help` → Show all commands (go to Step 1)
   - `/help <command>` → Show command details (go to Step 2)

### Step 1: Show All Commands (Default)

Output the following categorized command reference:

```
╔══════════════════════════════════════════════════════════════════╗
║ AI TASK FRAMEWORK - COMMAND REFERENCE                            ║
╠══════════════════════════════════════════════════════════════════╣
║ SETUP                                                            ║
║   /init        Bootstrap project with framework                  ║
║   /enhance     Add repos, conventions, or documentation          ║
║                                                                   ║
║ TASKS                                                             ║
║   /task-create Create a new development task                     ║
║   /task-start  Begin working on a task                           ║
║   /task-resume Resume an in-progress task                        ║
║   /task-work   Implement work items                              ║
║   /task-done   Complete and log a task                           ║
║   /task-status View task dashboard                               ║
║   /task-review Run code review                                   ║
║   /task-orchestrate Orchestrate WIs with background agents       ║
║                                                                   ║
║ EXPLORATION                                                       ║
║   /ask         Answer questions (docs first)                     ║
║   /task-explore Explore codebase for context                     ║
║                                                                   ║
║ DOCUMENTATION                                                     ║
║   /document    Create or update documentation                    ║
║                                                                   ║
║ META                                                              ║
║   /help           Show this help (or /help <cmd> for details)   ║
║   /command-create Create a new framework command                 ║
║   /command-extend Extend commands at project level               ║
║   /ai-sync        Sync .ai/ folder with git repository           ║
╠══════════════════════════════════════════════════════════════════╣
║ START: Read .ai/context.md for project overview                 ║
║ NAV:   See .ai/INDEX.md for full navigation                     ║
╚══════════════════════════════════════════════════════════════════╝
```

5. **Scan for variants**: Check `.ai/_project/commands/` for `*.variant.*.md` and `*.active.md` files.
   - For each command with variants, append after the main table:
     ```
     VARIANTS (Project Extensions)
     ══════════════════════════════════════════════════════════════════
       /{cmd}:{variant1}    [active]
       /{cmd}:{variant2}
     ```
   - If no variants exist, skip this section.

Then stop. Do not proceed further.

### Step 2: Show Command Details

When user provides `/help <command>`:

1. **Normalize the command name**: Remove leading `/` if present
   - `/help /task-create` → look for `task-create`
   - `/help task-create` → look for `task-create`

2. **Locate the command file**: `.ai/_framework/commands/{command}.md`

3. **If command not found**:
   ```
   Command '/{command}' not found.

   Available commands: init, enhance, task-create, task-start, task-resume,
   task-work, task-done, task-status, task-review, task-explore, ask,
   document, help, command-create, command-extend, ai-sync

   Use /help to see all commands with descriptions.
   ```

4. **If command found**: Read the command file and output:
   ```
   ╔══════════════════════════════════════════════════════════════════╗
   ║ /{command-name}                                                  ║
   ╚══════════════════════════════════════════════════════════════════╝

   DESCRIPTION
   {Extract the Description section from the command file}

   USAGE
   {Extract the Usage section examples}

   WORKFLOW
   {Extract and summarize the Workflow section - key steps only}
   ```

5. **Check for variants**: Scan `.ai/_project/commands/{command}.variant.*.md`
   - If variants exist, append:
     ```
     VARIANTS
       :{variant1}    [active]
       :{variant2}

     Switch: /command-extend {command} --activate {variant}
     ```

Then stop. Do not proceed further.
