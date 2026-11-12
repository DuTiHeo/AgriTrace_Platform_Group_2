const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");
const ACCESS_TOKEN_KEY = "farmer_quicklog_access_token";
const AUTH_EVENT = "auth-changed";
const CACHE_TTL = 15_000;
const cache = new Map<string, { value: unknown; expires: number }>();
const pending = new Map<string, Promise<unknown>>();
let generation = 0;
let activeRequests = 0;
const queue: Array<() => void> = [];

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  authenticated?: boolean;
  cacheTtl?: number;
};

function invalidateCache() {
  generation += 1;
  cache.clear();
  pending.clear();
}
function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}
function clearAccessToken() {
  const hadToken = Boolean(sessionStorage.getItem(ACCESS_TOKEN_KEY));
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  invalidateCache();
  if (hadToken) notifyAuthChange();
}
function errorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object" || !("detail" in payload)) return "Yêu cầu không thành công.";
  const detail = (payload as { detail: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item: { loc?: string[]; msg?: string }) =>
      `${item.loc?.filter((part) => part !== "body").join(".") ?? ""}: ${item.msg ?? "Dữ liệu không hợp lệ"}`,
    ).join("; ");
  }
  return "Dữ liệu không hợp lệ.";
}
async function fetchRequest<T>(path: string, options: RequestOptions, token: string | null): Promise<T> {
  const { body, authenticated = true, headers, cacheTtl: _cacheTtl, ...requestOptions } = options;
  void _cacheTtl;
  if (activeRequests >= 6) await new Promise<void>((resolve) => queue.push(resolve));
  else activeRequests += 1;
  try {
    if (authenticated && token !== sessionStorage.getItem(ACCESS_TOKEN_KEY)) throw new DOMException("Phiên đăng nhập đã thay đổi.", "AbortError");
    const requestHeaders = new Headers(headers);
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    requestHeaders.set("Accept", "application/json");
    if (body !== undefined && !isFormData) requestHeaders.set("Content-Type", "application/json");
    if (authenticated && token) requestHeaders.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions, headers: requestHeaders,
      body: body === undefined ? undefined : isFormData ? body as FormData : JSON.stringify(body),
    });
    if (response.status === 204) {
      if (authenticated && token !== sessionStorage.getItem(ACCESS_TOKEN_KEY)) throw new DOMException("Phiên đăng nhập đã thay đổi.", "AbortError");
      return undefined as T;
    }
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && authenticated && token === sessionStorage.getItem(ACCESS_TOKEN_KEY)) clearAccessToken();
      throw new ApiError(errorMessage(payload), response.status, payload);
    }
    if (authenticated && token !== sessionStorage.getItem(ACCESS_TOKEN_KEY)) throw new DOMException("Phiên đăng nhập đã thay đổi.", "AbortError");
    return payload as T;
  } finally {
    const next = queue.shift();
    if (next) next();
    else activeRequests -= 1;
  }
}
async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const authenticated = options.authenticated !== false;
  const token = authenticated ? sessionStorage.getItem(ACCESS_TOKEN_KEY) : null;
  const isGet = options.method === "GET";
  const ttl = options.cacheTtl ?? CACHE_TTL;
  const cacheable = isGet && ttl > 0 && !options.signal && !options.headers;
  if (!isGet) invalidateCache();
  const key = `${authenticated ? token ?? "anonymous" : "public"}:${path}`;
  const cached = cacheable ? cache.get(key) : undefined;
  if (cached && cached.expires > Date.now()) return structuredClone(cached.value) as T;
  const existing = cacheable ? pending.get(key) : undefined;
  if (existing) return structuredClone(await existing) as T;
  const startedGeneration = generation;
  const promise = fetchRequest<T>(path, options, token);
  if (cacheable) pending.set(key, promise);
  try {
    const result = await promise;
    if (cacheable && generation === startedGeneration) {
      for (const [oldKey, entry] of cache) if (entry.expires <= Date.now()) cache.delete(oldKey);
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(key, { value: result, expires: Date.now() + ttl });
    }
    return structuredClone(result);
  } finally {
    if (pending.get(key) === promise) pending.delete(key);
    if (!isGet) invalidateCache();
  }
}
export function resolveMediaUrl(value: string): string {
  if (value.startsWith("/") && /^https?:\/\//i.test(API_BASE_URL)) return new URL(value, API_BASE_URL).href;
  return value;
}
export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "DELETE" }),
  invalidateCache, notifyAuthChange, clearAccessToken,
  setAccessToken(token: string, notify = true) {
    invalidateCache();
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    if (notify) notifyAuthChange();
  },
  getAccessToken: () => sessionStorage.getItem(ACCESS_TOKEN_KEY),
  hasAccessToken: () => Boolean(sessionStorage.getItem(ACCESS_TOKEN_KEY)),
  subscribeAuth(listener: () => void) {
    window.addEventListener(AUTH_EVENT, listener);
    return () => window.removeEventListener(AUTH_EVENT, listener);
  },
};
