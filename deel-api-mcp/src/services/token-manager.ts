import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as jose from 'jose';

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scopes: string[];
  role: string;
}

export interface TokenStatus {
  hasToken: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  expiresIn: number | null;
  scopes: string[];
  role: string | null;
}

export class TokenManager {
  private tokenPath: string;
  private tokens: TokenData | null = null;

  constructor() {
    const configDir = join(homedir(), '.deel-api-mcp');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    this.tokenPath = join(configDir, 'tokens.json');
    this.load();
  }

  private load(): void {
    if (existsSync(this.tokenPath)) {
      try {
        const content = readFileSync(this.tokenPath, 'utf-8');
        this.tokens = JSON.parse(content);
      } catch {
        this.tokens = null;
      }
    }
  }

  private save(): void {
    if (this.tokens) {
      writeFileSync(this.tokenPath, JSON.stringify(this.tokens, null, 2));
    }
  }

  private decodeJwt(token: string): { exp: number; scope?: string[]; role?: string } {
    try {
      const payload = jose.decodeJwt(token);
      return {
        exp: (payload.exp as number) || 0,
        scope: payload.scope as string[] | undefined,
        role: payload.role as string | undefined
      };
    } catch {
      return { exp: 0 };
    }
  }

  getAccessToken(): string | null {
    return this.tokens?.access_token ?? null;
  }

  getRefreshToken(): string | null {
    return this.tokens?.refresh_token ?? null;
  }

  isExpired(): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expires_at * 1000;
  }

  isExpiringSoon(thresholdSeconds: number = 60): boolean {
    if (!this.tokens) return true;
    const thresholdMs = thresholdSeconds * 1000;
    return Date.now() >= (this.tokens.expires_at * 1000) - thresholdMs;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    const decoded = this.decodeJwt(accessToken);

    this.tokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: decoded.exp,
      scopes: decoded.scope || [],
      role: decoded.role || ''
    };

    this.save();
  }

  getStatus(): TokenStatus {
    if (!this.tokens) {
      return {
        hasToken: false,
        isExpired: true,
        expiresAt: null,
        expiresIn: null,
        scopes: [],
        role: null
      };
    }

    const now = Date.now();
    const expiresAtMs = this.tokens.expires_at * 1000;
    const expiresIn = Math.max(0, Math.floor((expiresAtMs - now) / 1000));

    return {
      hasToken: true,
      isExpired: this.isExpired(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      expiresIn,
      scopes: this.tokens.scopes,
      role: this.tokens.role
    };
  }

  clearTokens(): void {
    this.tokens = null;
    if (existsSync(this.tokenPath)) {
      writeFileSync(this.tokenPath, '{}');
    }
  }
}
