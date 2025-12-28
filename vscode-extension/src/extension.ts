import * as vscode from 'vscode';
import { CockpitFileWatcher } from './watchers/FileWatcher';
import { StatusBarProvider } from './providers/StatusBarProvider';
import { TaskTreeProvider } from './providers/TaskTreeProvider';
import { DiffContentProvider, DIFF_SCHEME } from './providers/DiffContentProvider';
import { DiffViewer } from './services/DiffViewer';
import { registerCommands } from './commands';
import { CockpitEvent } from './types';

let fileWatcher: CockpitFileWatcher | undefined;
let statusBar: StatusBarProvider | undefined;
let taskTreeProvider: TaskTreeProvider | undefined;
let diffContentProvider: DiffContentProvider | undefined;
let diffViewer: DiffViewer | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Cockpit extension activated');

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  // Initialize providers
  statusBar = new StatusBarProvider();
  fileWatcher = new CockpitFileWatcher(workspaceRoot);

  // Initialize task tree provider
  taskTreeProvider = new TaskTreeProvider(fileWatcher);

  // Register tree view
  const treeView = vscode.window.createTreeView('aiCockpit.tasks', {
    treeDataProvider: taskTreeProvider,
    showCollapseAll: true
  });

  // Initialize diff viewer
  diffContentProvider = new DiffContentProvider();
  const diffProviderRegistration = vscode.workspace.registerTextDocumentContentProvider(
    DIFF_SCHEME,
    diffContentProvider
  );
  diffViewer = new DiffViewer(diffContentProvider, workspaceRoot);

  // Connect file watcher to status bar
  fileWatcher.onActiveTaskChanged(task => {
    statusBar?.updateStatusBar(task);
  });

  // Start watching
  fileWatcher.start();

  // Register commands
  registerCommands(context, statusBar);

  // Add to subscriptions
  context.subscriptions.push(fileWatcher, statusBar, treeView, diffProviderRegistration);

  // Register diff command
  const viewEventDiff = vscode.commands.registerCommand(
    'aiCockpit.viewEventDiff',
    async (event: CockpitEvent) => {
      if (!diffViewer) return;

      switch (event.tool) {
        case 'Edit':
          await diffViewer.showEditDiff(event);
          break;
        case 'Write':
          await diffViewer.showWriteDiff(event);
          break;
        case 'TodoWrite':
          const input = event.input as { todos?: unknown[] };
          vscode.window.showInformationMessage(
            `TodoWrite: ${input.todos?.length || 0} items`
          );
          break;
      }
    }
  );

  context.subscriptions.push(viewEventDiff);

  // Register refresh command
  const refreshCommand = vscode.commands.registerCommand(
    'aiCockpit.refresh',
    () => {
      fileWatcher?.start();
      vscode.window.showInformationMessage('AI Cockpit refreshed');
    }
  );

  const showPanelCommand = vscode.commands.registerCommand(
    'aiCockpit.showPanel',
    () => {
      vscode.commands.executeCommand('aiCockpit.tasks.focus');
    }
  );

  context.subscriptions.push(refreshCommand, showPanelCommand);
}

export function deactivate() {
  fileWatcher?.dispose();
  statusBar?.dispose();
  console.log('AI Cockpit extension deactivated');
}
