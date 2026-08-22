'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import styles from './Breadcrumbs.module.css';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Show home icon as first breadcrumb. Defaults to false. */
  showHome?: boolean;
  className?: string;
}

/**
 * Breadcrumbs navigation component.
 *
 * Usage:
 *   <Breadcrumbs items={[
 *     { label: 'Inventory', href: '/wms/inventory' },
 *     { label: 'LOT-2024-0001' },
 *   ]} />
 */
export function Breadcrumbs({ items, showHome = false, className = '' }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav className={`${styles.breadcrumbs} ${className}`} aria-label="Breadcrumb">
      <ol className={styles.list}>
        {showHome && (
          <li className={styles.item}>
            <Link href="/" className={styles.link} aria-label="Home">
              <Home size={14} />
            </Link>
            <ChevronRight size={12} className={styles.separator} />
          </li>
        )}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className={styles.item}>
              {item.href && !isLast ? (
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span className={`${styles.label} ${isLast ? styles.current : ''}`} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight size={12} className={styles.separator} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
