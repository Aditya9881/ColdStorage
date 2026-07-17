/**
 * API Client — ColdStorage Frontend
 *
 * Uses httpOnly cookies for authentication (set by the backend).
 * No tokens are stored in localStorage.
 * All requests include `credentials: 'include'` so cookies are sent.
 *
 * C10: Refresh mutex prevents multiple concurrent refresh requests.
 */

let API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
if (API_BASE && !API_BASE.endsWith('/api/v1')) {
  API_BASE = API_BASE.replace(/\/+$/, '') + '/api/v1';
}


interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null; // C10: mutex

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  /**
   * Core request method — all API calls go through here.
   * Cookies are sent automatically via `credentials: 'include'`.
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, params } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const url = this.buildUrl(endpoint, params);

    let response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Send httpOnly cookies
    });

    // Handle token refresh on 401
    if (response.status === 401) {
      // Don't attempt refresh for auth endpoints — they should fail silently
      const isAuthEndpoint = endpoint === '/users/me' || endpoint.startsWith('/auth/');
      
      if (!isAuthEndpoint) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request (cookie is now refreshed)
          response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : undefined,
            credentials: 'include',
          });
        } else {
          // Only redirect if NOT already on the landing/auth page (prevents infinite loop)
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.search.includes('auth=login') && window.location.pathname !== '/') {
            window.location.href = '/?auth=login';
          }
          throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired — please log in again');
        }
      } else {
        // Auth endpoints (like /users/me) — just throw, don't redirect
        const data = await response.json().catch(() => ({}));
        throw new ApiError(401, data.error?.code || 'UNAUTHORIZED', data.error?.message || 'Not authenticated');
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.error?.code || 'UNKNOWN_ERROR',
        data.error?.message || 'An unexpected error occurred',
        data.error?.details
      );
    }

    return data;
  }

  /**
   * C10: Refresh token with mutex.
   * Only ONE refresh request fires at a time. All concurrent 401s
   * wait on the same promise.
   */
  private async refreshToken(): Promise<boolean> {
    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._doRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _doRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Send refresh token cookie
        body: JSON.stringify({}), // Empty body — token is in cookie
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data.success === true;
    } catch {
      return false;
    }
  }

  // Convenience methods
  get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Upload FormData (multipart/form-data) — for file uploads
   * Does NOT set Content-Type (browser sets multipart boundary automatically)
   */
  async uploadFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = this.buildUrl(endpoint);
    let response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    // Handle token refresh on 401
    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        response = await fetch(url, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
      } else {
        if (typeof window !== 'undefined' && window.location.pathname !== '/' && !window.location.search.includes('auth=login')) {
          window.location.href = '/?auth=login';
        }
        throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired — please log in again');
      }
    }

    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.error?.code || 'UNKNOWN_ERROR',
        data.error?.message || 'An unexpected error occurred',
        data.error?.details
      );
    }
    return data;
  }

  /**
   * Download a file as blob (for secure exports without token in URL)
   */
  async downloadBlob(endpoint: string, filename: string): Promise<void> {
    const url = this.buildUrl(endpoint);
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }

  // Auth helpers
  login(phone: string, password: string) {
    return this.post<{
      success: boolean;
      data: { user: import('@/types/models').User };
    }>('/auth/login', { phone, password });
  }

  register(data: { fullName: string; phone: string; email?: string; password: string; role: string }) {
    return this.post<{
      success: boolean;
      data: { user: import('@/types/models').User }
        | { pending: true; message: string; userId: string };
    }>('/auth/register', data);
  }

  /**
   * Register owner with KYC documents via multipart upload
   */
  registerOwner(formData: FormData) {
    return this.uploadFormData<{
      success: boolean;
      data: { pending: true; message: string; userId: string };
    }>('/auth/register', formData);
  }

  logout() {
    return this.post('/auth/logout', {});
  }

  getProfile() {
    return this.get<{ success: boolean; data: import('@/types/models').User }>('/auth/me');
  }
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const api = new ApiClient(API_BASE);
