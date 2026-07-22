'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck, Package, Store, TrendingUp,
  Receipt, FileText, MapPin, Phone,
} from 'lucide-react';
import styles from './QuickActionsDrawer.module.css';

const QUICK_ACTIONS = [
  { key: 'bookings', icon: CalendarCheck, label: 'Bookings', color: '#0D7A62', bg: '#E8F7F1', route: '/farmer/bookings' },
  { key: 'lots', icon: Package, label: 'My Lots', color: '#0D8D8A', bg: '#E8F9F7', route: '/farmer/inventory' },
  { key: 'marketplace', icon: Store, label: 'Marketplace', color: '#197C76', bg: '#EAF8F5', route: '/farmer/marketplace' },
  { key: 'mandi', icon: TrendingUp, label: 'Mandi Prices', color: '#D45B4E', bg: '#FFF0EE', route: '/farmer/market-prices' },
  { key: 'invoices', icon: Receipt, label: 'Invoices', color: '#2589AA', bg: '#EAF8FC', route: '/farmer/invoices' },
  { key: 'receipts', icon: FileText, label: 'Receipts', color: '#7457BE', bg: '#F0EBFF', route: '/farmer/receipts' },
  { key: 'discover', icon: MapPin, label: 'Find Storage', color: '#B7791F', bg: '#FFF7E6', route: '/discover' },
  { key: 'support', icon: Phone, label: 'Support', color: '#5F6B7A', bg: '#F1F5F9', route: '/farmer/support' },
];

interface QuickActionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickActionsDrawer({ isOpen, onClose }: QuickActionsDrawerProps) {
  const router = useRouter();

  const handleAction = (route: string) => {
    onClose();
    router.push(route);
  };

  return (
    <>
      {isOpen && <div className={styles.backdrop} onClick={onClose} />}
      <div className={`${styles.drawer} ${isOpen ? styles.open : ''}`}>
        <div className={styles.drawerInner}>
          <div className={styles.drawerHeader}>
            <span className={styles.drawerEyebrow}>SHORTCUTS</span>
            <h3 className={styles.drawerTitle}>Quick Actions</h3>
          </div>

          <div className={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  className={styles.actionCard}
                  onClick={() => handleAction(action.route)}
                >
                  <div
                    className={styles.actionIcon}
                    style={{ backgroundColor: action.bg, color: action.color }}
                  >
                    <Icon size={22} />
                  </div>
                  <span className={styles.actionLabel}>{action.label}</span>
                  <div
                    className={styles.actionAccent}
                    style={{ backgroundColor: action.color }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
