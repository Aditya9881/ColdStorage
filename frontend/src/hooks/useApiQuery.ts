'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiError } from '@/lib/api-client';
import type { ApiResponse } from '@/types/models';

// ──────────────────────────────────────────────
// useApiQuery — Lightweight Data Fetching Hook
// ──────────────────────────────────────────────
// Eliminates the useState/useEffect/try-catch boilerplate
// that's repeated across every page component.
//
// Usage:
//   const { data, loading, error, refetch } = useApiQuery<Facility[]>('/facilities');
//   const { data } = useApiQuery<User>('/users/me', { enabled: !!token });

interface UseApiQueryOptions<T> {
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined>;
  /** Only fetch when true (default: true) */
  enabled?: boolean;
  /** Transform the response data */
  transform?: (data: T) => T;
  /** Called on success */
  onSuccess?: (data: T) => void;
  /** Called on error */
  onError?: (error: ApiError) => void;
  /** Refetch interval in ms (0 = disabled) */
  refetchInterval?: number;
}

interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export function useApiQuery<T>(
  endpoint: string | null,
  options: UseApiQueryOptions<T> = {},
): UseApiQueryResult<T> {
  const {
    params,
    enabled = true,
    transform,
    onSuccess,
    onError,
    refetchInterval = 0,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!endpoint || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.get<ApiResponse<T>>(endpoint, params);
      if (!mountedRef.current) return;

      const result = (res as any).data ?? res;
      const transformed = transform ? transform(result) : result;
      setData(transformed);
      onSuccess?.(transformed);
    } catch (err) {
      if (!mountedRef.current) return;
      const apiError = err instanceof ApiError
        ? err
        : new ApiError(500, 'UNKNOWN', String(err));
      setError(apiError);
      onError?.(apiError);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, enabled, JSON.stringify(params)]);

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

  return { data, loading, error, refetch: fetchData };
}

// ──────────────────────────────────────────────
// useApiMutation — For POST/PATCH/DELETE
// ──────────────────────────────────────────────

interface UseApiMutationOptions<TInput, TOutput> {
  method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  onSuccess?: (data: TOutput) => void;
  onError?: (error: ApiError) => void;
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
  options: UseApiMutationOptions<TInput, TOutput> = {},
): UseApiMutationResult<TInput, TOutput> {
  const { method = 'POST', onSuccess, onError } = options;

  const [data, setData] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = useCallback(async (input?: TInput): Promise<TOutput | null> => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.request<ApiResponse<TOutput>>(endpoint, {
        method,
        body: input,
      });
      const result = (res as any).data ?? res;
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const apiError = err instanceof ApiError
        ? err
        : new ApiError(500, 'UNKNOWN', String(err));
      setError(apiError);
      onError?.(apiError);
      return null;
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, method]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { mutate, loading, error, data, reset };
}
