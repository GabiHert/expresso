import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CockpitFileWatcher } from './watchers/FileWatcher';
import { StatusBarProvider } from './providers/StatusBarProvider';
import { TaskTreeProvider } from './providers/TaskTreeProvider';
import { registerCommands } from './commands';
import { TerminalManager } from './services/TerminalManager';
import { CommentManager } from './services/CommentManager';
import { ExpressoScanner } from './services/ExpressoScanner';
import { ExpressoDecorator } from './services/ExpressoDecorator';
import { ExpressoCodeLensProvider } from './providers/ExpressoCodeLensProvider';
import { ExpressoCompletionProvider } from './providers/ExpressoCompletionProvider';
import { CommandRegistry } from './services/CommandRegistry';
import { registerExpressoCommands } from './commands/expresso';
import { TaskColor, isValidTaskColor } from './types';

let fileWatcher: CockpitFileWatcher | undefined;
let statusBar: StatusBarProvider | undefined;
let taskTreeProvider: TaskTreeProvider | undefined;
let terminalManager: TerminalManager | undefined;
let commentManager: CommentManager | undefined;
let expressoScanner: ExpressoScanner | undefined;
let expressoDecorator: ExpressoDecorator | undefined;

export function getTerminalManager(): TerminalManager | undefined {
  return terminalManager;
}

/**
 * Read task color from status.yaml file
 */
async function getTaskColorFromYaml(taskId: string, workspaceRoot: string): Promise<TaskColor | undefined> {
  for (const status of ['in_progress', 'todo', 'done']) {
    const statusPath = path.join(workspaceRoot, '.ai', 'tasks', status, taskId, 'status.yaml');
    try {
      const content = await fs.promises.readFile(statusPath, 'utf-8');
      const colorMatch = content.match(/^color:\s*["']?([^"'\n]+)["']?/m);
      if (colorMatch) {
        const colorValue = colorMatch[1].trim();
        if (isValidTaskColor(colorValue)) {
          return colorValue;
        }
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        console.warn(`AI Cockpit: Failed to read color from ${statusPath}:`, code || err);
      }
    }
  }
  return undefined;
}

