'use client';

import React from 'react';
import styles from './StatsCard.module.css';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: { value: number; label: string };
  icon: React.ReactNode;
  variant?: 'primary' | 'accent' | 'warning' | 'danger' | 'info';
}

export function StatsCard({
  title,
  value,
  subtitle,
  change,
  icon,
  variant = 'primary',
}: StatsCardProps) {
  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.top}>
        <div className={styles.info}>
          <span className={styles.label}>{title}</span>
          <span className={styles.value}>{value}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>{icon}</span>
        </div>
      </div>
      {change && (
        <div className={styles.change}>
          <span className={`${styles.changeValue} ${change.value >= 0 ? styles.positive : styles.negative}`}>
            {change.value >= 0 ? '+' : ''}{Math.abs(change.value)}%
          </span>
          <span className={styles.changeLabel}>{change.label}</span>
        </div>
      )}
    </div>
  );
}
