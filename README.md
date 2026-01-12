<div align="center">

```
    ╔═══════════════════╗
    ║    ☕ EXPRESSO    ║
    ╠═══════════════════╣
    ║  ┌─────────────┐  ║
    ║  │ ▓▓▓▓▓▓▓▓▓▓▓ │  ║
    ║  │ ▓ BREWING ▓ │  ║
    ║  │ ▓▓▓▓▓▓▓▓▓▓▓ │  ║
    ║  └──────┬──────┘  ║
    ║         │         ║
    ║      ╭──┴──╮      ║
    ║      │~~~~~│      ║
    ║      ╰─────╯      ║
    ╚═══════════════════╝
```

**Brew tasks directly in your code**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

# Expresso

A developer productivity framework for Claude Code that supercharges your AI-assisted development workflow with inline task annotations, structured task management, and real-time session tracking.

## Why Expresso?

When working with Claude Code on complex projects, you often need to:
- Leave notes in code for Claude to address later
- Track multiple development tasks across sessions
- See what changes Claude made and review them
- Resume previous conversations seamlessly

Expresso solves all of this with three core features:

### 1. @expresso Tags - Inline Task Annotations

Leave tasks directly in your code comments. Click to copy the command, paste in Claude, and watch it execute.

```typescript
// @expresso Add input validation for email field
function createUser(email: string) {
  return db.users.create({ email });
}

/*
 * @expresso! URGENT: Fix the race condition here
 * This causes duplicate entries under high load
 */
async function processOrder(orderId: string) {
  // ...
}

// @expresso? Should we cache this result?
function fetchUserProfile(userId: string) {
  return api.get(`/users/${userId}`);
}
```

**Tag Variants:**
| Tag | Meaning | Behavior |
|-----|---------|----------|
| `@expresso` | Standard task | Execute normally |
| `@expresso!` | Urgent task | Prioritize, execute immediately |
| `@expresso?` | Question | Claude explains first, then offers options |

### 2. Structured Task Management

Organize work into trackable tasks with work items:

```
/task-create    Create a new task with work items
/task-start     Begin working on a task
/task-work      Implement work items step-by-step
/task-done      Complete and archive the task
/task-status    View dashboard of all tasks
```

Tasks are stored in `.ai/tasks/` with full history preserved.

### 3. VSCode Extension - AI Cockpit

A sidebar panel that shows:
- Active tasks and their work items
- Claude sessions per task (resume anytime)
- File changes with diff history
- Shadow copies for reviewing Claude's edits

## Installation

### Quick Start

```bash
# Clone the repository
git clone https://github.com/GabiHert/expresso.git

# Install to your project
node expresso/install.js /path/to/your/project

# Or install to current directory
cd /path/to/your/project
node /path/to/expresso/install.js
```

### Installation Options

```bash
# Interactive installation (recommended for first time)
node install.js ./my-project

# Non-interactive mode (accept defaults)
node install.js ./my-project --yes

# Skip VSCode extension
node install.js ./my-project --no-extension

# Update existing installation
node install.js ./my-project --update

# Show help
node install.js --help
```

### What Gets Installed

```
your-project/
├── .ai/
│   ├── _framework/     # Commands and templates (17 slash commands)
│   ├── _project/       # Your project configuration
│   ├── tasks/          # Task management (todo, in_progress, done)
│   ├── cockpit/        # Runtime data for VSCode extension
│   └── docs/           # Documentation storage
├── .claude/
│   ├── commands/       # Claude Code slash command wrappers
│   ├── agents/         # Lightweight subagents (cost-optimized)
│   ├── hooks/          # Event capture for session tracking
│   └── settings.json   # Hook configuration
└── CLAUDE.md           # Project instructions for Claude
```

## Getting Started

### 1. Initialize Your Project

After installation, run the `/init` command in Claude Code:

```
/init
```

This creates your project manifest with:
- Repository configuration
- Commit conventions
- Available MCPs
- Team conventions

### 2. Create Your First Task

```
/task-create
```

Follow the prompts to define:
- Task ID (e.g., PROJ-001)
- Title and description
- Work items (implementation steps)
- Color coding (optional)

