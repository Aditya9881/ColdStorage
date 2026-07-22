'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Bell, Snowflake } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { QuickActionsDrawer } from './QuickActionsDrawer';
import styles from './FarmerHeader.module.css';

export function FarmerHeader() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((prev) => !prev);
  }, []);

  const initials = user?.fullName
    ? user.fullName.charAt(0).toUpperCase()
    : 'F';

  return (
    <>
      <header className={styles.header}>
        <button
          className={styles.menuBtn}
          onClick={toggleDrawer}
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
        >
          {drawerOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <Snowflake size={15} strokeWidth={2.4} />
          </div>
          <span className={styles.brandName}>ColdStorage</span>
        </div>

        <div className={styles.rightActions}>
          <button
            className={styles.notifBtn}
            onClick={() => router.push('/farmer/notifications')}
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className={styles.notifDot} />
          </button>

          <button
            className={styles.avatar}
            onClick={() => router.push('/farmer/profile')}
            aria-label="Profile"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className={styles.avatarImg} />
            ) : (
              <span>{initials}</span>
            )}
          </button>
        </div>
      </header>

      <QuickActionsDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
