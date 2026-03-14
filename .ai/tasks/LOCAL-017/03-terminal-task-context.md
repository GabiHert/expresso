---
type: work-item
id: "03"
parent: LOCAL-017
title: Add task context to TerminalManager
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-017]]


# Add Task Context to TerminalManager

## Objective

Enhance TerminalManager to store the taskId associated with each terminal. This provides better debugging context and enables future improvements like task-aware logging.

## Pre-Implementation

This is an optional enhancement that improves observability. It can be done independently of work items 01-02.

Review `vscode-extension/src/services/TerminalManager.ts`.

## Implementation Steps

### Step 1: Add TerminalContext interface

**File**: `vscode-extension/src/services/TerminalManager.ts`

**Location**: At the top of the file, after imports

**Add**:
```typescript
interface TerminalContext {
  terminal: vscode.Terminal;
  taskId: string;
  createdAt: number;
}
```

### Step 2: Update terminalMap type

**File**: `vscode-extension/src/services/TerminalManager.ts`

**Change**:
```typescript
// FROM:
private terminalMap = new Map<string, vscode.Terminal>();

// TO:
private terminalMap = new Map<string, TerminalContext>();
```

### Step 3: Update registerTerminal method

**Change**:
```typescript
// FROM:
registerTerminal(terminalId: string, terminal: vscode.Terminal): void {
  this.terminalMap.set(terminalId, terminal);
}

// TO:
registerTerminal(terminalId: string, terminal: vscode.Terminal, taskId: string): void {
  this.terminalMap.set(terminalId, {
    terminal,
    taskId,
    createdAt: Date.now()
  });
}
```

### Step 4: Update getTerminal method

**Change**:
```typescript
// FROM:
getTerminal(terminalId: string): vscode.Terminal | undefined {
  return this.terminalMap.get(terminalId);
}

// TO:
getTerminal(terminalId: string): vscode.Terminal | undefined {
  return this.terminalMap.get(terminalId)?.terminal;
}
```

### Step 5: Update findTerminalId method

**Change**:
```typescript
// FROM:
findTerminalId(terminal: vscode.Terminal): string | undefined {
  for (const [id, t] of this.terminalMap.entries()) {
    if (t === terminal) return id;
  }
  return undefined;
}

// TO:
findTerminalId(terminal: vscode.Terminal): string | undefined {
  for (const [id, ctx] of this.terminalMap.entries()) {
    if (ctx.terminal === terminal) return id;
  }
  return undefined;
}
```

### Step 6: Add getTaskId method

**Add**:
```typescript
getTaskId(terminalId: string): string | undefined {
  return this.terminalMap.get(terminalId)?.taskId;
}
```

### Step 7: Update hasTerminal method

**Change**:
```typescript
hasTerminal(terminalId: string): boolean {
  return this.terminalMap.has(terminalId);
}
// No change needed - Map.has works the same
```

### Step 8: Update callers in extension.ts

**File**: `vscode-extension/src/extension.ts`

Update all `terminalManager.registerTerminal()` calls to include taskId:

```typescript
// In openTaskTerminal:
terminalManager!.registerTerminal(terminalId, terminal, taskId);

// In newSession:
terminalManager!.registerTerminal(terminalId, terminal, taskId);

// In startSession:
terminalManager!.registerTerminal(terminalId, terminal, UNASSIGNED_TASK_ID);
```

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] `TerminalContext` interface exists
- [ ] `terminalMap` stores context objects, not just terminals
- [ ] `registerTerminal` accepts taskId parameter
- [ ] `getTaskId` method exists and works
- [ ] All callers updated with taskId argument
- [ ] TypeScript compiles without errors

## Testing

1. `npm run compile` - should pass
2. Open task terminal - verify no errors
3. Check terminal manager stores correct taskId

## Notes

- This change enables future logging improvements
- Could be used for "show which task owns this terminal" feature
- The `createdAt` field can help debug timing issues
