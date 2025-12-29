<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-shadow-manager.md                                  ║
║ TASK: LOCAL-004                                                  ║
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

# Create ShadowManager Service

## Objective

Create a service to load, query, and check sync status of shadow files.

## Implementation Steps

### Step 1: Create ShadowManager.ts

**File**: `vscode-extension/src/services/ShadowManager.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface ShadowMeta {
  filePath: string;
  taskId: string;
  baseline: {
    capturedAt: string;
    hash: string;
    size: number;
  };
  accumulated: {
    lastUpdatedAt: string;
    hash: string;
    size: number;
    editCount: number;
  };
  sync: {
    lastCheckedAt: string;
    actualFileHash?: string;
    status: 'synced' | 'user-modified' | 'file-deleted';
  };
}

export interface Shadow {
  meta: ShadowMeta;
  baseline: string;
  accumulated: string;
  dirPath: string;
}

export class ShadowManager {
  private shadowsPath: string;

  constructor(private workspaceRoot: string) {
    this.shadowsPath = path.join(workspaceRoot, '.ai/cockpit/shadows');
  }

  async getShadowsForTask(taskId: string): Promise<Shadow[]> {
    const taskDir = path.join(this.shadowsPath, taskId);
    if (!fs.existsSync(taskDir)) return [];

    const shadows: Shadow[] = [];
    const entries = fs.readdirSync(taskDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const shadow = await this.loadShadow(path.join(taskDir, entry.name));
          shadows.push(shadow);
        } catch {
          // Skip invalid shadow directories
        }
      }
    }

    return shadows;
  }

  async getShadow(taskId: string, filePath: string): Promise<Shadow | null> {
    const hash = this.hashFilePath(filePath);
    const shadowDir = path.join(this.shadowsPath, taskId, hash);

    if (!fs.existsSync(path.join(shadowDir, 'meta.json'))) {
      return null;
    }

    return this.loadShadow(shadowDir);
  }

  private async loadShadow(shadowDir: string): Promise<Shadow> {
    const meta = JSON.parse(
      fs.readFileSync(path.join(shadowDir, 'meta.json'), 'utf8')
    ) as ShadowMeta;

    const baseline = fs.readFileSync(
      path.join(shadowDir, 'baseline.txt'),
      'utf8'
    );

    const accumulated = fs.readFileSync(
      path.join(shadowDir, 'accumulated.txt'),
      'utf8'
    );

    return { meta, baseline, accumulated, dirPath: shadowDir };
  }

  async checkSyncStatus(
    shadow: Shadow
  ): Promise<'synced' | 'user-modified' | 'file-deleted'> {
    const actualPath = path.join(this.workspaceRoot, shadow.meta.filePath);

    if (!fs.existsSync(actualPath)) {
      return 'file-deleted';
    }

    const actual = fs.readFileSync(actualPath, 'utf8');
    const actualHash = this.hashContent(actual);

    return actualHash === shadow.meta.accumulated.hash
      ? 'synced'
      : 'user-modified';
  }

  async getActualContent(shadow: Shadow): Promise<string | null> {
    const actualPath = path.join(this.workspaceRoot, shadow.meta.filePath);

    if (!fs.existsSync(actualPath)) {
      return null;
    }

    return fs.readFileSync(actualPath, 'utf8');
  }

  private hashFilePath(filePath: string): string {
    return crypto
      .createHash('sha256')
      .update(filePath)
      .digest('hex')
      .substring(0, 12);
  }

  private hashContent(content: string): string {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 16);
  }
}
```

### Step 2: Export from services

Ensure the service is exported properly (if you have an index.ts in services/).

### Step 3: Initialize in extension.ts

**File**: `vscode-extension/src/extension.ts`

Add import:
```typescript
import { ShadowManager } from './services/ShadowManager';
```

Add variable:
```typescript
let shadowManager: ShadowManager | undefined;
```

In `activate()`:
```typescript
shadowManager = new ShadowManager(workspaceRoot);
```

## Acceptance Criteria

- [ ] ShadowManager can load all shadows for a task
- [ ] ShadowManager can load a specific shadow by file path
- [ ] checkSyncStatus returns correct status
- [ ] Handles missing files gracefully

## Testing

1. Create shadow files manually, verify getShadowsForTask() loads them
2. Verify checkSyncStatus() returns 'synced' when file matches
3. Edit file manually, verify checkSyncStatus() returns 'user-modified'
4. Delete file, verify checkSyncStatus() returns 'file-deleted'

## Notes

- Service is stateless - loads from disk each time
- Could add caching later if performance is an issue
