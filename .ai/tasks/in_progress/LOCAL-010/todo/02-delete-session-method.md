<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-delete-session-method.md                           ║
║ TASK: LOCAL-010                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Add deleteSession Method to SessionManager

## Objective

Add a method to SessionManager that removes a session from the registry by its ID.

## Implementation Steps

### Step 1: Add deleteSession method

**File**: `src/services/SessionManager.ts`

**Location**: After `renameSession` method

**Instructions**:

Add the following method:

```typescript
/**
 * Delete a session from the registry
 */
async deleteSession(sessionId: string): Promise<boolean> {
  return this.withLock(async () => {
    const registry = await this.loadRegistryAsync();
    const originalLength = registry.sessions.length;
    registry.sessions = registry.sessions.filter(s => s.id !== sessionId);

    if (registry.sessions.length < originalLength) {
      await this.saveRegistryAsync(registry);
      return true;
    }
    return false;
  });
}
```

**Pattern Reference**: This follows the `withLock` pattern used in `cleanupOldSessions` (lines 108-131).

## Acceptance Criteria

- [ ] `deleteSession(sessionId)` method exists on SessionManager
- [ ] Method returns `true` when session is found and deleted
- [ ] Method returns `false` when session is not found
- [ ] Session is removed from `sessions.json`
- [ ] Method uses `withLock` to prevent race conditions

## Testing

1. Create a test session, verify it exists in sessions.json
2. Call deleteSession with the session ID
3. Verify session is removed from sessions.json
4. Call deleteSession with non-existent ID, verify returns false

## Notes

- This method does NOT clean up terminal mappings - that's the command's responsibility
- This method does NOT delete associated events in `.ai/cockpit/events/` - those are useful for history
- The command layer will handle confirmation dialogs and active session warnings
