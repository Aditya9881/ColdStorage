'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import styles from './Charts.module.css';

interface DataSeries {
  dataKey: string;
  name: string;
  color?: string;
  strokeDasharray?: string;
  strokeWidth?: number;
}

interface ReferenceLineConfig {
  y: number;
  label: string;
  color?: string;
  strokeDasharray?: string;
}

interface LineChartProps {
  data: Record<string, any>[];
  xAxisKey: string;
  series: DataSeries[];
  title?: string;
  subtitle?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showDots?: boolean;
  referenceLines?: ReferenceLineConfig[];
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
  formatTooltip?: (value: number) => string;
  yAxisDomain?: [number | string, number | string];
  yAxisLabel?: string;
}

const DEFAULT_LINE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6'];

export default function LineChart({
  data,
  xAxisKey,
  series,
  title,
  subtitle,
  height = 320,
  showGrid = true,
  showLegend = true,
  showDots = false,
  referenceLines,
  formatXAxis,
  formatYAxis,
  formatTooltip,
  yAxisDomain,
  yAxisLabel,
}: LineChartProps) {
  return (
    <div className={styles.chartContainer}>
      {(title || subtitle) && (
        <div className={styles.chartHeader}>
          {title && <h3 className={styles.chartTitle}>{title}</h3>}
          {subtitle && <p className={styles.chartSubtitle}>{subtitle}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
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
            domain={yAxisDomain}
            tickFormatter={formatYAxis}
            label={yAxisLabel ? {
              value: yAxisLabel,
              angle: -90,
              position: 'insideLeft',
              style: { fill: 'var(--color-text-tertiary)', fontSize: 11 },
            } : undefined}
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
            <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-secondary)' }} />
          )}
          {referenceLines?.map((ref, i) => (
            <ReferenceLine
              key={`ref-${i}`}
              y={ref.y}
              stroke={ref.color || '#f43f5e'}
              strokeDasharray={ref.strokeDasharray || '8 4'}
              strokeWidth={1.5}
              label={{
                value: ref.label,
                position: 'insideTopRight',
                fill: ref.color || '#f43f5e',
                fontSize: 11,
              }}
            />
          ))}
          {series.map((s, i) => {
            const color = s.color || DEFAULT_LINE_COLORS[i % DEFAULT_LINE_COLORS.length];
            return (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={color}
                strokeWidth={s.strokeWidth || 2}
                strokeDasharray={s.strokeDasharray}
                dot={showDots ? { r: 3, strokeWidth: 2, stroke: color, fill: 'var(--color-bg-primary)' } : false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: color, fill: 'var(--color-bg-primary)' }}
              />
            );
          })}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
