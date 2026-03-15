---
type: internal-doc
tags:
  - doc
---

> Parent: [[docs-index]]


<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: DOMAIN                                                    ║
║ STATUS: MVP v1 - Design Phase                                    ║
╠══════════════════════════════════════════════════════════════════╣
║ NAVIGATION:                                                      ║
║ • Parent: .ai/docs/_architecture/README.md                       ║
║ • Related: vscode-extension docs                                 ║
║ • Index: .ai/INDEX.md                                           ║
╚══════════════════════════════════════════════════════════════════╝
-->

# AI Cockpit - MVP v1 Specification

A VSCode extension for real-time monitoring of Claude Code tasks, with diff history tracking and agent orchestration.

---

## Overview

- **What**: VSCode extension that provides a control panel for Claude Code agents
- **Why**: Developers need visibility into what AI agents are doing, with ability to review/revert changes
- **When**: Use while running Claude Code in VSCode terminals to monitor tasks and review diffs

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| Task | A unit of work tracked by the cockpit (created via `/task-create`) |
| Subtask | Granular steps within a task (pending → in_progress → completed) |
| DiffChunk | A single edit operation captured from Claude Code's Edit tool |
| AgentEvent | Real-time event streamed from Claude Code (tool calls, messages, errors) |
| Hook | Claude Code hook that sends events to the cockpit server |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VSCode Extension                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Task Panel  │  │  Diff Viewer │  │ Agent Status │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │ WebSocket / File Watch
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Cockpit Server                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Task Manager│  │ Diff Store  │  │ Event Stream    │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
       ┌────────┐   ┌──────────┐   ┌─────────┐
       │ SQLite │   │  Hooks   │   │ Claude  │
       │   DB   │   │  (IPC)   │   │  Code   │
       └────────┘   └──────────┘   └─────────┘
```

### Components (MVP v1)

| Component | Location | Purpose |
|-----------|----------|---------|
| Task Panel | `vscode-extension/src/panels/TaskPanel.ts` | Display task list with status/progress |
| Diff Viewer | `vscode-extension/src/panels/DiffViewer.ts` | Show diff history per task |
| Cockpit Server | `vscode-extension/src/server/` | Local server for hook communication |
| SQLite Store | `vscode-extension/src/db/` | Persist tasks, subtasks, diffs |
| Hook Scripts | `.claude/hooks/` | Claude Code hooks for event capture |

---

## Data Model

### Task

```typescript
interface Task {
  id: string;                    // UUID
  title: string;                 // "Add user authentication"
  status: 'pending' | 'in_progress' | 'done' | 'failed';
  progress_pct: number;          // 0-100
  branch?: string;               // "feat/add-auth"
  ai_framework_id?: string;      // Sync with .ai/tasks/
  created_at: Date;
  updated_at: Date;
}
```

### Subtask

```typescript
interface Subtask {
  id: string;                    // UUID
  task_id: string;               // FK to Task
  title: string;                 // "Create User model"
  status: 'pending' | 'in_progress' | 'completed';
  order: number;                 // Display order
}
```

### DiffChunk

```typescript
interface DiffChunk {
  id: string;                    // UUID
  task_id: string;               // FK to Task
  subtask_id?: string;           // FK to Subtask (optional)
  file_path: string;             // "src/auth.ts"
  old_content: string | null;    // null for new files
  new_content: string;           // The new content
  line_start?: number;           // Starting line number
  is_new_file: boolean;          // true if Write tool created file
  status: 'pending' | 'accepted' | 'rejected';
  commit_sha?: string;           // Git reference if committed
  timestamp: Date;
}
```

### AgentEvent

```typescript
interface AgentEvent {
  id: string;                    // UUID
  task_id: string;               // FK to Task
  event_type: 'tool_call' | 'message' | 'error' | 'status_change';
  tool_name?: string;            // "Edit", "Write", "Bash", etc.
  payload: Record<string, any>;  // Event-specific data
  timestamp: Date;
}
```

---

## Claude Code Hook Integration

### Hook Configuration

The cockpit captures events via Claude Code hooks. MVP uses `PostToolUse` hook:

```json
// .claude/settings.json (or per-project .claude/hooks.json)
{
  "hooks": {
    "PostToolUse": [
      {
        "command": "node ${workspaceFolder}/.claude/hooks/cockpit-hook.js",
        "tools": ["Edit", "Write", "TodoWrite"]
      }
    ]
  }
}
```

### Hook Script (MVP)

```javascript
// .claude/hooks/cockpit-hook.js
const http = require('http');

const event = JSON.parse(process.env.CLAUDE_TOOL_EVENT || '{}');
const taskId = process.env.COCKPIT_TASK_ID;

const payload = {
  taskId,
  tool: event.tool_name,
  params: event.params,
  result: event.result,
  timestamp: Date.now()
};

