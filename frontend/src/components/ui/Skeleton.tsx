'use client';

import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'table-row';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width || undefined,
    height: height || undefined,
  };

  if (variant === 'card') {
    return (
      <div className={`${styles.skeletonCard} ${className}`} style={style}>
        <div className={styles.skeletonPulse} style={{ height: '120px', borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }} />
        <div className={styles.skeletonCardBody}>
          <div className={styles.skeletonPulse} style={{ height: '16px', width: '70%', marginBottom: '8px' }} />
          <div className={styles.skeletonPulse} style={{ height: '12px', width: '90%', marginBottom: '6px' }} />
          <div className={styles.skeletonPulse} style={{ height: '12px', width: '50%' }} />
        </div>
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <div className={`${styles.skeletonTableRow} ${className}`} style={style}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={styles.skeletonPulse} style={{ height: '14px', flex: i === 0 ? 2 : 1 }} />
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div
        className={`${styles.skeletonPulse} ${styles.skeletonCircular} ${className}`}
        style={{ ...style, width: width || '40px', height: height || '40px' }}
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={`${styles.skeletonPulse} ${styles.skeletonRectangular} ${className}`}
        style={{ ...style, height: height || '80px' }}
      />
    );
  }

  // Text variant with multiple lines
  return (
    <div className={`${styles.skeletonText} ${className}`} style={style}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={styles.skeletonPulse}
          style={{
            height: '14px',
            width: i === lines - 1 && lines > 1 ? '60%' : '100%',
            marginBottom: i < lines - 1 ? '8px' : 0,
          }}
        />
      ))}
    </div>
  );
}

// ── Preset Layout Skeletons ──

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeletonStatCard}>
          <div className={styles.skeletonPulse} style={{ height: '12px', width: '60%', marginBottom: '8px' }} />
          <div className={styles.skeletonPulse} style={{ height: '28px', width: '40%', marginBottom: '4px' }} />
          <div className={styles.skeletonPulse} style={{ height: '10px', width: '50%' }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className={styles.skeletonTable}>
      <div className={styles.skeletonTableHeader}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={styles.skeletonPulse} style={{ height: '12px', flex: i === 0 ? 2 : 1 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="table-row" />
      ))}
    </div>
  );
}
