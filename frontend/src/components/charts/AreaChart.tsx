'use client';

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import styles from './Charts.module.css';

interface DataSeries {
  dataKey: string;
  name: string;
  color?: string;
  gradient?: { from: string; to: string };
}

interface AreaChartProps {
  data: Record<string, any>[];
  xAxisKey: string;
  series: DataSeries[];
  title?: string;
  subtitle?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  formatXAxis?: (value: any) => string;
  formatTooltip?: (value: number) => string;
}

const DEFAULT_COLORS = [
  { from: '#6366f1', to: '#818cf8' },
  { from: '#10b981', to: '#34d399' },
  { from: '#f59e0b', to: '#fbbf24' },
  { from: '#f43f5e', to: '#fb7185' },
  { from: '#06b6d4', to: '#22d3ee' },
];

export default function AreaChart({
  data,
  xAxisKey,
  series,
  title,
  subtitle,
  height = 320,
  showGrid = true,
  showLegend = true,
  stacked = false,
  formatXAxis,
  formatTooltip,
}: AreaChartProps) {
  return (
    <div className={styles.chartContainer}>
      {(title || subtitle) && (
        <div className={styles.chartHeader}>
          {title && <h3 className={styles.chartTitle}>{title}</h3>}
          {subtitle && <p className={styles.chartSubtitle}>{subtitle}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s, i) => {
              const grad = s.gradient || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
              return (
                <linearGradient key={s.dataKey} id={`gradient-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={grad.from} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={grad.to} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-secondary)"
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            stroke="var(--color-text-tertiary)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatXAxis}
          />
          <YAxis
            stroke="var(--color-text-tertiary)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              fontSize: '13px',
              color: 'var(--color-text-primary)',
            }}
            formatter={formatTooltip ? (value: any) => [formatTooltip(value), ''] : undefined}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}
            />
          )}
          {series.map((s, i) => {
            const color = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length].from;
            return (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${s.dataKey})`}
                stackId={stacked ? 'stack' : undefined}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: color, fill: 'var(--color-bg-primary)' }}
              />
            );
          })}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
