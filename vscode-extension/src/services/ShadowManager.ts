import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface ShadowMeta {
  filePath: string;
  taskId: string;
  baseline: {
    capturedAt: string;
    hash: string;
    size: number;
  };
  accumulated: {
    lastUpdatedAt: string;
    hash: string;
    size: number;
    editCount: number;
  };
  sync: {
    lastCheckedAt: string;
    actualFileHash?: string;
    status: 'synced' | 'user-modified' | 'file-deleted';
  };
}

export interface Shadow {
  meta: ShadowMeta;
  baseline: string;
  accumulated: string;
  dirPath: string;
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
        } catch {
          // Skip invalid shadow directories
        }
      }
    }

    return shadows;
  }

  async getShadow(taskId: string, filePath: string): Promise<Shadow | null> {
    const hash = this.hashFilePath(filePath);
    const shadowDir = path.join(this.shadowsPath, taskId, hash);

    if (!fs.existsSync(path.join(shadowDir, 'meta.json'))) {
      return null;
    }

    return this.loadShadow(shadowDir);
  }

  private async loadShadow(shadowDir: string): Promise<Shadow> {
    const meta = JSON.parse(
      fs.readFileSync(path.join(shadowDir, 'meta.json'), 'utf8')
    ) as ShadowMeta;

    const baseline = fs.readFileSync(
      path.join(shadowDir, 'baseline.txt'),
      'utf8'
    );

    const accumulated = fs.readFileSync(
      path.join(shadowDir, 'accumulated.txt'),
      'utf8'
    );

    return { meta, baseline, accumulated, dirPath: shadowDir };
  }

  async checkSyncStatus(
    shadow: Shadow
  ): Promise<'synced' | 'user-modified' | 'file-deleted'> {
    const actualPath = this.resolveFilePath(shadow.meta.filePath);

    if (!fs.existsSync(actualPath)) {
      return 'file-deleted';
    }

    const actual = fs.readFileSync(actualPath, 'utf8');
    const actualHash = this.hashContent(actual);

    return actualHash === shadow.meta.accumulated.hash
      ? 'synced'
      : 'user-modified';
  }

  async getActualContent(shadow: Shadow): Promise<string | null> {
    const actualPath = this.resolveFilePath(shadow.meta.filePath);

    if (!fs.existsSync(actualPath)) {
      return null;
    }

    return fs.readFileSync(actualPath, 'utf8');
  }

  private resolveFilePath(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.join(this.workspaceRoot, filePath);
  }

  private hashFilePath(filePath: string): string {
    return crypto
      .createHash('sha256')
      .update(filePath)
      .digest('hex')
      .substring(0, 12);
  }

  private hashContent(content: string): string {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 16);
  }
}
