---
type: internal-doc
tags:
  - doc
---

<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: DOMAIN                                                    ║
║ STATUS: MVP v2 - Design Phase                                    ║
╠══════════════════════════════════════════════════════════════════╣
║ NAVIGATION:                                                      ║
║ • Parent: .ai/docs/_architecture/README.md                       ║
║ • Previous: [[ai-cockpit-mvp-v1]].md                                 ║
║ • Related: [[claude-code-hooks]].md                                  ║
║ • Index: .ai/INDEX.md                                           ║
╚══════════════════════════════════════════════════════════════════╝
-->

# AI Cockpit - MVP v2 Specification

Building on MVP v1, this version solves the **Task ID Propagation** problem — how hooks know which task an edit belongs to.

---

## Overview

- **What**: Task ID propagation system using active-task file + framework integration
- **Why**: Hooks need to associate edits with the correct task for proper tracking
- **When**: MVP v2 implements task context before building the VSCode extension

---

## Changes from MVP v1

| Area | MVP v1 | MVP v2 |
|------|--------|--------|
| Task ID source | Environment variable (unclear how set) | Active-task file + `/task-start` integration |
| Hook → Task mapping | Assumed available | Explicit file-based lookup |
| Task lifecycle | Not defined | `/task-start` → active → `/task-done` |
| Fallback strategy | None | Git branch parsing |
| Cockpit state | Undefined | `.ai/cockpit/` directory structure |

---

## Task ID Propagation Design

### The Problem

When a `PostToolUse` hook fires for an Edit tool call, it receives:

```json
{
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "src/auth.ts",
    "old_string": "...",
    "new_string": "..."
  },
  "session_id": "abc123"
}
```

**Missing**: Which AI Cockpit task does this edit belong to?

### The Solution: Active Task File

Use a file-based approach where the current task is written to `.ai/cockpit/active-task.json`.

```
┌────────────────────────────────────────────────────────────────┐
│                    TASK ID RESOLUTION                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. COCKPIT_TASK environment variable  ◄── NEW: Parallel work  │
│     ↓ if set                                                   │
│     → Use env var value (highest priority)                     │
│                                                                │
│     ↓ if not set                                               │
│  2. Read .ai/cockpit/active-task.json                          │
│     ↓ if exists and valid                                      │
│     → Use taskId from file                                     │
│                                                                │
│     ↓ if not found                                             │
│  3. Parse git branch name                                      │
│     ↓ if matches pattern (e.g., feat/TASK-123-*)               │
│     → Use extracted task ID                                    │
│                                                                │
│     ↓ if no match                                              │
│  4. Use session_id as fallback                                 │
│     → Group events by session (orphaned edits)                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Parallel Sessions

To work on multiple tasks simultaneously in different terminals:

```bash
# Terminal 1: Work on LOCAL-001
COCKPIT_TASK=LOCAL-001 claude

# Terminal 2: Work on LOCAL-002 (parallel)
COCKPIT_TASK=LOCAL-002 claude
```

Each session's edits are routed independently to their specified task.

**Without the env var**, all sessions use the same active task from `active-task.json`.

---

## Cockpit Directory Structure

```
.ai/
├── cockpit/
│   ├── active-task.json       # Currently active task
│   ├── config.json            # Cockpit configuration
│   └── events/                # Captured events (file-based storage)
│       ├── TASK-123/          # Events grouped by task
│       │   ├── 001-edit.json
│       │   ├── 002-edit.json
│       │   └── 003-write.json
│       └── _orphaned/         # Events with no task (fallback)
│           └── session-abc123/
│               └── 001-edit.json
├── tasks/                     # Existing ai-framework tasks
│   ├── todo/
│   ├── in_progress/
│   └── done/
└── ...
```

---

## Active Task File

### Format

```json
{
  "taskId": "TASK-123",
  "title": "Add user authentication",
  "branch": "feat/TASK-123-auth",
  "frameworkPath": ".ai/tasks/in_progress/TASK-123",
  "startedAt": "2025-12-27T10:00:00.000Z",
  "sessionId": "abc123"
}
```

### Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      TASK LIFECYCLE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /task-create "Add auth"                                        │
│       │                                                         │
│       ▼                                                         │
│  Creates .ai/tasks/todo/TASK-123/                               │
│       │                                                         │
│       ▼                                                         │
│  /task-start TASK-123                                           │
│       │                                                         │
│       ├─► Moves to .ai/tasks/in_progress/TASK-123/              │
│       │                                                         │
│       └─► Writes .ai/cockpit/active-task.json  ◄── KEY ACTION   │
│               {                                                 │
│                 "taskId": "TASK-123",                           │
│                 "title": "Add auth",                            │
│                 ...                                             │
│               }                                                 │
│       │                                                         │
│       ▼                                                         │
│  [Claude Code works on task]                                    │
│       │                                                         │
│       │  PostToolUse hook fires                                 │
│       │       │                                                 │
│       │       └─► Reads active-task.json                        │
│       │           Associates edit with TASK-123                 │
│       │                                                         │
│       ▼                                                         │
│  /task-done                                                     │
│       │                                                         │
│       ├─► Moves to .ai/tasks/done/TASK-123/                     │
│       │                                                         │
│       └─► Deletes .ai/cockpit/active-task.json                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Framework Command Updates

### /[[task-start]] Enhancement

Add cockpit integration to `/task-start`:

```markdown
## Step X: Activate Cockpit Tracking

