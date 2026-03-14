---
type: work-item
id: WI-02
parent: LOCAL-016
title: Update all Claude launch points
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-016]]


# Update All Claude Launch Points

## Objective

Replace all hardcoded Claude CLI commands with calls to the new `generateClaudeCommand` helper function.

## Pre-Implementation

Ensure WI-01 is complete and the `generateClaudeCommand` helper exists.

## Implementation Steps

### Step 1: Update openTaskTerminal

**File**: `vscode-extension/src/extension.ts`
**Location**: Around line 330 (in `openTaskTerminal` function)

**Find**:
```typescript
terminal.sendText('claude');
```

**Replace with**:
```typescript
terminal.sendText(generateClaudeCommand());
```

### Step 2: Update resumeSession

**File**: `vscode-extension/src/extension.ts`
**Location**: Around line 448 (in `resumeSession` function)

**Find**:
```typescript
terminal.sendText(`claude --resume ${session.id}`);
```

**Replace with**:
```typescript
terminal.sendText(generateClaudeCommand({ resume: session.id }));
```

### Step 3: Update newSession

**File**: `vscode-extension/src/extension.ts`
**Location**: Around line 721 (in `newSession` function)

**Find**:
```typescript
terminal.sendText('claude');
```

**Replace with**:
```typescript
terminal.sendText(generateClaudeCommand());
```

### Step 4: Update startSession

**File**: `vscode-extension/src/extension.ts`
**Location**: Around line 803 (in `startSession` function)

**Find**:
```typescript
terminal.sendText('claude');
```

**Replace with**:
```typescript
terminal.sendText(generateClaudeCommand());
```

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] `openTaskTerminal` uses `generateClaudeCommand()`
- [ ] `resumeSession` uses `generateClaudeCommand({ resume: session.id })`
- [ ] `newSession` uses `generateClaudeCommand()`
- [ ] `startSession` uses `generateClaudeCommand()`
- [ ] No hardcoded `'claude'` or `'claude --resume'` strings remain for session launching
- [ ] TypeScript compiles without errors

## Testing

```bash
cd vscode-extension
npm run compile
```

Then search for any remaining hardcoded Claude commands:
```bash
grep -n "sendText.*claude" src/extension.ts
```

All matches should now use `generateClaudeCommand`.

## Notes

- Line numbers are approximate - search for the function names to find exact locations
- The helper function call syntax depends on whether it's a class method or standalone function
