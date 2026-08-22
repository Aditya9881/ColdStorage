'use client';

import React from 'react';
import { Factory, Package, Users, Coins, BarChart3, TrendingUp } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatsCard } from '@/components/ui/StatsCard';
import { Badge } from '@/components/ui/Badge';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatCurrency, formatWeight, formatPercent, getCommodityLabel } from '@/lib/formatters';
import { AreaChart } from '@/components/charts';
import { PieChart } from '@/components/charts';
import { BarChart } from '@/components/charts';
import styles from './analytics.module.css';

interface OverviewData {
  facilities: { total: number; active: number; pendingReview: number };
  users: { total: number; farmers: number; owners: number };
  inventory: { totalLots: number; activeLots: number; totalStoredKg: number; totalStoredMt: number };
  financial: { totalInvoices: number; totalRevenue: number };
}

interface CapacityData {
  national: { totalCapacityMt: number; occupiedMt: number; availableMt: number; utilizationRate: number; facilityCount: number };
  byState: Array<{ state: string; totalCapacityMt: number; occupiedMt: number; availableMt: number; utilizationRate: number; facilityCount: number }>;
}

interface CommodityItem {
  category: string;
  lotCount: number;
  totalWeightKg: number;
  totalWeightMt: number;
}

interface IntakeTrendItem {
  date: string;
  totalKg: number;
  lotCount: number;
}

interface FacilityComparison {
  id: string;
  name: string;
  state: string;
  capacityMt: number;
  occupiedMt: number;
  utilizationRate: number;
  lotCount: number;
  chamberCount: number;
}

