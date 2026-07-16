'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Package, Users, Coins, Clock, ClipboardList, TrendingUp, UserPlus, ShieldCheck } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column, renderStatus } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatCurrency, formatWeight, formatDate, formatPercent } from '@/lib/formatters';
import type { Facility, DashboardOverview, CapacityAnalytics } from '@/types/models';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const router = useRouter();

  const { data: overview, loading: overviewLoading } = useApiQuery<DashboardOverview>('/analytics/overview');
  const { data: capacity } = useApiQuery<CapacityAnalytics>('/analytics/capacity');
  const { data: facilitiesData, loading: facilitiesLoading } = useApiQuery<Facility[]>('/facilities');

  const loading = overviewLoading || facilitiesLoading;
  const facilities = facilitiesData || [];

  const facilityColumns: Column<Facility>[] = [
    {
      key: 'name',
      header: 'Facility',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.name}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            {row.city}, {row.state}
          </div>
        </div>
      ),
    },
    { key: 'owner', header: 'Owner', render: (row) => row.owner?.fullName || '—' },
    {
      key: 'totalCapacityMt',
      header: 'Capacity',
      render: (row) => (
        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          {Number(row.totalCapacityMt).toLocaleString()} MT
        </span>
      ),
    },
    { key: 'storageType', header: 'Type', render: (row) => <Badge variant="muted">{row.storageType}</Badge> },
    { key: 'status', header: 'Status', render: (row) => renderStatus(row.status) },
    {
      key: '_count',
      header: 'Chambers',
      render: (row) => <span style={{ fontFamily: 'var(--font-mono)' }}>{row._count?.chambers ?? 0}</span>,
    },
  ];

  return (
    <>
      <Header
        title="Admin Dashboard"
        subtitle="Platform-wide overview and management"
      />

      <main className={styles.content}>
        {/* KPI Stats Row */}
        <section className={`${styles.statsGrid} stagger-in`}>
          <StatsCard
            title="Total Facilities"
            value={overview?.facilities.total ?? '—'}
            subtitle={`${overview?.facilities.active ?? 0} active`}
            icon={<Factory size={18} />}
            variant="primary"
          />
          <StatsCard
            title="Active Lots"
            value={overview?.inventory.activeLots ?? '—'}
            subtitle={overview ? formatWeight(overview.inventory.totalStoredKg) : '—'}
            icon={<Package size={18} />}
            variant="accent"
          />
          <StatsCard
            title="Registered Users"
            value={overview?.users.total ?? '—'}
            subtitle={`${overview?.users.farmers ?? 0} farmers`}
            icon={<Users size={18} />}
            variant="info"
          />
          <StatsCard
            title="Revenue"
            value={overview ? formatCurrency(overview.financial.totalRevenue) : '—'}
            subtitle={`${overview?.financial.totalInvoices ?? 0} invoices`}
            icon={<Coins size={18} />}
            variant="warning"
          />
        </section>

        {/* Capacity Overview + Pending Actions */}
        <div className={styles.twoColumns}>
          {/* Capacity by State */}
          <Card padding="md">
            <CardHeader
              title="Capacity by State"
              subtitle="Real-time utilization across network"
              action={capacity ? <Badge variant="primary">{capacity.byState.length} states</Badge> : undefined}
            />
            {capacity ? (
              <>
                <div className={styles.capacityList}>
                  {capacity.byState.map((state) => (
                    <div key={state.state} className={styles.capacityItem}>
                      <div className={styles.capacityInfo}>
                        <span className={styles.stateName}>{state.state}</span>
                        <span className={styles.stateDetails}>
                          {state.facilityCount} {state.facilityCount === 1 ? 'facility' : 'facilities'} · {state.totalCapacityMt} MT
                        </span>
                      </div>
                      <div className={styles.capacityBar}>
                        <div className={styles.barTrack}>
                          <div
                            className={styles.barFill}
                            style={{
                              width: `${Math.min(Math.max(state.utilizationRate, 1), 100)}%`,
                              background: state.utilizationRate > 80
                                ? 'var(--color-danger-500)'
                                : state.utilizationRate > 50
                                ? 'var(--color-warning-500)'
                                : 'var(--color-accent-500)',
                            }}
                          />
                        </div>
                        <span className={styles.barLabel}>{formatPercent(state.utilizationRate)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* National Summary */}
                <div className={styles.nationalSummary}>
                  <div className={styles.nationalItem}>
                    <span className={styles.nationalLabel}>National Capacity</span>
                    <span className={styles.nationalValue}>{capacity.national.totalCapacityMt.toLocaleString()} MT</span>
                  </div>
                  <div className={styles.nationalItem}>
                    <span className={styles.nationalLabel}>Utilization</span>
                    <span className={styles.nationalValue}>{formatPercent(capacity.national.utilizationRate)}</span>
                  </div>
                  <div className={styles.nationalItem}>
                    <span className={styles.nationalLabel}>Available</span>
                    <span className={styles.nationalValue}>{capacity.national.availableMt.toLocaleString()} MT</span>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.loadingBlock}>
                <div className="skeleton" style={{ height: 20, width: '60%' }} />
                <div className="skeleton" style={{ height: 14, width: '100%', marginTop: 12 }} />
                <div className="skeleton" style={{ height: 14, width: '80%', marginTop: 8 }} />
              </div>
            )}
          </Card>

          {/* Pending Actions */}
          <Card padding="md">
            <CardHeader
              title="Pending Actions"
              subtitle="Items requiring your attention"
            />
            <div className={styles.actionList}>
              <div className={styles.actionItem}>
                <div className={styles.actionIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning-500)' }}><Clock size={16} /></div>
                <div className={styles.actionContent}>
                  <span className={styles.actionTitle}>Facility Reviews</span>
                  <span className={styles.actionDesc}>{overview?.facilities.pendingReview ?? 0} facilities awaiting approval</span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => router.push('/admin/facilities')}>Review</Button>
              </div>
              <div className={styles.actionItem}>
                <div className={styles.actionIcon} style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--color-danger-400)' }}><ClipboardList size={16} /></div>
                <div className={styles.actionContent}>
                  <span className={styles.actionTitle}>Document Compliance</span>
                  <span className={styles.actionDesc}>Check facility document status</span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => router.push('/admin/verification')}>View</Button>
              </div>
              <div className={styles.actionItem}>
                <div className={styles.actionIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary-400)' }}><TrendingUp size={16} /></div>
                <div className={styles.actionContent}>
                  <span className={styles.actionTitle}>Platform Revenue</span>
                  <span className={styles.actionDesc}>{formatCurrency(overview?.financial.totalRevenue ?? 0)} collected</span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => router.push('/admin/analytics')}>Analytics</Button>
              </div>
              <div className={styles.actionItem}>
                <div className={styles.actionIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-accent-400)' }}><UserPlus size={16} /></div>
                <div className={styles.actionContent}>
                  <span className={styles.actionTitle}>New Users</span>
                  <span className={styles.actionDesc}>{overview?.users.total ?? 0} total registered users</span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => router.push('/admin/users')}>Manage</Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Facilities Table */}
        <Card padding="none">
          <div style={{ padding: 'var(--space-5) var(--space-5) 0' }}>
            <CardHeader
              title="All Facilities"
              subtitle={`${facilities.length} registered facilities`}
              action={
                <Button variant="primary" size="sm" onClick={() => router.push('/admin/facilities')}>
                  View All
                </Button>
              }
            />
          </div>
          <DataTable
            columns={facilityColumns}
            data={facilities.slice(0, 5)}
            loading={loading}
            emptyMessage="No facilities registered yet"
            onRowClick={(row) => router.push(`/admin/facilities/${row.id}`)}
          />
        </Card>
      </main>
    </>
  );
}
