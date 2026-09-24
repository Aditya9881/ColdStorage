/**
 * useApiQuery — React hook for data fetching in the mobile app.
 *
 * Provides a consistent interface for GET requests with:
 * - Loading state management
 * - Error handling with ApiError
 * - Pull-to-refresh support (via refetch)
 * - Automatic refetch on endpoint/params change
 * - Optional polling interval
 * - Conditional fetching (enabled flag)
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApiQuery<Facility[]>('/facilities');
 *   const { data } = useApiQuery<User>('/users/me', { enabled: !!token });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiError } from '@/lib/api-client';

interface UseApiQueryOptions<T> {
  /** Only fetch when true (default: true) */
  enabled?: boolean;
  /** Called on success */
  onSuccess?: (data: T) => void;
  /** Called on error */
  onError?: (error: ApiError) => void;
  /** Polling interval in ms (0 = disabled) */
  refetchInterval?: number;
  /** Transform the API response before setting data */
  transform?: (data: T) => T;
}

interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  /** Convenience: true when loading for the first time (data is still null) */
  isInitialLoading: boolean;
}

export function useApiQuery<T>(
  endpoint: string | null,
  options: UseApiQueryOptions<T> = {},
): UseApiQueryResult<T> {
  const {
    enabled = true,
    onSuccess,
    onError,
    refetchInterval = 0,
    transform,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const mountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!endpoint || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.get<T>(endpoint);
      if (!mountedRef.current) return;

      const result = (res as any)?.data ?? res;
      const finalData = transform ? transform(result) : result;
      setData(finalData);
      hasFetchedRef.current = true;
      onSuccess?.(finalData);
    } catch (err) {
      if (!mountedRef.current) return;
      const apiError = err instanceof ApiError
        ? err
        : new ApiError(String(err), 'UNKNOWN', 0);
      setError(apiError);
      onError?.(apiError);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  // Optional polling
  useEffect(() => {
    if (refetchInterval <= 0 || !enabled) return;
    const interval = setInterval(fetchData, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchData, refetchInterval, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isInitialLoading: loading && !hasFetchedRef.current,
  };
}

// ── Mutation Hook ──

interface UseApiMutationOptions<TOutput> {
  method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  onSuccess?: (data: TOutput) => void;
  onError?: (error: ApiError) => void;
  /** If true, mutations will be queued when offline */
  offlineQueue?: boolean;
}

interface UseApiMutationResult<TInput, TOutput> {
  mutate: (input?: TInput) => Promise<TOutput | null>;
  loading: boolean;
  error: ApiError | null;
  data: TOutput | null;
  reset: () => void;
}

export function useApiMutation<TInput = unknown, TOutput = unknown>(
  endpoint: string,
  options: UseApiMutationOptions<TOutput> = {},
): UseApiMutationResult<TInput, TOutput> {
  const { method = 'POST', onSuccess, onError, offlineQueue = false } = options;

  const [data, setData] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = useCallback(async (input?: TInput): Promise<TOutput | null> => {
    setLoading(true);
    setError(null);

    try {
      const apiMethod = method === 'POST' ? api.post
        : method === 'PATCH' ? api.patch
        : method === 'PUT' ? api.put
        : api.delete;

      const res = await apiMethod<TOutput>(endpoint, input as any, { offlineQueue });
      const result = (res as any)?.data ?? res;
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const apiError = err instanceof ApiError
        ? err
        : new ApiError(String(err), 'UNKNOWN', 0);
      setError(apiError);
      onError?.(apiError);
      return null;
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, method, offlineQueue]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { mutate, loading, error, data, reset };
}
