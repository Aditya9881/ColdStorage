'use client';

import React, { useCallback } from 'react';
import { Search, X } from 'lucide-react';
import styles from './FilterBar.module.css';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterBarProps {
  /** Search input */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  /** Status / category dropdown filters */
  filters?: {
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }[];

  /** Date range */
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  showDateRange?: boolean;

  /** Clear all */
  onClearAll?: () => void;

  /** Extra actions (e.g. export button) rendered after filters */
  actions?: React.ReactNode;
}

export function FilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  dateFrom = '',
  dateTo = '',
  onDateFromChange,
  onDateToChange,
  showDateRange = false,
  onClearAll,
  actions,
}: FilterBarProps) {
  const hasActiveFilters = useCallback(() => {
    if (searchValue) return true;
    if (dateFrom || dateTo) return true;
    return filters.some((f) => f.value !== '');
  }, [searchValue, dateFrom, dateTo, filters]);

  return (
    <div className={styles.filterBar}>
      {/* Search */}
      {onSearchChange && (
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
      )}

      {/* Dropdown filters */}
      {filters.map((filter) => (
        <div key={filter.key} className={styles.selectWrapper}>
          <select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            aria-label={filter.label}
          >
            <option value="">{filter.label}</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* Date range */}
      {showDateRange && (
        <>
          <input
            type="date"
            className={styles.dateInput}
            value={dateFrom}
            onChange={(e) => onDateFromChange?.(e.target.value)}
            aria-label="From date"
          />
          <input
            type="date"
            className={styles.dateInput}
            value={dateTo}
            onChange={(e) => onDateToChange?.(e.target.value)}
            aria-label="To date"
          />
        </>
      )}

      {/* Spacer pushes actions to the right */}
      <div className={styles.spacer} />

      {/* Clear all */}
      {onClearAll && hasActiveFilters() && (
        <button
          className={styles.clearBtn}
          onClick={onClearAll}
          type="button"
        >
          <X size={14} />
          Clear
        </button>
      )}

      {/* Extra actions */}
      {actions}
    </div>
  );
}