export async function activate(context: vscode.ExtensionContext) {
  console.log('AI Cockpit extension activated');

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  // Initialize providers
  statusBar = new StatusBarProvider();
  fileWatcher = new CockpitFileWatcher(workspaceRoot);
  terminalManager = new TerminalManager();
  commentManager = new CommentManager(workspaceRoot);
  context.subscriptions.push({ dispose: () => commentManager?.dispose() });

  // Initialize CommandRegistry first (source of truth for Claude commands)
  const commandRegistry = new CommandRegistry(workspaceRoot);
  await commandRegistry.initialize();
  console.log('[Expresso] CommandRegistry initialized');

  // Initialize Expresso tag scanner with command registry
  expressoScanner = new ExpressoScanner(workspaceRoot, commandRegistry);
  expressoDecorator = new ExpressoDecorator(expressoScanner, context.extensionUri);

  // Register Expresso CodeLens provider
  const expressoCodeLensProvider = new ExpressoCodeLensProvider(expressoScanner);
  const expressoCodeLensRegistration = vscode.languages.registerCodeLensProvider(
    { scheme: 'file' },
    expressoCodeLensProvider
  );

  // Register Expresso completion provider with command registry
  const expressoCompletionProvider = new ExpressoCompletionProvider(commandRegistry);
  const expressoCompletionRegistration = vscode.languages.registerCompletionItemProvider(
    { scheme: 'file' },
    expressoCompletionProvider,
    '/'
  );

  // Register Expresso commands
  registerExpressoCommands(context);

  // Start scanning workspace for @expresso tags and watching for changes
  expressoScanner.scanWorkspace().then(result => {
    if (result.totalCount > 0) {
      console.log(`AI Cockpit: Found ${result.totalCount} @expresso tag(s)`);
    }
  });
  expressoScanner.startWatching();

  context.subscriptions.push(
    commandRegistry,
    expressoScanner,
    expressoDecorator,
    expressoCodeLensProvider,
    expressoCodeLensRegistration,
    expressoCompletionRegistration
  );

  // Initialize task tree provider
  taskTreeProvider = new TaskTreeProvider(fileWatcher, commentManager);

  // Register tree view
  const treeView = vscode.window.createTreeView('aiCockpit.tasks', {
    treeDataProvider: taskTreeProvider,
    showCollapseAll: true
  });

  // Start watching
  fileWatcher.start();

  // Register commands
  registerCommands(context, statusBar);

  // Add to subscriptions
  context.subscriptions.push(fileWatcher, statusBar, treeView, taskTreeProvider);

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

  // Valid task statuses whitelist
  const VALID_STATUSES = ['todo', 'in_progress', 'done'];

  // Register open work item command
  const openWorkItemCommand = vscode.commands.registerCommand(
    'aiCockpit.openWorkItem',
    async (args: { taskId: string; taskStatus: string; workItem: { file?: string; name: string } }) => {
      if (!args?.taskId || !args?.taskStatus || !args?.workItem?.file) {
        vscode.window.showErrorMessage('Invalid work item arguments');
        return;
      }

      if (!VALID_STATUSES.includes(args.taskStatus)) {
        vscode.window.showErrorMessage('Invalid task status');
        return;
      }

      const fileName = args.workItem.file;
      const normalizedFileName = path.normalize(fileName);

      if (normalizedFileName.includes('..') || path.isAbsolute(normalizedFileName)) {
        vscode.window.showErrorMessage('Invalid work item file path');
        return;
      }

      const workItemPath = path.join(
        workspaceRoot,
        '.ai',
        'tasks',
        args.taskStatus,
        args.taskId,
        normalizedFileName
      );

      const resolvedPath = path.resolve(workItemPath);
      const allowedBase = path.resolve(workspaceRoot, '.ai', 'tasks', args.taskStatus, args.taskId);
      if (!resolvedPath.startsWith(allowedBase + path.sep)) {
        vscode.window.showErrorMessage('Path traversal detected');
        return;
      }

      try {
        const uri = vscode.Uri.file(workItemPath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
      } catch {
        vscode.window.showErrorMessage(`Could not open work item: ${args.workItem.name}`);
      }
    }
  );

  context.subscriptions.push(openWorkItemCommand);

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

  // Register open terminal command
  const openTaskTerminal = vscode.commands.registerCommand(
    'aiCockpit.openTaskTerminal',
    async (item: { taskId?: string; task?: { taskId: string } }) => {
      const taskId = item.taskId || item.task?.taskId;
      if (!taskId) {
        vscode.window.showWarningMessage('No task selected');
        return;
      }

      const taskColor = await getTaskColorFromYaml(taskId, workspaceRoot);

      const terminal = vscode.window.createTerminal({
        name: `Cockpit: ${taskId}`,
        color: taskColor ? new vscode.ThemeColor(taskColor) : undefined,
      });
      terminal.show();
      terminal.sendText('claude --allow-dangerously-skip-permissions');
    }
  );

  context.subscriptions.push(openTaskTerminal);

  // Register delete task command
  const deleteTask = vscode.commands.registerCommand(
    'aiCockpit.deleteTask',
    async (item: { taskId?: string; task?: { taskId: string; status: string; title: string } }) => {
      const taskId = item?.taskId || item?.task?.taskId;
      const status = item?.task?.status;
      const title = item?.task?.title || taskId;

      if (!taskId || !status) {
        vscode.window.showWarningMessage('No task selected');
        return;
      }

      if (!VALID_STATUSES.includes(status)) {
        vscode.window.showErrorMessage('Invalid task status');
        return;
      }

      if (taskId.includes('..') || taskId.includes('/') || taskId.includes('\\')) {
        vscode.window.showErrorMessage('Invalid task ID');
        return;
      }

      let warningMessage = `Delete task "${title}"?`;
      let detail = 'This will permanently remove the task folder.';

      if (status === 'in_progress') {
        warningMessage = `Delete in-progress task "${title}"?`;
        detail = 'WARNING: This task is currently in progress. ' + detail;
      }

      const result = await vscode.window.showWarningMessage(
        warningMessage,
        { modal: true, detail },
        'Delete'
      );

      if (result !== 'Delete') {
        return;
      }

      const taskPath = path.join(workspaceRoot, '.ai/tasks', status, taskId);

      const resolvedTaskPath = path.resolve(taskPath);
      const allowedBase = path.resolve(workspaceRoot, '.ai/tasks');
      if (!resolvedTaskPath.startsWith(allowedBase + path.sep)) {
        vscode.window.showErrorMessage('Invalid task path');
        return;
      }

      try {
        await fs.promises.rm(taskPath, { recursive: true, force: true });
        taskTreeProvider?.refresh();
        vscode.window.showInformationMessage(`Task "${taskId}" deleted`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to delete task: ${error}`);
      }
    }
  );

  context.subscriptions.push(deleteTask);

  // Register open feedback file command
  const openFeedbackFile = vscode.commands.registerCommand(
    'aiCockpit.openFeedbackFile',
    async (item: { taskId?: string; task?: { taskId: string; status: string }; status?: string }) => {
      const taskId = item?.taskId || item?.task?.taskId;

      if (!taskId) {
        vscode.window.showWarningMessage('No task selected');
        return;
      }

      const rawStatus = item?.status || item?.task?.status || 'in_progress';
      const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'in_progress';

      if (taskId.includes('..') || taskId.includes('/') || taskId.includes('\\')) {
        vscode.window.showErrorMessage('Invalid task ID');
        return;
      }

      const taskPath = path.join(workspaceRoot, '.ai/tasks', status, taskId);

      const resolvedTaskPath = path.resolve(taskPath);
      const allowedBase = path.resolve(workspaceRoot, '.ai/tasks');
      if (!resolvedTaskPath.startsWith(allowedBase + path.sep)) {
        vscode.window.showErrorMessage('Invalid task path');
        return;
      }
      const feedbackDir = path.join(taskPath, 'feedback');
      const feedbackPath = path.join(feedbackDir, 'diff-review.md');

      if (!fs.existsSync(feedbackPath)) {
        const templatePath = path.join(
          workspaceRoot,
          '.ai/_framework/templates/feedback-template.md'
        );

        try {
          fs.mkdirSync(feedbackDir, { recursive: true });

          if (fs.existsSync(templatePath)) {
            fs.copyFileSync(templatePath, feedbackPath);
          } else {
            fs.writeFileSync(
              feedbackPath,
              '# Diff Feedback\n\nAdd your feedback below using the format:\n\n### path/to/file.ts:42\nYour comment here\n'
            );
          }
        } catch (err) {
          vscode.window.showErrorMessage(`Failed to create feedback file: ${err}`);
          return;
        }
      }

      try {
        const doc = await vscode.workspace.openTextDocument(feedbackPath);
        await vscode.window.showTextDocument(doc);
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to open feedback file: ${err}`);
      }
    }
  );

  context.subscriptions.push(openFeedbackFile);
}

export async function deactivate() {
  fileWatcher?.dispose();
  statusBar?.dispose();
  terminalManager?.dispose();
  commentManager?.dispose();
  console.log('AI Cockpit extension deactivated');
}
