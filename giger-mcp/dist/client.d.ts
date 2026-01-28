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
export declare class GigerClient {
    private baseUrl;
    private cookie;
    constructor();
    request<T>(path: string, options?: RequestOptions): Promise<T>;
    paginated<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<PaginatedResponse<T>>;
}
export {};