export default function AnalyticsPage() {
  const { data: overview, loading: overviewLoading } = useApiQuery<OverviewData>('/analytics/overview');
  const { data: capacity } = useApiQuery<CapacityData>('/analytics/capacity');
  const { data: rawCommodities } = useApiQuery<CommodityItem[]>('/analytics/commodities');
  const { data: intakeTrend } = useApiQuery<IntakeTrendItem[]>('/analytics/intake-trend');
  const { data: facilityComp } = useApiQuery<FacilityComparison[]>('/analytics/facility-comparison');

  const loading = overviewLoading;
  const commodities = Array.isArray(rawCommodities) ? rawCommodities : [];

  const commodityColors: Record<string, string> = {
    POTATO: 'var(--color-warning-500)', ONION: 'var(--color-danger-500)', VEGETABLES: 'var(--color-accent-500)', FRUITS: 'var(--color-primary-500)',
    DAIRY: 'var(--color-info-500)', FROZEN_SEAFOOD: 'var(--color-primary-400)',
    FROZEN_MEAT: 'var(--color-danger-400)',
    PROCESSED_FOOD: 'var(--color-warning-400)', SEEDS: 'var(--color-accent-400)', OTHER: 'var(--color-text-muted)',
  };

  const getUtilColor = (rate: number) => {
    if (rate > 80) return 'var(--color-danger-500)';
    if (rate > 50) return 'var(--color-warning-500)';
    return 'var(--color-accent-500)';
  };

  return (
    <PageLayout
      title="Analytics"
      subtitle="Platform-wide data insights and trends"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Analytics' },
      ]}
    >
        {/* Top KPIs */}
        <div className={`${styles.statsGrid} stagger-in`}>
          <StatsCard title="Facilities" value={overview?.facilities.total ?? '—'} subtitle={`${overview?.facilities.active ?? 0} active`} icon={<Factory size={18} />} variant="primary" />
          <StatsCard title="Total Stored" value={overview ? formatWeight(overview.inventory.totalStoredKg) : '—'} subtitle={`${overview?.inventory.activeLots ?? 0} active lots`} icon={<Package size={18} />} variant="accent" />
          <StatsCard title="Registered Users" value={overview?.users.total ?? '—'} subtitle={`${overview?.users.farmers ?? 0} farmers`} icon={<Users size={18} />} variant="info" />
          <StatsCard title="Revenue" value={overview ? formatCurrency(overview.financial.totalRevenue) : '—'} subtitle={`${overview?.financial.totalInvoices ?? 0} invoices`} icon={<Coins size={18} />} variant="warning" />
        </div>

        {/* Intake Trend Chart — Full Width */}
        <Card padding="md">
          <CardHeader
            title="Intake Volume Trend"
            subtitle="Daily intake volumes over the last 30 days (MT)"
          />
          {intakeTrend && intakeTrend.length > 0 ? (
            <AreaChart
              data={intakeTrend.map(d => ({
                date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                volume: d.totalKg / 1000,
                lots: d.lotCount,
              }))}
              xAxisKey="date"
              series={[
                { dataKey: 'volume', name: 'Volume (MT)', gradient: { from: '#6366f1', to: '#818cf8' } },
              ]}
              height={280}
              formatTooltip={(v: number) => `${v.toFixed(1)} MT`}
            />
          ) : (
            <div className={styles.emptyState}>
              <TrendingUp size={32} style={{ color: 'var(--color-text-muted)' }} />
              <p>No intake data for the last 30 days</p>
            </div>
          )}
        </Card>

        {/* Capacity + Commodities */}
        <div className={styles.twoCol}>
          {/* Capacity Breakdown */}
          <Card padding="md">
            <CardHeader
              title="Capacity Utilization by State"
              subtitle="Storage usage across the network"
            />
            {capacity ? (
              <div className={styles.capacityList}>
                {capacity.byState.map((s) => (
                  <div key={s.state} className={styles.capacityRow}>
                    <div className={styles.capacityMeta}>
                      <span className={styles.stateName}>{s.state}</span>
                      <span className={styles.stateInfo}>
                        {s.facilityCount} {s.facilityCount === 1 ? 'facility' : 'facilities'} · {s.occupiedMt.toLocaleString()} / {s.totalCapacityMt.toLocaleString()} MT
                      </span>
                    </div>
                    <div className={styles.barRow}>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{
                          width: `${Math.max(Math.min(s.utilizationRate, 100), 1)}%`,
                          background: getUtilColor(s.utilizationRate),
                        }} />
                      </div>
                      <span className={styles.barPct}>{formatPercent(s.utilizationRate)}</span>
                    </div>
                  </div>
                ))}

                {/* National totals */}
                <div className={styles.nationalBar}>
                  <div className={styles.nationalMeta}>
                    <span>National Total</span>
                    <Badge variant="primary">{formatPercent(capacity.national.utilizationRate)} utilized</Badge>
                  </div>
                  <div className={styles.nationalNumbers}>
                    <div className={styles.numBlock}>
                      <span className={styles.numLabel}>Total</span>
                      <span className={styles.numValue}>{capacity.national.totalCapacityMt.toLocaleString()} MT</span>
                    </div>
                    <div className={styles.numBlock}>
                      <span className={styles.numLabel}>Occupied</span>
                      <span className={styles.numValue}>{capacity.national.occupiedMt.toLocaleString()} MT</span>
                    </div>
                    <div className={styles.numBlock}>
                      <span className={styles.numLabel}>Available</span>
                      <span className={styles.numValue}>{capacity.national.availableMt.toLocaleString()} MT</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.loadingBlock}>
                <div className="skeleton" style={{ height: 20, width: '60%' }} />
                <div className="skeleton" style={{ height: 14, width: '100%', marginTop: 12 }} />
                <div className="skeleton" style={{ height: 14, width: '80%', marginTop: 8 }} />
              </div>
            )}
          </Card>

          {/* Commodity Breakdown */}
          <Card padding="md">
            <CardHeader
              title="Commodity Distribution"
              subtitle="Inventory by commodity type"
            />
            {commodities && commodities.length > 0 ? (
              <PieChart
                data={commodities.map(c => ({
                  name: c.category.replace(/_/g, ' '),
                  value: c.totalWeightMt,
                  color: commodityColors[c.category] || undefined,
                }))}
                height={300}
                formatValue={(v: number) => `${v.toLocaleString()} MT`}
              />
            ) : (
              <div className={styles.emptyState}>
                <BarChart3 size={32} style={{ color: 'var(--color-text-muted)' }} />
                <p>No commodity data available</p>
              </div>
            )}
          </Card>
        </div>

        {/* Facility Comparison — Full Width */}
        {facilityComp && facilityComp.length > 0 && (
          <BarChart
            data={facilityComp.map(f => ({
              name: f.name.length > 20 ? f.name.substring(0, 20) + '…' : f.name,
              utilization: f.utilizationRate,
              occupied: f.occupiedMt,
              capacity: f.capacityMt,
            }))}
            xAxisKey="name"
            series={[
              { dataKey: 'occupied', name: 'Occupied (MT)', color: '#6366f1' },
              { dataKey: 'capacity', name: 'Total Capacity (MT)', color: '#334155' },
            ]}
            title="Facility Comparison"
            subtitle="Utilization comparison across active facilities"
            height={340}
            formatTooltip={(v: number) => `${v.toLocaleString()} MT`}
          />
        )}
    </PageLayout>
  );
}
