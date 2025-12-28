<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 05-diff-viewer.md                                     ║
║ TASK: LOCAL-003                                                  ║
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

# Add Diff Viewer Integration

## Objective

Integrate with VSCode's native diff viewer to show before/after content for Edit events.

## Implementation Steps

### Step 1: Create Virtual Document Provider

VSCode's diff command needs URIs for both sides. We'll create virtual documents for the "before" content.

**src/providers/DiffContentProvider.ts**:
```typescript
import * as vscode from 'vscode';
import { CockpitEvent } from '../types';

export class DiffContentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  // Store content by URI
  private contentMap = new Map<string, string>();

  /**
   * Register content for a URI
   */
  registerContent(uri: vscode.Uri, content: string): void {
    this.contentMap.set(uri.toString(), content);
    this._onDidChange.fire(uri);
  }

  /**
   * Clear content for a URI
   */
  clearContent(uri: vscode.Uri): void {
    this.contentMap.delete(uri.toString());
  }

  /**
   * Provide content for virtual document
   */
  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contentMap.get(uri.toString()) || '';
  }

  dispose(): void {
    this._onDidChange.dispose();
    this.contentMap.clear();
  }
}

// Scheme for our virtual documents
export const DIFF_SCHEME = 'ai-cockpit-diff';
```

### Step 2: Create Diff Viewer Service

**src/services/DiffViewer.ts**:
```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { CockpitEvent } from '../types';
import { DiffContentProvider, DIFF_SCHEME } from '../providers/DiffContentProvider';

export class DiffViewer {
  constructor(
    private contentProvider: DiffContentProvider,
    private workspaceRoot: string
  ) {}

  /**
   * Show diff for an Edit event
   */
  async showEditDiff(event: CockpitEvent): Promise<void> {
    if (event.tool !== 'Edit') {
      vscode.window.showErrorMessage('Not an Edit event');
      return;
    }

    const { file_path, old_string, new_string } = event.input;

    if (!old_string || !new_string) {
      vscode.window.showErrorMessage('Event missing diff content');
      return;
    }

    // Create URIs for before/after
    const beforeUri = vscode.Uri.parse(
      `${DIFF_SCHEME}:before/${event.id}/${path.basename(file_path)}`
    );
    const afterUri = vscode.Uri.parse(
      `${DIFF_SCHEME}:after/${event.id}/${path.basename(file_path)}`
    );

    // Register content
    this.contentProvider.registerContent(beforeUri, old_string);
    this.contentProvider.registerContent(afterUri, new_string);

    // Get timestamp for title
    const time = new Date(event.timestamp).toLocaleTimeString();

    // Open diff view
    await vscode.commands.executeCommand(
      'vscode.diff',
      beforeUri,
      afterUri,
      `${path.basename(file_path)} (${time}) - Before ↔ After`
    );
  }

  /**
   * Show diff for a Write event (new file)
   */
  async showWriteDiff(event: CockpitEvent): Promise<void> {
    if (event.tool !== 'Write') {
      vscode.window.showErrorMessage('Not a Write event');
      return;
    }

    const { file_path, content } = event.input;

    // For new files, show empty vs content
    const beforeUri = vscode.Uri.parse(
      `${DIFF_SCHEME}:before/${event.id}/${path.basename(file_path)}`
    );
    const afterUri = vscode.Uri.parse(
      `${DIFF_SCHEME}:after/${event.id}/${path.basename(file_path)}`
    );

    // Empty before, content after
    this.contentProvider.registerContent(beforeUri, '');
    this.contentProvider.registerContent(afterUri, content);

    const time = new Date(event.timestamp).toLocaleTimeString();

    await vscode.commands.executeCommand(
      'vscode.diff',
      beforeUri,
      afterUri,
      `${path.basename(file_path)} (${time}) - New File`
    );
  }

  /**
   * Show context diff (with surrounding lines from actual file)
   */
  async showContextDiff(event: CockpitEvent): Promise<void> {
    if (event.tool !== 'Edit') return;

    const { file_path, old_string, new_string } = event.input;
    const fullPath = path.join(this.workspaceRoot, file_path);

    try {
      // Read current file
      const doc = await vscode.workspace.openTextDocument(fullPath);
      const currentContent = doc.getText();

      // Find the change in current file
      const changeIndex = currentContent.indexOf(new_string);

      if (changeIndex === -1) {
        // File has changed since edit, show simple diff
        await this.showEditDiff(event);
        return;
      }

      // Get context (5 lines before and after)
      const lines = currentContent.split('\n');
      const lineStart = doc.positionAt(changeIndex).line;
      const contextStart = Math.max(0, lineStart - 5);
      const contextEnd = Math.min(lines.length, lineStart + 5);

      // Build before context (with old_string)
      const beforeContext = currentContent.replace(new_string, old_string);
      const beforeLines = beforeContext.split('\n').slice(contextStart, contextEnd);

      // Build after context
      const afterLines = lines.slice(contextStart, contextEnd);

      // Create virtual docs with context
      const beforeUri = vscode.Uri.parse(
        `${DIFF_SCHEME}:context-before/${event.id}/${path.basename(file_path)}`
      );
      const afterUri = vscode.Uri.parse(
        `${DIFF_SCHEME}:context-after/${event.id}/${path.basename(file_path)}`
      );

      this.contentProvider.registerContent(beforeUri, beforeLines.join('\n'));
      this.contentProvider.registerContent(afterUri, afterLines.join('\n'));

      const time = new Date(event.timestamp).toLocaleTimeString();

      await vscode.commands.executeCommand(
        'vscode.diff',
        beforeUri,
        afterUri,
        `${path.basename(file_path)} (${time}) - Lines ${contextStart + 1}-${contextEnd}`
      );

    } catch (error) {
      // Fall back to simple diff
      await this.showEditDiff(event);
    }
  }
}
```

