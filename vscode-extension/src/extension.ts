import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import { CockpitFileWatcher } from './watchers/FileWatcher';
import { StatusBarProvider } from './providers/StatusBarProvider';
import { TaskTreeProvider } from './providers/TaskTreeProvider';
import { DiffContentProvider, DIFF_SCHEME } from './providers/DiffContentProvider';
import { DiffViewer } from './services/DiffViewer';
import { ShadowManager } from './services/ShadowManager';
import { SessionManager } from './services/SessionManager';
import { registerCommands } from './commands';
import { CockpitEvent, UNASSIGNED_TASK_ID, TaskColor, isValidTaskColor } from './types';
import { Shadow } from './services/ShadowManager';
import { safeJsonParseLine } from './utils/jsonUtils';
import { getClaudeHistoryPath } from './utils/claudePaths';
import { TerminalManager } from './services/TerminalManager';
import { DiffReviewPanel } from './panels/DiffReviewPanel';
import { CommentManager } from './services/CommentManager';
import { CockpitCleanupService } from './services/CockpitCleanupService';

let fileWatcher: CockpitFileWatcher | undefined;
let statusBar: StatusBarProvider | undefined;
let taskTreeProvider: TaskTreeProvider | undefined;
let diffContentProvider: DiffContentProvider | undefined;
let diffViewer: DiffViewer | undefined;
let shadowManager: ShadowManager | undefined;
let sessionManager: SessionManager | undefined;
let terminalManager: TerminalManager | undefined;
let commentManager: CommentManager | undefined;

export function getTerminalManager(): TerminalManager | undefined {
  return terminalManager;
}

/**
 * Read task color from status.yaml file
 */
