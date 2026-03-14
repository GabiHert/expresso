---
type: work-item
id: "02"
parent: LOCAL-007
title: Convert SessionManager to async I/O
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Convert SessionManager to Async I/O

## Objective

Replace synchronous file operations in SessionManager with async versions to prevent blocking the VS Code extension host and improve responsiveness.

## Pre-Implementation

Understand:
- Which methods currently use sync I/O
- How the writeQueue mechanism works
- Impact on callers if methods become async

## Implementation Steps

### Step 1: Convert loadRegistry to Async

**File**: `vscode-extension/src/services/SessionManager.ts`

**Instructions**:
1. Rename `loadRegistry` to `loadRegistryAsync`
2. Replace `fs.existsSync` with `fs.promises.access`
3. Replace `fs.readFileSync` with `fs.promises.readFile`
4. Update return type to `Promise<SessionRegistry>`

```typescript
private async loadRegistryAsync(): Promise<SessionRegistry> {
  try {
    await fs.promises.access(this.sessionsPath);
    const content = await fs.promises.readFile(this.sessionsPath, 'utf8');
    return JSON.parse(content) as SessionRegistry;
  } catch {
    return { sessions: [] };
  }
}
```

### Step 2: Convert saveRegistry to Async

**File**: `vscode-extension/src/services/SessionManager.ts`

**Instructions**:
1. Rename `saveRegistry` to `saveRegistryAsync`
2. Replace `fs.existsSync` with `fs.promises.access` and catch
3. Replace `fs.mkdirSync` with `fs.promises.mkdir`
4. Replace `fs.writeFileSync` with `fs.promises.writeFile`

```typescript
private async saveRegistryAsync(registry: SessionRegistry): Promise<void> {
  const dir = path.dirname(this.sessionsPath);
  try {
    await fs.promises.access(dir);
  } catch {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  await fs.promises.writeFile(
    this.sessionsPath,
    JSON.stringify(registry, null, 2),
    'utf8'
  );
}
```

### Step 3: Update withLock to Handle Async Operations

**File**: `vscode-extension/src/services/SessionManager.ts`

**Instructions**:
1. Update `withLock` to properly handle async operations inside
2. Ensure proper error propagation

```typescript
private async withLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = this.writeQueue.then(() => operation());
  this.writeQueue = result.then(
    () => {},
    () => {}
  );
  return result;
}
```

### Step 4: Update All Methods Using loadRegistry/saveRegistry

**File**: `vscode-extension/src/services/SessionManager.ts`

**Instructions**:
1. Update `getSessions()` - must become async
2. Update `getSessionsForTask()` - must become async
3. Update `getSession()` - must become async
4. Update `registerSession()` - already async, update internals
5. Update `updateSession()` - already async, update internals
6. Update `closeSessionByTerminal()` - already async, update internals

### Step 5: Update Callers in Extension.ts

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
1. Update `captureLatestSessionId` to handle async `getSessions()`
2. Update terminal handlers to await session operations
3. Update any other callers of SessionManager methods

### Step 6: Update Callers in TaskTreeProvider.ts

**File**: `vscode-extension/src/providers/TaskTreeProvider.ts`

**Instructions**:
1. Update `getSessionsForTask` method to handle async
2. Update `getTaskChildren` to await session operations

## Post-Implementation

After completing, run a **code review agent** to check for:
- Proper await usage
- Error handling in async methods
- No sync I/O remaining

## Acceptance Criteria

- [ ] No sync file operations remain in SessionManager
- [ ] Extension doesn't block during file operations
- [ ] All callers properly await async methods
- [ ] Error handling preserved/improved

## Testing

1. Open multiple terminals while sessions.json is being written
2. Verify no file corruption occurs
3. Verify UI remains responsive during session operations
4. Test with slow file system (if possible)

## Notes

- This is a breaking change for SessionManager API
- Callers must be updated to use await
- Consider caching sessions in memory to reduce file reads
