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
║   /ai-sync        Sync .ai/ folder with git repository           ║
╠══════════════════════════════════════════════════════════════════╣
║ START: Read .ai/context.md for project overview                 ║
║ NAV:   See .ai/INDEX.md for full navigation                     ║
╚══════════════════════════════════════════════════════════════════╝
```

## Implementation

### Step 0: Parse Arguments

Determine if the user provided a command name:
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
║   /ai-sync        Sync .ai/ folder with git repository           ║
╠══════════════════════════════════════════════════════════════════╣
║ START: Read .ai/context.md for project overview                 ║
║ NAV:   See .ai/INDEX.md for full navigation                     ║
╚══════════════════════════════════════════════════════════════════╝
```

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
   document, help, command-create, ai-sync

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

Then stop. Do not proceed further.
