<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-cumulative-diff-commands.md                        ║
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

# Add Cumulative Diff Commands

## Objective

Add commands to show Claude's cumulative changes and user's changes to a file.

## Implementation Steps

### Step 1: Add methods to DiffViewer

**File**: `vscode-extension/src/services/DiffViewer.ts`

Add import:
```typescript
import { Shadow, ShadowManager } from './ShadowManager';
```

Update constructor to accept ShadowManager:
```typescript
constructor(
  private contentProvider: DiffContentProvider,
  private workspaceRoot: string,
  private shadowManager: ShadowManager
) {}
```

Add methods:
```typescript
/**
 * Show all Claude changes (baseline → accumulated)
 */
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

/**
 * Show user changes (accumulated → actual file)
 */
async showYourChanges(shadow: Shadow): Promise<void> {
  const actual = await this.shadowManager.getActualContent(shadow);

  if (actual === null) {
    vscode.window.showWarningMessage('File has been deleted');
    return;
  }

  const beforeUri = vscode.Uri.parse(
    `${DIFF_SCHEME}:accumulated/${shadow.meta.taskId}/${path.basename(shadow.meta.filePath)}`
  );
  const afterUri = vscode.Uri.file(
    path.join(this.workspaceRoot, shadow.meta.filePath)
  );

  this.contentProvider.registerContent(beforeUri, shadow.accumulated);

  await vscode.commands.executeCommand(
    'vscode.diff',
    beforeUri,
    afterUri,
    `${path.basename(shadow.meta.filePath)} - Your Changes`
  );
}

/**
 * Show full picture (baseline → actual file)
 */
async showFullDiff(shadow: Shadow): Promise<void> {
  const actual = await this.shadowManager.getActualContent(shadow);

  if (actual === null) {
    vscode.window.showWarningMessage('File has been deleted');
    return;
  }

  const beforeUri = vscode.Uri.parse(
    `${DIFF_SCHEME}:baseline/${shadow.meta.taskId}/${path.basename(shadow.meta.filePath)}`
  );
  const afterUri = vscode.Uri.file(
    path.join(this.workspaceRoot, shadow.meta.filePath)
  );

  this.contentProvider.registerContent(beforeUri, shadow.baseline);

  await vscode.commands.executeCommand(
    'vscode.diff',
    beforeUri,
    afterUri,
    `${path.basename(shadow.meta.filePath)} - Full Changes (Original → Current)`
  );
}
```

### Step 2: Update DiffViewer instantiation

**File**: `vscode-extension/src/extension.ts`

Update the DiffViewer creation:
```typescript
diffViewer = new DiffViewer(diffContentProvider, workspaceRoot, shadowManager);
```

### Step 3: Register commands

**File**: `vscode-extension/src/extension.ts`

Add commands:
```typescript
const showClaudeChanges = vscode.commands.registerCommand(
  'aiCockpit.showClaudeChanges',
  async (shadow: Shadow) => {
    await diffViewer?.showClaudeChanges(shadow);
  }
);

const showYourChanges = vscode.commands.registerCommand(
  'aiCockpit.showYourChanges',
  async (shadow: Shadow) => {
    await diffViewer?.showYourChanges(shadow);
  }
);

const showFullDiff = vscode.commands.registerCommand(
  'aiCockpit.showFullDiff',
  async (shadow: Shadow) => {
    await diffViewer?.showFullDiff(shadow);
  }
);

context.subscriptions.push(showClaudeChanges, showYourChanges, showFullDiff);
```

### Step 4: Add commands to package.json

**File**: `vscode-extension/package.json`

Add to `contributes.commands`:
```json
{
  "command": "aiCockpit.showClaudeChanges",
  "title": "AI Cockpit: Show Claude Changes"
},
{
  "command": "aiCockpit.showYourChanges",
  "title": "AI Cockpit: Show Your Changes"
},
{
  "command": "aiCockpit.showFullDiff",
  "title": "AI Cockpit: Show Full Diff"
}
```

## Acceptance Criteria

- [ ] showClaudeChanges opens diff with baseline → accumulated
- [ ] showYourChanges opens diff with accumulated → actual file
- [ ] showFullDiff opens diff with baseline → actual file
- [ ] Commands handle deleted files gracefully
- [ ] Diff titles show edit count and context

## Testing

1. Create shadow via hook, run showClaudeChanges
   - Verify diff shows original → all Claude edits
2. Edit file manually, run showYourChanges
   - Verify diff shows Claude state → your edits
3. Run showFullDiff
   - Verify diff shows original → current (Claude + yours)

## Notes

- Commands receive Shadow object from tree view (work item 04)
- Could add keyboard shortcuts later
