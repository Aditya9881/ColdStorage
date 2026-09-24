/**
 * ColdStorage Mobile — Offline Queue
 *
 * Persists failed write operations (POST/PATCH/PUT/DELETE) to AsyncStorage
 * and replays them when connectivity returns. Each mutation carries a
 * client-generated idempotency key so the server can deduplicate retries.
 *
 * Queue entries are stored as JSON in AsyncStorage under `offline_queue`.
 */
import { storage } from './storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const QUEUE_KEY = 'offline_queue';

export interface QueuedMutation {
  id: string;                // Client-generated UUID (also used as idempotency key)
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  endpoint: string;
  body?: any;
  createdAt: string;         // ISO timestamp
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'failed';
}

/**
 * Generate a unique idempotency key for a write operation.
 */
export function generateIdempotencyKey(): string {
  return uuidv4();
}

/**
 * Get all queued mutations.
 */
export async function getQueue(): Promise<QueuedMutation[]> {
  try {
    const raw = await storage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    return [];
  }
}

/**
 * Add a failed mutation to the offline queue.
 */
export async function enqueue(mutation: Omit<QueuedMutation, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<QueuedMutation> {
  const queue = await getQueue();
  const entry: QueuedMutation = {
    ...mutation,
    id: generateIdempotencyKey(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  };
  queue.push(entry);
  await storage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return entry;
}

/**
 * Remove a successfully synced mutation from the queue.
 */
export async function dequeue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((m) => m.id !== id);
  await storage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

/**
 * Update a mutation's status/retry count after a sync attempt.
 */
export async function updateQueueEntry(id: string, update: Partial<QueuedMutation>): Promise<void> {
  const queue = await getQueue();
  const idx = queue.findIndex((m) => m.id === id);
  if (idx !== -1) {
    queue[idx] = { ...queue[idx], ...update };
    await storage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

/**
 * Get the count of pending mutations.
 */
export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.filter((m) => m.status !== 'syncing').length;
}

/**
 * Clear all mutations (for logout/reset).
 */
export async function clearQueue(): Promise<void> {
  await storage.deleteItem(QUEUE_KEY);
}

/**
 * Get the timestamp of the last successful sync.
 */
export async function getLastSyncTime(): Promise<string | null> {
  return storage.getItem('last_sync_time');
}

/**
 * Record a successful sync timestamp.
 */
export async function setLastSyncTime(): Promise<void> {
  await storage.setItem('last_sync_time', new Date().toISOString());
}
