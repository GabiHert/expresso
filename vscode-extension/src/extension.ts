import * as vscode from 'vscode';
import * as path from 'path';
import { CockpitFileWatcher } from './watchers/FileWatcher';
import { StatusBarProvider } from './providers/StatusBarProvider';
import { TaskTreeProvider } from './providers/TaskTreeProvider';
import { DiffContentProvider, DIFF_SCHEME } from './providers/DiffContentProvider';
import { DiffViewer } from './services/DiffViewer';
import { ShadowManager } from './services/ShadowManager';
import { registerCommands } from './commands';
import { CockpitEvent } from './types';
import { Shadow } from './services/ShadowManager';

let fileWatcher: CockpitFileWatcher | undefined;
let statusBar: StatusBarProvider | undefined;
let taskTreeProvider: TaskTreeProvider | undefined;
let diffContentProvider: DiffContentProvider | undefined;
let diffViewer: DiffViewer | undefined;
let shadowManager: ShadowManager | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Cockpit extension activated');

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  // Initialize providers
  statusBar = new StatusBarProvider();
  fileWatcher = new CockpitFileWatcher(workspaceRoot);
  shadowManager = new ShadowManager(workspaceRoot);

  // Initialize task tree provider
  taskTreeProvider = new TaskTreeProvider(fileWatcher, shadowManager);

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
  diffViewer = new DiffViewer(diffContentProvider, workspaceRoot, shadowManager);

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

  // Register open task command
  const openTaskCommand = vscode.commands.registerCommand(
    'aiCockpit.openTask',
    async (task: { taskId: string; status: string }) => {
      const readmePath = path.join(
        workspaceRoot,
        '.ai/tasks',
        task.status,
        task.taskId,
        'README.md'
      );

      try {
        const doc = await vscode.workspace.openTextDocument(readmePath);
        await vscode.window.showTextDocument(doc);
      } catch {
        vscode.window.showWarningMessage(`Could not open README for ${task.taskId}`);
      }
    }
  );

  context.subscriptions.push(openTaskCommand);

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

  // Register shadow diff commands
  // Note: arg can be Shadow (from click) or TreeItem with shadow property (from context menu)
  const extractShadow = (arg: unknown): Shadow | undefined => {
    if (!arg) return undefined;
    // If it has meta.filePath, it's a Shadow
    if ((arg as Shadow).meta?.filePath) return arg as Shadow;
    // If it has shadow property, it's a ShadowFileItem
    if ((arg as { shadow?: Shadow }).shadow) return (arg as { shadow: Shadow }).shadow;
    return undefined;
  };

  const showClaudeChanges = vscode.commands.registerCommand(
    'aiCockpit.showClaudeChanges',
    async (arg: unknown) => {
      const shadow = extractShadow(arg);
      if (shadow) await diffViewer?.showClaudeChanges(shadow);
    }
  );

  const showYourChanges = vscode.commands.registerCommand(
    'aiCockpit.showYourChanges',
    async (arg: unknown) => {
      const shadow = extractShadow(arg);
      if (shadow) await diffViewer?.showYourChanges(shadow);
    }
  );

  const showFullDiff = vscode.commands.registerCommand(
    'aiCockpit.showFullDiff',
    async (arg: unknown) => {
      const shadow = extractShadow(arg);
      if (shadow) await diffViewer?.showFullDiff(shadow);
    }
  );

  context.subscriptions.push(showClaudeChanges, showYourChanges, showFullDiff);
}

export function deactivate() {
  fileWatcher?.dispose();
  statusBar?.dispose();
  console.log('AI Cockpit extension deactivated');
}
