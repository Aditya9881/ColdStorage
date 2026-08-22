'use client';

import React from 'react';
import { Plus, Edit, Trash2, RefreshCw, Activity } from 'lucide-react';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatRelativeTime } from '@/lib/formatters';
import styles from './AuditTimeline.module.css';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
}

interface AuditTimelineProps {
  /** The entity type to filter by (e.g. 'inventoryLot', 'invoice', 'booking') */
  entityType: string;
  /** The entity ID to filter by */
  entityId: string;
  /** Maximum entries to show (default: 10) */
  limit?: number;
}

function getActionType(action: string): 'create' | 'update' | 'delete' | 'status' | 'default' {
  if (action.includes('create') || action.includes('intake')) return 'create';
  if (action.includes('delete') || action.includes('remove')) return 'delete';
  if (action.includes('status') || action.includes('confirm') || action.includes('reject')) return 'status';
  if (action.includes('update') || action.includes('edit') || action.includes('release') || action.includes('transfer')) return 'update';
  return 'default';
}

function getActionIcon(type: string) {
  const size = 12;
  switch (type) {
    case 'create': return <Plus size={size} />;
    case 'update': return <Edit size={size} />;
    case 'delete': return <Trash2 size={size} />;
    case 'status': return <RefreshCw size={size} />;
    default: return <Activity size={size} />;
  }
}

function formatAction(action: string): string {
  return action
    .replace(/\./g, ' → ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderChanges(oldValues?: Record<string, unknown> | null, newValues?: Record<string, unknown> | null) {
  if (!oldValues && !newValues) return null;

  const allKeys = new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {}),
  ]);

  if (allKeys.size === 0) return null;

  const changedKeys = [...allKeys].filter((key) => {
    const oldVal = (oldValues || {})[key];
    const newVal = (newValues || {})[key];
    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
  });

  if (changedKeys.length === 0) return null;

  return (
    <div className={styles.changes}>
      {changedKeys.slice(0, 5).map((key) => (
        <div key={key} className={styles.changeRow}>
          <span className={styles.changeField}>{key}:</span>
          {(oldValues || {})[key] !== undefined && (
            <span className={styles.oldVal}>{String((oldValues || {})[key])}</span>
          )}
          {(newValues || {})[key] !== undefined && (
            <span className={styles.newVal}>{String((newValues || {})[key])}</span>
          )}
        </div>
      ))}
      {changedKeys.length > 5 && (
        <div className={styles.changeRow}>
          <span className={styles.changeField}>…and {changedKeys.length - 5} more</span>
        </div>
      )}
    </div>
  );
}

/**
 * AuditTimeline — Displays a vertical timeline of audit log entries
 * for a specific entity. Fetches from `/audit/logs` with entity filters.
 *
 * Usage:
 *   <AuditTimeline entityType="inventoryLot" entityId={lot.id} />
 */
export function AuditTimeline({ entityType, entityId, limit = 10 }: AuditTimelineProps) {
  const { data, loading } = useApiQuery<AuditEntry[]>(
    `/audit/logs`,
    {
      params: {
        entityType,
        entityId,
        limit,
      },
      transform: (raw: any) => {
        // The API returns { data: [...], pagination: {...} } or just [...]
        if (Array.isArray(raw)) return raw;
        if (raw?.logs) return raw.logs;
        if (Array.isArray(raw?.data)) return raw.data;
        return raw;
      },
    },
  );

  if (loading) {
    return (
      <div className={styles.emptyState}>
        Loading activity…
      </div>
    );
  }

  const entries = Array.isArray(data) ? data : [];

  if (entries.length === 0) {
    return (
      <div className={styles.emptyState}>
        No activity recorded for this item yet.
      </div>
    );
  }

  return (
    <div className={styles.timeline}>
      {entries.map((entry) => {
        const actionType = getActionType(entry.action);
        return (
          <div key={entry.id} className={styles.entry}>
            <div className={`${styles.dot} ${styles[actionType]}`}>
              {getActionIcon(actionType)}
            </div>
            <div className={styles.content}>
              <div className={styles.action}>
                {entry.user && (
                  <span className={styles.actor}>{entry.user.fullName}</span>
                )}{' '}
                {formatAction(entry.action)}
              </div>
              <div className={styles.meta}>
                {formatRelativeTime(entry.createdAt)}
                {entry.user?.role && ` · ${entry.user.role}`}
              </div>
              {renderChanges(entry.oldValues, entry.newValues)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
