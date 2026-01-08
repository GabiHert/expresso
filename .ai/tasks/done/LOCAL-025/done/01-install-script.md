<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-install-script.md                                  ║
║ TASK: LOCAL-025                                                  ║
║ STATUS: COMPLETED                                                ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: ai-framework
---

# Create install.js Script

## Objective

Create a standalone Node.js installation script that automates the setup of the ai-framework in any project directory.

## Implementation

Created `install.js` at the repository root with:

### Features
- Zero external dependencies (uses only built-in Node.js modules)
- Interactive and non-interactive modes
- Backup creation before overwriting
- Smart settings.json merging
- VSCode extension installation support
- Colored console output

### Command Line Options
- `--yes`, `-y` - Non-interactive mode
- `--no-extension` - Skip VSCode extension
- `--update` - Update existing installation
- `--help`, `-h` - Show help

### What Gets Copied
1. `.ai/_framework/` - Commands and templates
2. `.claude/commands/` - Claude Code slash commands
3. `.claude/agents/` - Lightweight subagents
4. `.claude/hooks/` - Event capture hook
5. `.claude/settings.json` - Hook configuration (merged)

### Directory Structure Created
- `.ai/tasks/{todo,in_progress,done}/`
- `.ai/cockpit/{events,shadows}/`
- `.ai/docs/`
- `.ai/cockpit/config.json`

## Acceptance Criteria

- [x] Script runs with `node install.js [target] [options]`
- [x] Copies all required framework files
- [x] Creates directory structure
- [x] Merges settings.json without losing existing config
- [x] Supports non-interactive mode
- [x] Creates backups when overwriting
- [x] Installs VSCode extension (optional)

## File Created

`/Users/gabriel.herter/Documents/Personal/ai-framework/install.js` (~350 lines)
