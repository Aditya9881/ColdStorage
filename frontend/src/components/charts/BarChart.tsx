'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import styles from './Charts.module.css';

interface DataSeries {
  dataKey: string;
  name: string;
  color?: string;
  radius?: number;
}

interface BarChartProps {
  data: Record<string, any>[];
  xAxisKey: string;
  series: DataSeries[];
  title?: string;
  subtitle?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  layout?: 'vertical' | 'horizontal';
  barSize?: number;
  colorByValue?: string[]; // Different color per bar from this palette
  formatXAxis?: (value: any) => string;
  formatTooltip?: (value: number) => string;
}

const DEFAULT_BAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6'];

export default function BarChart({
  data,
  xAxisKey,
  series,
  title,
  subtitle,
  height = 320,
  showGrid = true,
  showLegend = true,
  stacked = false,
  layout = 'horizontal',
  barSize,
  colorByValue,
  formatXAxis,
  formatTooltip,
}: BarChartProps) {
  const isVertical = layout === 'vertical';

  return (
    <div className={styles.chartContainer}>
      {(title || subtitle) && (
        <div className={styles.chartHeader}>
          {title && <h3 className={styles.chartTitle}>{title}</h3>}
          {subtitle && <p className={styles.chartSubtitle}>{subtitle}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout={isVertical ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 24, left: isVertical ? 80 : 0, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-secondary)"
              vertical={isVertical}
              horizontal={!isVertical}
            />
          )}
          {isVertical ? (
            <>
              <XAxis type="number" stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey={xAxisKey} stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} width={72} />
            </>
          ) : (
            <>
              <XAxis dataKey={xAxisKey} stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatXAxis} />
              <YAxis stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} width={48} />
            </>
          )}
          <Tooltip
            contentStyle={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              fontSize: '13px',
              color: 'var(--color-text-primary)',
            }}
            cursor={{ fill: 'var(--color-border-secondary)' }}
            formatter={formatTooltip ? (value: any) => [formatTooltip(value), ''] : undefined}
          />
          {showLegend && series.length > 1 && (
            <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-secondary)' }} />
          )}
          {series.map((s, i) => {
            const color = s.color || DEFAULT_BAR_COLORS[i % DEFAULT_BAR_COLORS.length];
            return (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name}
                fill={color}
                stackId={stacked ? 'stack' : undefined}
                barSize={barSize || (series.length > 2 ? 16 : 24)}
                radius={[s.radius ?? 4, s.radius ?? 4, 0, 0]}
              >
                {colorByValue && data.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={colorByValue[idx % colorByValue.length]} />
                ))}
              </Bar>
            );
          })}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