### 3. Work on the Task

```
/task-start PROJ-001
/task-work
```

The framework guides you through each work item, tracks progress, and optionally runs code review between items.

### 4. Use @expresso Tags

Add tags anywhere in your code:

```python
# @expresso Add retry logic with exponential backoff
def fetch_data(url):
    response = requests.get(url)
    return response.json()
```

In VSCode, you'll see:
- Brown highlight on the comment
- "Brew this" CodeLens button above the line
- Click to copy `/expresso path:line "task"` to clipboard
- Paste in Claude to execute

## Commands Reference

### Task Management

| Command | Description |
|---------|-------------|
| `/task-create` | Create a new task with work items |
| `/task-start ID` | Begin working on a task |
| `/task-resume` | Resume an in-progress task |
| `/task-work` | Implement next work item |
| `/task-work --autopilot` | Implement all work items automatically |
| `/task-done` | Complete current task |
| `/task-status` | View task dashboard |
| `/task-review` | Run code review on task changes |
| `/task-explore` | Explore codebase for a task |

### Documentation

| Command | Description |
|---------|-------------|
| `/init` | Initialize/update project configuration |
| `/enhance` | Evolve project setup with new capabilities |
| `/document` | Create documentation |
| `/ask` | Answer questions using project docs |
| `/help` | Show all available commands |

### Utilities

| Command | Description |
|---------|-------------|
| `/expresso path:line "task"` | Execute an @expresso tag |
| `/address-feedback` | Address code review comments |
| `/ai-sync` | Sync .ai folder with git |
| `/command-create` | Create new framework command |
| `/command-extend` | Extend existing commands |

## VSCode Extension Features

### Session Tracking

- Automatically captures Claude sessions
- Links sessions to tasks
- Resume any previous session with full context
- Import sessions by UUID

### Diff History

- Shadow copies of files before/after Claude edits
- Three diff views: Claude's changes, your changes, full diff
- Native VSCode diff viewer

### Task Panel

- Hierarchical view: Tasks > Work Items > Sessions > Files
- Color-coded task status
- Quick actions via context menu
- Terminal integration with task context

### @expresso Integration

- Real-time tag detection
- Syntax highlighting for tags
- CodeLens "Brew this" buttons
- Multi-line comment support

## Configuration

### Project Manifest

Edit `.ai/_project/manifest.yaml`:

```yaml
project:
  name: "My Project"
  description: "Project description"

repositories:
  - name: "my-repo"
    path: "./"
    tech: ["typescript", "react"]

conventions:
  commits: "type(scope): description"
  branches: "feature/{description}"

notifications:
  on_task_done: true
  discord_webhook: "..."
```

### Extension Settings

In VSCode settings:

```json
{
  "aiCockpit.expresso.enabled": true,
  "aiCockpit.expresso.showCodeLens": true,
  "aiCockpit.expresso.showDecorations": true,
  "aiCockpit.sessions.retentionDays": 7
}
```

## Requirements

- **Node.js** 18+
- **VSCode** 1.85+ (for the extension)
- **Claude Code** CLI (for slash commands)

## Updating

```bash
node expresso/install.js /path/to/your/project --update
```

This updates framework files while preserving your project configuration, tasks, and documentation.

## Troubleshooting

### Extension not showing

1. Ensure `.ai/cockpit/` exists in your workspace
2. Reload VSCode (Cmd+Shift+P > "Developer: Reload Window")
3. Check Output panel (View > Output > AI Cockpit)

### @expresso tags not highlighting

1. Check file extension is supported (ts, js, py, go, etc.)
2. Verify extension is enabled in settings
3. Reload window after installation

### Commands not working

1. Ensure `.claude/commands/` contains the command wrappers
2. Restart Claude Code CLI
3. Run `/help` to verify commands are loaded

### Hooks not triggering

Check `.claude/settings.json` contains:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write|TodoWrite",
      "hooks": [{
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/cockpit-capture.js\""
      }]
    }]
  }
}
```

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

- **Issues**: https://github.com/GabiHert/expresso/issues
- **Documentation**: See `.ai/_framework/README.md` after installation
