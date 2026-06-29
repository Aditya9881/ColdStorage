'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Sun, Moon, Package, Receipt, Users } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { NotificationPanel } from '@/components/ui/NotificationPanel';
import { api } from '@/lib/api-client';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  OWNER: 'Facility Owner',
  STAFF: 'Staff',
  FARMER: 'Farmer',
  BUYER: 'Buyer',
};

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<{ fullName: string; role: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get<any>('/notifications/unread-count');
      if (res.success && res.data) {
        setUnreadCount(res.data.count);
      }
    } catch {
      // Silently fail — notifications are non-critical
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch real user profile
  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get<any>('/users/me');
      if (res.success && res.data) {
        setProfile({ fullName: res.data.fullName, role: res.data.role });
      }
    } catch {
      // Silent fallback
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    // Re-fetch profile when settings page dispatches a custom event
    const handleProfileUpdate = () => fetchProfile();
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, [fetchProfile]);

  const handlePanelClose = () => {
    setNotifOpen(false);
    fetchUnreadCount();
  };

  const displayName = profile?.fullName;
  const displayRole = profile?.role ? roleLabels[profile.role] || profile.role : undefined;

  // Live search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.length < 2) { setSearchResults(null); setSearchOpen(false); return; }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get<any>('/search', { q: value });
        if (res.success) { setSearchResults(res.data); setSearchOpen(true); }
      } catch { /* silent */ }
    }, 300);
  };

  const navigateSearch = (url: string) => {
    setSearchOpen(false); setSearchQuery(''); router.push(url);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.left}>
          <div>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>

        <div className={styles.right}>
          {actions && <div className={styles.actions}>{actions}</div>}

          <div className={styles.searchWrap} ref={searchRef}>
            <div className={styles.searchContainer}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (searchResults) setSearchOpen(true); }}
              />
              <kbd className={styles.kbd}>/</kbd>
            </div>
            {searchOpen && searchResults && (
              <div className={styles.searchDropdown}>
                {searchResults.lots?.length > 0 && (
                  <>
                    <div className={styles.searchCategory}>Inventory Lots</div>
                    {searchResults.lots.map((l: any) => (
                      <div key={l.id} className={styles.searchResult} onClick={() => navigateSearch(`/wms/inventory/${l.id}`)}>
                        <Package size={14} style={{ color: 'var(--color-primary-400)', flexShrink: 0 }} />
                        <div>
                          <div className={styles.searchResultTitle}>{l.lotNumber}</div>
                          <div className={styles.searchResultMeta}>{l.commodityName} • {l.depositor?.fullName}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {searchResults.depositors?.length > 0 && (
                  <>
                    <div className={styles.searchCategory}>Depositors</div>
                    {searchResults.depositors.map((d: any) => (
                      <div key={d.id} className={styles.searchResult} onClick={() => navigateSearch(`/wms/depositors/${d.id}`)}>
                        <Users size={14} style={{ color: 'var(--color-accent-400)', flexShrink: 0 }} />
                        <div>
                          <div className={styles.searchResultTitle}>{d.fullName}</div>
                          <div className={styles.searchResultMeta}>{d.phone}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {searchResults.invoices?.length > 0 && (
                  <>
                    <div className={styles.searchCategory}>Invoices</div>
                    {searchResults.invoices.map((i: any) => (
                      <div key={i.id} className={styles.searchResult} onClick={() => navigateSearch(`/wms/invoices/${i.id}`)}>
                        <Receipt size={14} style={{ color: 'var(--color-warning-400)', flexShrink: 0 }} />
                        <div>
                          <div className={styles.searchResultTitle}>{i.invoiceNumber}</div>
                          <div className={styles.searchResultMeta}>{i.depositor?.fullName} • ₹{Number(i.totalAmount).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {!searchResults.lots?.length && !searchResults.depositors?.length && !searchResults.invoices?.length && (
                  <div className={styles.searchEmpty}>No results for "{searchQuery}"</div>
                )}
              </div>
            )}
          </div>

          <button
            className={styles.iconBtn}
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            className={styles.iconBtn}
            aria-label="Notifications"
            onClick={() => setNotifOpen(true)}
          >
            <Bell size={16} />
            {unreadCount > 0 && <span className={styles.notifDot} />}
          </button>

          {displayName && (
            <div className={styles.profile}>
              <div className={styles.avatar}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className={styles.profileInfo}>
                <span className={styles.profileName}>{displayName}</span>
                {displayRole && <span className={styles.profileRole}>{displayRole}</span>}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Notification Panel */}
      <NotificationPanel isOpen={notifOpen} onClose={handlePanelClose} />
    </>
  );
}
