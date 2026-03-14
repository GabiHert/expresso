---
type: work-item
id: "02"
parent: LOCAL-023
title: Refactor SessionManager to use database
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-023]]


# Refactor SessionManager to Use Database

## Objective

Refactor `SessionManager.ts` to use `SessionDatabase` instead of direct JSON file operations. The public API must remain 100% unchanged to avoid breaking dependent code.

## Pre-Implementation

1. Ensure Work Item 01 (SessionDatabase) is complete
2. Run existing tests to establish baseline
3. Review all SessionManager method signatures

## Implementation Steps

### Step 1: Update Imports and Constructor

**File**: `vscode-extension/src/services/SessionManager.ts`

**Changes**:

```typescript
// REMOVE these imports:
// import * as fs from 'fs';
// import { safeJsonParse } from '../utils/safeJsonParse';

// ADD this import:
import { SessionDatabase } from './SessionDatabase';

export class SessionManager {
  private db: SessionDatabase;
  private writeQueue: Promise<void> = Promise.resolve();
  private initialized: boolean = false;

  constructor(private workspaceRoot: string) {
    const dbPath = path.join(workspaceRoot, '.ai/cockpit/sessions.db');
    this.db = new SessionDatabase(dbPath);
  }

  // ADD new lifecycle methods:
  async initialize(): Promise<void> {
    await this.db.initialize();
    this.initialized = true;
  }

  async close(): Promise<void> {
    await this.db.close();
    this.initialized = false;
  }
}
```

### Step 2: Refactor Read Operations

Replace JSON file reads with database queries:

```typescript
// BEFORE:
async getSessions(): Promise<CockpitSession[]> {
  return this.withLock(async () => {
    const registry = await this.loadRegistryAsync();
    return registry.sessions;
  });
}

// AFTER:
async getSessions(): Promise<CockpitSession[]> {
  return this.withLock(async () => {
    return this.db.getAllSessions();
  });
}
```

Apply similar changes to:
- `getSessionsForTask(taskId)` → `this.db.getSessionsByTaskId(taskId)`
- `getUnassignedSessions()` → `this.db.getSessionsByTaskId(UNASSIGNED_TASK_ID)`
- `getSession(sessionId)` → `this.db.getSessionById(sessionId)`
- `getActiveSessionByTerminalId(terminalId)` → `this.db.getSessionByTerminalId(terminalId)`

### Step 3: Refactor Write Operations

Replace JSON file writes with database operations:

```typescript
// BEFORE:
async registerSession(session: CockpitSession): Promise<void> {
  return this.withLock(async () => {
    const registry = await this.loadRegistryAsync();
    const existingIndex = registry.sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      registry.sessions[existingIndex] = session;
    } else {
      registry.sessions.push(session);
    }
    await this.saveRegistryAsync(registry);
  });
}

// AFTER:
async registerSession(session: CockpitSession): Promise<void> {
  return this.withLock(async () => {
    const existing = this.db.getSessionById(session.id);
    if (existing) {
      this.db.updateSession(session.id, session);
    } else {
      this.db.insertSession(session);
    }
  });
}
```

Apply similar changes to:
- `updateSession(id, updates)`
- `closeSession(sessionId)`
- `renameSession(id, label)`
- `linkSessionToTask(id, taskId)`
- `updateSessionTaskId(oldTaskId, newTaskId)`
- `deleteSession(sessionId)`
- `closeSessionByTerminal(name)`
- `closeSessionByTerminalId(terminalId)`
- `cleanupOldSessions(days)`

### Step 4: Remove Deprecated Methods

Delete these methods (no longer needed):
- `loadRegistryAsync()` - replaced by direct DB queries
- `saveRegistryAsync()` - replaced by direct DB writes
- `repairRegistry()` - SQLite handles integrity

Keep these methods:
- `withLock()` - still useful for operation serialization
- `isValidSession()` - can be used for validation before insert
- `verifyAndRepairSessions()` - may still be useful for task sync
- `cleanupOldSignalFiles()` - unrelated to sessions

### Step 5: Add deleteByTaskId Method

Add a new method for CockpitCleanupService:

```typescript
async deleteByTaskId(taskId: string): Promise<number> {
  return this.withLock(async () => {
    return this.db.deleteByTaskId(taskId);
  });
}
```

### Step 6: Update verifyAndRepairSessions

Adjust to work with database queries instead of JSON:

```typescript
private async verifyAndRepairSessions(): Promise<void> {
  const activeTask = await this.loadActiveTask();
  if (!activeTask) return;

  const sessions = this.db.getAllSessions();
  for (const session of sessions) {
    if (session.status === 'active' && session.taskId !== activeTask.taskId) {
      this.db.updateSession(session.id, {
        taskId: activeTask.taskId,
        lastActive: new Date().toISOString()
      });
    }
  }
}
```

## Public API Verification Checklist

Ensure these method signatures are UNCHANGED:

- [ ] `getSessions(): Promise<CockpitSession[]>`
- [ ] `getSessionsForTask(taskId: string): Promise<CockpitSession[]>`
- [ ] `getUnassignedSessions(): Promise<CockpitSession[]>`
- [ ] `getSession(sessionId: string): Promise<CockpitSession | undefined>`
- [ ] `registerSession(session: CockpitSession): Promise<void>`
- [ ] `updateSession(id: string, updates: Partial<CockpitSession>): Promise<boolean>`
- [ ] `closeSession(sessionId: string): Promise<void>`
- [ ] `renameSession(id: string, label: string): Promise<void>`
- [ ] `linkSessionToTask(id: string, taskId: string): Promise<void>`
- [ ] `updateSessionTaskId(sessionId: string, newTaskId: string): Promise<void>`
- [ ] `deleteSession(sessionId: string): Promise<boolean>`
- [ ] `closeSessionByTerminal(terminalName: string): Promise<void>`
- [ ] `closeSessionByTerminalId(terminalId: string): Promise<void>`
- [ ] `cleanupOldSessions(daysToKeep: number): Promise<void>`
- [ ] `startContinuousVerification(intervalMs?: number): { dispose: () => void }`

NEW methods:
- [ ] `initialize(): Promise<void>`
- [ ] `close(): Promise<void>`
- [ ] `deleteByTaskId(taskId: string): Promise<number>`

## Acceptance Criteria

- [ ] All public methods work with same signatures
- [ ] No JSON file operations remain (except signal files)
- [ ] withLock() pattern preserved for write serialization
- [ ] initialize() must be called before operations work
- [ ] close() properly saves and closes database
- [ ] All existing callers in extension.ts work unchanged

## Testing

1. Run existing tests - they should pass with minimal changes
2. Manual test: Create terminal → session appears in tree
3. Manual test: Close terminal → session marked closed
4. Manual test: Switch task → sessions update taskId
5. Manual test: Delete task → sessions for task deleted

## Notes

- The withLock() pattern is still valuable even with SQLite
- Consider whether `initialized` flag should throw or warn if operations called before init
- The database handles its own file persistence - no need for saveRegistryAsync equivalent
