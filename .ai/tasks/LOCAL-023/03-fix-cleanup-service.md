---
type: work-item
id: "03"
parent: LOCAL-023
title: Refactor CockpitCleanupService to use SessionManager API
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Refactor CockpitCleanupService to Use SessionManager API

## Objective

Fix the critical bug where `CockpitCleanupService.ts` directly reads/writes `sessions.json`, bypassing `SessionManager`'s locking mechanism. This causes race conditions when cleanup runs concurrently with session operations.

## Pre-Implementation

1. Ensure Work Item 02 (SessionManager refactor) is complete
2. Review current CockpitCleanupService implementation (lines 82-113)

## The Bug

**Current code (lines 82-113)**:
```typescript
private async cleanupSessions(taskId: string): Promise<void> {
  const sessionsPath = path.join(this.workspaceRoot, '.ai/cockpit/sessions.json');

  try {
    await fs.promises.access(sessionsPath);
    const content = await fs.promises.readFile(sessionsPath, 'utf8');
    const registry = JSON.parse(content);

    // Filter out sessions for this task
    const filteredSessions = registry.sessions.filter(
      (s: any) => s.taskId !== taskId
    );

    // Write back
    await fs.promises.writeFile(
      sessionsPath,
      JSON.stringify({ sessions: filteredSessions }, null, 2),
      'utf8'
    );
  } catch (error) {
    // Ignore if file doesn't exist
  }
}
```

**Problem**: This bypasses SessionManager's `withLock()` queue, causing:
- Race condition if session is being registered while cleanup runs
- Data loss if cleanup overwrites a concurrent write
- Inconsistent state if cleanup crashes mid-write

## Implementation Steps

### Step 1: Add SessionManager Dependency

**File**: `vscode-extension/src/services/CockpitCleanupService.ts`

**Changes to constructor**:

```typescript
// BEFORE:
export class CockpitCleanupService {
  constructor(private workspaceRoot: string) {}
}

// AFTER:
import { SessionManager } from './SessionManager';

export class CockpitCleanupService {
  constructor(
    private workspaceRoot: string,
    private sessionManager: SessionManager
  ) {}
}
```

### Step 2: Replace Direct File Access

**Replace lines 82-113**:

```typescript
// BEFORE (buggy):
private async cleanupSessions(taskId: string): Promise<void> {
  const sessionsPath = path.join(this.workspaceRoot, '.ai/cockpit/sessions.json');
  // ... direct file manipulation ...
}

// AFTER (fixed):
private async cleanupSessions(taskId: string): Promise<void> {
  try {
    const deletedCount = await this.sessionManager.deleteByTaskId(taskId);
    if (deletedCount > 0) {
      console.log(`AI Cockpit: Deleted ${deletedCount} sessions for task ${taskId}`);
    }
  } catch (error) {
    console.error(`AI Cockpit: Failed to cleanup sessions for task ${taskId}:`, error);
  }
}
```

### Step 3: Update Extension.ts

**File**: `vscode-extension/src/extension.ts`

Find where CockpitCleanupService is instantiated and pass sessionManager:

```typescript
// BEFORE:
const cleanupService = new CockpitCleanupService(workspaceRoot);

// AFTER:
const cleanupService = new CockpitCleanupService(workspaceRoot, sessionManager);
```

### Step 4: Remove Unused Imports

In `CockpitCleanupService.ts`, remove:
```typescript
// Remove if no longer used:
// import * as fs from 'fs';  // (only if not used elsewhere in file)
```

### Step 5: Update Type Exports (if needed)

If `CockpitCleanupService` is exported and used elsewhere, ensure the new constructor signature is documented.

## Acceptance Criteria

- [ ] CockpitCleanupService accepts SessionManager in constructor
- [ ] cleanupSessions() uses sessionManager.deleteByTaskId()
- [ ] No direct sessions.json file access in CockpitCleanupService
- [ ] extension.ts passes sessionManager to CockpitCleanupService
- [ ] Cleanup works correctly when deleting a task
- [ ] No race conditions during concurrent operations

## Testing

1. **Manual test - Delete task with sessions**:
   - Create a task terminal (registers session)
   - Run "Delete Task" command
   - Verify session is deleted from database
   - Verify no errors in console

2. **Race condition test**:
   - Create multiple terminals rapidly
   - While terminals are being created, delete the task
   - Verify no crashes or data corruption

3. **Verify cleanup cascade**:
   ```
   Delete task → events cleaned up
                → shadows cleaned up
                → sessions cleaned up (via SessionManager)
                → active-task cleared
   ```

## Notes

- This is a critical bug fix - the direct file access was causing race conditions
- The fix is straightforward - just use the API instead of direct file access
- This pattern should be followed for any future cockpit data operations
