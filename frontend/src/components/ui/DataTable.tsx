'use client';

import React from 'react';
import { Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './DataTable.module.css';
import { Badge } from './Badge';
import { getStatusLabel, getStatusColor } from '@/lib/formatters';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pagination?: PaginationInfo;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found',
  onRowClick,
  pagination,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className={styles.loadingRow}>
                {columns.map((col, j) => (
                  <td key={col.key}>
                    <div className={styles.loadingBar} style={{ width: `${55 + ((i * 7 + j * 13) % 35)}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Inbox size={32} className={styles.emptyIcon} />
        <p className={styles.emptyText}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }} scope="col">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              className={onRowClick ? styles.clickable : ''}
              onClick={() => onRowClick?.(row)}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); } } : undefined}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '—')
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pagination && pagination.totalPages > 1 && (
        <TablePagination {...pagination} />
      )}
    </div>
  );
}

// ── Pagination Controls ──

function TablePagination({ page, limit, total, totalPages, onPageChange, onLimitChange }: PaginationInfo) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Build page numbers to show (max 5 visible)
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className={styles.pagination}>
      <div className={styles.paginationInfo}>
        <span className={styles.paginationText}>
          Showing <strong>{start}–{end}</strong> of <strong>{total}</strong>
        </span>
        {onLimitChange && (
          <select
            className={styles.pageSizeSelect}
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        )}
      </div>
      <div className={styles.paginationControls}>
        <button
          className={styles.pageBtn}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>…</span>
          ) : (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className={styles.pageBtn}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Convenience render function: status badge
 */
export function renderStatus(status: string) {
  return (
    <Badge variant={getStatusColor(status) as any} dot>
      {getStatusLabel(status)}
    </Badge>
  );
}

