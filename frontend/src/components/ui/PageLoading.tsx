'use client';

import React from 'react';
import styles from './PageLoading.module.css';

interface PageLoadingProps {
  /** Number of stat cards to show in the skeleton */
  statsCount?: number;
  /** Whether to show a table skeleton */
  showTable?: boolean;
  /** Number of table rows in the skeleton */
  tableRows?: number;
  /** Whether to show card skeletons */
  showCards?: boolean;
}

/**
 * Full-page loading skeleton for dashboard pages.
 * Mimics the common dashboard layout: Header + Stats Grid + Content Cards + Table.
 */
export function PageLoading({
  statsCount = 4,
  showTable = true,
  tableRows = 5,
  showCards = true,
}: PageLoadingProps) {
  return (
    <div className={styles.container}>
      {/* Header skeleton */}
      <div className={styles.header}>
        <div>
          <div className={`skeleton ${styles.headerTitle}`} />
          <div className={`skeleton ${styles.headerSubtitle}`} />
        </div>
      </div>

      {/* Stats row skeleton */}
      <div className={styles.statsGrid}>
        {Array.from({ length: statsCount }).map((_, i) => (
          <div key={i} className={styles.statCard}>
            <div className={`skeleton ${styles.statLabel}`} />
            <div className={`skeleton ${styles.statValue}`} />
            <div className={`skeleton ${styles.statSub}`} />
          </div>
        ))}
      </div>

      {/* Content cards skeleton */}
      {showCards && (
        <div className={styles.cardsRow}>
          <div className={styles.contentCard}>
            <div className={`skeleton ${styles.cardTitle}`} />
            <div className={`skeleton ${styles.cardBody}`} />
            <div className={`skeleton ${styles.cardBody2}`} />
          </div>
          <div className={styles.contentCard}>
            <div className={`skeleton ${styles.cardTitle}`} />
            <div className={`skeleton ${styles.cardBody}`} />
            <div className={`skeleton ${styles.cardBody2}`} />
          </div>
        </div>
      )}

      {/* Table skeleton */}
      {showTable && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`skeleton ${styles.tableHeaderCell}`} style={{ flex: i === 0 ? 2 : 1 }} />
            ))}
          </div>
          {Array.from({ length: tableRows }).map((_, i) => (
            <div key={i} className={styles.tableRow}>
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className={`skeleton ${styles.tableCell}`} style={{ flex: j === 0 ? 2 : 1 }} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
