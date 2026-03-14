---
type: work-item
id: "04"
parent: LOCAL-007
title: Handle JSON parsing errors gracefully
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Handle JSON Parsing Errors Gracefully

## Objective

Add robust error handling for JSON parsing operations in both history.jsonl reading and sessions.json loading. Prevent crashes and provide useful feedback to users.

## Pre-Implementation

Understand:
- What can go wrong with JSON parsing
- Current error handling in the code
- Where user feedback is needed vs silent recovery

## Implementation Steps

### Step 1: Add Safe JSON Parser Utility

**File**: `vscode-extension/src/utils/jsonUtils.ts` (NEW)

**Instructions**:
1. Create a utility function for safe JSON parsing
2. Include logging for parse errors

```typescript
export function safeJsonParse<T>(
  json: string,
  fallback: T,
  context?: string
): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn(
      `AI Cockpit: JSON parse error${context ? ` in ${context}` : ''}: ${error}`
    );
    return fallback;
  }
}

export function safeJsonParseLine<T>(
  line: string,
  context?: string
): T | null {
  try {
    return JSON.parse(line) as T;
  } catch {
    // Silent for line-by-line parsing (common with JSONL)
    return null;
  }
}
```

### Step 2: Update History.jsonl Parsing

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
1. Import `safeJsonParseLine` utility
2. Update `captureLatestSessionId` to use safe parsing
3. Add validation of expected fields

```typescript
import { safeJsonParseLine } from './utils/jsonUtils';

// In captureLatestSessionId:
for (const line of lines.slice(0, 20)) {
  const entry = safeJsonParseLine<{
    project?: string;
    sessionId?: string;
  }>(line, 'history.jsonl');

  if (!entry) continue;

  if (
    entry.project === workspaceRoot &&
    entry.sessionId &&
    typeof entry.sessionId === 'string' &&
    !knownSessionIds.has(entry.sessionId)
  ) {
    return entry.sessionId;
  }
}
```

### Step 3: Update Sessions.json Loading

**File**: `vscode-extension/src/services/SessionManager.ts`

**Instructions**:
1. Import `safeJsonParse` utility
2. Update `loadRegistryAsync` to use safe parsing
3. Add validation of session objects

```typescript
import { safeJsonParse } from '../utils/jsonUtils';

private async loadRegistryAsync(): Promise<SessionRegistry> {
  try {
    await fs.promises.access(this.sessionsPath);
    const content = await fs.promises.readFile(this.sessionsPath, 'utf8');
    const registry = safeJsonParse<SessionRegistry>(
      content,
      { sessions: [] },
      'sessions.json'
    );

    // Validate sessions array
    if (!Array.isArray(registry.sessions)) {
      console.warn('AI Cockpit: Invalid sessions format, resetting');
      return { sessions: [] };
    }

    // Filter out invalid session objects
    registry.sessions = registry.sessions.filter(this.isValidSession);

    return registry;
  } catch {
    return { sessions: [] };
  }
}

private isValidSession(session: unknown): session is CockpitSession {
  if (!session || typeof session !== 'object') return false;
  const s = session as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.taskId === 'string' &&
    typeof s.status === 'string'
  );
}
```

### Step 4: Add Recovery for Corrupted sessions.json

**File**: `vscode-extension/src/services/SessionManager.ts`

**Instructions**:
1. Create backup before overwriting corrupted file
2. Notify user of recovery

```typescript
async repairRegistry(): Promise<boolean> {
  try {
    const content = await fs.promises.readFile(this.sessionsPath, 'utf8');
    JSON.parse(content); // Test parse
    return false; // No repair needed
  } catch {
    // Backup corrupted file
    const backupPath = `${this.sessionsPath}.backup.${Date.now()}`;
    try {
      await fs.promises.rename(this.sessionsPath, backupPath);
      console.log(`AI Cockpit: Backed up corrupted sessions to ${backupPath}`);
    } catch {
      // File might not exist
    }

    // Create fresh registry
    await this.saveRegistryAsync({ sessions: [] });
    return true; // Repair performed
  }
}
```

### Step 5: Add User Notification for Session Capture Failure

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
1. After failed session capture, show warning message
2. Add option to retry or dismiss

```typescript
// In openTaskTerminal, after capture fails:
if (!sessionId) {
  vscode.window.showWarningMessage(
    `AI Cockpit: Could not capture session for ${taskId}. ` +
    `The terminal is open but session tracking may not work.`,
    'Dismiss'
  );
}
```

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Corrupted JSON doesn't crash the extension
- [ ] Malformed history.jsonl lines are skipped
- [ ] Invalid session objects are filtered out
- [ ] User is notified of session capture failures
- [ ] Corrupted sessions.json is backed up before repair

## Testing

1. Corrupt sessions.json with invalid JSON
2. Verify extension loads without crash
3. Verify backup file created
4. Add invalid entries to history.jsonl
5. Verify session capture still works (skips bad lines)
6. Test with empty/missing files

## Notes

- Consider adding telemetry for parse errors (helps identify issues)
- May want recovery UI in case of repeated failures
- JSONL format naturally handles line-level corruption
