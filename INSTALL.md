# AI Framework Installation Guide

Quick setup for the AI Cockpit framework and VSCode extension.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/GabiHert/ai-framework.git

# Install to your project
node ai-framework/install.js /path/to/your/project

# Or install to current directory
cd /path/to/your/project
node /path/to/ai-framework/install.js
```

## Installation Options

```bash
# Basic installation (interactive)
node install.js ./my-project

# Non-interactive mode (accept all defaults)
node install.js ./my-project --yes

# Skip VSCode extension installation
node install.js ./my-project --no-extension

# Update existing installation (preserves project files)
node install.js ./my-project --update

# Show help
node install.js --help
```

## What Gets Installed

| Directory/File | Description |
|----------------|-------------|
| `.ai/_framework/` | Command definitions and templates (17 commands) |
| `.ai/tasks/` | Task management directories (todo, in_progress, done) |
| `.ai/cockpit/` | Runtime data for VSCode extension |
| `.ai/docs/` | Documentation storage |
| `.claude/commands/` | Claude Code slash commands |
| `.claude/agents/` | Lightweight subagents (Haiku model) |
| `.claude/hooks/` | Event capture hook for VSCode extension |
| `.claude/settings.json` | Hook configuration |

## After Installation

### 1. Open in VSCode

```bash
cd /path/to/your/project
code .
```

### 2. Initialize the Framework

Run the `/init` command in Claude Code to configure the framework for your project:

```
/init
```

This will:
- Gather information about your project
- Create the project manifest (`.ai/_project/manifest.yaml`)
- Set up documentation structure
- Configure conventions

### 3. Start Using Commands

| Command | Description |
|---------|-------------|
| `/task-create` | Create a new development task |
| `/task-start TASK-ID` | Begin working on a task |
| `/task-work` | Implement work items |
| `/task-done` | Complete current task |
| `/task-status` | View task dashboard |
| `/help` | Show all available commands |

## VSCode Extension

The AI Cockpit VSCode extension provides:
- Real-time session tracking
- Diff history of Claude's changes
- Task management sidebar
- Session import/export

### Manual Extension Installation

If the automatic installation fails:

```bash
code --install-extension /path/to/ai-framework/vscode-extension/ai-cockpit-0.1.0.vsix
```

### Activating the Extension

The extension activates when:
1. Your workspace contains a `.ai/cockpit/` directory
2. You have an active Claude Code session

Look for the **AI Cockpit** icon in the VSCode activity bar (sidebar).

## Updating

To update an existing installation:

```bash
node ai-framework/install.js /path/to/your/project --update
```

This will:
- Update `.ai/_framework/` (commands and templates)
- Update `.claude/` integration files
- Preserve your project-specific files (manifest, docs, tasks)

## Uninstalling

To remove the framework:

```bash
# Remove framework directories
rm -rf .ai/_framework
rm -rf .claude

# Optionally remove project data
rm -rf .ai

# Uninstall VSCode extension
code --uninstall-extension ai-cockpit
```

## Troubleshooting

### "command not found: code"

The VSCode CLI needs to be in your PATH. In VSCode:
1. Open Command Palette (Cmd+Shift+P)
2. Run "Shell Command: Install 'code' command in PATH"

### Extension not showing in sidebar

1. Ensure `.ai/cockpit/` directory exists in your workspace
2. Reload VSCode (Cmd+Shift+P → "Developer: Reload Window")
3. Check for errors in Output panel (View → Output → AI Cockpit)

### Hooks not triggering

Verify `.claude/settings.json` contains the hook configuration:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/cockpit-capture.js\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

## Requirements

- Node.js 18+
- VSCode 1.85+ (for the extension)
- Claude Code CLI (for slash commands)

## Support

- GitHub Issues: https://github.com/GabiHert/ai-framework/issues
- Documentation: See `.ai/_framework/README.md` after installation
