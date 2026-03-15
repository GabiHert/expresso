---
type: internal-doc
tags:
  - doc
---

> Parent: [[docs-index]]


<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: DOMAIN                                                    ║
║ STATUS: Design Phase                                             ║
╠══════════════════════════════════════════════════════════════════╣
║ NAVIGATION:                                                      ║
║ • Parent: .ai/docs/_architecture/README.md                       ║
║ • Related: [[ai-cockpit-mvp-v2]].md                                  ║
║ • Index: .ai/INDEX.md                                           ║
╚══════════════════════════════════════════════════════════════════╝
-->

# Shadow Copy System - Simplified Design

## Overview

Track cumulative Claude changes per file with minimal storage.

**Goals:**
1. See all Claude changes to a file (baseline → accumulated)
2. See your changes vs Claude's (accumulated → actual file)
3. Minimal storage footprint

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIMPLIFIED SHADOW SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Claude Edit/Write                                              │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────┐                                               │
│  │ Hook fires   │                                               │
│  │ cockpit-     │                                               │
│  │ capture.js   │                                               │
│  └──────┬───────┘                                               │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Shadow Directory                                     │       │
│  │ .ai/cockpit/shadows/{taskId}/{file-hash}/            │       │
│  │                                                      │       │
│  │  ├── baseline.txt      ← Original (before Claude)    │       │
│  │  ├── accumulated.txt   ← After all Claude edits      │       │
│  │  └── meta.json         ← Minimal metadata            │       │
│  └──────────────────────────────────────────────────────┘       │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                    DIFF VIEWS                        │       │
│  │                                                      │       │
│  │  • Claude Changes: baseline ↔ accumulated            │       │
│  │  • Your Changes:   accumulated ↔ actual file         │       │
│  │  • Full Picture:   baseline ↔ actual file            │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
.ai/cockpit/
├── config.json
├── active-task.json
├── events/                    # Existing (optional, can disable)
│   └── {taskId}/
│       └── *.json
│
└── shadows/                   # NEW: Accumulated state only
    └── {taskId}/
        └── {file-hash}/       # Short hash of file path
            ├── meta.json      # Metadata
            ├── baseline.txt   # Original content
            └── accumulated.txt # Current Claude state
```

### File Hash

Use short hash of file path for directory name:
```javascript
function fileHash(filePath) {
  return require('crypto')
    .createHash('sha256')
    .update(filePath)
    .digest('hex')
    .substring(0, 12);
}
// "src/services/auth.ts" → "a1b2c3d4e5f6"
```

---

## Data Structures

### meta.json

```json
{
  "filePath": "src/services/auth.ts",
  "taskId": "LOCAL-003",
  "baseline": {
    "capturedAt": "2025-12-28T14:00:00Z",
    "hash": "abc123",
    "size": 1500
  },
  "accumulated": {
    "lastUpdatedAt": "2025-12-28T15:30:00Z",
    "hash": "def456",
    "size": 1850,
    "editCount": 5
  },
  "sync": {
    "lastCheckedAt": "2025-12-28T15:35:00Z",
    "actualFileHash": "def456",
    "status": "synced"
  }
}
```

### Sync Status Values

| Status | Meaning |
|--------|---------|
| `synced` | Actual file matches accumulated |
| `user-modified` | You edited the file |
| `file-deleted` | File no longer exists |

---

## Hook Update

Update `cockpit-capture.js` to maintain shadows:

```javascript
#!/usr/bin/env node
// .claude/hooks/cockpit-capture.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ... existing code ...

process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(input);
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const taskId = resolveTaskId(projectDir, hookData.session_id);

    // Existing: Save event
    const event = buildEvent(hookData, taskId);
    saveEvent(projectDir, event);

    // NEW: Update shadow
    if (hookData.tool_name === 'Edit' || hookData.tool_name === 'Write') {
      updateShadow(projectDir, taskId.id, hookData);
    }

  } catch (err) {
    console.error(`[cockpit] Error: ${err.message}`);
  }
  process.exit(0);
});

