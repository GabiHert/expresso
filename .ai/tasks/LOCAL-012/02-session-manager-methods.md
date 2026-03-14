---
type: work-item
id: "02"
parent: LOCAL-012
title: Add SessionManager methods
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Add SessionManager Methods

## Objective

Add methods to get unassigned sessions and link sessions to tasks.

## Implementation Steps

### Step 1: Import UNASSIGNED_TASK_ID

**File**: `src/services/SessionManager.ts`

Add import:
```typescript
import { CockpitSession, SessionRegistry, UNASSIGNED_TASK_ID } from '../types';
```

### Step 2: Add getUnassignedSessions method

**Location**: After `getSessionsForTask` method

```typescript
async getUnassignedSessions(): Promise<CockpitSession[]> {
  const sessions = await this.getSessions();
  return sessions.filter(s => s.taskId === UNASSIGNED_TASK_ID);
}
```

### Step 3: Add linkSessionToTask method

**Location**: After `renameSession` method

```typescript
async linkSessionToTask(sessionId: string, newTaskId: string): Promise<boolean> {
  return this.updateSession(sessionId, { taskId: newTaskId });
}
```

### Step 4: Update getSessionsForTask to exclude unassigned

**Modify existing method** to ensure task-scoped queries don't include unassigned:

```typescript
async getSessionsForTask(taskId: string): Promise<CockpitSession[]> {
  const sessions = await this.getSessions();
  return sessions.filter(s => s.taskId === taskId && taskId !== UNASSIGNED_TASK_ID);
}
```

## Acceptance Criteria

- [ ] `getUnassignedSessions()` returns only sessions with `_unassigned` taskId
- [ ] `linkSessionToTask()` updates session's taskId
- [ ] `getSessionsForTask()` excludes `_unassigned` sessions