After moving task to in_progress:

1. Create `.ai/cockpit/` directory if not exists
2. Write `active-task.json`:

\`\`\`json
{
  "taskId": "{task-id}",
  "title": "{task-title}",
  "branch": "{current-git-branch}",
  "frameworkPath": ".ai/tasks/in_progress/{task-id}",
  "startedAt": "{ISO-timestamp}",
  "sessionId": "{from-environment-or-generate}"
}
\`\`\`

3. Announce:
   ```
   Cockpit: Task {task-id} is now active
   All edits will be tracked under this task.
   ```
```

### /[[task-done]] Enhancement

Add cockpit cleanup to `/task-done`:

```markdown
## Step X: Deactivate Cockpit Tracking

Before moving task to done:

1. Read `.ai/cockpit/active-task.json`
2. If taskId matches current task:
   - Delete `active-task.json`
   - Announce: `Cockpit: Task {task-id} tracking stopped`
3. If taskId doesn't match:
   - Warn user: another task is active
```

### /task-switch (New Command - Optional)

For switching between tasks mid-session:

```markdown
## /task-switch

Usage: /task-switch TASK-ID

1. Save current active-task.json to history
2. Write new task to active-task.json
3. Announce switch
```

---

## Hook Implementation (Updated)

### cockpit-capture.js

```javascript
#!/usr/bin/env node
// .claude/hooks/cockpit-capture.js

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

// Read hook input from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(input);
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

    // Resolve task ID
    const taskId = resolveTaskId(projectDir, hookData.session_id);

    // Build event payload
    const event = {
      id: generateId(),
      taskId: taskId.id,
      taskIdSource: taskId.source,
      tool: hookData.tool_name,
      input: hookData.tool_input,
      response: hookData.tool_response,
      sessionId: hookData.session_id,
      timestamp: new Date().toISOString()
    };

    // Save event
    saveEvent(projectDir, event);

    // Optionally notify cockpit server
    notifyServer(event);

  } catch (err) {
    // Don't block Claude Code on hook errors
    console.error(`[cockpit] Error: ${err.message}`);
  }

  process.exit(0);
});

function resolveTaskId(projectDir, sessionId) {
  // Strategy 1: Environment variable override (highest priority)
  const envTaskId = process.env.COCKPIT_TASK;
  if (envTaskId) {
    return { id: envTaskId, source: 'env-var' };
  }

  // Strategy 2: Active task file
  const activeTaskPath = path.join(projectDir, '.ai/cockpit/active-task.json');
  if (fs.existsSync(activeTaskPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(activeTaskPath, 'utf8'));
      if (data.taskId) {
        return { id: data.taskId, source: 'active-task-file' };
      }
    } catch {}
  }

  // Strategy 3: Git branch pattern
  try {
    const branch = execSync('git branch --show-current', {
      cwd: projectDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    // Match patterns like: feat/TASK-123-description or JIRA-456-fix
    const match = branch.match(/([A-Z]+-\d+)/i);
    if (match) {
      return { id: match[1].toUpperCase(), source: 'git-branch' };
    }
  } catch {}

  // Strategy 4: Session fallback
  return { id: `session-${sessionId}`, source: 'session-fallback' };
}

function generateId() {
  return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function saveEvent(projectDir, event) {
  const eventsDir = path.join(projectDir, '.ai/cockpit/events', event.taskId);

  // Create directory if needed
  fs.mkdirSync(eventsDir, { recursive: true });

  // Generate sequential filename
  const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.json'));
  const nextNum = String(files.length + 1).padStart(3, '0');
  const filename = `${nextNum}-${event.tool.toLowerCase()}.json`;

  // Write event
  fs.writeFileSync(
    path.join(eventsDir, filename),
    JSON.stringify(event, null, 2)
  );
}

function notifyServer(event) {
  // Fire-and-forget notification to cockpit server
  const req = http.request({
    hostname: 'localhost',
    port: 9999,
    path: '/events',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    timeout: 1000
  }, () => {});

  req.on('error', () => {}); // Ignore errors
  req.write(JSON.stringify(event));
  req.end();
}
```

