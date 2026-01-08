import * as fs from 'fs';
import * as path from 'path';
import { SessionManager } from './SessionManager';

export class CockpitCleanupService {
  constructor(
    private workspaceRoot: string,
    private sessionManager: SessionManager
  ) {}

  async cleanupTask(taskId: string): Promise<{ success: boolean; errors: string[]; wasActive: boolean }> {
    const errors: string[] = [];
    let wasActive = false;

    try {
      await this.cleanupEvents(taskId);
    } catch (error) {
      errors.push(`Events cleanup failed: ${error}`);
    }

    try {
      await this.cleanupShadows(taskId);
    } catch (error) {
      errors.push(`Shadows cleanup failed: ${error}`);
    }

    try {
      await this.cleanupSessions(taskId);
    } catch (error) {
      errors.push(`Sessions cleanup failed: ${error}`);
    }

    try {
      wasActive = await this.clearActiveTask(taskId);
    } catch (error) {
      errors.push(`Active task cleanup failed: ${error}`);
    }

    return {
      success: errors.length === 0,
      errors,
      wasActive
    };
  }

  private async cleanupEvents(taskId: string): Promise<void> {
    const eventsPath = path.join(this.workspaceRoot, '.ai/cockpit/events', taskId);

    if (!this.isValidPath(eventsPath, '.ai/cockpit/events')) {
      throw new Error('Invalid events path');
    }

    if (fs.existsSync(eventsPath)) {
      await fs.promises.rm(eventsPath, { recursive: true, force: true });
    }
  }

  private async cleanupShadows(taskId: string): Promise<void> {
    const shadowsPath = path.join(this.workspaceRoot, '.ai/cockpit/shadows', taskId);

    if (!this.isValidPath(shadowsPath, '.ai/cockpit/shadows')) {
      throw new Error('Invalid shadows path');
    }

    if (fs.existsSync(shadowsPath)) {
      await fs.promises.rm(shadowsPath, { recursive: true, force: true });
    }
  }

  private async cleanupSessions(taskId: string): Promise<void> {
    try {
      const deletedCount = await this.sessionManager.deleteByTaskId(taskId);
      if (deletedCount > 0) {
        console.log(`AI Cockpit: Deleted ${deletedCount} sessions for task ${taskId}`);
      }
    } catch (error) {
      console.error(`AI Cockpit: Failed to cleanup sessions for task ${taskId}:`, error);
      throw error;
    }
  }

  async clearActiveTask(taskId: string): Promise<boolean> {
    const activeTaskPath = path.join(this.workspaceRoot, '.ai/cockpit/active-task.json');

    if (!fs.existsSync(activeTaskPath)) {
      return false;
    }

    try {
      const content = await fs.promises.readFile(activeTaskPath, 'utf8');
      const activeTask = JSON.parse(content);

      if (activeTask.taskId === taskId) {
        await fs.promises.unlink(activeTaskPath);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to read/clear active-task.json:', error);
      return false;
    }
  }

  private isValidPath(targetPath: string, allowedSubdir: string): boolean {
    const resolvedPath = path.resolve(targetPath);
    const allowedBase = path.resolve(this.workspaceRoot, allowedSubdir);
    return resolvedPath.startsWith(allowedBase + path.sep) || resolvedPath === allowedBase;
  }
}
