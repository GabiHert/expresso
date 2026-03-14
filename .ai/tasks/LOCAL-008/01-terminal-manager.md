---
type: work-item
id: "01"
parent: LOCAL-008
title: Export terminalIdMap for terminal lookup
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Export terminalIdMap for Terminal Lookup

## Objective

Create a TerminalManager service that exposes terminal lookup functionality. Currently `terminalIdMap` is local to `extension.ts` and can't be accessed from TaskTreeProvider/SessionItem.

## Pre-Implementation

The current state:
- `extension.ts:27-28` has `const terminalIdMap = new Map<string, vscode.Terminal>()`
- This map is module-local and can't be accessed from other files
- SessionItem needs to lookup terminals to determine if they still exist

## Implementation Steps

### Step 1: Create TerminalManager Service

**File**: `vscode-extension/src/services/TerminalManager.ts` (NEW)

**Instructions**:
Create a service class that manages terminal tracking:

```typescript
import * as vscode from 'vscode';

export class TerminalManager {
  private terminalMap = new Map<string, vscode.Terminal>();
  private pendingCaptures = new Set<string>();

  registerTerminal(terminalId: string, terminal: vscode.Terminal): void {
    this.terminalMap.set(terminalId, terminal);
  }

  unregisterTerminal(terminalId: string): void {
    this.terminalMap.delete(terminalId);
    this.pendingCaptures.delete(terminalId);
  }

  getTerminal(terminalId: string): vscode.Terminal | undefined {
    return this.terminalMap.get(terminalId);
  }

  findTerminalId(terminal: vscode.Terminal): string | undefined {
    for (const [id, t] of this.terminalMap.entries()) {
      if (t === terminal) return id;
    }
    return undefined;
  }

  hasTerminal(terminalId: string): boolean {
    return this.terminalMap.has(terminalId);
  }

  markPendingCapture(terminalId: string): void {
    this.pendingCaptures.add(terminalId);
  }

  clearPendingCapture(terminalId: string): void {
    this.pendingCaptures.delete(terminalId);
  }

  isPendingCapture(terminalId: string): boolean {
    return this.pendingCaptures.has(terminalId);
  }
}
```

### Step 2: Update extension.ts to Use TerminalManager

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
1. Import TerminalManager
2. Create instance in activate()
3. Replace all uses of `terminalIdMap` and `pendingCaptures` with the manager

Replace:
```typescript
const terminalIdMap = new Map<string, vscode.Terminal>();
const pendingCaptures = new Set<string>();
```

With:
```typescript
import { TerminalManager } from './services/TerminalManager';

let terminalManager: TerminalManager | undefined;
// In activate():
terminalManager = new TerminalManager();
```

Update all usages:
- `terminalIdMap.set(id, terminal)` → `terminalManager.registerTerminal(id, terminal)`
- `terminalIdMap.get(id)` → `terminalManager.getTerminal(id)`
- `terminalIdMap.delete(id)` → `terminalManager.unregisterTerminal(id)`
- `terminalIdMap.has(id)` → `terminalManager.hasTerminal(id)`
- `pendingCaptures.add/delete/has` → `terminalManager.markPendingCapture/clearPendingCapture/isPendingCapture`

### Step 3: Export TerminalManager Instance

**File**: `vscode-extension/src/extension.ts`

**Instructions**:
Export the terminalManager so other modules can access it:

```typescript
export function getTerminalManager(): TerminalManager | undefined {
  return terminalManager;
}
```

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] TerminalManager service created
- [ ] All terminalIdMap usages migrated
- [ ] All pendingCaptures usages migrated
- [ ] getTerminalManager() exported
- [ ] TypeScript compiles without errors

## Testing

1. Open a task terminal
2. Verify terminal tracking still works
3. Close terminal and verify session marked as closed

## Notes

- This is a refactoring step that doesn't change behavior
- The goal is to make terminal lookup accessible from other modules