### Hook Configuration

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

---

## Event Storage Format

### Edit Event

```json
{
  "id": "evt-1703692800000-a1b2c3d4e",
  "taskId": "TASK-123",
  "taskIdSource": "active-task-file",
  "tool": "Edit",
  "input": {
    "file_path": "src/auth.ts",
    "old_string": "function login() {",
    "new_string": "async function login(user: User) {"
  },
  "response": "File edited successfully",
  "sessionId": "abc123",
  "timestamp": "2025-12-27T10:00:00.000Z"
}
```

### Write Event

```json
{
  "id": "evt-1703692801000-f5g6h7i8j",
  "taskId": "TASK-123",
  "taskIdSource": "active-task-file",
  "tool": "Write",
  "input": {
    "file_path": "src/models/user.ts",
    "content": "export interface User {\n  id: string;\n  email: string;\n}"
  },
  "response": "File created successfully",
  "sessionId": "abc123",
  "timestamp": "2025-12-27T10:00:01.000Z"
}
```

### TodoWrite Event

```json
{
  "id": "evt-1703692802000-k9l0m1n2o",
  "taskId": "TASK-123",
  "taskIdSource": "active-task-file",
  "tool": "TodoWrite",
  "input": {
    "todos": [
      {"content": "Create User model", "status": "completed"},
      {"content": "Add password hashing", "status": "in_progress"},
      {"content": "Implement login endpoint", "status": "pending"}
    ]
  },
  "response": "Todos updated",
  "sessionId": "abc123",
  "timestamp": "2025-12-27T10:00:02.000Z"
}
```

---

## VSCode Extension Updates

### File Watcher Strategy

The extension watches `.ai/cockpit/` for changes:

```typescript
// src/watchers/CockpitWatcher.ts
import * as vscode from 'vscode';

export class CockpitWatcher {
  private watcher: vscode.FileSystemWatcher;

  constructor(private onEvent: (event: CockpitEvent) => void) {
    const pattern = new vscode.RelativePattern(
      vscode.workspace.workspaceFolders![0],
      '.ai/cockpit/events/**/*.json'
    );

    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    this.watcher.onDidCreate(uri => this.handleNewEvent(uri));
    this.watcher.onDidChange(uri => this.handleNewEvent(uri));
  }

  private async handleNewEvent(uri: vscode.Uri) {
    const content = await vscode.workspace.fs.readFile(uri);
    const event = JSON.parse(content.toString());
    this.onEvent(event);
  }

  dispose() {
    this.watcher.dispose();
  }
}
```

### Active Task Display