async function getTaskColorFromYaml(taskId: string, workspaceRoot: string): Promise<TaskColor | undefined> {
  // Check all status directories
  for (const status of ['in_progress', 'todo', 'done']) {
    const statusPath = path.join(workspaceRoot, '.ai', 'tasks', status, taskId, 'status.yaml');
    try {
      const content = await fs.promises.readFile(statusPath, 'utf-8');
      // Simple YAML parsing for color field
      const colorMatch = content.match(/^color:\s*["']?([^"'\n]+)["']?/m);
      if (colorMatch) {
        const colorValue = colorMatch[1].trim();
        if (isValidTaskColor(colorValue)) {
          return colorValue;
        }
      }
    } catch (err) {
      // Only log non-ENOENT errors (file not found is expected)
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        console.warn(`AI Cockpit: Failed to read color from ${statusPath}:`, code || err);
      }
    }
  }
  return undefined;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Cockpit extension activated');

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  // Clean up any stale signal files on startup
  const signalPath = path.join(workspaceRoot, '.ai/cockpit/task-switch-signal.json');
  fs.promises.unlink(signalPath).then(
    () => console.log('AI Cockpit: Cleaned up stale signal file'),
    () => { /* File doesn't exist, that's fine */ }
  );

  // Initialize providers
  statusBar = new StatusBarProvider();
  fileWatcher = new CockpitFileWatcher(workspaceRoot);
  shadowManager = new ShadowManager(workspaceRoot);
  sessionManager = new SessionManager(workspaceRoot);
  terminalManager = new TerminalManager();
  commentManager = new CommentManager(workspaceRoot);
  context.subscriptions.push({ dispose: () => commentManager?.dispose() });

  // Initialize task tree provider
  taskTreeProvider = new TaskTreeProvider(fileWatcher, shadowManager, sessionManager, commentManager);

  // Run session cleanup on startup if enabled
  const config = vscode.workspace.getConfiguration('aiCockpit');
  if (config.get<boolean>('sessions.autoCleanup', true)) {
    const retentionDays = config.get<number>('sessions.retentionDays', 7);
    sessionManager.cleanupOldSessions(retentionDays).then(count => {
      if (count > 0) {
        console.log(`AI Cockpit: Cleaned up ${count} old sessions`);
      }
    });
  }

  // Start continuous verification (safety net for missed signals)
  if (sessionManager) {
    const verificationDisposable = sessionManager.startContinuousVerification(3000);
    context.subscriptions.push(verificationDisposable);
  }

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

  /**
   * Session Task Synchronization
   *
   * When a user runs /task-start within a Claude session, the task-start command
   * writes a signal file that triggers this listener. We then update the session
   * registry to match the new task, ensuring:
   * - Resume operations open the correct session
   * - Events are attributed to the correct task
   * - UI shows sessions under the correct task tree
   *
   * This solves the session-task desync issue where sessions created for TASK-A
   * never update when the user switches to TASK-B via /task-start.
   */
  fileWatcher.onTaskSwitched(async (signal) => {
    if (!sessionManager) {
      return;
    }

    console.log(
      `AI Cockpit: Task switch detected: ${signal.previousTaskId} → ${signal.newTaskId}`
    );

    try {
      // Find active sessions that belong to the previous task
      const sessions = await sessionManager.getSessions();
      const sessionsToUpdate = sessions.filter(
        s => s.taskId === signal.previousTaskId && s.status === 'active'
      );

      if (sessionsToUpdate.length === 0) {
        console.log(
          `AI Cockpit: No active sessions found for ${signal.previousTaskId}, skipping sync`
        );
        return;
      }

      // Update each matching session
      let updateCount = 0;
      for (const session of sessionsToUpdate) {
        // Check if terminal still exists (user might have closed it)
        if (session.terminalId) {
          const terminal = terminalManager?.getTerminal(session.terminalId);
          if (!terminal) {
            console.log(
              `AI Cockpit: Skipping session ${session.id.substring(0, 8)}... ` +
              `(terminal closed)`
            );
            continue;
          }
        }

        const updated = await sessionManager.updateSessionTaskId(
          session.id,
          signal.newTaskId
        );
        if (updated) {
          updateCount++;
        }
      }

      console.log(
        `AI Cockpit: Synced ${updateCount} session(s) from ${signal.previousTaskId} ` +
        `to ${signal.newTaskId}`
      );

      // Refresh tree view to show updated task assignments
      if (updateCount > 0 && taskTreeProvider) {
        taskTreeProvider.refresh();
      }
    } catch (error) {
      console.error('AI Cockpit: Error handling task switch:', error);
      // Don't crash the extension - log and continue
    }
  });

  // Start watching
  fileWatcher.start();

  // Register commands
  registerCommands(context, statusBar);

  // Add to subscriptions
  context.subscriptions.push(fileWatcher, statusBar, treeView, diffProviderRegistration, taskTreeProvider);

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

      // Validate task status against whitelist
      if (!VALID_STATUSES.includes(args.taskStatus)) {
        vscode.window.showErrorMessage('Invalid task status');
        return;
      }

      // Normalize path before checking for traversal
      const fileName = args.workItem.file;
      const normalizedFileName = path.normalize(fileName);

      // Check for traversal attempts after normalization
      if (normalizedFileName.includes('..') || path.isAbsolute(normalizedFileName)) {
        vscode.window.showErrorMessage('Invalid work item file path');
        return;
      }

      // Build the path using normalized filename
      const workItemPath = path.join(
        workspaceRoot,
        '.ai',
        'tasks',
        args.taskStatus,
        args.taskId,
        normalizedFileName
      );

      // Verify resolved path is within allowed directory
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

  // Register cleanup sessions command
  const cleanupSessions = vscode.commands.registerCommand(
    'aiCockpit.cleanupSessions',
    async () => {
      if (!sessionManager) return;

      const cleanupConfig = vscode.workspace.getConfiguration('aiCockpit');
      const retentionDays = cleanupConfig.get<number>('sessions.retentionDays', 7);
      const count = await sessionManager.cleanupOldSessions(retentionDays);

      vscode.window.showInformationMessage(
        `AI Cockpit: Cleaned up ${count} old session(s)`
      );

      taskTreeProvider?.refresh();
    }
  );

  context.subscriptions.push(cleanupSessions);

  // Normalize path for comparison (resolve symlinks, remove trailing slashes)
  const normalizePath = (p: string): string => {
    return p.replace(/\/+$/, '');
  };

  // Capture queue to prevent concurrent session captures (race condition fix)
  let captureQueue: Promise<string | null> = Promise.resolve(null);

  // Implementation: capture latest sessionId from Claude history with polling
  const captureLatestSessionIdImpl = async (
    knownSessionIds: Set<string>
  ): Promise<string | null> => {
    const historyPath = await getClaudeHistoryPath();

    if (!historyPath) {
      console.warn('AI Cockpit: Claude history file not found');
      return null;
    }

    const normalizedWorkspaceRoot = normalizePath(workspaceRoot);
    const maxAttempts = 15; // Increased from 10 to give more time
    const pollInterval = 1000;

    console.log(`AI Cockpit: Capturing session, workspace: ${normalizedWorkspaceRoot}`);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const content = await fs.promises.readFile(historyPath, 'utf8');
        const lines = content.trim().split('\n').reverse();

        for (const line of lines.slice(0, 30)) { // Check more lines
          const entry = safeJsonParseLine<{
            project?: string;
            sessionId?: string;
          }>(line);

          if (!entry || typeof entry !== 'object') continue;

          if (
            typeof entry.project === 'string' &&
            normalizePath(entry.project) === normalizedWorkspaceRoot &&
            typeof entry.sessionId === 'string' &&
            entry.sessionId &&
            !knownSessionIds.has(entry.sessionId)
          ) {
            console.log(`AI Cockpit: Captured sessionId: ${entry.sessionId}`);
            return entry.sessionId;
          }
        }
      } catch (err) {
        // Log on first attempt only to avoid spam
        if (attempt === 0) {
          const code = (err as NodeJS.ErrnoException).code;
          if (code === 'ENOENT') {
            console.warn(`AI Cockpit: History file not found at ${historyPath}, polling...`);
          } else {
            console.warn(`AI Cockpit: Error reading history file: ${code || err}`);
          }
        }
        // Continue polling - file might not exist yet during Claude startup
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    console.warn(`AI Cockpit: Session capture timed out after ${maxAttempts} attempts`);
    return null;
  };

  /**
   * Session registration data for atomic capture+register operation
   */
  interface SessionRegistrationData {
    taskId: string;
    label: string;
    terminalName: string;
    terminalId: string;
  }

  /**
   * Atomically captures a session ID and registers it in a single queued operation.
   * This prevents race conditions where concurrent captures could grab each other's
   * session IDs because registration happened outside the queue.
   *
   * The entire capture + registration is done inside the queue, ensuring:
   * 1. Fresh sessions are read at capture time
   * 2. New session is found via polling
   * 3. Session is registered BEFORE the next capture can start
   */
  const captureAndRegisterSession = async (
    registrationData: SessionRegistrationData
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      captureQueue = captureQueue.then(async () => {
        // Get FRESH known sessions at capture time (not terminal creation time)
        const allSessions = await sessionManager?.getSessions() ?? [];
        const knownSessionIds = new Set(allSessions.map(s => s.id));

        console.log(`AI Cockpit: Starting queued capture, ${knownSessionIds.size} known sessions`);

        const sessionId = await captureLatestSessionIdImpl(knownSessionIds);

        // Register INSIDE the queue before returning, so next capture sees it
        if (sessionId && sessionManager) {
          await sessionManager.registerSession({
            id: sessionId,
            taskId: registrationData.taskId,
            label: registrationData.label,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            status: 'active',
            terminalName: registrationData.terminalName,
            terminalId: registrationData.terminalId
          });
          console.log(`AI Cockpit: Session ${sessionId} registered inside queue`);
        }

        resolve(sessionId);
        return sessionId;
      });
    });
  };

  /**
   * Generates the Claude CLI command with required flags.
   * All Cockpit-initiated Claude sessions should use this to ensure
   * the --allow-dangerously-skip-permissions flag is included.
   */
  const generateClaudeCommand = (options?: { resume?: string }): string => {
    const parts = ['claude', '--allow-dangerously-skip-permissions'];

    if (options?.resume) {
      parts.push('--resume', options.resume);
    }

    return parts.join(' ');
  };

  // Register open terminal command - opens terminal with COCKPIT_TASK env var
  const openTaskTerminal = vscode.commands.registerCommand(
    'aiCockpit.openTaskTerminal',
    async (item: { taskId?: string; task?: { taskId: string } }) => {
      // Handle both direct call and context menu (TreeItem)
      const taskId = item.taskId || item.task?.taskId;
      if (!taskId) {
        vscode.window.showWarningMessage('No task selected');
        return;
      }

      // Generate unique terminal ID for correlation
      const terminalId = crypto.randomUUID();

      // Get task color for terminal tab
      const taskColor = await getTaskColorFromYaml(taskId, workspaceRoot);

      const terminal = vscode.window.createTerminal({
        name: `Cockpit: ${taskId}`,
        color: taskColor ? new vscode.ThemeColor(taskColor) : undefined,
        env: {
          COCKPIT_TASK: taskId,
          COCKPIT_TERMINAL_ID: terminalId
        }
      });
      terminal.show();
      terminal.sendText(generateClaudeCommand());

      // Store mapping for terminal close correlation
      terminalManager!.registerTerminal(terminalId, terminal, taskId);

      // Mark as pending capture (to handle terminal close during capture)
      terminalManager!.markPendingCapture(terminalId);

      let sessionId: string | null = null;
      try {
        // Atomically capture and register session (prevents race conditions)
        sessionId = await captureAndRegisterSession({
          taskId,
          label: `Session ${new Date().toLocaleTimeString()}`,
          terminalName: terminal.name,
          terminalId
        });
      } finally {
        // Always remove from pending, even if capture throws
        terminalManager!.clearPendingCapture(terminalId);
      }

      // Check if terminal was closed during capture
      if (!terminalManager!.hasTerminal(terminalId)) {
        // Terminal was closed during capture - don't register session
        console.warn(`AI Cockpit: Terminal closed during session capture for task ${taskId}`);
        return;
      }

      if (sessionId) {
        taskTreeProvider?.refresh();
      } else {
        console.warn(`AI Cockpit: Failed to capture sessionId for task ${taskId}`);
        // Clean up map entry on failed capture to prevent memory leak
        terminalManager!.unregisterTerminal(terminalId);
        vscode.window.showWarningMessage(
          `AI Cockpit: Could not capture session for ${taskId}. ` +
          `The terminal is open but session tracking may not work.`,
          'Dismiss'
        );
      }
    }
  );

  context.subscriptions.push(openTaskTerminal);

  // Track terminal close events to mark sessions as closed
  const terminalCloseHandler = vscode.window.onDidCloseTerminal(async terminal => {
    if (terminal.name.startsWith('Cockpit:') && sessionManager) {
      try {
        // Find terminalId by searching the map for this terminal
        const terminalId = terminalManager!.findTerminalId(terminal);

        if (terminalId) {
          // Always clean up the map entry
          terminalManager!.unregisterTerminal(terminalId);

          // If capture is still pending, just clean up - session won't be registered
          if (terminalManager!.isPendingCapture(terminalId)) {
            terminalManager!.clearPendingCapture(terminalId);
            return;
          }

          // Try to close by terminalId first
          const closed = await sessionManager.closeSessionByTerminalId(terminalId);
          if (!closed) {
            // Fall back to terminal name if terminalId lookup failed
            await sessionManager.closeSessionByTerminal(terminal.name);
          }
        } else {
          // No terminalId found - use terminal name fallback
          await sessionManager.closeSessionByTerminal(terminal.name);
        }
      } catch (error) {
        console.error(`AI Cockpit: Failed to close session for ${terminal.name}:`, error);
      }
      taskTreeProvider?.refresh();
    }
  });

  context.subscriptions.push(terminalCloseHandler);

  // Register resume session command
  const resumeSession = vscode.commands.registerCommand(
    'aiCockpit.resumeSession',
    async (session: { id: string; taskId: string; label: string; status: string; terminalId?: string }) => {
      if (!session?.id || !session?.taskId) {
        vscode.window.showWarningMessage('Invalid session');
        return;
      }

      // Generate new terminal ID for this resumed session
      // Clean up any stale terminal reference from old terminalId
      if (session.terminalId) {
        terminalManager?.unregisterTerminal(session.terminalId);
      }

      const terminalId = crypto.randomUUID();

      // Get task color for terminal tab (only for assigned tasks)
      const taskColor = session.taskId !== UNASSIGNED_TASK_ID
        ? await getTaskColorFromYaml(session.taskId, workspaceRoot)
        : undefined;

      // Create terminal with COCKPIT_TASK set
      const terminal = vscode.window.createTerminal({
        name: `Cockpit: ${session.taskId}`,
        color: taskColor ? new vscode.ThemeColor(taskColor) : undefined,
        env: {
          COCKPIT_TASK: session.taskId,
          COCKPIT_TERMINAL_ID: terminalId
        }
      });
      terminal.show();

      // Store mapping for terminal close correlation
      terminalManager!.registerTerminal(terminalId, terminal, session.taskId);

      // Resume the Claude session
      terminal.sendText(generateClaudeCommand({ resume: session.id }));

      // Update session status to active with new terminalId
      if (sessionManager) {
        const updated = await sessionManager.updateSession(session.id, {
          status: 'active',
          lastActive: new Date().toISOString(),
          terminalName: terminal.name,
          terminalId
        });

        if (!updated) {
          console.warn(`AI Cockpit: Session ${session.id} not found in registry`);
        }
        taskTreeProvider?.refresh();
      }
    }
  );

  context.subscriptions.push(resumeSession);

  // Register focus session command - focuses existing terminal for active sessions
  const focusSession = vscode.commands.registerCommand(
    'aiCockpit.focusSession',
    async (session: { id: string; taskId: string; terminalId?: string; status: string }) => {
      if (!session?.terminalId) {
        vscode.window.showWarningMessage('Session has no terminal ID');
        return;
      }

      if (session.status !== 'active') {
        // Session is not active, delegate to resumeSession
        vscode.commands.executeCommand('aiCockpit.resumeSession', session);
        return;
      }

      const terminal = terminalManager?.getTerminal(session.terminalId);

      if (terminal) {
        // Terminal exists - just focus it
        terminal.show();
      } else {
        // Terminal was closed externally - update status and auto-resume
        if (sessionManager) {
          await sessionManager.closeSession(session.id);
          taskTreeProvider?.refresh();
        }
        // Auto-resume the session instead of requiring a second click
        vscode.commands.executeCommand('aiCockpit.resumeSession', {
          ...session,
          status: 'closed'
        });
      }
    }
  );

  context.subscriptions.push(focusSession);

  // Register rename session command
  const renameSession = vscode.commands.registerCommand(
    'aiCockpit.renameSession',
    async (sessionItem: { session?: { id: string; label: string } }) => {
      const session = sessionItem?.session;
      if (!session?.id || !sessionManager) {
        return;
      }

      const newLabel = await vscode.window.showInputBox({
        prompt: 'Enter new session label',
        value: session.label,
        placeHolder: 'e.g., Bug fix session, Feature work, Testing'
      });

      if (newLabel === undefined) {
        return;
      }

      if (!newLabel.trim()) {
        vscode.window.showWarningMessage('Session label cannot be empty');
        return;
      }

      const updated = await sessionManager.renameSession(session.id, newLabel.trim());
      if (updated) {
        taskTreeProvider?.refresh();
      } else {
        vscode.window.showWarningMessage('Session not found');
      }
    }
  );

  context.subscriptions.push(renameSession);

  // Register delete session command
  const deleteSession = vscode.commands.registerCommand(
    'aiCockpit.deleteSession',
    async (sessionItem: { session?: { id: string; label: string; status: string; terminalId?: string } }) => {
      const session = sessionItem?.session;
      if (!session?.id || !sessionManager) {
        return;
      }

      const warningMessage = session.status === 'active'
        ? `Delete active session "${session.label}"? The terminal will remain open but session tracking will be lost.`
        : `Delete session "${session.label}"?`;

      const result = await vscode.window.showWarningMessage(
        warningMessage,
        { modal: true },
        'Delete'
      );

      if (result !== 'Delete') {
        return;
      }

      if (session.status === 'active' && session.terminalId && terminalManager) {
        terminalManager.unregisterTerminal(session.terminalId);
      }

      const deleted = await sessionManager.deleteSession(session.id);
      if (deleted) {
        taskTreeProvider?.refresh();
        vscode.window.showInformationMessage(`Session "${session.label}" deleted`);
      } else {
        vscode.window.showWarningMessage('Session not found');
      }
    }
  );

  context.subscriptions.push(deleteSession);

  // Create cockpit cleanup service
  const cockpitCleanupService = new CockpitCleanupService(workspaceRoot);

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

      // Validate status
      const VALID_STATUSES = ['todo', 'in_progress', 'done'];
      if (!VALID_STATUSES.includes(status)) {
        vscode.window.showErrorMessage('Invalid task status');
        return;
      }

      // Validate taskId doesn't contain path traversal
      if (taskId.includes('..') || taskId.includes('/') || taskId.includes('\\')) {
        vscode.window.showErrorMessage('Invalid task ID');
        return;
      }

      // Build warning message based on task state
      let warningMessage = `Delete task "${title}"?`;
      let detail = 'This will permanently remove the task and all associated data (events, shadows, sessions).';

      if (status === 'in_progress') {
        warningMessage = `Delete in-progress task "${title}"?`;
        detail = 'WARNING: This task is currently in progress. ' + detail;
      }

      // Confirmation dialog
      const result = await vscode.window.showWarningMessage(
        warningMessage,
        { modal: true, detail },
        'Delete'
      );

      if (result !== 'Delete') {
        return;
      }

      // Close any open DiffReviewPanels for this task
      const closedPanels = DiffReviewPanel.closeAllForTask(taskId);

      // Clean up cockpit data (events, shadows, sessions, active task)
      const cleanupResult = await cockpitCleanupService.cleanupTask(taskId);
      if (!cleanupResult.success) {
        console.warn('Partial cleanup errors:', cleanupResult.errors);
      }

      // Construct task path
      const taskPath = path.join(workspaceRoot, '.ai/tasks', status, taskId);

      // Security: Validate path stays within allowed directory
      const resolvedTaskPath = path.resolve(taskPath);
      const allowedBase = path.resolve(workspaceRoot, '.ai/tasks');
      if (!resolvedTaskPath.startsWith(allowedBase + path.sep)) {
        vscode.window.showErrorMessage('Invalid task path');
        return;
      }

      try {
        // Delete task folder
        await fs.promises.rm(taskPath, { recursive: true, force: true });

        // Refresh tree view
        taskTreeProvider?.refresh();

        // Build success message
        let successMsg = `Task "${taskId}" deleted`;
        if (cleanupResult.wasActive) {
          successMsg += ' (was active task)';
        }
        if (closedPanels > 0) {
          successMsg += ` - closed ${closedPanels} diff panel(s)`;
        }

        vscode.window.showInformationMessage(successMsg);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to delete task: ${error}`);
      }
    }
  );

  context.subscriptions.push(deleteTask);

  // Register new session command with custom label
  const newSession = vscode.commands.registerCommand(
    'aiCockpit.newSession',
    async (item: { taskId?: string; task?: { taskId: string }; id?: string }) => {
      console.log('AI Cockpit: newSession called with item:', JSON.stringify(item));
      // Try multiple ways to get taskId:
      // 1. Direct taskId property (if class instance preserved)
      // 2. From task.taskId (for TaskItem)
      // 3. From id property (sessions-{taskId} format for SessionsSection)
      let taskId = item?.taskId || item?.task?.taskId;
      if (!taskId && item?.id?.startsWith('sessions-')) {
        taskId = item.id.replace('sessions-', '');
      }
      if (!taskId) {
        console.warn('AI Cockpit: newSession - no taskId found in item');
        vscode.window.showWarningMessage('No task selected');
        return;
      }
      console.log(`AI Cockpit: newSession for taskId: ${taskId}`);

      // Prompt for session label
      const label = await vscode.window.showInputBox({
        prompt: 'Session label (optional)',
        placeHolder: 'e.g., Bug fix, Feature work, Testing'
      });

      // User cancelled the input
      if (label === undefined) {
        return;
      }

      // Generate unique terminal ID for correlation
      const terminalId = crypto.randomUUID();

      // Get task color for terminal tab
      const taskColor = await getTaskColorFromYaml(taskId, workspaceRoot);

      // Create terminal
      const terminal = vscode.window.createTerminal({
        name: `Cockpit: ${taskId}`,
        color: taskColor ? new vscode.ThemeColor(taskColor) : undefined,
        env: {
          COCKPIT_TASK: taskId,
          COCKPIT_TERMINAL_ID: terminalId
        }
      });
      terminal.show();
      terminal.sendText(generateClaudeCommand());

      // Store mapping for terminal close correlation
      terminalManager!.registerTerminal(terminalId, terminal, taskId);

      // Mark as pending capture (to handle terminal close during capture)
      terminalManager!.markPendingCapture(terminalId);

      const sessionLabel = label || `Session ${new Date().toLocaleTimeString()}`;
      let sessionId: string | null = null;
      try {
        // Atomically capture and register session (prevents race conditions)
        sessionId = await captureAndRegisterSession({
          taskId,
          label: sessionLabel,
          terminalName: terminal.name,
          terminalId
        });
      } finally {
        // Always remove from pending, even if capture throws
        terminalManager!.clearPendingCapture(terminalId);
      }

      // Check if terminal was closed during capture
      if (!terminalManager!.hasTerminal(terminalId)) {
        console.warn(`AI Cockpit: Terminal closed during session capture for task ${taskId}`);
        return;
      }

      if (sessionId) {
        taskTreeProvider?.refresh();
        console.log(`AI Cockpit: Session "${sessionLabel}" registered for task ${taskId}`);
      } else {
        console.warn(`AI Cockpit: Failed to capture sessionId for task ${taskId}`);
        // Clean up map entry on failed capture to prevent memory leak
        terminalManager!.unregisterTerminal(terminalId);
        vscode.window.showWarningMessage(
          `AI Cockpit: Could not capture session for ${taskId}. ` +
          `The terminal is open but session tracking may not work.`,
          'Dismiss'
        );
      }
    }
  );

  context.subscriptions.push(newSession);

  // Register start unassigned session command
  const startSession = vscode.commands.registerCommand(
    'aiCockpit.startSession',
    async () => {
      // Prompt for session label
      const label = await vscode.window.showInputBox({
        prompt: 'Session label (optional)',
        placeHolder: 'e.g., Exploration, Research, Debugging'
      });

      // User cancelled the input
      if (label === undefined) {
        return;
      }

      // Generate unique terminal ID for correlation
      const terminalId = crypto.randomUUID();

      // Create terminal without COCKPIT_TASK - this is an unassigned session
      const terminal = vscode.window.createTerminal({
        name: 'Cockpit: Session',
        env: {
          COCKPIT_TERMINAL_ID: terminalId
        }
      });
      terminal.show();
      terminal.sendText(generateClaudeCommand());

      // Store mapping for terminal close correlation
      terminalManager!.registerTerminal(terminalId, terminal, UNASSIGNED_TASK_ID);

      // Mark as pending capture
      terminalManager!.markPendingCapture(terminalId);

      const sessionLabel = label || `Session ${new Date().toLocaleTimeString()}`;
      let sessionId: string | null = null;
      try {
        // Atomically capture and register session (prevents race conditions)
        sessionId = await captureAndRegisterSession({
          taskId: UNASSIGNED_TASK_ID,
          label: sessionLabel,
          terminalName: terminal.name,
          terminalId
        });
      } finally {
        terminalManager!.clearPendingCapture(terminalId);
      }

      // Check if terminal was closed during capture
      if (!terminalManager!.hasTerminal(terminalId)) {
        console.warn('AI Cockpit: Terminal closed during session capture');
        return;
      }

      if (sessionId) {
        taskTreeProvider?.refresh();
        console.log(`AI Cockpit: Unassigned session "${sessionLabel}" registered`);
      } else {
        console.warn('AI Cockpit: Failed to capture sessionId for unassigned session');
        terminalManager!.unregisterTerminal(terminalId);
        vscode.window.showWarningMessage(
          'AI Cockpit: Could not capture session. The terminal is open but session tracking may not work.',
          'Dismiss'
        );
      }
    }
  );

  context.subscriptions.push(startSession);

  // Register link session to task command
  const linkSessionToTask = vscode.commands.registerCommand(
    'aiCockpit.linkSessionToTask',
    async (sessionItem: { session?: { id: string; label: string; taskId: string } }) => {
      const session = sessionItem?.session;
      if (!session?.id || !sessionManager) {
        return;
      }

      // Get list of in-progress tasks
      const inProgressPath = path.join(workspaceRoot, '.ai/tasks/in_progress');
      let taskIds: string[] = [];
      try {
        const entries = await fs.promises.readdir(inProgressPath, { withFileTypes: true });
        taskIds = entries.filter(e => e.isDirectory()).map(e => e.name);
      } catch {
        // No in_progress directory
      }

      if (taskIds.length === 0) {
        vscode.window.showWarningMessage('No in-progress tasks to link to');
        return;
      }

      // Show quick pick
      const selectedTask = await vscode.window.showQuickPick(taskIds, {
        placeHolder: 'Select a task to link this session to'
      });

      if (!selectedTask) {
        return;
      }

      const linked = await sessionManager.linkSessionToTask(session.id, selectedTask);
      if (linked) {
        taskTreeProvider?.refresh();
        vscode.window.showInformationMessage(
          `Session "${session.label}" linked to ${selectedTask}`
        );
      } else {
        vscode.window.showWarningMessage('Session not found');
      }
    }
  );

  context.subscriptions.push(linkSessionToTask);

  // Register Claude path validation command
  const validateClaudePath = vscode.commands.registerCommand(
    'aiCockpit.validateClaudePath',
    async () => {
      const historyPath = await getClaudeHistoryPath();

      if (!historyPath) {
        vscode.window.showErrorMessage(
          'AI Cockpit: Could not find Claude history file. ' +
          'Check your aiCockpit.claude.historyPath setting.'
        );
        return;
      }

      try {
        await fs.promises.access(historyPath);
        vscode.window.showInformationMessage(
          `AI Cockpit: Found Claude history at ${historyPath}`
        );
      } catch {
        vscode.window.showWarningMessage(
          `AI Cockpit: Path configured but file not found: ${historyPath}`
        );
      }
    }
  );

  context.subscriptions.push(validateClaudePath);

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

  // Register plain diff command (native VSCode diff, no comments)
  const showPlainDiff = vscode.commands.registerCommand(
    'aiCockpit.showPlainDiff',
    async (arg: unknown) => {
      const shadow = extractShadow(arg);
      if (!shadow) {
        vscode.window.showWarningMessage('No shadow data provided');
        return;
      }
      await diffViewer?.showFullDiff(shadow);
    }
  );

  context.subscriptions.push(showClaudeChanges, showYourChanges, showFullDiff, showPlainDiff);

  // Register open diff review panel command (GitHub-style review)
  const openDiffReview = vscode.commands.registerCommand(
    'aiCockpit.openDiffReview',
    async (arg: unknown) => {
      const shadow = extractShadow(arg);
      if (!shadow) {
        vscode.window.showWarningMessage('No shadow data provided');
        return;
      }
      if (!commentManager) {
        vscode.window.showErrorMessage('CommentManager not initialized');
        return;
      }
      DiffReviewPanel.createOrShow(context.extensionUri, shadow, commentManager);
    }
  );

  context.subscriptions.push(openDiffReview);

  // Register open feedback file command
  const openFeedbackFile = vscode.commands.registerCommand(
    'aiCockpit.openFeedbackFile',
    async (item: { taskId?: string; task?: { taskId: string; status: string }; status?: string }) => {
      const taskId = item?.taskId || item?.task?.taskId;

      if (!taskId) {
        vscode.window.showWarningMessage('No task selected');
        return;
      }

      // Validate status to prevent path traversal
      const VALID_STATUSES = ['todo', 'in_progress', 'done'];
      const rawStatus = item?.status || item?.task?.status || 'in_progress';
      const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'in_progress';

      // Validate taskId doesn't contain path traversal
      if (taskId.includes('..') || taskId.includes('/') || taskId.includes('\\')) {
        vscode.window.showErrorMessage('Invalid task ID');
        return;
      }

      const taskPath = path.join(workspaceRoot, '.ai/tasks', status, taskId);

      // Additional safety: ensure resolved path is within workspace
      const resolvedTaskPath = path.resolve(taskPath);
      const allowedBase = path.resolve(workspaceRoot, '.ai/tasks');
      if (!resolvedTaskPath.startsWith(allowedBase + path.sep)) {
        vscode.window.showErrorMessage('Invalid task path');
        return;
      }
      const feedbackDir = path.join(taskPath, 'feedback');
      const feedbackPath = path.join(feedbackDir, 'diff-review.md');

      // Create file from template if it doesn't exist
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
            // Create minimal file if template doesn't exist
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

export function deactivate() {
  fileWatcher?.dispose();
  statusBar?.dispose();
  terminalManager?.dispose();
  commentManager?.dispose();
  console.log('AI Cockpit extension deactivated');
}
