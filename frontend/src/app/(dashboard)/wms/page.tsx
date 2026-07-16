'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, Column, renderStatus } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';
import { Plus, Snowflake, BarChart3, Package, Sprout, Download, Receipt, FileDown, Clock, CalendarCheck, CheckCircle, XCircle, User } from 'lucide-react';
import { useApiQuery } from '@/hooks/useApiQuery';
import { api, ApiError } from '@/lib/api-client';
import { formatWeight, formatCurrency, formatDate, formatPercent, getCommodityLabel } from '@/lib/formatters';
import type { InventoryLot, Chamber } from '@/types/models';
import styles from './wms-dashboard.module.css';

interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  commodityCategory: string;
  commodityName: string;
  estimatedWeightKg: number;
  estimatedBags?: number;
  preferredDate: string;
  preferredSlot?: string;
  createdAt: string;
  farmer: { id: string; fullName: string; phone: string; uniqueId?: string };
  facility: { id: string; name: string };
}

export default function WMSDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: lots, loading: lotsLoading } = useApiQuery<InventoryLot[]>('/inventory/lots');
  const { data: chambers, loading: chambersLoading } = useApiQuery<Chamber[]>('/chambers');
  const { data: bookingsData, loading: bookingsLoading, refetch: refetchBookings } = useApiQuery<{ bookings: Booking[] }>('/bookings/facility/mine?status=PENDING');

  const loading = lotsLoading || chambersLoading;
  const lotList = lots || [];
  const chamberList = chambers || [];
  const pendingBookings = bookingsData?.bookings || [];

  const totalCapacity = chamberList.reduce((s, c) => s + Number(c.capacityMt || 0), 0);
  const totalOccupied = chamberList.reduce((s, c) => s + Number(c.occupiedMt || 0), 0);
  const utilization = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;
  const activeLots = lotList.filter((l) => l.status === 'STORED' || l.status === 'PARTIALLY_RELEASED').length;
  const totalStored = lotList.reduce((s, l) => s + Number(l.currentWeightKg || 0), 0);

  const handleBookingAction = async (bookingId: string, status: 'CONFIRMED' | 'REJECTED') => {
    setActionLoading(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      showToast(`Booking ${status.toLowerCase()}`, 'success');
      refetchBookings();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const lotColumns: Column<InventoryLot>[] = [
    {
      key: 'lotNumber',
      header: 'Lot #',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
          {row.lotNumber}
        </span>
      ),
    },
    {
      key: 'commodity',
      header: 'Commodity',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{getCommodityLabel(row.commodityCategory)}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{row.commodityName}</div>
        </div>
      ),
    },
    {
      key: 'depositor',
      header: 'Depositor',
      render: (row) => row.depositor?.fullName || '—',
    },
    {
      key: 'currentWeightKg',
      header: 'Weight',
      render: (row) => (
        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          {formatWeight(row.currentWeightKg)}
        </span>
      ),
    },
    {
      key: 'qualityGrade',
      header: 'Grade',
      render: (row) => {
        const v = row.qualityGrade === 'A' ? 'accent' : row.qualityGrade === 'B' ? 'warning' : 'danger';
        return row.qualityGrade ? <Badge variant={v as any}>Grade {row.qualityGrade}</Badge> : <span>—</span>;
      },
    },
    { key: 'status', header: 'Status', render: (row) => renderStatus(row.status) },
    {
      key: 'intakeDate',
      header: 'Intake',
      render: (row) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{formatDate(row.intakeDate)}</span>,
    },
  ];

  return (
    <>
      <Header
        title="WMS Dashboard"
        subtitle="Warehouse Management System — Facility Operations"
        actions={
          <div className={styles.headerActions}>
            <Button variant="secondary" size="sm" icon={<FileDown size={14} />} onClick={() => {
              api.downloadBlob('/reports/inventory/csv', `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`);
            }}>
              Export
            </Button>
            <Button variant="accent" size="sm" icon={<Plus size={14} />} onClick={() => router.push('/wms/inventory/intake')}>
              New Intake
            </Button>
          </div>
        }
      />

      <main className={styles.content}>
        {/* KPI Row */}
        <div className={`${styles.statsGrid} stagger-in`}>
          <StatsCard title="Pending Bookings" value={pendingBookings.length} subtitle="Awaiting confirmation" icon={<CalendarCheck size={20} />} variant={pendingBookings.length > 0 ? 'warning' : 'accent'} />
          <StatsCard title="Chambers" value={chamberList.length} subtitle={`${chamberList.filter(c => c.status === 'OPERATIONAL').length} operational`} icon={<Snowflake size={20} />} variant="primary" />
          <StatsCard title="Utilization" value={formatPercent(utilization)} subtitle={`${totalOccupied} / ${totalCapacity} MT`} icon={<BarChart3 size={20} />} variant={utilization > 80 ? 'danger' : 'accent'} />
          <StatsCard title="Active Lots" value={activeLots} subtitle={formatWeight(totalStored)} icon={<Package size={20} />} variant="info" />
        </div>

        {/* ─── Pending Bookings ─── */}
        {pendingBookings.length > 0 && (
          <Card padding="md">
            <CardHeader
              title="Pending Bookings"
              subtitle="Farmer booking requests awaiting your confirmation"
              action={
                <Button variant="secondary" size="sm" onClick={() => router.push('/wms/bookings')}>
                  View All
                </Button>
              }
            />
            <div className={styles.bookingsList}>
              {pendingBookings.slice(0, 5).map((b) => (
                <div key={b.id} className={styles.bookingItem}>
                  <div className={styles.bookingInfo}>
                    <div className={styles.bookingFarmer}>
                      <User size={14} />
                      <strong>{b.farmer.fullName}</strong>
                      <span className={styles.bookingPhone}>{b.farmer.phone}</span>
                    </div>
                    <div className={styles.bookingMeta}>
                      <Badge variant="primary" size="sm">{getCommodityLabel(b.commodityCategory)}</Badge>
                      <span>{b.commodityName} · ~{(b.estimatedWeightKg / 1000).toFixed(1)} MT</span>
                      {b.estimatedBags && <span>· {b.estimatedBags} bags</span>}
                      <span>· {formatDate(b.preferredDate)}</span>
                    </div>
                    <div className={styles.bookingNumber}>
                      <Clock size={12} /> {b.bookingNumber} · Booked {formatDate(b.createdAt)}
                    </div>
                  </div>
                  <div className={styles.bookingActions}>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle size={14} />}
                      onClick={() => handleBookingAction(b.id, 'CONFIRMED')}
                      loading={actionLoading === b.id}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<XCircle size={14} />}
                      onClick={() => handleBookingAction(b.id, 'REJECTED')}
                      disabled={actionLoading === b.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Chamber Visualization + Quick Actions */}
        <div className={styles.twoCol}>
          {/* Chamber Occupancy Cards */}
          <Card padding="md">
            <CardHeader title="Chamber Occupancy" subtitle="Real-time storage utilization" />
            <div className={styles.chamberGrid}>
              {chamberList.map((ch) => {
                const cap = Number(ch.capacityMt || 0);
                const occ_mt = Number(ch.occupiedMt || 0);
                const occ = cap > 0 ? (occ_mt / cap) * 100 : 0;
                return (
                  <div key={ch.id} className={styles.chamberCard}>
                    <div className={styles.chamberTop}>
                      <span className={styles.chamberNumber}>{ch.chamberNumber}</span>
                      <Badge variant={ch.status === 'OPERATIONAL' ? 'accent' : ch.status === 'MAINTENANCE' ? 'warning' : 'danger'} size="sm">
                        {ch.status === 'OPERATIONAL' ? '●' : '○'} {ch.status.toLowerCase()}
                      </Badge>
                    </div>
                    {ch.name && <div className={styles.chamberName}>{ch.name}</div>}

                    {/* Visual capacity gauge */}
                    <div className={styles.gauge}>
                      <div className={styles.gaugeTrack}>
                        <div className={styles.gaugeFill} style={{
                          height: `${Math.max(occ, 2)}%`,
                          background: occ > 80 ? 'linear-gradient(to top, var(--color-danger-600), var(--color-danger-400))' :
                            occ > 50 ? 'linear-gradient(to top, var(--color-warning-600), var(--color-warning-400))' :
                            'linear-gradient(to top, var(--color-accent-600), var(--color-accent-400))',
                        }} />
                      </div>
                      <span className={styles.gaugePct}>{formatPercent(occ)}</span>
                    </div>

                    <div className={styles.chamberMeta}>
                      <span>{occ_mt} / {cap} MT</span>
                      {ch.commodityCategory && <span>{getCommodityLabel(ch.commodityCategory)}</span>}
                    </div>
                  </div>
                );
              })}
              {chamberList.length === 0 && !loading && (
                <div className={styles.emptyChambers}>
                  <Snowflake size={36} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }} />
                  <p>No chambers configured</p>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card padding="md">
            <CardHeader title="Quick Actions" subtitle="Common operations" />
            <div className={styles.quickActions}>
              <button className={styles.actionCard} onClick={() => router.push('/wms/inventory/intake')}>
                <div className={styles.actionCardIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success-600)' }}><Download size={18} /></div>
                <div>
                  <strong>New Intake</strong>
                  <p>Register incoming stock</p>
                </div>
              </button>
              <button className={styles.actionCard} onClick={() => router.push('/wms/inventory')}>
                <div className={styles.actionCardIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary-600)' }}><Package size={18} /></div>
                <div>
                  <strong>View Inventory</strong>
                  <p>Manage stored lots</p>
                </div>
              </button>
              <button className={styles.actionCard} onClick={() => router.push('/wms/invoices/create')}>
                <div className={styles.actionCardIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning-600)' }}><Receipt size={18} /></div>
                <div>
                  <strong>Generate Invoice</strong>
                  <p>Bill depositor for rent</p>
                </div>
              </button>
              <button className={styles.actionCard} onClick={() => router.push('/wms/facility/chambers')}>
                <div className={styles.actionCardIcon} style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-info-600)' }}><Snowflake size={18} /></div>
                <div>
                  <strong>Manage Chambers</strong>
                  <p>Configure storage rooms</p>
                </div>
              </button>
            </div>
          </Card>
        </div>

        {/* Upcoming Releases */}
        {(() => {
          const now = new Date();
          const upcoming = lotList
            .filter(l => l.expectedRelease && (l.status === 'STORED' || l.status === 'PARTIALLY_RELEASED'))
            .map(l => {
              const releaseDate = new Date(l.expectedRelease!);
              const diffDays = Math.ceil((releaseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return { ...l, diffDays };
            })
            .filter(l => l.diffDays <= 14 && l.diffDays >= -7)
            .sort((a, b) => a.diffDays - b.diffDays)
            .slice(0, 6);

          if (upcoming.length === 0) return null;

          return (
            <Card padding="md">
              <CardHeader title="Upcoming Releases" subtitle="Lots nearing expected release date" />
              <div className={styles.releaseList}>
                {upcoming.map((lot) => (
                  <div key={lot.id} className={styles.releaseItem} onClick={() => router.push(`/wms/inventory/${lot.id}`)} style={{ cursor: 'pointer' }}>
                    <div>
                      <div className={styles.releaseLot}>{lot.lotNumber}</div>
                      <div className={styles.releaseDepositor}>{lot.depositor?.fullName} — {lot.commodityName} ({formatWeight(lot.currentWeightKg)})</div>
                    </div>
                    <span className={`${styles.releaseDays} ${lot.diffDays <= 0 ? styles.releaseUrgent : lot.diffDays <= 3 ? styles.releaseSoon : styles.releaseNormal}`}>
                      {lot.diffDays <= 0 ? `${Math.abs(lot.diffDays)}d overdue` : `${lot.diffDays}d left`}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

        {/* Recent Inventory */}
        <Card padding="none">
          <div style={{ padding: 'var(--space-5) var(--space-5) 0' }}>
            <CardHeader
              title="Inventory Lots"
              subtitle={`${lotList.length} total lots`}
              action={
                <Button variant="primary" size="sm" onClick={() => router.push('/wms/inventory')}>
                  View All
                </Button>
              }
            />
          </div>
          <DataTable
            columns={lotColumns}
            data={lotList.slice(0, 10)}
            loading={loading}
            emptyMessage="No inventory lots yet"
            onRowClick={(row) => router.push(`/wms/inventory/${row.id}`)}
          />
        </Card>
      </main>
    </>
  );
}