### Step 3: Register Provider and Update Commands

**src/extension.ts** (update):
```typescript
import { DiffContentProvider, DIFF_SCHEME } from './providers/DiffContentProvider';
import { DiffViewer } from './services/DiffViewer';

// In activate():
const diffContentProvider = new DiffContentProvider();
const diffProviderRegistration = vscode.workspace.registerTextDocumentContentProvider(
  DIFF_SCHEME,
  diffContentProvider
);

const diffViewer = new DiffViewer(diffContentProvider, workspaceRoot);

// Update viewEventDiff command
const viewEventDiff = vscode.commands.registerCommand(
  'aiCockpit.viewEventDiff',
  async (event: CockpitEvent) => {
    switch (event.tool) {
      case 'Edit':
        await diffViewer.showEditDiff(event);
        break;
      case 'Write':
        await diffViewer.showWriteDiff(event);
        break;
      case 'TodoWrite':
        // Show todo changes in a different way
        vscode.window.showInformationMessage(
          `TodoWrite: ${event.input.todos?.length || 0} items`
        );
        break;
    }
  }
);

context.subscriptions.push(diffProviderRegistration, viewEventDiff);
```

### Step 4: Add Quick Diff Button to Tree Items

Update **TaskTreeProvider.ts** EventItem:
```typescript
class EventItem extends vscode.TreeItem {
  constructor(/* ... */) {
    // ... existing code ...

    // Add inline action
    if (tool === 'Edit' || tool === 'Write') {
      this.resourceUri = vscode.Uri.file(filePath);
    }
  }
}
```

Update **package.json** menus:
```json
{
  "menus": {
    "view/item/context": [
      {
        "command": "aiCockpit.viewEventDiff",
        "when": "view == aiCockpit.tasks && viewItem == event",
        "group": "inline"
      }
    ]
  }
}
```

## Acceptance Criteria

- [ ] Virtual document provider registered
- [ ] Edit events show before/after diff
- [ ] Write events show empty/content diff
- [ ] Diff opens in native VSCode diff viewer
- [ ] Diff title shows filename and timestamp
- [ ] Clicking tree item opens diff

## Testing

1. Create an Edit event file manually:
```json
{
  "id": "evt-test",
  "taskId": "TEST-001",
  "tool": "Edit",
  "input": {
    "file_path": "test.ts",
    "old_string": "const x = 1",
    "new_string": "const x = 2"
  },
  "timestamp": "2025-12-28T10:00:00Z"
}
```

2. Click the event in task panel
3. Verify diff view opens with correct content
4. Test with Write event (new file)

## Notes

- Virtual documents are ephemeral - content is in memory only
- Consider caching recent diffs for performance
- Could add "revert" action directly from diff view (future)
