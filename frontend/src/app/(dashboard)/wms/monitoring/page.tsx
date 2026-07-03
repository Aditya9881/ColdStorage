'use client';

import React from 'react';
import {
  Thermometer, Droplets, AlertTriangle, CheckCircle,
  Activity, Clock, RefreshCw,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatRelativeTime, getCommodityLabel } from '@/lib/formatters';
import styles from './monitoring.module.css';

interface SparklinePoint {
  temp: number;
  humidity: number | null;
  time: string;
  isAlert: boolean;
}

interface ChamberOverview {
  chamber: {
    id: string;
    chamberNumber: string;
    name: string | null;
    capacityMt: number;
    occupiedMt: number;
    commodityCategory: string | null;
    targetTempMin: number | null;
    targetTempMax: number | null;
    targetHumidityMin: number | null;
    targetHumidityMax: number | null;
    facility: { id: string; name: string };
  };
  currentTemperature: number | null;
  currentHumidity: number | null;
  lastUpdated: string | null;
  alertStatus: 'normal' | 'warning' | 'critical';
  sparkline: SparklinePoint[];
}

// ── Sparkline SVG Component ────────────────────
function Sparkline({ data, targetMin, targetMax }: { data: SparklinePoint[]; targetMin: number | null; targetMax: number | null }) {
  if (data.length < 2) {
    return (
      <div className={styles.sparkline}>
        <svg className={styles.sparklineSvg} viewBox="0 0 300 48" preserveAspectRatio="none">
          <text x="150" y="28" textAnchor="middle" fill="var(--color-text-muted)" fontSize="10">No data yet</text>
        </svg>
      </div>
    );
  }

  const temps = data.map((d) => d.temp);
  const allValues = [...temps];
  if (targetMin !== null) allValues.push(targetMin);
  if (targetMax !== null) allValues.push(targetMax);

  const min = Math.min(...allValues) - 1;
  const max = Math.max(...allValues) + 1;
  const range = max - min || 1;

  const width = 300;
  const height = 48;
  const padY = 2;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padY + ((max - d.temp) / range) * (height - padY * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  // Target range band
  const rangeY1 = targetMax !== null ? padY + ((max - targetMax) / range) * (height - padY * 2) : 0;
  const rangeY2 = targetMin !== null ? padY + ((max - targetMin) / range) * (height - padY * 2) : height;

  return (
    <div className={styles.sparkline}>
      <svg className={styles.sparklineSvg} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary-400)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {/* Target range background */}
        {targetMin !== null && targetMax !== null && (
          <rect
            x={0} y={rangeY1}
            width={width} height={rangeY2 - rangeY1}
            className={styles.rangeZone}
          />
        )}
        {/* Area fill */}
        <path d={areaPath} className={styles.sparklineArea} />
        {/* Line */}
        <path d={linePath} className={styles.sparklineLine} />
      </svg>
    </div>
  );
}

