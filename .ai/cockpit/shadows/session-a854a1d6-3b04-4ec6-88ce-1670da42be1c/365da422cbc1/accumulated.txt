import * as fs from 'fs';
import * as path from 'path';

export class CockpitCleanupService {
  constructor(private workspaceRoot: string) {}

  /**
   * Clean up all cockpit data for a task
   */
  async cleanupTask(taskId: string): Promise<{ success: boolean; errors: string[]; wasActive: boolean }> {
    const errors: string[] = [];
    let wasActive = false;

    // 1. Clean up events
    try {
      await this.cleanupEvents(taskId);
    } catch (error) {
      errors.push(`Events cleanup failed: ${error}`);
    }

    // 2. Clean up shadows
    try {
      await this.cleanupShadows(taskId);
    } catch (error) {
      errors.push(`Shadows cleanup failed: ${error}`);
    }

    // 3. Clean up session references
    try {
      await this.cleanupSessions(taskId);
    } catch (error) {
      errors.push(`Sessions cleanup failed: ${error}`);
    }

    // 4. Clear active task if it matches
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

  /**
   * Remove event history for a task
   */
  private async cleanupEvents(taskId: string): Promise<void> {
    const eventsPath = path.join(this.workspaceRoot, '.ai/cockpit/events', taskId);

    if (!this.isValidPath(eventsPath, '.ai/cockpit/events')) {
      throw new Error('Invalid events path');
    }

    if (fs.existsSync(eventsPath)) {
      await fs.promises.rm(eventsPath, { recursive: true, force: true });
    }
  }

  /**
   * Remove shadow copies for a task
   */
  private async cleanupShadows(taskId: string): Promise<void> {
    const shadowsPath = path.join(this.workspaceRoot, '.ai/cockpit/shadows', taskId);

    if (!this.isValidPath(shadowsPath, '.ai/cockpit/shadows')) {
      throw new Error('Invalid shadows path');
    }

    if (fs.existsSync(shadowsPath)) {
      await fs.promises.rm(shadowsPath, { recursive: true, force: true });
    }
  }

  /**
   * Remove session references for a task from sessions.json
   */
  private async cleanupSessions(taskId: string): Promise<void> {
    const sessionsPath = path.join(this.workspaceRoot, '.ai/cockpit/sessions.json');

    if (!fs.existsSync(sessionsPath)) {
      return; // No sessions file, nothing to clean
    }

    try {
      const content = await fs.promises.readFile(sessionsPath, 'utf8');
      const registry = JSON.parse(content);

      if (!registry.sessions || !Array.isArray(registry.sessions)) {
        return;
      }

      const originalLength = registry.sessions.length;
      registry.sessions = registry.sessions.filter(
        (session: { taskId?: string }) => session.taskId !== taskId
      );

      if (registry.sessions.length < originalLength) {
        await fs.promises.writeFile(
          sessionsPath,
          JSON.stringify(registry, null, 2),
          'utf8'
        );
      }
    } catch (error) {
      // If parse fails, log but don't throw - sessions.json may be corrupted
      console.error('Failed to parse sessions.json:', error);
    }
  }

  /**
   * Clear active-task.json if it references the deleted task
   */
  async clearActiveTask(taskId: string): Promise<boolean> {
    const activeTaskPath = path.join(this.workspaceRoot, '.ai/cockpit/active-task.json');

    if (!fs.existsSync(activeTaskPath)) {
      return false; // No active task file
    }

    try {
      const content = await fs.promises.readFile(activeTaskPath, 'utf8');
      const activeTask = JSON.parse(content);

      if (activeTask.taskId === taskId) {
        await fs.promises.unlink(activeTaskPath);
        return true; // Active task was cleared
      }

      return false; // Different task is active
    } catch (error) {
      console.error('Failed to read/clear active-task.json:', error);
      return false;
    }
  }

  /**
   * Validate path stays within allowed directory (prevent path traversal)
   */
  private isValidPath(targetPath: string, allowedSubdir: string): boolean {
    const resolvedPath = path.resolve(targetPath);
    const allowedBase = path.resolve(this.workspaceRoot, allowedSubdir);
    return resolvedPath.startsWith(allowedBase + path.sep) || resolvedPath === allowedBase;
  }
}
