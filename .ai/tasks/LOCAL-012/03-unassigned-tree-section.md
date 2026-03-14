---
type: work-item
id: "03"
parent: LOCAL-012
title: Add UnassignedSessionsSection to tree
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-012]]


# Add UnassignedSessionsSection to Tree

## Objective

Add a root-level "Sessions" section that displays unassigned sessions.

## Implementation Steps

### Step 1: Import UNASSIGNED_TASK_ID

**File**: `src/providers/TaskTreeProvider.ts`

Add to imports:
```typescript
import { UNASSIGNED_TASK_ID } from '../types';
```

### Step 2: Create UnassignedSessionsSection class

**Location**: After `SessionsSection` class (around line 496)

```typescript
class UnassignedSessionsSection extends vscode.TreeItem {
  constructor(sessionCount: number) {
    super('Sessions', vscode.TreeItemCollapsibleState.Collapsed);
    this.id = 'unassigned-sessions';
    this.description = `${sessionCount}`;
    this.iconPath = new vscode.ThemeIcon('terminal');
    this.contextValue = 'unassigned-sessions-section';
  }
}
```

### Step 3: Update getSections to include unassigned sessions

**Modify `getSections()` method** to add the new section at the top when there are unassigned sessions:

In the `getSections()` method, add before returning sections:

```typescript
// Check for unassigned sessions
const unassignedSessions = await this.sessionManager.getUnassignedSessions();
if (unassignedSessions.length > 0) {
  sections.unshift(new UnassignedSessionsSection(unassignedSessions.length));
}
```

### Step 4: Update getChildren to handle UnassignedSessionsSection

**Add case in `getChildren()` method**:

```typescript
if (element instanceof UnassignedSessionsSection) {
  const sessions = await this.sessionManager.getUnassignedSessions();
  return sessions.map(s => new SessionItem(s, true)); // true = unassigned
}
```

### Step 5: Update SessionItem to handle unassigned context

**Modify SessionItem constructor** to accept optional `isUnassigned` parameter:

```typescript
class SessionItem extends vscode.TreeItem {
  constructor(
    public readonly session: CockpitSession,
    private readonly isUnassigned: boolean = false
  ) {
    // ... existing code ...

    // Update contextValue to distinguish unassigned sessions
    this.contextValue = isUnassigned
      ? `session-${session.status}-unassigned`
      : `session-${session.status}`;
  }
}
```

## Acceptance Criteria

- [ ] "Sessions" section appears at root when unassigned sessions exist
- [ ] Section shows count of unassigned sessions
- [ ] Expanding shows SessionItems with unassigned context
- [ ] Section hides when no unassigned sessions
