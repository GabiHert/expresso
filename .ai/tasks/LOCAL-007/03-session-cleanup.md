---
type: work-item
id: "03"
parent: LOCAL-007
title: Add session cleanup mechanism
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Add Session Cleanup Mechanism

## Objective

Implement automatic cleanup of old closed sessions to prevent sessions.json from growing indefinitely. Add a configurable retention period and manual cleanup command.

## Pre-Implementation

Consider:
- What's a reasonable default retention period? (7 days suggested)
- Should cleanup be automatic or manual?
- Should we archive deleted sessions or just remove them?

## Implementation Steps

### Step 1: Add Cleanup Configuration

**File**: `vscode-extension/package.json`

**Instructions**:
1. Add configuration settings for session cleanup:

```json
"configuration": {
  "title": "AI Cockpit",
  "properties": {
    "aiCockpit.sessions.retentionDays": {
      "type": "number",
      "default": 7,
      "description": "Number of days to keep closed sessions"
    },
    "aiCockpit.sessions.autoCleanup": {
      "type": "boolean",
      "default": true,
      "description": "Automatically clean up old sessions on startup"
    }
  }
}
```

### Step 2: Add Cleanup Method to SessionManager

**File**: `vscode-extension/src/services/SessionManager.ts`

**Instructions**:
1. Add `cleanupOldSessions` method
2. Only clean up closed sessions older than retention period
3. Never delete active sessions

```typescript
async cleanupOldSessions(retentionDays: number): Promise<number> {
  return this.withLock(async () => {
    const registry = await this.loadRegistryAsync();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const originalCount = registry.sessions.length;
    registry.sessions = registry.sessions.filter(session => {
      // Never delete active sessions
      if (session.status === 'active') return true;

      // Keep sessions newer than cutoff
      const lastActive = new Date(session.lastActive);
      return lastActive > cutoffDate;
    });

    const deletedCount = originalCount - registry.sessions.length;
    if (deletedCount > 0) {
      await this.saveRegistryAsync(registry);
    }

    return deletedCount;
  });
}
```

### Step 3: Run Cleanup on Startup

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
1. In `activate()`, after initializing SessionManager
2. Check configuration for auto-cleanup setting
3. Run cleanup if enabled

```typescript
// In activate(), after sessionManager initialization
const config = vscode.workspace.getConfiguration('aiCockpit');
if (config.get<boolean>('sessions.autoCleanup', true)) {
  const retentionDays = config.get<number>('sessions.retentionDays', 7);
  sessionManager.cleanupOldSessions(retentionDays).then(count => {
    if (count > 0) {
      console.log(`AI Cockpit: Cleaned up ${count} old sessions`);
    }
  });
}
```

### Step 4: Add Manual Cleanup Command

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
1. Register a command `aiCockpit.cleanupSessions`
2. Show info message with cleanup count

```typescript
const cleanupSessions = vscode.commands.registerCommand(
  'aiCockpit.cleanupSessions',
  async () => {
    if (!sessionManager) return;

    const config = vscode.workspace.getConfiguration('aiCockpit');
    const retentionDays = config.get<number>('sessions.retentionDays', 7);
    const count = await sessionManager.cleanupOldSessions(retentionDays);

    vscode.window.showInformationMessage(
      `AI Cockpit: Cleaned up ${count} old session(s)`
    );

    taskTreeProvider?.refresh();
  }
);

context.subscriptions.push(cleanupSessions);
```

### Step 5: Add Command to package.json

**File**: `vscode-extension/package.json`

**Instructions**:
1. Add the cleanup command to commands array

```json
{
  "command": "aiCockpit.cleanupSessions",
  "title": "AI Cockpit: Cleanup Old Sessions"
}
```

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Old closed sessions are automatically cleaned up
- [ ] Retention period is configurable
- [ ] Active sessions are never deleted
- [ ] Manual cleanup command available
- [ ] Cleanup runs on extension startup (if enabled)

## Testing

1. Create several sessions, close some
2. Manually set lastActive to > 7 days ago in sessions.json
3. Run cleanup command
4. Verify old closed sessions are removed
5. Verify active sessions remain
6. Verify sessions within retention period remain

## Notes

- Consider adding a "clear all sessions" option for debugging
- Could log deleted session IDs for audit trail
- May want to add confirmation dialog for manual cleanup
