const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const ACCESS_TOKEN_KEY = "helpdesk.accessToken";
const REFRESH_TOKEN_KEY = "helpdesk.refreshToken";

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  setAccessToken: (accessToken: string) => localStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        tokenStorage.setAccessToken(data.accessToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  skipAuthRetry?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, query, signal } = options;
  const headers: Record<string, string> = {};
  const accessToken = tokenStorage.getAccessToken();
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined && !formData) headers["Content-Type"] = "application/json";

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    signal,
  });

  if (response.status === 401 && !options.skipAuthRetry && accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipAuthRetry: true });
    }
    tokenStorage.clear();
    window.dispatchEvent(new CustomEvent("helpdesk:unauthorized"));
    throw new ApiError(401, "Your session has expired. Please log in again.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const message = (isJson && payload && (payload as { error?: string }).error) || "Something went wrong. Please try again.";
    throw new ApiError(response.status, message, isJson ? (payload as { details?: unknown }).details : undefined);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "GET", query, signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  postForm: <T>(path: string, formData: FormData) => apiRequest<T>(path, { method: "POST", formData }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};

export { API_BASE_URL };
