'use client';

import React, { useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { useApiQuery } from '@/hooks/useApiQuery';
import styles from './audit.module.css';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description?: string;
  oldValues?: any;
  newValues?: any;
  createdAt: string;
  user?: { id: string; fullName: string; role: string };
}

interface AuditResponse {
  data: AuditLog[];
  pagination?: { totalPages: number };
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const queryParams: Record<string, string> = { page: String(page), limit: '20' };
  if (actionFilter) queryParams.action = actionFilter;
  if (entityFilter) queryParams.entityType = entityFilter;

  const { data: logs, loading } = useApiQuery<AuditLog[]>('/audit/logs', {
    params: queryParams,
    onSuccess: (_data) => {
      // totalPages is handled via the raw response; for now keep at 1
    },
  });
  const logList = logs || [];

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getActionClass = (action: string) => {
    if (action === 'CREATE') return styles.logActionCreate;
    if (action === 'UPDATE') return styles.logActionUpdate;
    if (action === 'DELETE') return styles.logActionDelete;
    return '';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <>
      <Header
        title="Audit Trail"
        subtitle="Track all system actions and changes"
      />

      <main className={styles.content}>
        <Card padding="md">
          <CardHeader title="Activity Log" subtitle="All recorded actions across the platform" />

          {/* Filters */}
          <div className={styles.filters}>
            <Select
              label="Action"
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'All Actions' },
                { value: 'CREATE', label: 'Create' },
                { value: 'UPDATE', label: 'Update' },
                { value: 'DELETE', label: 'Delete' },
              ]}
            />
            <Select
              label="Entity"
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'All Entities' },
                { value: 'FACILITY', label: 'Facility' },
                { value: 'CHAMBER', label: 'Chamber' },
                { value: 'INVENTORY_LOT', label: 'Inventory Lot' },
                { value: 'INVOICE', label: 'Invoice' },
                { value: 'USER', label: 'User' },
                { value: 'PRICING', label: 'Pricing' },
              ]}
            />
          </div>

          {/* Log List */}
          {logList.length > 0 ? (
            <div className={styles.logList}>
              {logList.map((log) => (
                <div key={log.id} className={styles.logItem}>
                  <div className={styles.logAvatar}>
                    {log.user ? getInitials(log.user.fullName) : '?'}
                  </div>
                  <div className={styles.logBody}>
                    <div className={styles.logHeader}>
                      <span className={styles.logUser}>{log.user?.fullName || 'System'}</span>
                      <span className={`${styles.logAction} ${getActionClass(log.action)}`}>
                        {log.action}
                      </span>
                    </div>
                    <div className={styles.logDescription}>
                      {log.description || `${log.action} on ${log.entityType} (${log.entityId.substring(0, 8)}…)`}
                    </div>
                  </div>
                  <span className={styles.logTime}>{formatTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <FileText size={32} />
              <p>{loading ? 'Loading audit logs...' : 'No audit logs found'}</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled>
                Page {page} of {totalPages}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
