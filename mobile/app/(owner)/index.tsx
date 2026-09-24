/**
 * ColdStorage — Owner Dashboard
 *
 * Premium owner dashboard with:
 *  - Animated header with facility info
 *  - Live stats (bookings, capacity, revenue)
 *  - Quick action grid
 *  - Recent booking activity feed
 *  - Capacity utilization ring
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Platform, ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';
import { hapticLight, hapticSuccess } from '@/lib/haptics';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Premium Color System ──
const C = {
  bg: '#F4F3F9',
  surface: '#FFFFFF',
  primary: '#6D28D9',       // Vivid violet
  primaryLight: '#8B5CF6',
  primarySoft: '#EDE9FE',
  primaryGlow: 'rgba(109,40,217,0.08)',
  accent: '#06B6D4',        // Cyan accent
  accentSoft: '#ECFEFF',
  success: '#059669',
  successSoft: '#D1FAE5',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  blue: '#2563EB',
  blueSoft: '#DBEAFE',
  ink: '#0F172A',
  muted: '#64748B',
  subtle: '#94A3B8',
  border: '#E2E8F0',
  divider: '#F1F5F9',
};

interface FacilityInfo {
  id: string;
  name: string;
  city: string;
  state: string;
  totalCapacityMt: number;
  usedCapacityMt: number;
  status: string;
  chamberCount?: number;
}

interface DashStats {
  pendingBookings: number;
  confirmedBookings: number;
  todayArrivals: number;
  storedBookings: number;
  totalBookings: number;
  totalLots: number;
  activeLots: number;
}

export default function OwnerDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [facility, setFacility] = useState<FacilityInfo | null>(null);
  const [stats, setStats] = useState<DashStats>({
    pendingBookings: 0, confirmedBookings: 0, todayArrivals: 0,
    storedBookings: 0, totalBookings: 0, totalLots: 0, activeLots: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  const fetchData = useCallback(async () => {
    try {
      // 1. Get owner's facility
      const facRes = await api.get<any>('/facilities?limit=1');
      // Backend sends: { success: true, data: [ ...facilities ] } — data IS the array
      const facArr = Array.isArray(facRes.data) ? facRes.data : facRes.data?.facilities || [];
      if (facRes.success && facArr.length > 0) {
        const fac = facArr[0];
        setFacility({
          id: fac.id,
          name: fac.name,
          city: fac.city,
          state: fac.state,
          totalCapacityMt: fac.totalCapacityMt || 0,
          usedCapacityMt: fac.usedCapacityMt || 0,
          status: fac.status,
          chamberCount: fac._count?.chambers || fac.chambers?.length || 0,
        });

        // 2. Get bookings via /facility/mine (correct endpoint)
        try {
          const bookRes = await api.get<any>('/bookings/facility/mine?limit=30');
          if (bookRes.success && bookRes.data) {
            const all = bookRes.data.bookings || [];
            setRecentBookings(all.slice(0, 6));
            setStats(prev => ({
              ...prev,
              pendingBookings: all.filter((b: any) => b.status === 'PENDING').length,
              confirmedBookings: all.filter((b: any) => b.status === 'CONFIRMED').length,
              todayArrivals: all.filter((b: any) => b.status === 'ARRIVED' || b.status === 'WEIGHING').length,
              storedBookings: all.filter((b: any) => b.status === 'STORED').length,
              totalBookings: bookRes.data.total || 0,
            }));
          }
        } catch (e) {
          console.warn('[Dashboard] Bookings fetch:', e);
        }

        // 3. Get inventory stats
        try {
          const invRes = await api.get<any>(`/inventory/lots?facilityId=${fac.id}&limit=1`);
          if (invRes.success && invRes.data) {
            setStats(prev => ({
              ...prev,
              totalLots: invRes.data.total || 0,
              activeLots: invRes.data.activeLots || invRes.data.total || 0,
            }));
          }
        } catch (e) {
          console.warn('[Dashboard] Inventory fetch:', e);
        }
      }
    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      animateIn();
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const capacityPercent = facility
    ? Math.min(100, Math.round(((facility.usedCapacityMt || 0) / Math.max(1, facility.totalCapacityMt)) * 100))
    : 0;

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const STATUS_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
    PENDING:    { bg: C.warningSoft, text: C.warning, icon: 'time-outline' },
    CONFIRMED:  { bg: C.successSoft, text: C.success, icon: 'checkmark-circle-outline' },
    ARRIVED:    { bg: C.blueSoft,    text: C.blue,    icon: 'location-outline' },
    WEIGHING:   { bg: '#EDE9FE',     text: C.primary, icon: 'scale-outline' },
    STORED:     { bg: C.successSoft, text: '#047857', icon: 'cube-outline' },
    DISPATCH_REQUESTED: { bg: '#FFEDD5', text: '#EA580C', icon: 'arrow-up-circle-outline' },
    DISPATCHED: { bg: C.accentSoft,  text: '#0E7490', icon: 'car-outline' },
    COMPLETED:  { bg: C.successSoft, text: C.success, icon: 'trophy-outline' },
    CANCELLED:  { bg: C.dangerSoft,  text: C.danger,  icon: 'close-circle-outline' },
    REJECTED:   { bg: C.dangerSoft,  text: C.danger,  icon: 'ban-outline' },
  };

  const quickActions = [
    { label: 'Scan QR', icon: 'qr-code', gradient: ['#6D28D9', '#A78BFA'] as const, route: '/(owner)/scan' },
    { label: 'Bookings', icon: 'calendar', gradient: ['#059669', '#34D399'] as const, route: '/(owner)/bookings' },
    { label: 'Inventory', icon: 'cube', gradient: ['#2563EB', '#60A5FA'] as const, route: '/(tabs)/inventory' },
    { label: 'Notifications', icon: 'notifications', gradient: ['#D97706', '#FBBF24'] as const, route: '/notifications' },
  ];

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={{ marginTop: 12, color: C.muted, fontSize: 14, fontWeight: '500' }}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ── Premium Header ── */}
      <LinearGradient
        colors={['#4C1D95', '#6D28D9', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        {/* Decorative circles */}
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />

        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getTimeGreeting()},</Text>
            <Text style={styles.userName} numberOfLines={1}>{user?.fullName || 'Owner'}</Text>
            {facility && (
              <View style={styles.facilityChip}>
                <Ionicons name="business" size={11} color="rgba(255,255,255,0.9)" />
                <Text style={styles.facilityChipText}>{facility.name}</Text>
                <View style={[styles.statusDot, { backgroundColor: facility.status === 'ACTIVE' ? '#34D399' : '#FBBF24' }]} />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => { router.push('/notifications'); hapticLight(); }}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications" size={20} color="#FFF" />
            {stats.pendingBookings > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{stats.pendingBookings > 9 ? '9+' : stats.pendingBookings}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Capacity Card ── */}
          {facility && (
            <View style={styles.capacityCard}>
              <LinearGradient
                colors={['#F5F3FF', '#EDE9FE']}
                style={styles.capacityGradient}
              >
                <View style={styles.capacityTop}>
                  <View>
                    <Text style={styles.capacityTitle}>Storage Capacity</Text>
                    <Text style={styles.capacitySubtitle}>
                      {facility.usedCapacityMt || 0} / {facility.totalCapacityMt} MT used
                    </Text>
                  </View>
                  <View style={styles.capacityRing}>
                    <Text style={styles.capacityPercent}>{capacityPercent}%</Text>
                  </View>
                </View>
                {/* Progress bar */}
                <View style={styles.progressTrack}>
                  <LinearGradient
                    colors={
                      capacityPercent > 85
                        ? ['#DC2626', '#EF4444']
                        : capacityPercent > 60
                        ? ['#D97706', '#F59E0B']
                        : ['#059669', '#34D399']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${Math.max(3, capacityPercent)}%` as any }]}
                  />
                </View>
                <View style={styles.capacityMeta}>
                  <View style={styles.capacityMetaItem}>
                    <Ionicons name="layers-outline" size={14} color={C.primary} />
                    <Text style={styles.capacityMetaText}>{facility.chamberCount || 0} Chambers</Text>
                  </View>
                  <View style={styles.capacityMetaItem}>
                    <Ionicons name="cube-outline" size={14} color={C.primary} />
                    <Text style={styles.capacityMetaText}>{stats.totalLots} Active Lots</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* ── Stats Grid ── */}
          <Text style={styles.sectionTitle}>Booking Overview</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Pending', value: stats.pendingBookings, icon: 'time', color: C.warning, bg: C.warningSoft },
              { label: 'Confirmed', value: stats.confirmedBookings, icon: 'checkmark-circle', color: C.success, bg: C.successSoft },
              { label: 'At Facility', value: stats.todayArrivals, icon: 'location', color: C.blue, bg: C.blueSoft },
              { label: 'Stored', value: stats.storedBookings, icon: 'cube', color: C.primary, bg: C.primarySoft },
            ].map((s, i) => (
              <TouchableOpacity
                key={s.label}
                style={styles.statCard}
                onPress={() => { router.push('/(owner)/bookings'); hapticLight(); }}
                activeOpacity={0.7}
              >
                <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon as any} size={18} color={s.color} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Quick Actions ── */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map(a => (
              <TouchableOpacity
                key={a.label}
                style={styles.actionCard}
                onPress={() => { router.push(a.route as any); hapticLight(); }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={a.gradient as any}
                  style={styles.actionIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={a.icon as any} size={22} color="#FFF" />
                </LinearGradient>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Recent Bookings ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentBookings.length > 0 && (
              <TouchableOpacity onPress={() => { router.push('/(owner)/bookings'); hapticLight(); }}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentBookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="calendar-outline" size={36} color={C.subtle} />
              </View>
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptySubtext}>
                Bookings from farmers will appear here once they start reserving storage.
              </Text>
            </View>
          ) : (
            recentBookings.map((b, idx) => {
              const st = STATUS_STYLE[b.status] || { bg: '#F1F5F9', text: C.muted, icon: 'ellipsis-horizontal' };
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.bookingCard, idx === recentBookings.length - 1 && { marginBottom: 8 }]}
                  onPress={() => { router.push(`/booking/${b.id}` as any); hapticLight(); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.bookingIconWrap, { backgroundColor: st.bg }]}>
                    <Ionicons name={st.icon as any} size={18} color={st.text} />
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingNumber}>#{b.bookingNumber}</Text>
                    <Text style={styles.bookingMeta} numberOfLines={1}>
                      {b.farmer?.fullName || 'Farmer'} • {b.commodityName || 'Commodity'} • {b.estimatedWeightKg || 0} Kg
                    </Text>
                  </View>
                  <View style={styles.bookingRight}>
                    <View style={[styles.bookingStatusPill, { backgroundColor: st.bg }]}>
                      <Text style={[styles.bookingStatusText, { color: st.text }]}>
                        {b.status?.replace(/_/g, ' ')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={C.subtle} style={{ marginTop: 4 }} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // ── Header ──
  header: {
    paddingTop: 12, // overridden inline with insets.top
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerDecor1: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerDecor2: {
    position: 'absolute', bottom: -30, left: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerContent: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500',
  },
  userName: {
    fontSize: 24, fontWeight: '800', color: '#FFF', marginTop: 2,
    letterSpacing: -0.3,
  },
  facilityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, marginTop: 10, alignSelf: 'flex-start',
  },
  facilityChipText: {
    fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600',
  },
  statusDot: {
    width: 7, height: 7, borderRadius: 4,
  },
  notifBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  notifBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#EF4444', borderRadius: 10,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#6D28D9',
  },
  notifBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF' },

  scrollContent: { padding: 20, paddingTop: 16 },

  // ── Capacity Card ──
  capacityCard: {
    borderRadius: 20, overflow: 'hidden', marginBottom: 24,
    backgroundColor: C.surface,
    shadowColor: '#6D28D9', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  capacityGradient: {
    padding: 20,
  },
  capacityTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  capacityTitle: {
    fontSize: 16, fontWeight: '700', color: C.ink,
  },
  capacitySubtitle: {
    fontSize: 13, color: C.muted, marginTop: 3, fontWeight: '500',
  },
  capacityRing: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 3, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(109,40,217,0.06)',
  },
  capacityPercent: {
    fontSize: 15, fontWeight: '800', color: C.primary,
  },
  progressTrack: {
    height: 8, backgroundColor: 'rgba(109,40,217,0.1)',
    borderRadius: 4, overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: 8, borderRadius: 4,
  },
  capacityMeta: {
    flexDirection: 'row', gap: 20,
  },
  capacityMetaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  capacityMetaText: {
    fontSize: 12, color: C.muted, fontWeight: '600',
  },

  // ── Section ──
  sectionTitle: {
    fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 14,
    letterSpacing: -0.2,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  seeAll: {
    fontSize: 13, fontWeight: '600', color: C.primary,
    marginBottom: 14,
  },

  // ── Stats ──
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28,
  },
  statCard: {
    width: (SCREEN_W - 50) / 2,
    backgroundColor: C.surface, borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 28, fontWeight: '800', color: C.ink,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 2,
  },

  // ── Actions ──
  actionsGrid: {
    flexDirection: 'row', gap: 12, marginBottom: 28,
  },
  actionCard: {
    flex: 1, alignItems: 'center', gap: 8,
  },
  actionIcon: {
    width: 54, height: 54, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  actionLabel: {
    fontSize: 12, fontWeight: '600', color: C.muted,
  },

  // ── Bookings ──
  bookingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  bookingIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  bookingInfo: { flex: 1 },
  bookingNumber: { fontSize: 14, fontWeight: '700', color: C.ink },
  bookingMeta: { fontSize: 12, color: C.muted, marginTop: 2, fontWeight: '500' },
  bookingRight: { alignItems: 'flex-end' },
  bookingStatusPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  bookingStatusText: {
    fontSize: 9, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ── Empty ──
  emptyCard: {
    alignItems: 'center', paddingVertical: 40, paddingHorizontal: 30,
    backgroundColor: C.surface, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: C.divider,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13, color: C.subtle, textAlign: 'center', lineHeight: 19,
  },
});
