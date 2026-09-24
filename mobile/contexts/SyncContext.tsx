/**
 * ColdStorage Mobile — Sync Context
 *
 * Provides app-wide connectivity awareness and offline queue management.
 * Listens for network state changes and automatically flushes the
 * offline mutation queue when connectivity is restored.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import {
  getQueue,
  dequeue,
  updateQueueEntry,
  getPendingCount,
  getLastSyncTime,
  setLastSyncTime,
  QueuedMutation,
} from '@/lib/offline-queue';
import { api } from '@/lib/api-client';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  connectionType: string | null;
}

interface SyncContextType extends SyncState {
  /** Force a sync attempt now */
  syncNow: () => Promise<void>;
  /** Refresh the pending count from storage */
  refreshPendingCount: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const MAX_RETRIES = 5;
const RETRY_DELAY_BASE_MS = 2000; // Exponential backoff starting at 2s

export function SyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    connectionType: null,
  });

  const isSyncingRef = useRef(false);

  // ── Initialize ──
  useEffect(() => {
    (async () => {
      const lastSync = await getLastSyncTime();
      const count = await getPendingCount();
      setState((prev) => ({ ...prev, lastSyncTime: lastSync, pendingCount: count }));
    })();
  }, []);

  // ── Network Listener ──
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      const online = netState.isConnected === true && netState.isInternetReachable !== false;
      const connectionType = netState.type || null;

      setState((prev) => {
        // If transitioning from offline → online, trigger sync
        if (!prev.isOnline && online) {
          flushQueue();
        }
        return { ...prev, isOnline: online, connectionType };
      });
    });

    return () => unsubscribe();
  }, []);

  // ── Queue Flush Logic ──
  const flushQueue = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setState((prev) => ({ ...prev, isSyncing: true }));

    try {
      const queue = await getQueue();
      const pending = queue.filter((m) => m.status !== 'syncing');

      let successCount = 0;

      for (const mutation of pending) {
        try {
          // Mark as syncing
          await updateQueueEntry(mutation.id, { status: 'syncing' });

          // Replay the mutation with idempotency key
          const method = mutation.method.toLowerCase() as 'post' | 'patch' | 'put' | 'delete';

          if (method === 'delete') {
            await api.delete(mutation.endpoint);
          } else {
            await (api as any)[method](mutation.endpoint, mutation.body);
          }

          // Success — remove from queue
          await dequeue(mutation.id);
          successCount++;
        } catch (err: any) {
          const retryCount = mutation.retryCount + 1;

          if (retryCount >= MAX_RETRIES) {
            // Permanently failed
            await updateQueueEntry(mutation.id, {
              status: 'failed',
              retryCount,
              lastError: err?.message || 'Unknown error',
            });
          } else {
            // Will retry later
            await updateQueueEntry(mutation.id, {
              status: 'pending',
              retryCount,
              lastError: err?.message || 'Unknown error',
            });
          }
        }
      }

      if (successCount > 0) {
        await setLastSyncTime();
      }

      const newCount = await getPendingCount();
      const lastSync = await getLastSyncTime();

      setState((prev) => ({
        ...prev,
        isSyncing: false,
        pendingCount: newCount,
        lastSyncTime: lastSync,
      }));
    } catch {
      setState((prev) => ({ ...prev, isSyncing: false }));
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (state.isOnline) {
      await flushQueue();
    }
  }, [state.isOnline, flushQueue]);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setState((prev) => ({ ...prev, pendingCount: count }));
  }, []);

  return (
    <SyncContext.Provider value={{ ...state, syncNow, refreshPendingCount }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextType {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
