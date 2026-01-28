import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import type { PostmanEnvironment } from '../types/postman.js';

export class VariableResolver {
  private environment: Map<string, string> = new Map();
  private globals: Map<string, string> = new Map();
  private envPath: string;

  constructor(envPath?: string) {
    this.envPath = envPath || '';
    if (envPath && existsSync(envPath)) {
      this.loadEnvironment(envPath);
    }
  }

  private loadEnvironment(envPath: string): void {
    const content = readFileSync(envPath, 'utf-8');
    const env: PostmanEnvironment = JSON.parse(content);

    for (const item of env.values) {
      if (item.enabled) {
        this.environment.set(item.key, item.value);
      }
    }
  }

  resolve(template: string): string {
    if (!template) return template;

    return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmedName = varName.trim();

      if (trimmedName.startsWith('$')) {
        return this.resolveDynamicVariable(trimmedName);
      }

      const globalValue = this.globals.get(trimmedName);
      if (globalValue !== undefined) {
        return globalValue;
      }

      const envValue = this.environment.get(trimmedName);
      if (envValue !== undefined) {
        return envValue;
      }

      return match;
    });
  }

  private resolveDynamicVariable(name: string): string {
    switch (name) {
      case '$guid':
        return randomUUID();
      case '$timestamp':
        return Math.floor(Date.now() / 1000).toString();
      case '$isoTimestamp':
        return new Date().toISOString();
      case '$randomInt':
        return Math.floor(Math.random() * 1000).toString();
      default:
        return `{{${name}}}`;
    }
  }

  setVariable(key: string, value: string, scope: 'global' | 'environment' = 'global'): void {
    if (scope === 'global') {
      this.globals.set(key, value);
    } else {
      this.environment.set(key, value);
    }
  }

  getVariable(key: string): string | undefined {
    return this.globals.get(key) ?? this.environment.get(key);
  }

  getAllVariables(): Record<string, string> {
    const allVars: Record<string, string> = {};

    for (const [key, value] of this.environment) {
      allVars[key] = value;
    }

    for (const [key, value] of this.globals) {
      allVars[key] = value;
    }

    return allVars;
  }

  getFilteredVariables(pattern?: string): Record<string, string> {
    const allVars = this.getAllVariables();

    if (!pattern) {
      return allVars;
    }

    const regex = new RegExp(pattern, 'i');
    const filtered: Record<string, string> = {};

    for (const [key, value] of Object.entries(allVars)) {
      if (regex.test(key)) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  saveEnvironment(): void {
    if (!this.envPath) return;

    const env: PostmanEnvironment = {
      id: 'dev-env',
      name: 'Dev',
      values: []
    };

    for (const [key, value] of this.environment) {
      env.values.push({ key, value, enabled: true });
    }

    writeFileSync(this.envPath, JSON.stringify(env, null, 2));
  }
}
