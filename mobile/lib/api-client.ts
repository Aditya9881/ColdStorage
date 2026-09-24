/**
 * ColdStorage Mobile API Client
 * Reusable API client with offline queue and idempotency support
 */
import { Platform } from 'react-native';
import { storage } from './storage';
import { enqueue, generateIdempotencyKey } from './offline-queue';

// ── API Base URL ──
// Default: deployed Render backend (works for both Expo Go dev and production builds)
// Override: set EXPO_PUBLIC_API_URL in .env for local backend development
//   e.g. EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1
const CUSTOM_BASE = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE = CUSTOM_BASE || 'https://coldstorage-4lql.onrender.com/api/v1';

const TOKEN_KEY = 'auth_access_token';
const REFRESH_KEY = 'auth_refresh_token';

async function getToken(): Promise<string | null> {
  return await storage.getItem(TOKEN_KEY);
}

export async function setTokens(access: string, refresh: string) {
  await storage.setItem(TOKEN_KEY, access);
  await storage.setItem(REFRESH_KEY, refresh);
}

export async function clearTokens() {
  await storage.deleteItem(TOKEN_KEY);
  await storage.deleteItem(REFRESH_KEY);
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ApiError';
  }
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: { code: string; message: string };
  meta?: Record<string, any>;
}

/**
 * Options for write requests that support offline queuing.
 */
interface RequestOptions {
  /** If true, queue the mutation locally when offline instead of throwing */
  offlineQueue?: boolean;
  /** Custom idempotency key (auto-generated if not provided) */
  idempotencyKey?: string;
}

// ── CSRF Token Cache ──
// Backend requires CSRF token for unauthenticated mutating requests.
// We fetch once and cache in memory (tokens valid for 4h, we refresh at 3.5h).
let _csrfToken: string | null = null;
let _csrfFetchedAt = 0;
const CSRF_TTL = 3.5 * 60 * 60 * 1000; // 3.5 hours

async function getCsrfToken(): Promise<string | null> {
  if (_csrfToken && Date.now() - _csrfFetchedAt < CSRF_TTL) {
    return _csrfToken;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/csrf-token`);
    const json = await res.json();
    if (json.success && json.data?.csrfToken) {
      _csrfToken = json.data.csrfToken;
      _csrfFetchedAt = Date.now();
      return _csrfToken;
    }
  } catch {
    // Fail silently — CSRF may not be enforced in dev
  }
  return null;
}
async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  endpoint: string,
  body?: any,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Add idempotency key for write operations
  if (method !== 'GET' && method !== 'DELETE') {
    const idempotencyKey = options?.idempotencyKey || generateIdempotencyKey();
    headers['Idempotency-Key'] = idempotencyKey;
  }

  // For unauthenticated mutating requests, add CSRF token
  if (!token && method !== 'GET') {
    try {
      const csrfToken = await getCsrfToken();
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    } catch {
      // Continue without CSRF — backend may not require it in dev
    }
  }

  const config: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // Try token refresh on 401
      if (response.status === 401 && endpoint !== '/auth/refresh') {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return request<T>(method, endpoint, body, options);
        }
      }
      throw new ApiError(
        data.error?.message || 'Request failed',
        data.error?.code || 'UNKNOWN',
        response.status,
      );
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    // ── Offline Queue Logic ──
    // If the request is a write operation and offline queuing is enabled,
    // persist the mutation locally for later replay.
    if (options?.offlineQueue && method !== 'GET') {
      const queued = await enqueue({
        method: method as 'POST' | 'PATCH' | 'PUT' | 'DELETE',
        endpoint,
        body,
      });
      // Return a synthetic "queued" response so the UI can show optimistic feedback
      return {
        success: true,
        data: {
          _queued: true,
          _queueId: queued.id,
          _message: 'Saved offline — will sync when connected',
        } as any,
      };
    }

    throw new ApiError('Network error — check your connection', 'NETWORK_ERROR', 0);
  }
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const refresh = await storage.getItem(REFRESH_KEY);
    if (!refresh) return false;

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (data.success && data.data?.accessToken) {
      await setTokens(data.data.accessToken, data.data.refreshToken || refresh);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>('GET', endpoint),
  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>('POST', endpoint, body, options),
  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>('PATCH', endpoint, body, options),
  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>('PUT', endpoint, body, options),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>('DELETE', endpoint, undefined, options),
};

export type { ApiResponse, RequestOptions };