function updateShadow(projectDir, taskId, hookData) {
  const filePath = hookData.tool_input.file_path;
  if (!filePath) return;

  const shadowDir = getShadowDir(projectDir, taskId, filePath);
  const metaPath = path.join(shadowDir, 'meta.json');
  const baselinePath = path.join(shadowDir, 'baseline.txt');
  const accumulatedPath = path.join(shadowDir, 'accumulated.txt');

  fs.mkdirSync(shadowDir, { recursive: true });

  const isFirstEdit = !fs.existsSync(metaPath);

  if (isFirstEdit) {
    // Capture baseline
    const fullPath = path.join(projectDir, filePath);
    let baseline = '';

    if (hookData.tool_name === 'Write') {
      baseline = ''; // New file, empty baseline
    } else if (fs.existsSync(fullPath)) {
      // Read current file content as baseline
      // (before this edit is applied - but hook fires after, so we reconstruct)
      const current = fs.readFileSync(fullPath, 'utf8');
      const oldStr = hookData.tool_input.old_string || '';
      const newStr = hookData.tool_input.new_string || '';
      baseline = current.replace(newStr, oldStr); // Reverse the edit
    }

    fs.writeFileSync(baselinePath, baseline);

    // Initialize meta
    const meta = {
      filePath,
      taskId,
      baseline: {
        capturedAt: new Date().toISOString(),
        hash: hashContent(baseline),
        size: baseline.length
      },
      accumulated: {
        lastUpdatedAt: new Date().toISOString(),
        hash: '',
        size: 0,
        editCount: 0
      },
      sync: {
        lastCheckedAt: new Date().toISOString(),
        status: 'synced'
      }
    };

    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  }

  // Update accumulated with current file state
  const fullPath = path.join(projectDir, filePath);
  let accumulated = '';

  if (hookData.tool_name === 'Write') {
    accumulated = hookData.tool_input.content || '';
  } else if (fs.existsSync(fullPath)) {
    accumulated = fs.readFileSync(fullPath, 'utf8');
  }

  fs.writeFileSync(accumulatedPath, accumulated);

  // Update meta
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  meta.accumulated = {
    lastUpdatedAt: new Date().toISOString(),
    hash: hashContent(accumulated),
    size: accumulated.length,
    editCount: (meta.accumulated.editCount || 0) + 1
  };
  meta.sync = {
    lastCheckedAt: new Date().toISOString(),
    actualFileHash: meta.accumulated.hash,
    status: 'synced'
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

function getShadowDir(projectDir, taskId, filePath) {
  const hash = crypto
    .createHash('sha256')
    .update(filePath)
    .digest('hex')
    .substring(0, 12);

  return path.join(projectDir, '.ai/cockpit/shadows', taskId, hash);
}

function hashContent(content) {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex')
    .substring(0, 16);
}
```

---

## VSCode Extension Changes

### ShadowManager (Simplified)

```typescript
// vscode-extension/src/services/ShadowManager.ts

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ShadowMeta {
  filePath: string;
  taskId: string;
  baseline: { hash: string; size: number };
  accumulated: { hash: string; size: number; editCount: number; lastUpdatedAt: string };
  sync: { status: 'synced' | 'user-modified' | 'file-deleted'; lastCheckedAt: string };
}

interface Shadow {
  meta: ShadowMeta;
  baseline: string;
  accumulated: string;
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
        } catch { /* skip invalid */ }
      }
    }

    return shadows;
  }

  private async loadShadow(shadowDir: string): Promise<Shadow> {
    const meta = JSON.parse(fs.readFileSync(path.join(shadowDir, 'meta.json'), 'utf8'));
    const baseline = fs.readFileSync(path.join(shadowDir, 'baseline.txt'), 'utf8');
    const accumulated = fs.readFileSync(path.join(shadowDir, 'accumulated.txt'), 'utf8');
    return { meta, baseline, accumulated };
  }

  async checkSyncStatus(shadow: Shadow): Promise<'synced' | 'user-modified' | 'file-deleted'> {
    const actualPath = path.join(this.workspaceRoot, shadow.meta.filePath);

    if (!fs.existsSync(actualPath)) {
      return 'file-deleted';
    }

    const actual = fs.readFileSync(actualPath, 'utf8');
    const actualHash = this.hash(actual);

    return actualHash === shadow.meta.accumulated.hash ? 'synced' : 'user-modified';
  }

  private hash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}
