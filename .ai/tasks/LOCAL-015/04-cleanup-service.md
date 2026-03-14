---
type: work-item
id: "04"
parent: LOCAL-015
title: Add cockpit cleanup service
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-015]]


# Add Cockpit Cleanup Service

## Objective

Create a service to handle cleanup of cockpit data (events, shadows, sessions) when a task is deleted.

## Implementation Steps

### Step 1: Create CockpitCleanupService

**File**: `vscode-extension/src/services/CockpitCleanupService.ts` (new file)

**Instructions**:
Create a new service file with the following content:

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class CockpitCleanupService {
  constructor(private workspaceRoot: string) {}

  /**
   * Clean up all cockpit data for a task
   */
  async cleanupTask(taskId: string): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 1. Clean up events
    try {
      await this.cleanupEvents(taskId);
    } catch (error) {
      errors.push(`Events cleanup failed: ${error}`);
    }

    // 2. Clean up shadows
    try {
      await this.cleanupShadows(taskId);
    } catch (error) {
      errors.push(`Shadows cleanup failed: ${error}`);
    }

    // 3. Clean up session references
    try {
      await this.cleanupSessions(taskId);
    } catch (error) {
      errors.push(`Sessions cleanup failed: ${error}`);
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Remove event history for a task
   */
  private async cleanupEvents(taskId: string): Promise<void> {
    const eventsPath = path.join(this.workspaceRoot, '.ai/cockpit/events', taskId);

    if (!this.isValidPath(eventsPath, '.ai/cockpit/events')) {
      throw new Error('Invalid events path');
    }

    if (fs.existsSync(eventsPath)) {
      await fs.promises.rm(eventsPath, { recursive: true, force: true });
    }
  }

  /**
   * Remove shadow copies for a task
   */
  private async cleanupShadows(taskId: string): Promise<void> {
    const shadowsPath = path.join(this.workspaceRoot, '.ai/cockpit/shadows', taskId);

    if (!this.isValidPath(shadowsPath, '.ai/cockpit/shadows')) {
      throw new Error('Invalid shadows path');
    }

    if (fs.existsSync(shadowsPath)) {
      await fs.promises.rm(shadowsPath, { recursive: true, force: true });
    }
  }

  /**
   * Remove session references for a task from sessions.json
   */
  private async cleanupSessions(taskId: string): Promise<void> {
    const sessionsPath = path.join(this.workspaceRoot, '.ai/cockpit/sessions.json');

    if (!fs.existsSync(sessionsPath)) {
      return; // No sessions file, nothing to clean
    }

    try {
      const content = await fs.promises.readFile(sessionsPath, 'utf8');
      const registry = JSON.parse(content);

      if (!registry.sessions || !Array.isArray(registry.sessions)) {
        return;
      }

      const originalLength = registry.sessions.length;
      registry.sessions = registry.sessions.filter(
        (session: { taskId?: string }) => session.taskId !== taskId
      );

      if (registry.sessions.length < originalLength) {
        await fs.promises.writeFile(
          sessionsPath,
          JSON.stringify(registry, null, 2),
          'utf8'
        );
      }
    } catch (error) {
      // If parse fails, log but don't throw - sessions.json may be corrupted
      console.error('Failed to parse sessions.json:', error);
    }
  }

  /**
   * Validate path stays within allowed directory (prevent path traversal)
   */
  private isValidPath(targetPath: string, allowedSubdir: string): boolean {
    const resolvedPath = path.resolve(targetPath);
    const allowedBase = path.resolve(this.workspaceRoot, allowedSubdir);
    return resolvedPath.startsWith(allowedBase + path.sep) || resolvedPath === allowedBase;
  }
}
```

### Step 2: Integrate cleanup service into deleteTask command

**File**: `vscode-extension/src/extension.ts`

**Instructions**:

1. Import the service at the top:
```typescript
import { CockpitCleanupService } from './services/CockpitCleanupService';
```

2. Create service instance in activate function (after workspaceRoot is defined):
```typescript
const cockpitCleanupService = new CockpitCleanupService(workspaceRoot);
```

3. Update deleteTask command to use the service (add before deleting task folder):
```typescript
// Clean up cockpit data (events, shadows, sessions)
const cleanupResult = await cockpitCleanupService.cleanupTask(taskId);
if (!cleanupResult.success) {
  console.warn('Partial cleanup errors:', cleanupResult.errors);
}
```

## Acceptance Criteria

- [ ] CockpitCleanupService is created with proper methods
- [ ] Events directory is cleaned up on task deletion
- [ ] Shadows directory is cleaned up on task deletion
- [ ] Session references are removed from sessions.json
- [ ] Path traversal attacks are prevented in all cleanup methods
- [ ] Partial failures are handled gracefully (don't block deletion)

## Testing

1. Create a task and make some edits (to generate events/shadows)
2. Delete the task
3. Verify:
   - `.ai/cockpit/events/{taskId}/` is removed
   - `.ai/cockpit/shadows/{taskId}/` is removed
   - Sessions with that taskId are removed from sessions.json

## Notes

The service handles partial failures gracefully - if one cleanup fails, it continues with others and reports all errors.
