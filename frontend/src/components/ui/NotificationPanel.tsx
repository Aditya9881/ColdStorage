'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Thermometer, Package, Receipt, Building, Bell, BellOff,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/formatters';
import styles from './NotificationPanel.module.css';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/notifications', { limit: 50 });
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadNotifications();
  }, [isOpen, loadNotifications]);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await api.patch(`/notifications/${notification.id}/read`);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }

    // Navigate
    if (notification.actionUrl) {
      onClose();
      router.push(notification.actionUrl);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TEMPERATURE_ALERT': return <Thermometer size={16} />;
      case 'LOT_EXPIRY_WARNING': return <Package size={16} />;
      case 'INVOICE_OVERDUE': return <Receipt size={16} />;
      case 'CHAMBER_CAPACITY_WARNING': return <Building size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const getTypeClass = (type: string): string => {
    switch (type) {
      case 'TEMPERATURE_ALERT': return styles.temp;
      case 'LOT_EXPIRY_WARNING': return styles.expiry;
      case 'INVOICE_OVERDUE': return styles.invoice;
      case 'CHAMBER_CAPACITY_WARNING': return styles.capacity;
      default: return styles.system;
    }
  };

  // Group by date
  const groupByDate = (items: Notification[]) => {
    const groups: { label: string; items: Notification[] }[] = [];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();

    const grouped = new Map<string, Notification[]>();
    for (const item of items) {
      const dateStr = new Date(item.createdAt).toDateString();
      let label: string;
      if (dateStr === todayStr) label = 'Today';
      else if (dateStr === yesterdayStr) label = 'Yesterday';
      else label = new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

      if (!grouped.has(label)) grouped.set(label, []);
      grouped.get(label)!.push(item);
    }

    for (const [label, items] of grouped) {
      groups.push({ label, items });
    }

    return groups;
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const groups = groupByDate(notifications);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            Notifications
            {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
          </div>
          <div className={styles.headerActions}>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={markAllRead}>
                Mark all read
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}>×</button>
          </div>
        </div>

        {/* List */}
        <div className={styles.list}>
          {loading ? (
            <div className={styles.emptyState}>
              <p>Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className={styles.emptyState}>
              <BellOff size={36} />
              <p>No notifications yet</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <div className={styles.dateGroup}>
                  <span className={styles.dateLabel}>{group.label}</span>
                </div>
                {group.items.map((notification) => (
                  <div
                    key={notification.id}
                    className={`${styles.item} ${!notification.read ? styles.unread : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={`${styles.itemIcon} ${getTypeClass(notification.type)}`}>
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className={styles.itemContent}>
                      <div className={styles.itemTitle}>{notification.title}</div>
                      <div className={styles.itemMessage}>{notification.message}</div>
                      <div className={styles.itemTime}>{formatRelativeTime(notification.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
