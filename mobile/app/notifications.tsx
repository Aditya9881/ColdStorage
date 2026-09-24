/**
 * SheetKosh — Premium Notifications Screen
 *
 * Features:
 * - Premium hero header
 * - Grouped by day (Today, Yesterday, Earlier)
 * - Mark all as read
 * - Notification type icons with better visual hierarchy
 * - Pull to refresh
 * - Empty state, loading state, error state
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  SectionList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonList } from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { hapticLight } from '@/lib/haptics';
import { DetailUI } from '@/components/DetailScreenCard';
import SubPageHeader from '@/components/SubPageHeader';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  TEMPERATURE_ALERT: { icon: 'thermometer-outline', color: '#DC2626', bg: '#FEF2F2' },
  LOT_EXPIRY_WARNING: { icon: 'time-outline', color: '#D97706', bg: '#FFFBEB' },
  INVOICE_OVERDUE: { icon: 'receipt-outline', color: '#DC2626', bg: '#FEF2F2' },
  CHAMBER_CAPACITY_WARNING: { icon: 'bar-chart-outline', color: '#D97706', bg: '#FFFBEB' },
  ORDER_UPDATE: { icon: 'cart-outline', color: '#0891B2', bg: '#ECFEFF' },
  PAYMENT_RECEIVED: { icon: 'wallet-outline', color: '#059669', bg: '#ECFDF5' },
  SYSTEM: { icon: 'information-circle-outline', color: '#6B7280', bg: '#F3F4F6' },
};

const UI = {
  bg: DetailUI.canvas,
  surface: DetailUI.surface,
  text: DetailUI.ink,
  textMuted: DetailUI.muted,
  textSoft: DetailUI.subtle,
  border: DetailUI.border,
  forest: DetailUI.primary,
  forestDeep: DetailUI.primaryDark,
  forestMid: DetailUI.primaryMid,
  unreadBg: '#F3FBF6',
  unreadBorder: '#D6F1DF',
};

// Role-based gradient colors
const ROLE_GRADIENTS: Record<string, [string, string, string]> = {
  OWNER: ['#4C1D95', '#6D28D9', '#7C3AED'],
  BUYER: ['#0B3B36', '#0F766E', '#14B8A6'],
  FARMER: [UI.forestDeep, UI.forestMid, UI.forest],
  STAFF: ['#4C1D95', '#6D28D9', '#7C3AED'],
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDayGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Earlier';
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const gradientColors = ROLE_GRADIENTS[user?.role || 'FARMER'] || ROLE_GRADIENTS.FARMER;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(false);

      const res = await api.get<any>('/notifications');

      if (res.success && res.data) {
        const items = Array.isArray(res.data)
          ? res.data
          : res.data.notifications || res.data.items || [];

        setNotifications(
          items.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            read: n.read,
            createdAt: n.createdAt,
          }))
        );
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Notifications error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    hapticLight();
    try {
      setMarkingAll(true);
      await api.patch('/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Mark all read error:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const sections = useMemo(() => {
    const groups: Record<string, AppNotification[]> = {};
    const order = ['Today', 'Yesterday', 'Earlier'];

    notifications.forEach(n => {
      const group = getDayGroup(n.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
    });

    return order
      .filter(g => groups[g]?.length > 0)
      .map(g => ({ title: g, data: groups[g] }));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: UI.bg }]}>
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
          <SubPageHeader title="Notifications" subtitle="Loading updates..." />
          <View style={{ paddingTop: 14 }}>
            <SkeletonList count={5} />
          </View>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: UI.bg }]}>
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
          <SubPageHeader title="Notifications" subtitle="Could not load updates" />
          <View style={{ flex: 1 }}>
            <ErrorState variant="network" onRetry={fetchNotifications} />
          </View>
        </View>
      </>
    );
  }

  const renderItem = ({ item }: { item: AppNotification }) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.SYSTEM;

    return (
      <TouchableOpacity
        style={[
          styles.notifCard,
          item.read ? styles.notifCardRead : styles.notifCardUnread,
        ]}
        onPress={() => {
          hapticLight();
          if (!item.read) markRead(item.id);
        }}
        activeOpacity={0.8}
      >
        <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon as any} size={20} color={config.color} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.notifMessage} numberOfLines={2}>
            {item.message}
          </Text>

          <View style={styles.notifMetaRow}>
            <Text style={styles.notifTime}>{getTimeAgo(item.createdAt)}</Text>
            {!item.read ? <Text style={styles.newBadge}>NEW</Text> : null}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#A8B0B8" />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: UI.bg }]}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

        <SubPageHeader
          title="Notifications"
          subtitle={
            unreadCount > 0
              ? `${unreadCount} unread updates`
              : user?.role === 'OWNER'
              ? 'Facility alerts & bookings'
              : user?.role === 'BUYER'
              ? 'Orders & marketplace alerts'
              : 'Storage & market updates'
          }
          rightIcon="notifications-outline"
          rightIconColor="#D3A03A"
        />

        <View style={styles.statsRow}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsCard}
          >
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{notifications.length}</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{unreadCount}</Text>
              <Text style={styles.statLabel}>UNREAD</Text>
            </View>
          </LinearGradient>
        </View>

        {unreadCount > 0 && (
          <View style={styles.topBar}>
            <Text style={styles.unreadLabel}>{unreadCount} unread notifications</Text>
            <TouchableOpacity
              onPress={markAllRead}
              activeOpacity={0.8}
              disabled={markingAll}
              style={styles.markAllWrap}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color={UI.forest} />
              ) : (
                <Text style={styles.markAllBtn}>Mark all read</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={UI.forest}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="notifications-off-outline"
                title="All Caught Up"
                subtitle={
                  user?.role === 'OWNER'
                    ? 'No facility alerts or booking requests right now.'
                    : user?.role === 'BUYER'
                    ? 'No order or marketplace updates yet.'
                    : 'No updates about your stored crops. We\'ll notify you when something happens.'
                }
              />
            </View>
          }
          stickySectionHeadersEnabled={false}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  statsRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  statLabel: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.6,
  },

  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },

  unreadLabel: {
    fontSize: 13,
    color: '#86908B',
    fontWeight: '600',
  },

  markAllWrap: {
    paddingVertical: 4,
  },

  markAllBtn: {
    fontSize: 13,
    color: UI.forest,
    fontWeight: '800',
  },

  list: {
    paddingTop: 6,
    paddingBottom: 32,
  },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D6A4F',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },

  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  notifCardRead: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E9E3',
  },

  notifCardUnread: {
    backgroundColor: '#F0F9F3',
    borderColor: '#D0EBDA',
  },

  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B2520',
    flex: 1,
    letterSpacing: -0.1,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2D6A4F',
  },

  notifMessage: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    color: '#86908B',
    fontWeight: '500',
  },

  notifMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },

  notifTime: {
    fontSize: 11,
    color: '#A3ADA7',
    fontWeight: '500',
  },

  newBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#14532D',
    backgroundColor: '#DDF5E5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },

  emptyWrap: {
    paddingTop: 60,
  },
});