```typescript
// src/providers/ActiveTaskProvider.ts
export class ActiveTaskProvider {
  private activeTask: ActiveTask | null = null;

  async refresh() {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) return;

    const activeTaskPath = path.join(workspaceRoot, '.ai/cockpit/active-task.json');

    try {
      const content = await fs.promises.readFile(activeTaskPath, 'utf8');
      this.activeTask = JSON.parse(content);
      this.statusBarItem.text = `$(tasklist) ${this.activeTask.taskId}`;
      this.statusBarItem.show();
    } catch {
      this.activeTask = null;
      this.statusBarItem.text = '$(tasklist) No active task';
      this.statusBarItem.show();
    }
  }
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User                                                                   │
│    │                                                                    │
│    │ /task-start TASK-123                                               │
│    ▼                                                                    │
│  ┌─────────────────┐                                                    │
│  │ Claude Code     │                                                    │
│  │ (ai-framework)  │                                                    │
│  └────────┬────────┘                                                    │
│           │                                                             │
│           │ Writes                                                      │
│           ▼                                                             │
│  ┌─────────────────────────────────────────┐                            │
│  │ .ai/cockpit/active-task.json            │                            │
│  │ { "taskId": "TASK-123", ... }           │                            │
│  └─────────────────────────────────────────┘                            │
│                                                                         │
│  User                                                                   │
│    │                                                                    │
│    │ "Add login endpoint"                                               │
│    ▼                                                                    │
│  ┌─────────────────┐         ┌─────────────────┐                        │
│  │ Claude Code     │────────►│ Edit Tool       │                        │
│  └─────────────────┘         └────────┬────────┘                        │
│                                       │                                 │
│                                       │ PostToolUse Hook                │
│                                       ▼                                 │
│                              ┌─────────────────┐                        │
│                              │ cockpit-capture │                        │
│                              │ .js             │                        │
│                              └────────┬────────┘                        │
│                                       │                                 │
│                    ┌──────────────────┼──────────────────┐              │
│                    │                  │                  │              │
│                    ▼                  ▼                  ▼              │
│           ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│           │ Read active-  │  │ Save event to │  │ Notify HTTP   │       │
│           │ task.json     │  │ .ai/cockpit/  │  │ server        │       │
│           │ → TASK-123    │  │ events/       │  │ (optional)    │       │
│           └───────────────┘  └───────┬───────┘  └───────────────┘       │
│                                      │                                  │
│                                      ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │ .ai/cockpit/events/TASK-123/001-edit.json                   │        │
│  │ {                                                           │        │
│  │   "taskId": "TASK-123",                                     │        │
│  │   "tool": "Edit",                                           │        │
│  │   "input": { "file_path": "...", "old_string": "..." }      │        │
│  │ }                                                           │        │
│  └──────────────────────────────┬──────────────────────────────┘        │
│                                 │                                       │
│                                 │ File watcher                          │
│                                 ▼                                       │
│                        ┌─────────────────┐                              │
│                        │ VSCode Extension│                              │
│                        │ Updates UI      │                              │
│                        └─────────────────┘                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## MVP v2 Scope

### Included

| Feature | Priority | Status |
|---------|----------|--------|
| Active task file system | P0 | Planned |
| /task-start cockpit integration | P0 | Planned |
| /task-done cockpit cleanup | P0 | Planned |
| Hook with task ID resolution | P0 | Planned |
| Git branch fallback | P1 | Planned |
| Session ID fallback | P1 | Planned |
| File-based event storage | P1 | Planned |
| VSCode file watcher | P2 | Planned |
| Status bar active task | P2 | Planned |

### Deferred to v3

- HTTP server for real-time push
- SQLite migration from file storage
- Multi-task session support
- Task switching UI

---

## Implementation Order

```
Phase 1: Framework Integration
├── 1.1 Create .ai/cockpit/ directory structure
├── 1.2 Update /task-start to write active-task.json
├── 1.3 Update /task-done to clear active-task.json
└── 1.4 Test task lifecycle

Phase 2: Hook System
├── 2.1 Create cockpit-capture.js hook script
├── 2.2 Add hook configuration to .claude/settings.json
├── 2.3 Test task ID resolution (all 3 strategies)
└── 2.4 Test event file creation

Phase 3: VSCode Extension (Basic)
├── 3.1 Create extension scaffold
├── 3.2 Implement file watcher for events
├── 3.3 Add status bar for active task
└── 3.4 Basic task panel (read-only)
```

---

## Testing Strategy

### Unit Tests

```typescript
// Test task ID resolution
describe('resolveTaskId', () => {
  it('should read from COCKPIT_TASK env var first', () => {
    // Env var set
    process.env.COCKPIT_TASK = 'ENV-TASK';
    expect(resolveTaskId(mockDir, 'session-1')).toEqual({
      id: 'ENV-TASK',
      source: 'env-var'
    });
    delete process.env.COCKPIT_TASK;
  });

  it('should fall back to active-task.json', () => {
    // No env var, but file exists with taskId
    expect(resolveTaskId(mockDir, 'session-1')).toEqual({
      id: 'TASK-123',
      source: 'active-task-file'
    });
  });

  it('should fall back to git branch', () => {
    // No env var, no active-task.json, but git branch is feat/JIRA-456-fix
    expect(resolveTaskId(mockDir, 'session-1')).toEqual({
      id: 'JIRA-456',
      source: 'git-branch'
    });
  });

  it('should fall back to session ID', () => {
    // No env var, no active-task.json, no matching branch
    expect(resolveTaskId(mockDir, 'session-1')).toEqual({
      id: 'session-session-1',
      source: 'session-fallback'
    });
  });
});
```

### Integration Tests

```bash
# Test full flow
1. /task-create "Test task"
2. /task-start TASK-001
3. Verify .ai/cockpit/active-task.json exists
4. Make an edit (Claude Code)
5. Verify .ai/cockpit/events/TASK-001/001-edit.json created
6. /task-done
7. Verify active-task.json deleted
```

---

## Related Documentation

- [MVP v1 Specification](./ai-cockpit-mvp-v1.md) - Base architecture
- [Claude Code Hooks](../_shared/claude-code-hooks.md) - Hook reference
- [ai-framework Docs](../ai-framework/README.md)

---

_Created: 2025-12-27_
_Last Updated: 2025-12-27_
_Version: MVP v2_
