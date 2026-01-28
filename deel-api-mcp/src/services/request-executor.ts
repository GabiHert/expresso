import type {
  PostmanRequest,
  PostmanBody,
  PostmanEvent,
  FlattenedRequest
} from '../types/postman.js';
import type { VariableResolver } from './variable-resolver.js';

export interface ExecutionResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  executionTime: number;
}

export interface RequestOverrides {
  variables?: Record<string, string>;
  body?: unknown;
}

export class RequestExecutor {
  constructor(
    private variableResolver: VariableResolver
  ) {}

  async execute(
    flatRequest: FlattenedRequest,
    overrides?: RequestOverrides
  ): Promise<ExecutionResult> {
    const { request, events } = flatRequest;

    if (overrides?.variables) {
      for (const [key, value] of Object.entries(overrides.variables)) {
        this.variableResolver.setVariable(key, value);
      }
    }

    const url = this.buildUrl(request);
    const headers = this.buildHeaders(request);
    const body = this.buildBody(request.body, overrides?.body);

    const startTime = Date.now();

    const fetchOptions: RequestInit = {
      method: request.method,
      headers
    };

    if (body && request.method !== 'GET' && request.method !== 'HEAD') {
      fetchOptions.body = body;
    }

    const response = await fetch(url, fetchOptions);
    const executionTime = Date.now() - startTime;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody: unknown;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        responseBody = await response.json();
      } catch {
        responseBody = await response.text();
      }
    } else {
      responseBody = await response.text();
    }

    if (events) {
      this.runPostScripts(events, responseBody);
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      executionTime
    };
  }

  private buildUrl(request: PostmanRequest): string {
    let url = request.url.raw;

    // First, resolve path variables (:paramName)
    if (request.url.variable) {
      for (const pathVar of request.url.variable) {
        if (!pathVar.disabled) {
          const resolvedValue = this.variableResolver.resolve(pathVar.value);
          url = url.replace(`:${pathVar.key}`, resolvedValue);
        }
      }
    }

    // Then resolve {{variable}} patterns
    url = this.variableResolver.resolve(url);

    // Add query parameters
    if (request.url.query) {
      const enabledParams = request.url.query.filter(q => !q.disabled);
      if (enabledParams.length > 0) {
        const hasQueryString = url.includes('?');
        const params = enabledParams
          .map(q => `${q.key}=${encodeURIComponent(this.variableResolver.resolve(q.value))}`)
          .join('&');

        if (!hasQueryString) {
          url += '?' + params;
        } else if (!url.endsWith('&') && !url.endsWith('?')) {
          url += '&' + params;
        } else {
          url += params;
        }
      }
    }

    return url;
  }

  private buildHeaders(request: PostmanRequest): Record<string, string> {
    const headers: Record<string, string> = {};

    if (request.header) {
      for (const header of request.header) {
        if (!header.disabled) {
          headers[header.key] = this.variableResolver.resolve(header.value);
        }
      }
    }

    if (request.auth?.type === 'bearer' && request.auth.bearer) {
      const tokenItem = request.auth.bearer.find(b => b.key === 'token');
      if (tokenItem) {
        const tokenValue = this.variableResolver.resolve(tokenItem.value);
        headers['Authorization'] = `Bearer ${tokenValue}`;
      }
    }

    return headers;
  }

  private buildBody(body?: PostmanBody, override?: unknown): string | URLSearchParams | undefined {
    if (override !== undefined) {
      return JSON.stringify(override);
    }

    if (!body) {
      return undefined;
    }

    if (body.mode === 'urlencoded' && body.urlencoded) {
      const params = new URLSearchParams();
      for (const item of body.urlencoded) {
        if (!item.disabled) {
          params.append(item.key, this.variableResolver.resolve(item.value));
        }
      }
      return params;
    }

    if (body.mode === 'raw' && body.raw) {
      return this.variableResolver.resolve(body.raw);
    }

    return undefined;
  }

  private runPostScripts(events: PostmanEvent[], responseBody: unknown): void {
    const testEvents = events.filter(e => e.listen === 'test');

    for (const event of testEvents) {
      const script = event.script.exec.join('\n');

      const setGlobalMatch = script.matchAll(/pm\.globals\.set\(\s*["']([^"']+)["']\s*,\s*([^)]+)\)/g);

      for (const match of setGlobalMatch) {
        const varName = match[1];
        const valueExpr = match[2].trim();

        if (valueExpr.includes('jsonData.access_token')) {
          const body = responseBody as Record<string, unknown>;
          if (body?.access_token) {
            this.variableResolver.setVariable(varName, body.access_token as string);
          }
        } else if (valueExpr.includes('jsonData.refresh_token')) {
          const body = responseBody as Record<string, unknown>;
          if (body?.refresh_token) {
            this.variableResolver.setVariable(varName, body.refresh_token as string);
          }
        } else if (valueExpr.includes('jsonData.id')) {
          const body = responseBody as Record<string, unknown>;
          if (body?.id) {
            this.variableResolver.setVariable(varName, body.id as string);
          }
        } else if (valueExpr.includes('content[0].id')) {
          const body = responseBody as { content?: Array<{ id: string }> };
          if (body?.content?.[0]?.id) {
            this.variableResolver.setVariable(varName, body.content[0].id);
          }
        }
      }
    }
  }
}
