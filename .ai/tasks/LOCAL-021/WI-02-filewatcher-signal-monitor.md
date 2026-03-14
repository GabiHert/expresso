---
type: work-item
id: WI-02
parent: LOCAL-021
title: Extend FileWatcher to monitor signal
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Extend FileWatcher to Monitor Signal File

## Objective

Add signal file monitoring to the existing `FileWatcher` class to detect task switches and emit events that trigger session registry synchronization.

## Pre-Implementation

Read these files first:
- `vscode-extension/src/watchers/FileWatcher.ts` (current implementation)
- `vscode-extension/src/types/index.ts` (type definitions)
- VSCode FileSystemWatcher API docs

## Implementation Steps

### Step 1: Add TaskSwitchSignal type definition

**File**: `vscode-extension/src/types/index.ts`

**Add after existing types** (around line 20-30):
```typescript
export interface TaskSwitchSignal {
  timestamp: string;
  previousTaskId: string;
  newTaskId: string;
  type: 'task-switch';
}
```

### Step 2: Add event emitter to FileWatcher class

**File**: `vscode-extension/src/watchers/FileWatcher.ts`

**Add after existing event emitters** (around line 10-15):
```typescript
private _onTaskSwitched = new vscode.EventEmitter<TaskSwitchSignal>();
readonly onTaskSwitched = this._onTaskSwitched.event;
```

### Step 3: Add signal file watcher in start() method

**File**: `vscode-extension/src/watchers/FileWatcher.ts`

**Location**: Inside `start()` method, after existing watchers (around line 35)

```typescript
// Watch task-switch-signal.json for task switches
const signalPattern = new vscode.RelativePattern(
  this.cockpitPath,
  'task-switch-signal.json'
);
this.signalWatcher = vscode.workspace.createFileSystemWatcher(signalPattern);
this.signalWatcher.onDidChange(() => this.handleTaskSwitch());
this.signalWatcher.onDidCreate(() => this.handleTaskSwitch());
this.disposables.push(this.signalWatcher);
```

**Note**: Watch both `onDidChange` and `onDidCreate` to catch all cases.

### Step 4: Add signal file property

**File**: `vscode-extension/src/watchers/FileWatcher.ts`

**Add to class properties** (around line 5-8):
```typescript
private signalWatcher: vscode.FileSystemWatcher | null = null;
```

### Step 5: Implement handleTaskSwitch method

**File**: `vscode-extension/src/watchers/FileWatcher.ts`

**Add as new private method** (after existing event handlers):
```typescript
private async handleTaskSwitch(): Promise<void> {
  try {
    const signal = await this.readTaskSwitchSignal();
    if (signal) {
      console.log(
        `AI Cockpit: Task switch detected: ${signal.previousTaskId} → ${signal.newTaskId}`
      );
      this._onTaskSwitched.fire(signal);

      // Delete signal file after processing
      await this.deleteSignalFile();
    }
  } catch (error) {
    console.error('AI Cockpit: Error handling task switch signal:', error);
  }
}
```

### Step 6: Implement readTaskSwitchSignal helper

**Add as new private method**:
```typescript
private async readTaskSwitchSignal(): Promise<TaskSwitchSignal | null> {
  const signalPath = path.join(this.cockpitPath, 'task-switch-signal.json');

  try {
    const content = await fs.promises.readFile(signalPath, 'utf-8');
    const signal = JSON.parse(content) as TaskSwitchSignal;

    // Validate required fields
    if (!signal.previousTaskId || !signal.newTaskId || signal.type !== 'task-switch') {
      console.warn('AI Cockpit: Invalid task-switch-signal format');
      return null;
    }

    return signal;
  } catch (error) {
    // File might have been deleted already or doesn't exist
    return null;
  }
}
```

### Step 7: Implement deleteSignalFile helper

**Add as new private method**:
```typescript
private async deleteSignalFile(): Promise<void> {
  const signalPath = path.join(this.cockpitPath, 'task-switch-signal.json');

  try {
    await fs.promises.unlink(signalPath);
  } catch (error) {
    // File already deleted, ignore
  }
}
```

### Step 8: Dispose signal watcher in dispose() method

**File**: `vscode-extension/src/watchers/FileWatcher.ts`

**Add to dispose() method**:
```typescript
this.signalWatcher?.dispose();
this._onTaskSwitched.dispose();
```

### Step 9: Add import statements

**At top of file**, add:
```typescript
import * as fs from 'fs';
import * as path from 'path';
```

## Post-Implementation

After completing:
1. Run `npm run compile` to check for TypeScript errors
2. Test: Write a signal file manually, verify event fires
3. Test: Delete signal file, verify no errors

## Acceptance Criteria

- [ ] TaskSwitchSignal type defined in types/index.ts
- [ ] onTaskSwitched event emitter added to FileWatcher
- [ ] Signal file watcher created in start() method
- [ ] handleTaskSwitch method processes signal and fires event
- [ ] Signal file deleted after successful processing
- [ ] Invalid signal format handled gracefully (no crash)
- [ ] Signal watcher disposed properly in dispose()
- [ ] No TypeScript compilation errors
- [ ] Event fires within 300ms of signal file write

## Testing

### Unit Test (create in test/suite/fileWatcher.test.ts)
```typescript
it('should emit onTaskSwitched when signal file changes', async () => {
  const watcher = new FileWatcher(testWorkspaceRoot);
  watcher.start();

  const eventPromise = new Promise<TaskSwitchSignal>((resolve) => {
    watcher.onTaskSwitched((signal) => resolve(signal));
  });

  // Write signal file
  const signalPath = path.join(testWorkspaceRoot, '.ai/cockpit/task-switch-signal.json');
  await fs.promises.writeFile(signalPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    previousTaskId: 'LOCAL-019',
    newTaskId: 'LOCAL-018',
    type: 'task-switch'
  }));

  const signal = await eventPromise;
  expect(signal.previousTaskId).toBe('LOCAL-019');
  expect(signal.newTaskId).toBe('LOCAL-018');

  watcher.dispose();
});
```

### Manual Test
```typescript
// In extension.ts activate(), add temporary listener:
fileWatcher.onTaskSwitched((signal) => {
  vscode.window.showInformationMessage(
    `Task switch: ${signal.previousTaskId} → ${signal.newTaskId}`
  );
});

// Then create signal file manually:
// echo '{"timestamp":"2026-01-05T20:00:00Z","previousTaskId":"LOCAL-019","newTaskId":"LOCAL-018","type":"task-switch"}' > .ai/cockpit/task-switch-signal.json

// Should see info message popup in VSCode
```

## Notes

- FileWatcher uses debouncing for file changes (existing pattern)
- Signal file is deleted to prevent accumulation
- Event fires even if signal file is malformed (logs warning)
- Multiple rapid signal writes are handled (last one wins)
