import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

function getWindowsAppDataPath(): string {
  if (process.env.APPDATA) {
    return process.env.APPDATA;
  }
  // Fallback: construct standard AppData path from homedir
  return path.join(os.homedir(), 'AppData', 'Roaming');
}

const DEFAULT_PATHS: Record<string, string[]> = {
  darwin: [
    path.join(os.homedir(), '.claude', 'history.jsonl'),
    path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'history.jsonl')
  ],
  linux: [
    path.join(os.homedir(), '.claude', 'history.jsonl'),
    path.join(os.homedir(), '.config', 'claude', 'history.jsonl')
  ],
  win32: [
    path.join(os.homedir(), '.claude', 'history.jsonl'),
    path.join(getWindowsAppDataPath(), 'Claude', 'history.jsonl')
  ]
};

export async function getClaudeHistoryPath(): Promise<string | null> {
  const config = vscode.workspace.getConfiguration('aiCockpit');

  // Check for manual override - if configured, don't fall back to auto-detect
  const manualPath = config.get<string>('claude.historyPath', '');
  if (manualPath) {
    try {
      await fs.promises.access(manualPath);
      return manualPath;
    } catch {
      console.error(`AI Cockpit: Configured path not accessible: ${manualPath}`);
      // Return null to signal failure - don't silently fall back to auto-detect
      return null;
    }
  }

  // Auto-detect if enabled
  if (config.get<boolean>('claude.autoDetect', true)) {
    const platform = process.platform;
    const candidates = DEFAULT_PATHS[platform] || DEFAULT_PATHS.linux;

    for (const candidate of candidates) {
      try {
        await fs.promises.access(candidate);
        return candidate;
      } catch {
        continue;
      }
    }
  }

  // Fallback to default path (may not exist, caller should handle)
  return getDefaultHistoryPath();
}

export function getDefaultHistoryPath(): string {
  return path.join(os.homedir(), '.claude', 'history.jsonl');
}
