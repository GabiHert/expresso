---
type: work-item
id: "04"
parent: LOCAL-023
title: Update extension lifecycle
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-023]]


# Update Extension Lifecycle

## Objective

Update `extension.ts` to properly initialize and close the SessionManager database. The database must be initialized before any session operations, and properly closed on extension deactivation to ensure data is saved.

## Pre-Implementation

1. Ensure Work Items 01-03 are complete
2. Review current activation/deactivation code in extension.ts

## Implementation Steps

### Step 1: Update Activation - Initialize Database

**File**: `vscode-extension/src/extension.ts`

**Find**: SessionManager instantiation (around line 84)

**Change**:

```typescript
// BEFORE (line ~84):
sessionManager = new SessionManager(workspaceRoot);

// AFTER:
sessionManager = new SessionManager(workspaceRoot);

// Initialize database (must complete before other operations)
try {
  await sessionManager.initialize();
  console.log('AI Cockpit: Session database initialized');
} catch (error) {
  console.error('AI Cockpit: Failed to initialize session database:', error);
  vscode.window.showErrorMessage(
    'AI Cockpit: Failed to initialize session database. Some features may not work.'
  );
}
```

### Step 2: Ensure Initialization Before Operations

The initialization must happen BEFORE:
- Auto-cleanup (line ~93-101)
- Continuous verification start (line ~104-107)
- File watchers start (line ~204)
- Any command that uses sessions

**Recommended order**:
```typescript
// 1. Create managers
sessionManager = new SessionManager(workspaceRoot);
terminalManager = new TerminalManager();
// ...

// 2. Initialize database FIRST
await sessionManager.initialize();

// 3. Then start cleanup, verification, watchers
if (config.get('autoCleanup.enabled')) {
  await sessionManager.cleanupOldSessions(daysToKeep);
}

const verificationDisposable = sessionManager.startContinuousVerification(3000);
context.subscriptions.push(verificationDisposable);

// 4. Then start file watchers, register commands, etc.
```

### Step 3: Update Deactivation - Close Database

**Find**: deactivate function (around line 1264-1270)

**Change**:

```typescript
// BEFORE:
export function deactivate() {
  fileWatcher?.dispose();
  statusBar?.dispose();
  terminalManager?.dispose();
  commentManager?.dispose();
}

// AFTER:
export async function deactivate() {
  // Close database first (saves pending changes)
  if (sessionManager) {
    try {
      await sessionManager.close();
      console.log('AI Cockpit: Session database closed');
    } catch (error) {
      console.error('AI Cockpit: Error closing session database:', error);
    }
  }

  // Then dispose other resources
  fileWatcher?.dispose();
  statusBar?.dispose();
  terminalManager?.dispose();
  commentManager?.dispose();
}
```

**Note**: The `deactivate` function can be async in VSCode extensions.

### Step 4: Handle Migration Errors Gracefully

During `initialize()`, if migration from sessions.json fails:

```typescript
try {
  await sessionManager.initialize();
} catch (error) {
  if (error.message?.includes('migration')) {
    vscode.window.showWarningMessage(
      'AI Cockpit: Session migration incomplete. Some sessions may not appear. Check the console for details.'
    );
  } else {
    throw error;
  }
}
```

### Step 5: Add Initialization Guard (Optional)

Consider adding a guard in SessionManager methods:

```typescript
// In SessionManager:
private ensureInitialized(): void {
  if (!this.initialized) {
    throw new Error('SessionManager not initialized. Call initialize() first.');
  }
}

async getSessions(): Promise<CockpitSession[]> {
  this.ensureInitialized();
  return this.withLock(async () => {
    return this.db.getAllSessions();
  });
}
```

This helps catch bugs where operations are called before initialization.

## Acceptance Criteria

- [ ] sessionManager.initialize() called during activation
- [ ] Initialization happens before any session operations
- [ ] sessionManager.close() called during deactivation
- [ ] deactivate() is async
- [ ] Migration errors handled gracefully with user notification
- [ ] Database file created at `.ai/cockpit/sessions.db`
- [ ] Extension activates successfully with both new DB and migrated JSON

## Testing

1. **Fresh install test**:
   - Delete `.ai/cockpit/sessions.db` and `sessions.json`
   - Activate extension
   - Verify `sessions.db` is created
   - Create a terminal → session should register

2. **Migration test**:
   - Have existing `sessions.json` with sessions
   - Delete `sessions.db`
   - Activate extension
   - Verify sessions migrate to database
   - Verify `sessions.json.backup.{timestamp}` created

3. **Deactivation test**:
   - Create sessions
   - Reload window (triggers deactivate then activate)
   - Verify sessions persist

4. **Error handling test**:
   - Make `sessions.json` invalid JSON
   - Activate extension
   - Verify warning shown, extension still works

## Notes

- sql.js WebAssembly loading is async - initialize() must be async
- VSCode allows async deactivate() - use it to ensure data is saved
- Consider showing a status bar item during initialization for feedback
- The database file should be gitignored (add to .gitignore if not present)
