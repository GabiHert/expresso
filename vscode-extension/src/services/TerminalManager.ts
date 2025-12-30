import * as vscode from 'vscode';

export class TerminalManager {
  private terminalMap = new Map<string, vscode.Terminal>();
  private pendingCaptures = new Set<string>();

  registerTerminal(terminalId: string, terminal: vscode.Terminal): void {
    this.terminalMap.set(terminalId, terminal);
  }

  unregisterTerminal(terminalId: string): void {
    this.terminalMap.delete(terminalId);
    this.pendingCaptures.delete(terminalId);
  }

  getTerminal(terminalId: string): vscode.Terminal | undefined {
    return this.terminalMap.get(terminalId);
  }

  findTerminalId(terminal: vscode.Terminal): string | undefined {
    for (const [id, t] of this.terminalMap.entries()) {
      if (t === terminal) return id;
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
