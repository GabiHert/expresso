interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    cursor: string | number | null;
    isLastPage: boolean;
    limit?: string | number;
  };
}

export class GigerClient {
  private baseUrl: string;
  private cookie: string;

  constructor() {
    this.baseUrl = process.env.GIGER_BASE_URL || 'https://giger.giger.deel';
    const sessionCookie = process.env.GIGER_SESSION_COOKIE;
    if (!sessionCookie) {
      throw new Error('GIGER_SESSION_COOKIE environment variable is required');
    }
    this.cookie = `giger.sid=${sessionCookie}`;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params } = options;

    const prefix = path.startsWith('/admin/') ? '' : '/admin/api/v1';
    let url = `${this.baseUrl}${prefix}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cookie': this.cookie,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Giger API error ${response.status}: ${text}`);
    }

    const text = await response.text();
    if (!text) {
      return { status: response.status, message: 'Success (no body)' } as T;
    }
    return JSON.parse(text) as T;
  }

  async paginated<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<PaginatedResponse<T>> {
    return this.request<PaginatedResponse<T>>(path, { params });
  }
}
