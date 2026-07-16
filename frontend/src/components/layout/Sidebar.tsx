'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BarChart3, Factory, Users, Coins,
  ClipboardCheck, Boxes, Package, PackagePlus,
  Receipt, FilePlus, Sprout, Building, Snowflake,
  PanelLeftClose, PanelLeftOpen, Settings, FileText, ShieldCheck, CalendarCheck,
} from 'lucide-react';
import { useSidebar } from '@/hooks/useSidebar';
import styles from './Sidebar.module.css';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const adminNav: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={18} /> },
      { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 size={18} /> },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Facilities', href: '/admin/facilities', icon: <Factory size={18} /> },
      { label: 'Users', href: '/admin/users', icon: <Users size={18} /> },
      { label: 'Pricing', href: '/admin/pricing', icon: <Coins size={18} /> },
      { label: 'Verification', href: '/admin/verification', icon: <ShieldCheck size={18} /> },
      { label: 'Audit Trail', href: '/admin/audit', icon: <FileText size={18} /> },
    ],
  },
];

const wmsNav: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/wms', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Facility', href: '/wms/facility', icon: <Building size={18} /> },
      { label: 'Chambers', href: '/wms/facility/chambers', icon: <Boxes size={18} /> },
      { label: 'Bookings', href: '/wms/bookings', icon: <CalendarCheck size={18} /> },
      { label: 'Inventory', href: '/wms/inventory', icon: <Package size={18} /> },
      { label: 'Monitoring', href: '/wms/monitoring', icon: <Snowflake size={18} /> },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Invoices', href: '/wms/invoices', icon: <Receipt size={18} /> },
      { label: 'Pricing', href: '/wms/pricing', icon: <Coins size={18} /> },
      { label: 'Depositors', href: '/wms/depositors', icon: <Sprout size={18} /> },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Settings', href: '/wms/settings', icon: <Settings size={18} /> },
    ],
  },
];

interface SidebarProps {
  role: 'admin' | 'wms';
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { isOpen, closeSidebar } = useSidebar();
  const navGroups = role === 'admin' ? adminNav : wmsNav;

  const isActive = (href: string) => {
    // Exact match for dashboard routes
    if (href === '/admin' || href === '/wms') {
      return pathname === href;
    }
    // Exact match for parent routes that have sub-routes
    // to prevent both parent and child from highlighting
    if (href === '/wms/invoices' || href === '/wms/facility') {
      return pathname === href;
    }
    // Inventory: match list page and lot detail pages (but not /intake)
    if (href === '/wms/inventory') {
      return pathname === href || (pathname.startsWith('/wms/inventory/') && !pathname.includes('intake'));
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {isOpen && <div className={styles.backdrop} onClick={closeSidebar} />}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${isOpen ? styles.open : ''}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Snowflake size={20} />
        </div>
        {!collapsed && (
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>ColdStorage</span>
            <span className={styles.logoRole}>
              {role === 'admin' ? 'Admin' : 'WMS'}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navGroups.map((group) => (
          <div key={group.title} className={styles.group}>
            {!collapsed && <div className={styles.groupTitle}>{group.title}</div>}
            <div className={styles.groupItems}>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className={styles.navLabel}>{item.label}</span>
                      {item.badge && (
                        <span className={styles.navBadge}>{item.badge}</span>
                      )}
                    </>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <button
        className={styles.collapseBtn}
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>
    </aside>
    </>
  );
}
