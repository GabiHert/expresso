---
type: task
id: LOCAL-025
title: Create installation script for easy ai-framework setup
status: done
created: 2026-01-06
updated: 2026-01-06
tags:
  - task
  - done
  - ai-framework
summary:
  total: 3
  todo: 0
  in_progress: 0
  done: 3
repos:
  - ai-framework
---

> Parent: [[task-index]]


# LOCAL-025: Create installation script for easy ai-framework setup

## Problem Statement

The ai-framework repository lacked an automated installation mechanism. Users had to manually copy files, configure hooks, and install the VSCode extension. This created friction for adoption and made setup error-prone.

## Solution

Created a standalone Node.js installation script (`install.js`) that:
- Copies framework files (`.ai/_framework/`)
- Installs Claude Code integration (`.claude/commands/`, `.claude/agents/`, `.claude/hooks/`)
- Merges settings.json intelligently (preserves existing customizations)
- Creates required directory structure
- Optionally installs the VSCode extension

## Acceptance Criteria

- [x] Single command installation: `node install.js /path/to/project`
- [x] Zero external dependencies (uses only built-in Node.js modules)
- [x] Supports interactive and non-interactive modes (`--yes` flag)
- [x] Creates backups before overwriting existing installations
- [x] Supports update mode (`--update` flag)
- [x] Installs VSCode extension via `code --install-extension`
- [x] Clear success/error messages with colored output
- [x] Documentation in INSTALL.md

## Work Items

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Create install.js script | ai-framework | done |
| 02 | Create INSTALL.md documentation | ai-framework | done |
| 03 | Test installation script | ai-framework | done |

## Files Created

| File | Description |
|------|-------------|
| `install.js` | Main installation script (~350 lines) |
| `INSTALL.md` | User documentation |

## Usage

```bash
# Clone and install to any project
git clone https://github.com/GabiHert/ai-framework.git
node ai-framework/install.js /path/to/your/project

# Options
node install.js ./my-project --yes          # Non-interactive
node install.js ./my-project --no-extension # Skip VSCode extension
node install.js ./my-project --update       # Update existing installation
node install.js --help                      # Show help
```

## Technical Context

The script uses only built-in Node.js modules:
- `fs` - File system operations
- `path` - Path manipulation
- `child_process` - Shell command execution (for VSCode extension)
- `readline` - Interactive prompts

Key functions:
- `copyDirectory()` - Recursive directory copy
- `mergeSettings()` - Smart JSON merge for settings.json
- `createBackup()` - Timestamped backup creation
- `installVSCodeExtension()` - `code --install-extension` wrapper

## Testing

Tested successfully:
- Fresh installation to empty directory
- Installation with `--yes` flag (non-interactive)
- Installation with `--no-extension` flag
- Help output (`--help`)
- Directory structure verification

## Notes

- The script lives at the repository root for easy access
- Works on macOS, Linux, and Windows (Node.js is cross-platform)
- Creates `.gitkeep` files in empty directories for git tracking


## Linked Work Items

- [[01-install-script]] — Create install.js script (done)
- [[02-install-docs]] — Create INSTALL.md documentation (done)
- [[03-test-script]] — Test installation script (done)
