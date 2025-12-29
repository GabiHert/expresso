<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-session-registry.md                                ║
║ TASK: LOCAL-006                                                  ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: ai-framework
---

# Session Registry Data Structure

## Objective

Define and create the session registry file structure that tracks Claude sessions per task.

## Implementation Steps

### Step 1: Create sessions.json schema

**File**: `.ai/cockpit/sessions.json`

```json
{
  "sessions": [
    {
      "id": "e0920ff0-b9e5-4ff6-9584-0a19919108bc",
      "taskId": "LOCAL-001",
      "label": "Main work",
      "createdAt": "2025-12-29T14:00:00Z",
      "lastActive": "2025-12-29T18:42:00Z",
      "status": "active" | "closed",
      "terminalName": "Cockpit: LOCAL-001"
    }
  ]
}
```

### Step 2: Create TypeScript interface

**File**: `vscode-extension/src/types/index.ts`

```typescript
export interface CockpitSession {
  id: string;           // Claude session UUID
  taskId: string;       // Task this session belongs to
  label: string;        // User-friendly label
  createdAt: string;    // ISO timestamp
  lastActive: string;   // ISO timestamp
  status: 'active' | 'closed';
  terminalName: string; // VSCode terminal name
}

export interface SessionRegistry {
  sessions: CockpitSession[];
}
```

### Step 3: Create SessionManager service

**File**: `vscode-extension/src/services/SessionManager.ts`

Methods needed:
- `getSessions()` - Load all sessions
- `getSessionsForTask(taskId)` - Filter by task
- `registerSession(session)` - Add new session
- `updateSession(id, updates)` - Update status/lastActive
- `closeSession(id)` - Mark as closed

## Acceptance Criteria

- [ ] TypeScript interfaces defined
- [ ] SessionManager service created
- [ ] Can read/write sessions.json
- [ ] Sessions persist across extension restarts
