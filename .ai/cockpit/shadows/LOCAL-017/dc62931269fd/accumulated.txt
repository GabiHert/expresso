import * as vscode from 'vscode';

interface TerminalContext {
  terminal: vscode.Terminal;
  taskId: string;
  createdAt: number;
}

export class TerminalManager {
  private terminalMap = new Map<string, TerminalContext>();
  private pendingCaptures = new Set<string>();

  registerTerminal(terminalId: string, terminal: vscode.Terminal, taskId: string): void {
    this.terminalMap.set(terminalId, {
      terminal,
      taskId,
      createdAt: Date.now()
    });
  }

  unregisterTerminal(terminalId: string): void {
    this.terminalMap.delete(terminalId);
    this.pendingCaptures.delete(terminalId);
  }

  getTerminal(terminalId: string): vscode.Terminal | undefined {
    return this.terminalMap.get(terminalId)?.terminal;
  }

  getTaskId(terminalId: string): string | undefined {
    return this.terminalMap.get(terminalId)?.taskId;
  }

  findTerminalId(terminal: vscode.Terminal): string | undefined {
    for (const [id, ctx] of this.terminalMap.entries()) {
      if (ctx.terminal === terminal) return id;
    }
    return undefined;
  }

  hasTerminal(terminalId: string): boolean {
    return this.terminalMap.has(terminalId);
  }

  markPendingCapture(terminalId: string): void {
    this.pendingCaptures.add(terminalId);
  }

  clearPendingCapture(terminalId: string): void {
    this.pendingCaptures.delete(terminalId);
  }

  isPendingCapture(terminalId: string): boolean {
    return this.pendingCaptures.has(terminalId);
  }

  dispose(): void {
    this.terminalMap.clear();
    this.pendingCaptures.clear();
  }
}
