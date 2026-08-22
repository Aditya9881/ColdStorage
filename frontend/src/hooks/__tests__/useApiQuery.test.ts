import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// ── Mocks ──
const mockApi = {
  get: vi.fn(),
  request: vi.fn(),
};

class MockApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

vi.mock('@/lib/api-client', () => ({
  api: mockApi,
  ApiError: MockApiError,
}));

describe('useApiQuery', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function getHook() {
    const mod = await import('@/hooks/useApiQuery');
    return mod.useApiQuery;
  }

  it('fetches data on mount and sets loading/data correctly', async () => {
    const mockData = [{ id: '1', name: 'Test' }];
    mockApi.get.mockResolvedValueOnce({ data: mockData });

    const useApiQuery = await getHook();
    const { result } = renderHook(() => useApiQuery<any[]>('/test-endpoint'));

    // Initially loading
    expect(result.current.loading).toBe(true);

    // After fetch completes
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('sets error state when API call throws ApiError', async () => {
    mockApi.get.mockRejectedValueOnce(new MockApiError(404, 'NOT_FOUND', 'Resource not found'));

    const useApiQuery = await getHook();
    const { result } = renderHook(() => useApiQuery('/missing'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.code).toBe('NOT_FOUND');
    expect(result.current.data).toBeNull();
  });

  it('does not fetch when enabled is false', async () => {
    const useApiQuery = await getHook();
    const { result } = renderHook(() => useApiQuery('/test', { enabled: false }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('does not fetch when endpoint is null', async () => {
    const useApiQuery = await getHook();
    const { result } = renderHook(() => useApiQuery(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).not.toHaveBeenCalled();
  });

  it('refetch re-fetches the data', async () => {
    const data1 = { data: { count: 1 } };
    const data2 = { data: { count: 2 } };
    mockApi.get.mockResolvedValueOnce(data1).mockResolvedValueOnce(data2);

    const useApiQuery = await getHook();
    const { result } = renderHook(() => useApiQuery<any>('/counter'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ count: 1 });

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockApi.get).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual({ count: 2 });
  });

  it('passes query params to api.get', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [] });

    const useApiQuery = await getHook();
    renderHook(() => useApiQuery('/items', { params: { page: '1', limit: '20', status: 'ACTIVE' } }));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith(
        '/items',
        { page: '1', limit: '20', status: 'ACTIVE' }
      );
    });
  });

  it('calls onSuccess callback when fetch succeeds', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { id: '1' } });
    const onSuccess = vi.fn();

    const useApiQuery = await getHook();
    renderHook(() => useApiQuery('/test', { onSuccess }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: '1' }));
  });

  it('calls onError callback when fetch fails', async () => {
    mockApi.get.mockRejectedValueOnce(new MockApiError(500, 'SERVER_ERROR', 'Internal error'));
    const onError = vi.fn();

    const useApiQuery = await getHook();
    renderHook(() => useApiQuery('/fail', { onError }));

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0].code).toBe('SERVER_ERROR');
  });

  it('applies transform function to the result', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [3, 1, 2] });

    const useApiQuery = await getHook();
    const { result } = renderHook(() =>
      useApiQuery<number[]>('/numbers', {
        transform: (data) => [...data].sort(),
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([1, 2, 3]);
  });
});

describe('useApiMutation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function getMutationHook() {
    const mod = await import('@/hooks/useApiQuery');
    return mod.useApiMutation;
  }

  it('mutate sends request and returns data', async () => {
    mockApi.request.mockResolvedValueOnce({ data: { id: '1', status: 'created' } });

    const useApiMutation = await getMutationHook();
    const { result } = renderHook(() => useApiMutation<{ name: string }, any>('/items'));

    expect(result.current.loading).toBe(false);

    let mutateResult: any;
    await act(async () => {
      mutateResult = await result.current.mutate({ name: 'test' });
    });

    expect(mutateResult).toEqual({ id: '1', status: 'created' });
    expect(result.current.loading).toBe(false);
    expect(mockApi.request).toHaveBeenCalledWith('/items', {
      method: 'POST',
      body: { name: 'test' },
    });
  });

  it('sets error state when mutation fails', async () => {
    mockApi.request.mockRejectedValueOnce(new MockApiError(400, 'VALIDATION_ERROR', 'Invalid data'));

    const useApiMutation = await getMutationHook();
    const { result } = renderHook(() => useApiMutation('/items'));

    await act(async () => {
      await result.current.mutate({ bad: 'data' });
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.code).toBe('VALIDATION_ERROR');
  });

  it('calls onSuccess callback', async () => {
    mockApi.request.mockResolvedValueOnce({ data: { id: '1' } });
    const onSuccess = vi.fn();

    const useApiMutation = await getMutationHook();
    const { result } = renderHook(() => useApiMutation('/items', { onSuccess }));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(onSuccess).toHaveBeenCalledWith({ id: '1' });
  });

  it('calls onError callback', async () => {
    mockApi.request.mockRejectedValueOnce(new MockApiError(500, 'ERROR', 'fail'));
    const onError = vi.fn();

    const useApiMutation = await getMutationHook();
    const { result } = renderHook(() => useApiMutation('/items', { onError }));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(onError).toHaveBeenCalled();
  });

  it('uses the specified HTTP method', async () => {
    mockApi.request.mockResolvedValueOnce({ data: {} });

    const useApiMutation = await getMutationHook();
    const { result } = renderHook(() => useApiMutation('/items/1', { method: 'DELETE' }));

    await act(async () => {
      await result.current.mutate();
    });

    expect(mockApi.request).toHaveBeenCalledWith('/items/1', {
      method: 'DELETE',
      body: undefined,
    });
  });

  it('reset clears mutation state', async () => {
    mockApi.request.mockRejectedValueOnce(new MockApiError(400, 'ERROR', 'fail'));

    const useApiMutation = await getMutationHook();
    const { result } = renderHook(() => useApiMutation('/items'));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
