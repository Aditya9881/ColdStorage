'use client';

import React from 'react';
import { Factory, Package, Users, Coins, BarChart3, TrendingUp } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatsCard } from '@/components/ui/StatsCard';
import { Badge } from '@/components/ui/Badge';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatCurrency, formatWeight, formatPercent, getCommodityLabel } from '@/lib/formatters';
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

// ── SVG Line Chart Component ────────────────────
function IntakeChart({ data }: { data: IntakeTrendItem[] }) {
  if (!data.length) return null;

  const width = 700;
  const height = 200;
  const padL = 50;
  const padR = 10;
  const padT = 10;
  const padB = 30;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const values = data.map(d => d.totalKg / 1000); // Convert to MT
  const max = Math.max(...values, 1);

  const getX = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const getY = (v: number) => padT + chartH - (v / max) * chartH;

  const points = values.map((v, i) => `${getX(i)},${getY(v)}`);
  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${getX(data.length - 1)},${padT + chartH} L ${padL},${padT + chartH} Z`;

  // Y-axis labels (4 ticks)
  const yTicks = [0, max * 0.25, max * 0.5, max * 0.75, max].map(v => Math.round(v));

  // X-axis labels (every 5 days)
  const xLabels = data.filter((_, i) => i % 5 === 0 || i === data.length - 1);

  return (
    <div className={styles.chartContainer}>
      <svg className={styles.chartSvg} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="intakeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary-400)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line x1={padL} y1={getY(tick)} x2={width - padR} y2={getY(tick)} className={styles.chartGridLine} />
            <text x={padL - 6} y={getY(tick) + 3} textAnchor="end" className={styles.chartLabel}>{tick}</text>
          </g>
        ))}

        {/* Area */}
        <path d={areaPath} fill="url(#intakeGrad)" className={styles.chartArea} />

        {/* Line */}
        <path d={linePath} className={styles.chartLine} />

        {/* Dots on non-zero days */}
        {values.map((v, i) => v > 0 ? (
          <circle key={i} cx={getX(i)} cy={getY(v)} r={3} className={styles.chartDot} />
        ) : null)}

        {/* X labels */}
        {xLabels.map((item) => {
          const idx = data.indexOf(item);
          const label = new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
          return (
            <text key={item.date} x={getX(idx)} y={height - 4} textAnchor="middle" className={styles.chartLabel}>
              {label}
            </text>
          );
        })}

        {/* Y-axis label */}
        <text x={6} y={padT + chartH / 2} textAnchor="middle" className={styles.chartLabel}
          transform={`rotate(-90, 6, ${padT + chartH / 2})`}>MT</text>
      </svg>
    </div>
  );
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
    <>
      <Header
        title="Analytics"
        subtitle="Platform-wide data insights and trends"
      />

      <main className={styles.content}>
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
            <IntakeChart data={intakeTrend} />
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
              <div className={styles.commodityList}>
                {commodities.map((c) => {
                  const color = commodityColors[c.category] || 'var(--color-text-muted)';
                  return (
                    <div key={c.category} className={styles.commodityItem}>
                      <div className={styles.commodityIcon}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'block' }} />
                      </div>
                      <div className={styles.commodityInfo}>
                        <span className={styles.commodityName}>{c.category.replace(/_/g, ' ')}</span>
                        <span className={styles.commodityMeta}>
                          {c.lotCount} lots · {formatWeight(c.totalWeightKg)}
                        </span>
                      </div>
                      <Badge variant="muted">{c.totalWeightMt} MT</Badge>
                    </div>
                  );
                })}
              </div>
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
          <Card padding="md">
            <CardHeader
              title="Facility Comparison"
              subtitle="Utilization comparison across active facilities"
            />
            <div className={styles.facilityCompList}>
              {facilityComp.map((f) => (
                <div key={f.id} className={styles.facilityCompRow}>
                  <div className={styles.facilityCompMeta}>
                    <span className={styles.facilityCompName}>{f.name}</span>
                    <span className={styles.facilityCompStats}>
                      {f.occupiedMt} / {f.capacityMt} MT · {f.chamberCount} chambers · {f.lotCount} lots
                    </span>
                  </div>
                  <div className={styles.facilityCompBar}>
                    <div className={styles.facilityCompTrack}>
                      <div
                        className={styles.facilityCompFill}
                        style={{
                          width: `${Math.max(Math.min(f.utilizationRate, 100), 1)}%`,
                          background: `linear-gradient(90deg, ${getUtilColor(f.utilizationRate)}, ${getUtilColor(f.utilizationRate)}88)`,
                        }}
                      />
                    </div>
                    <span className={styles.facilityCompPct}>{formatPercent(f.utilizationRate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