const req = http.request({
  hostname: 'localhost',
  port: 9999,
  path: '/events',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, () => {});

req.write(JSON.stringify(payload));
req.end();
```

### Diff Capture Strategy

Claude Code's Edit tool already contains structured diff data:

```
Edit tool call:
  file_path: "src/auth.ts"
  old_string: "function login() {"      ← This IS the before
  new_string: "async function login(user: User) {"  ← This IS the after
```

We capture this directly — no need to compute diffs ourselves.

---

## VSCode Extension UI

### Task Panel (Sidebar)

```
┌─ AI Cockpit ─────────────────────────────────────────────┐
│ ⚡ Active Tasks                                          │
├──────────────────────────────────────────────────────────┤
│ 🔄 Add user authentication                               │
│    Progress: ████████░░ 80%                              │
│    ├─ ✅ Create User model                               │
│    ├─ ✅ Add password hashing                            │
│    ├─ 🔄 Implement login endpoint                        │
│    └─ ⬚ Add session management                          │
│                                                          │
│ ⬚ Refactor database queries                             │
│    Progress: ░░░░░░░░░░ 0%                               │
├──────────────────────────────────────────────────────────┤
│ ✅ Completed (2)                                   [▾]   │
└──────────────────────────────────────────────────────────┘
```

### Diff Timeline (within task)

```
┌─ Diff History: Add user authentication ──────────────────┐
│                                                          │
│ 14:23  src/models/user.ts        +45 -0   [👁] [↩]      │
│ 14:25  src/utils/hash.ts         +23 -0   [👁] [↩]      │
│ 14:28  src/routes/auth.ts        +67 -12  [👁] [↩]      │
│ 14:32  src/middleware/session.ts +34 -0   [👁] [↩]      │
│                                                          │
│ [👁] = View Diff    [↩] = Revert Change                  │
└──────────────────────────────────────────────────────────┘
```

### Diff Viewer (native VSCode diff)

Uses `vscode.commands.executeCommand('vscode.diff', beforeUri, afterUri)` to show native diff view.

---

## Task Creation Flow (MVP)

### Method 1: `/task-create` Command

1. User runs `/task-create "Add authentication"` in Claude Code terminal
2. Command creates task in `.ai/tasks/` AND registers with cockpit
3. Sets `COCKPIT_TASK_ID` environment variable for hook context
4. All subsequent Edit/Write operations are captured under this task

### Method 2: Auto-detect from Prompt

1. User sends first message to Claude Code
2. Cockpit parses message and creates implicit task
3. Title derived from first line/summary of prompt

### Method 3: Git Branch Trigger

1. User checks out feature branch: `git checkout -b feat/add-auth`
2. Cockpit detects branch creation and creates task
3. Task title derived from branch name

---

## Sync with ai-framework

The cockpit syncs bidirectionally with `.ai/tasks/`:

### Cockpit → ai-framework

When cockpit creates/updates a task:
1. Write task YAML to `.ai/tasks/{status}/{task-id}/status.yaml`
2. Include cockpit metadata (diff count, progress, etc.)

### ai-framework → Cockpit

When `.ai/tasks/` changes externally:
1. File watcher detects changes
2. Cockpit updates internal state
3. UI refreshes automatically

---

## MVP v1 Scope

### Included

| Feature | Priority | Status |
|---------|----------|--------|
| Task panel showing current tasks | P0 | Planned |
| Real-time status updates | P0 | Planned |
| Subtask breakdown display | P0 | Planned |
| Diff capture via hooks | P0 | Planned |
| Diff timeline per task | P1 | Planned |
| View diff in VSCode diff viewer | P1 | Planned |
| SQLite persistence | P1 | Planned |
| Revert single change | P2 | Planned |
| Sync with .ai/tasks/ | P2 | Planned |

### NOT Included (Future Versions)

- Multi-agent orchestration
- Remote/team collaboration
- Cost tracking
- Voice commands
- GitHub Issues integration

---

## File Structure

```
vscode-extension/
├── package.json
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── panels/
│   │   ├── TaskPanel.ts       # Main task sidebar
│   │   └── DiffViewer.ts      # Diff display logic
│   ├── server/
│   │   └── CockpitServer.ts   # Local HTTP server for hooks
│   ├── db/
│   │   ├── schema.ts          # SQLite schema definitions
│   │   └── queries.ts         # Database operations
│   ├── providers/
│   │   └── DiffContentProvider.ts  # Virtual doc provider for diffs
│   └── types/
│       └── index.ts           # TypeScript interfaces
├── media/
│   └── icons/                 # Extension icons
└── .claude/
    └── hooks/
        └── cockpit-hook.js    # Hook script template
```

---

## Next Steps (v2 Planning)

After MVP v1, explore:

1. **Hook Event Structure** - Deep dive into Claude Code hook API
2. **Real-time WebSocket** - Replace polling with push updates
3. **Accept/Reject per chunk** - Granular change approval
4. **Diff grouping** - Group related edits by subtask
5. **Terminal integration** - Spawn Claude Code from extension

---

## Related Documentation

- [Architecture README](./README.md)
- [VSCode Extension Docs](../vscode-extension/README.md)
- [ai-framework Docs](../ai-framework/README.md)

---

_Created: 2025-12-27_
_Last Updated: 2025-12-27_
_Version: MVP v1_
