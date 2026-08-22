import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── ApiError class ─────────────────────────────

describe('ApiError', () => {
  it('creates an error with status, code, and message', async () => {
    const { ApiError } = await import('@/lib/api-client');
    const err = new ApiError(404, 'NOT_FOUND', 'Resource not found');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
    expect(err.details).toBeUndefined();
  });

  it('includes optional details', async () => {
    const { ApiError } = await import('@/lib/api-client');
    const details = { field: 'phone', reason: 'required' };
    const err = new ApiError(422, 'VALIDATION_ERROR', 'Invalid input', details);
    expect(err.details).toEqual(details);
  });
});

// ─── ApiClient ─────────────────────────────

describe('ApiClient', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws ApiError on non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({
        error: { code: 'VALIDATION', message: 'Invalid data' },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { api } = await import('@/lib/api-client');

    try {
      await api.get('/test');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(422);
      expect(err.code).toBe('VALIDATION');
    }
  });

  it('includes credentials in requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { api } = await import('@/lib/api-client');
    await api.get('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('sends JSON body on POST', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { api } = await import('@/lib/api-client');
    await api.post('/test', { name: 'potato' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'potato' }),
      }),
    );
  });

  it('sets Content-Type to application/json', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { api } = await import('@/lib/api-client');
    await api.get('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('attempts refresh on 401 for non-auth endpoints', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (url.includes('/auth/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        });
      }
      // First call returns 401, retry returns 200
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: { code: 'UNAUTHORIZED' } }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: { id: 1 } }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { api } = await import('@/lib/api-client');
    const result = await api.get('/facilities');

    expect(result).toEqual({ success: true, data: { id: 1 } });
    // Should have called: original, refresh, retry
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('does NOT attempt refresh for /users/me', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { code: 'UNAUTHORIZED', message: 'Not auth' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { api } = await import('@/lib/api-client');

    try {
      await api.get('/users/me');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    }

    // Only 1 call — no refresh attempt
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