export default function MonitoringPage() {
  const { data: rawData, loading, refetch } = useApiQuery<ChamberOverview[]>('/temperature/overview', {
    refetchInterval: 30_000,
  });

  const data = rawData || [];
  const lastRefresh = new Date();

  const normalCount = data.filter((d) => d.alertStatus === 'normal').length;
  const warningCount = data.filter((d) => d.alertStatus === 'warning').length;
  const criticalCount = data.filter((d) => d.alertStatus === 'critical').length;
  const noDataCount = data.filter((d) => d.currentTemperature === null).length;

  return (
    <>
      <Header
        title="Temperature Monitoring"
        subtitle="Real-time chamber environment tracking"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span className={styles.refreshBadge}>
              <span className={styles.refreshDot} />
              Live · {formatRelativeTime(lastRefresh.toISOString())}
            </span>
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={refetch}>
              Refresh
            </Button>
          </div>
        }
      />

      <main className={styles.content}>
        {/* Summary Bar */}
        <div className={styles.summaryBar}>
          <div className={styles.summaryItem}>
            <div className={`${styles.summaryIcon} ${styles.green}`}>
              <CheckCircle size={20} />
            </div>
            <div className={styles.summaryInfo}>
              <span className={styles.summaryValue}>{normalCount}</span>
              <span className={styles.summaryLabel}>Normal</span>
            </div>
          </div>
          <div className={styles.summaryItem}>
            <div className={`${styles.summaryIcon} ${styles.yellow}`}>
              <AlertTriangle size={20} />
            </div>
            <div className={styles.summaryInfo}>
              <span className={styles.summaryValue}>{warningCount}</span>
              <span className={styles.summaryLabel}>Warning</span>
            </div>
          </div>
          <div className={styles.summaryItem}>
            <div className={`${styles.summaryIcon} ${styles.red}`}>
              <Activity size={20} />
            </div>
            <div className={styles.summaryInfo}>
              <span className={styles.summaryValue}>{criticalCount}</span>
              <span className={styles.summaryLabel}>Critical</span>
            </div>
          </div>
          <div className={styles.summaryItem}>
            <div className={`${styles.summaryIcon} ${styles.blue}`}>
              <Thermometer size={20} />
            </div>
            <div className={styles.summaryInfo}>
              <span className={styles.summaryValue}>{data.length}</span>
              <span className={styles.summaryLabel}>Total Chambers</span>
            </div>
          </div>
        </div>

        {/* Chamber Grid */}
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p>Loading sensor data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className={styles.noData}>
            <Thermometer size={40} />
            <p>No operational chambers found</p>
          </div>
        ) : (
          <div className={styles.chamberGrid}>
            {data.map((item) => {
              const alertClass = item.alertStatus === 'critical'
                ? styles.alertCritical
                : item.alertStatus === 'warning'
                  ? styles.alertWarning
                  : styles.alertNormal;

              const dotClass = item.alertStatus === 'critical'
                ? styles.critical
                : item.alertStatus === 'warning'
                  ? styles.warning
                  : styles.normal;

              return (
                <div key={item.chamber.id} className={`${styles.chamberCard} ${alertClass}`}>
                  {/* Header */}
                  <div className={styles.cardTop}>
                    <div className={styles.chamberInfo}>
                      <span className={styles.chamberName}>
                        {item.chamber.chamberNumber} — {item.chamber.name || 'Unnamed'}
                      </span>
                      <span className={styles.chamberMeta}>
                        {item.chamber.commodityCategory
                          ? getCommodityLabel(item.chamber.commodityCategory)
                          : 'Multi-purpose'}
                        {' · '}
                        {item.chamber.facility.name}
                      </span>
                    </div>
                    <div className={`${styles.alertDot} ${dotClass}`} />
                  </div>

                  {/* Readings */}
                  <div className={styles.readingsRow}>
                    <div className={styles.reading}>
                      <span className={styles.readingLabel}>
                        <Thermometer size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        Temperature
                      </span>
                      <span className={styles.readingValue}>
                        {item.currentTemperature !== null ? `${item.currentTemperature.toFixed(1)}°C` : '—'}
                      </span>
                      {item.chamber.targetTempMin !== null && item.chamber.targetTempMax !== null && (
                        <span className={styles.readingRange}>
                          Target: {Number(item.chamber.targetTempMin)}–{Number(item.chamber.targetTempMax)}°C
                        </span>
                      )}
                    </div>
                    <div className={styles.reading}>
                      <span className={styles.readingLabel}>
                        <Droplets size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        Humidity
                      </span>
                      <span className={styles.readingValue}>
                        {item.currentHumidity !== null ? `${item.currentHumidity.toFixed(0)}%` : '—'}
                      </span>
                      {item.chamber.targetHumidityMin !== null && item.chamber.targetHumidityMax !== null && (
                        <span className={styles.readingRange}>
                          Target: {Number(item.chamber.targetHumidityMin)}–{Number(item.chamber.targetHumidityMax)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sparkline */}
                  <Sparkline
                    data={item.sparkline}
                    targetMin={item.chamber.targetTempMin ? Number(item.chamber.targetTempMin) : null}
                    targetMax={item.chamber.targetTempMax ? Number(item.chamber.targetTempMax) : null}
                  />

                  {/* Last Updated */}
                  <div className={styles.lastUpdated}>
                    <Clock size={10} />
                    {item.lastUpdated
                      ? `Updated ${formatRelativeTime(item.lastUpdated)}`
                      : 'No readings yet'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