```

### DiffViewer Additions

```typescript
// Add to DiffViewer.ts

async showClaudeChanges(shadow: Shadow): Promise<void> {
  const beforeUri = vscode.Uri.parse(
    `${DIFF_SCHEME}:baseline/${shadow.meta.taskId}/${path.basename(shadow.meta.filePath)}`
  );
  const afterUri = vscode.Uri.parse(
    `${DIFF_SCHEME}:accumulated/${shadow.meta.taskId}/${path.basename(shadow.meta.filePath)}`
  );

  this.contentProvider.registerContent(beforeUri, shadow.baseline);
  this.contentProvider.registerContent(afterUri, shadow.accumulated);

  await vscode.commands.executeCommand(
    'vscode.diff',
    beforeUri,
    afterUri,
    `${path.basename(shadow.meta.filePath)} - Claude Changes (${shadow.meta.accumulated.editCount} edits)`
  );
}

async showYourChanges(shadow: Shadow): Promise<void> {
  const actualPath = path.join(this.workspaceRoot, shadow.meta.filePath);
  if (!fs.existsSync(actualPath)) {
    vscode.window.showWarningMessage('File deleted');
    return;
  }

  const actual = fs.readFileSync(actualPath, 'utf8');

  const beforeUri = vscode.Uri.parse(
    `${DIFF_SCHEME}:accumulated/${shadow.meta.taskId}/${path.basename(shadow.meta.filePath)}`
  );
  const afterUri = vscode.Uri.file(actualPath);

  this.contentProvider.registerContent(beforeUri, shadow.accumulated);

  await vscode.commands.executeCommand(
    'vscode.diff',
    beforeUri,
    afterUri,
    `${path.basename(shadow.meta.filePath)} - Your Changes`
  );
}
```

---

## UI: Tree View

```
AI Cockpit
├── In Progress (3)
│   └── LOCAL-003 - VSCode Extension
│       ├── Work Items (6)
│       └── Files Changed (3)           ← NEW SECTION
│           ├── ✓ extension.ts (5 edits)
│           ├── ⚠ types.ts (2 edits)    ← user-modified
│           └── ✓ utils.ts (1 edit)
```

Click file → Show Claude Changes diff
Right-click → "Show Your Changes" (if modified)

---

## Implementation Plan

### Phase 1: Hook Update (30 min)
- [ ] Update `cockpit-capture.js` with `updateShadow()`
- [ ] Test: Make edit, verify shadow created
- [ ] Test: Make second edit, verify accumulated updated

### Phase 2: Extension Integration (1 hr)
- [ ] Create `ShadowManager.ts`
- [ ] Add `showClaudeChanges()` to DiffViewer
- [ ] Add `showYourChanges()` to DiffViewer
- [ ] Wire up commands

### Phase 3: Tree View (30 min)
- [ ] Add "Files Changed" section to TaskTreeProvider
- [ ] Show edit count and sync status
- [ ] Click to open diff

---

## Storage Estimate

| Files Changed | Storage |
|---------------|---------|
| 1 file, 10 edits | ~2 files (baseline + accumulated) |
| 10 files, 100 edits total | ~20 files |
| 50 files, 500 edits | ~100 files |

Much better than 500 event JSON files!

---

_Created: 2025-12-28_
_Version: 2.0.0 (Simplified)_
