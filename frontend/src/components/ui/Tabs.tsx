'use client';

import React, { useState } from 'react';
import styles from './Tabs.module.css';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Badge count shown next to label */
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  /** Currently active tab id */
  activeTab: string;
  /** Called when a tab is clicked */
  onTabChange: (tabId: string) => void;
  /** Visual variant */
  variant?: 'underline' | 'pills';
  className?: string;
}

/**
 * Tabs component for switching between views within a page.
 *
 * Usage:
 *   <Tabs
 *     tabs={[
 *       { id: 'profile', label: 'Profile', icon: <User size={14} /> },
 *       { id: 'security', label: 'Security', icon: <Lock size={14} /> },
 *     ]}
 *     activeTab={tab}
 *     onTabChange={setTab}
 *   />
 */
export function Tabs({
  tabs,
  activeTab,
  onTabChange,
  variant = 'underline',
  className = '',
}: TabsProps) {
  return (
    <div className={`${styles.tabs} ${styles[variant]} ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon && <span className={styles.tabIcon}>{tab.icon}</span>}
          <span>{tab.label}</span>
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className={styles.tabBadge}>{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
