'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, Column, renderStatus } from '@/components/ui/DataTable';
import { Plus, Snowflake, BarChart3, Package, Sprout, Download, Receipt, FileDown, Clock } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatWeight, formatCurrency, formatDate, formatPercent, getCommodityLabel } from '@/lib/formatters';
import type { InventoryLot, Chamber } from '@/types/models';
import styles from './wms-dashboard.module.css';

export default function WMSDashboard() {
  const router = useRouter();
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lotsRes, chambersRes] = await Promise.allSettled([
        api.get<any>('/inventory/lots'),
        api.get<any>('/chambers'),
      ]);

      if (lotsRes.status === 'fulfilled' && lotsRes.value.success) {
        setLots(lotsRes.value.data || []);
      }
      if (chambersRes.status === 'fulfilled' && chambersRes.value.success) {
        setChambers(chambersRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to load WMS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalCapacity = chambers.reduce((s, c) => s + Number(c.capacityMt || 0), 0);
  const totalOccupied = chambers.reduce((s, c) => s + Number(c.occupiedMt || 0), 0);
  const utilization = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;
  const activeLots = lots.filter((l) => l.status === 'STORED' || l.status === 'PARTIALLY_RELEASED').length;
  const totalStored = lots.reduce((s, l) => s + Number(l.currentWeightKg || 0), 0);

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
              const token = localStorage.getItem('accessToken');
              window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/reports/inventory/csv?token=${token}`, '_blank');
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
          <StatsCard title="Chambers" value={chambers.length} subtitle={`${chambers.filter(c => c.status === 'OPERATIONAL').length} operational`} icon={<Snowflake size={20} />} variant="primary" />
          <StatsCard title="Utilization" value={formatPercent(utilization)} subtitle={`${totalOccupied} / ${totalCapacity} MT`} icon={<BarChart3 size={20} />} variant={utilization > 80 ? 'danger' : 'accent'} />
          <StatsCard title="Active Lots" value={activeLots} subtitle={formatWeight(totalStored)} icon={<Package size={20} />} variant="info" />
          <StatsCard title="Total Depositors" value={new Set(lots.map(l => l.depositorId)).size} icon={<Sprout size={20} />} variant="warning" />
        </div>

        {/* Chamber Visualization + Quick Actions */}
        <div className={styles.twoCol}>
          {/* Chamber Occupancy Cards */}
          <Card padding="md">
            <CardHeader title="Chamber Occupancy" subtitle="Real-time storage utilization" />
            <div className={styles.chamberGrid}>
              {chambers.map((ch) => {
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
              {chambers.length === 0 && !loading && (
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
          const upcoming = lots
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
              subtitle={`${lots.length} total lots`}
              action={
                <Button variant="primary" size="sm" onClick={() => router.push('/wms/inventory')}>
                  View All
                </Button>
              }
            />
          </div>
          <DataTable
            columns={lotColumns}
            data={lots.slice(0, 10)}
            loading={loading}
            emptyMessage="No inventory lots yet"
            onRowClick={(row) => router.push(`/wms/inventory/${row.id}`)}
          />
        </Card>
      </main>
    </>
  );
}
