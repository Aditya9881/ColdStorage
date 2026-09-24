/**
 * SheetKosh — My Bookings Screen
 *
 * Premium bookings list for farmers:
 * - Rich gradient header
 * - Status summary + filter chips
 * - Cleaner booking cards
 * - Safer pagination handling
 * - Refined loading and empty states
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { api } from '@/lib/api-client';
import { hapticLight } from '@/lib/haptics';
import { DetailUI } from '@/components/DetailScreenCard';
import SubPageHeader from '@/components/SubPageHeader';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'STORED', label: 'Stored' },
  { key: 'DISPATCH_REQUESTED', label: 'Dispatch' },
  { key: 'COMPLETED', label: 'Done' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string; soft: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#B45309', icon: 'hourglass-outline', soft: '#FFFBEB' },
  CONFIRMED: { bg: '#D1FAE5', text: '#047857', icon: 'checkmark-circle-outline', soft: '#ECFDF5' },
  ARRIVED: { bg: '#DBEAFE', text: '#2563EB', icon: 'location-outline', soft: '#EFF6FF' },
  WEIGHING: { bg: '#EDE9FE', text: '#7C3AED', icon: 'scale-outline', soft: '#F5F3FF' },
  STORED: { bg: '#CCFBF1', text: '#0F766E', icon: 'cube-outline', soft: '#F0FDFA' },
  DISPATCH_REQUESTED: { bg: '#FFEDD5', text: '#C2410C', icon: 'arrow-up-circle-outline', soft: '#FFF7ED' },
  DISPATCHING: { bg: '#CFFAFE', text: '#0E7490', icon: 'car-outline', soft: '#ECFEFF' },
  DISPATCHED: { bg: '#CFFAFE', text: '#155E75', icon: 'checkmark-done-outline', soft: '#F0FDFF' },
  COMPLETED: { bg: '#D1FAE5', text: '#10B981', icon: 'trophy-outline', soft: '#ECFDF5' },
  CANCELLED: { bg: '#FEE2E2', text: '#DC2626', icon: 'close-circle-outline', soft: '#FEF2F2' },
  REJECTED: { bg: '#FEE2E2', text: '#DC2626', icon: 'ban-outline', soft: '#FEF2F2' },
};

const UI = {
  bg: DetailUI.canvas,
  surface: DetailUI.surface,
  text: DetailUI.ink,
  textMuted: DetailUI.muted,
  textSoft: DetailUI.subtle,
  border: DetailUI.borderSoft,
  forest: DetailUI.primary,
  forestDeep: DetailUI.primaryDark,
  forestMid: DetailUI.primaryMid,
  gold: '#D8B24A',
};

export default function MyBookingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const hasTriggeredEndRef = useRef(false);
  const heroFade = useRef(new Animated.Value(0)).current;
  const listRise = useRef(new Animated.Value(18)).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(heroFade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(listRise, {
        toValue: 0,
        tension: 38,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchBookings = useCallback(
    async (p = 1, reset = true) => {
      try {
        if (reset) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const params = new URLSearchParams();
        params.set('page', String(p));
        params.set('limit', '15');
        if (statusFilter) params.set('status', statusFilter);

        const res = await api.get<any>(`/bookings/my?${params.toString()}`);

        if (res.success && res.data) {
          const items = res.data.bookings || [];
          setBookings(prev => (reset ? items : [...prev, ...items]));
          setTotal(res.data.total || 0);
          setHasMore(items.length === 15);
          setPage(p);
        } else if (reset) {
          setBookings([]);
          setTotal(0);
          setHasMore(false);
        }
      } catch (err) {
        console.error('Failed to fetch bookings', err);
        if (reset) {
          setBookings([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        hasTriggeredEndRef.current = false;
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    fetchBookings(1, true);
    animateIn();
  }, [statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings(1, true);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore || bookings.length < 10 || hasTriggeredEndRef.current) return;
    hasTriggeredEndRef.current = true;
    fetchBookings(page + 1, false);
  };

  const statusStats = useMemo(() => {
    return {
      pending: bookings.filter(b => b.status === 'PENDING').length,
      active: bookings.filter(b =>
        ['CONFIRMED', 'ARRIVED', 'WEIGHING', 'STORED', 'DISPATCH_REQUESTED', 'DISPATCHING', 'DISPATCHED'].includes(b.status)
      ).length,
      completed: bookings.filter(b => b.status === 'COMPLETED').length,
    };
  }, [bookings]);

  const renderBooking = ({ item, index }: { item: any; index: number }) => {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.PENDING;
    const preferredDate = item.preferredDate
      ? new Date(item.preferredDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—';

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        activeOpacity={0.82}
        onPress={() => {
          router.push(`/booking/${item.id}`);
          hapticLight();
        }}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardIconWrap}>
            <LinearGradient
              colors={index % 3 === 0 ? ['#0F766E', '#14B8A6'] : index % 3 === 1 ? ['#2D6A4F', '#40916C'] : ['#2563EB', '#60A5FA']}
              style={styles.cardIcon}
            >
              <Ionicons name="snow-outline" size={18} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.bookingNo}>#{item.bookingNumber}</Text>
            <Text style={styles.facilityName} numberOfLines={1}>
              {item.facility?.name || 'Facility'}
            </Text>
          </View>

          <View style={[styles.statusChip, { backgroundColor: sc.soft, borderColor: sc.bg }]}>
            <Ionicons name={sc.icon as any} size={12} color={sc.text} />
            <Text style={[styles.statusChipText, { color: sc.text }]}>
              {String(item.status || 'PENDING').replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoPill}>
            <Ionicons name="leaf-outline" size={13} color="#6B7280" />
            <Text style={styles.infoPillText} numberOfLines={1}>
              {item.commodityName || 'Commodity'}
            </Text>
          </View>

          <View style={styles.infoPill}>
            <Ionicons name="scale-outline" size={13} color="#6B7280" />
            <Text style={styles.infoPillText}>
              {item.estimatedWeightKg || 0} Kg
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>{preferredDate}</Text>
          </View>

          {item.facility?.city ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.facility.city}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardArrow}>
          <Ionicons name="chevron-forward" size={16} color="#A7B0BA" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

        <SubPageHeader
          title="My Bookings"
          subtitle={`${total} total bookings`}
        />

        <Animated.View style={{ opacity: heroFade }}>
          <View style={styles.statsRow}>
            <LinearGradient
              colors={[UI.forestDeep, UI.forestMid, UI.forest]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsCard}
            >
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{total}</Text>
                <Text style={styles.statLabel}>TOTAL</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{statusStats.pending}</Text>
                <Text style={styles.statLabel}>PENDING</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{statusStats.active}</Text>
                <Text style={styles.statLabel}>ACTIVE</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{statusStats.completed}</Text>
                <Text style={styles.statLabel}>DONE</Text>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        <Animated.View style={{ flex: 1, transform: [{ translateY: listRise }] }}>
          <View style={styles.filterRow}>
            <FlatList
              data={STATUS_FILTERS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={f => f.key}
              contentContainerStyle={styles.filterContent}
              renderItem={({ item: f }) => {
                const active = statusFilter === f.key;
                return (
                  <TouchableOpacity
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => {
                      setStatusFilter(f.key);
                      hapticLight();
                    }}
                    activeOpacity={0.82}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {loading ? (
            <View style={styles.center}>
              <View style={styles.loaderOrb}>
                <ActivityIndicator size="large" color="#2D6A4F" />
              </View>
              <Text style={styles.loadingLabel}>Loading your bookings...</Text>
            </View>
          ) : bookings.length === 0 ? (
            <View style={styles.center}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="calendar-outline" size={42} color="#C7CDD6" />
              </View>
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptyText}>
                Find a cold storage facility and book your first storage slot.
              </Text>
              <TouchableOpacity
                style={styles.discoverBtn}
                onPress={() => {
                  router.push('/discover');
                  hapticLight();
                }}
                activeOpacity={0.84}
              >
                <Ionicons name="search-outline" size={16} color="#2D6A4F" />
                <Text style={styles.discoverBtnText}>Discover Facilities</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={bookings}
              keyExtractor={b => b.id}
              renderItem={renderBooking}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#2D6A4F"
                />
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.25}
              onMomentumScrollBegin={() => {
                hasTriggeredEndRef.current = false;
              }}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator style={{ marginVertical: 18 }} color="#2D6A4F" />
                ) : (
                  <View style={{ height: 18 }} />
                )
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 34,
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
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  filterRow: {
    paddingVertical: 14,
  },

  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingRight: 32,
  },

  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  filterChipActive: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
  },

  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(22, 60, 45, 0.06)',
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    position: 'relative',
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },

  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    overflow: 'hidden',
  },

  cardIcon: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bookingNo: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.text,
    letterSpacing: -0.2,
  },

  facilityName: {
    fontSize: 12,
    color: UI.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },

  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },

  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAF8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#EEF2EC',
  },

  infoPillText: {
    fontSize: 12,
    color: '#5F6B76',
    fontWeight: '600',
    maxWidth: 140,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 2,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '48%',
  },

  metaText: {
    fontSize: 12,
    color: '#8B95A1',
    fontWeight: '500',
  },

  cardArrow: {
    position: 'absolute',
    right: 16,
    top: 18,
  },

  loaderOrb: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,106,79,0.08)',
    marginBottom: 4,
  },

  loadingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  emptyIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1EA',
    marginBottom: 6,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#374151',
  },

  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },

  discoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2D6A4F',
    backgroundColor: '#FFFFFF',
  },

  discoverBtnText: {
    color: '#2D6A4F',
    fontWeight: '700',
    fontSize: 14,
  },
});