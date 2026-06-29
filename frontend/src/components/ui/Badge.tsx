'use client';

import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'accent' | 'warning' | 'danger' | 'info' | 'muted';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({ children, variant = 'primary', size = 'sm', dot = false }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${styles[size]}`}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}
