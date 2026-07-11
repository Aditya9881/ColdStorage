'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import styles from './Charts.module.css';

interface PieChartProps {
  data: { name: string; value: number; color?: string }[];
  title?: string;
  subtitle?: string;
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  formatValue?: (value: number) => string;
  showLabels?: boolean;
}

const DEFAULT_PIE_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#f43f5e',
  '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#64748b',
];

const RADIAN = Math.PI / 180;
function renderCustomLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: any) {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function PieChart({
  data,
  title,
  subtitle,
  height = 320,
  showLegend = true,
  innerRadius = 60,
  outerRadius = 110,
  formatValue,
  showLabels = true,
}: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className={styles.chartContainer}>
      {(title || subtitle) && (
        <div className={styles.chartHeader}>
          {title && <h3 className={styles.chartTitle}>{title}</h3>}
          {subtitle && <p className={styles.chartSubtitle}>{subtitle}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            labelLine={false}
            label={showLabels ? renderCustomLabel : false}
            stroke="var(--color-bg-primary)"
            strokeWidth={2}
          >
            {data.map((entry, idx) => (
              <Cell
                key={`cell-${idx}`}
                fill={entry.color || DEFAULT_PIE_COLORS[idx % DEFAULT_PIE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              fontSize: '13px',
              color: 'var(--color-text-primary)',
            }}
            formatter={(value: any, name: any) => {
              const formatted = formatValue ? formatValue(value) : value.toLocaleString();
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return [`${formatted} (${pct}%)`, name];
            }}
          />
          {showLegend && (
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                paddingLeft: '16px',
              }}
              formatter={(value: string, entry: any) => {
                const item = data.find(d => d.name === value);
                const pct = item && total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                return (
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {value} <span style={{ color: 'var(--color-text-tertiary)' }}>({pct}%)</span>
                  </span>
                );
              }}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
