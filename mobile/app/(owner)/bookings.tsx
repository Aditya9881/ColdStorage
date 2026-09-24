/**
 * SheetKosh — Owner Booking Management
 *
 * Lists all bookings for the owner's facility.
 * Owner can: Confirm, Reject, update status through the lifecycle.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Platform, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { Shadows } from '@/constants/Colors';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'ARRIVED', label: 'Arrived' },
  { key: 'WEIGHING', label: 'Weighing' },
  { key: 'STORED', label: 'Stored' },
  { key: 'DISPATCH_REQUESTED', label: 'Dispatch' },
];

const SC: Record<string, { bg: string; text: string; icon: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#D97706', icon: 'hourglass-outline' },
  CONFIRMED: { bg: '#D1FAE5', text: '#059669', icon: 'checkmark-circle-outline' },
  ARRIVED: { bg: '#DBEAFE', text: '#2563EB', icon: 'location-outline' },
  WEIGHING: { bg: '#EDE9FE', text: '#7C3AED', icon: 'scale-outline' },
  STORED: { bg: '#D1FAE5', text: '#047857', icon: 'cube-outline' },
  DISPATCH_REQUESTED: { bg: '#FFEDD5', text: '#EA580C', icon: 'arrow-up-circle-outline' },
  DISPATCHING: { bg: '#CFFAFE', text: '#0891B2', icon: 'car-outline' },
  DISPATCHED: { bg: '#CFFAFE', text: '#0E7490', icon: 'checkmark-done-outline' },
  COMPLETED: { bg: '#D1FAE5', text: '#10B981', icon: 'trophy-outline' },
  CANCELLED: { bg: '#FEE2E2', text: '#DC2626', icon: 'close-circle-outline' },
  REJECTED: { bg: '#FEE2E2', text: '#DC2626', icon: 'ban-outline' },
};

export default function OwnerBookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);

  const fetchBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '30');
      if (statusFilter) params.set('status', statusFilter);

      // Use /facility/mine — auto-resolves owner's facility on backend
      const res = await api.get<any>(`/bookings/facility/mine?${params.toString()}`);
      if (res.success && res.data) {
        setBookings(res.data.bookings || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch bookings', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchBookings();
  }, [statusFilter]);

  const handleAction = async (bookingId: string, status: string, extra?: any) => {
    setActionLoading(bookingId);
    try {
      const res = await api.patch<any>(`/bookings/${bookingId}/status`, { status, ...extra });
      if (res.success) {
        hapticSuccess();
        fetchBookings(); // Refresh
      } else {
        hapticError();
        Alert.alert('Error', res.error?.message || 'Action failed');
      }
    } catch (err: any) {
      hapticError();
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmBooking = (id: string) => {
    Alert.alert('Confirm Booking', 'Accept this booking request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => handleAction(id, 'CONFIRMED') },
    ]);
  };

  const rejectBooking = (id: string) => {
    Alert.alert('Reject Booking', 'Are you sure? This cannot be undone.', [
      { text: 'No', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => handleAction(id, 'REJECTED', { cancelReason: 'Rejected by facility' }) },
    ]);
  };

  const startWeighing = (id: string) => {
    handleAction(id, 'WEIGHING');
  };

  const renderBooking = ({ item }: { item: any }) => {
    const sc = SC[item.status] || SC.PENDING;
    const isActioning = actionLoading === item.id;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.cardDot, { backgroundColor: sc.text }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardBookingNo}>#{item.bookingNumber}</Text>
            <Text style={styles.cardFarmer}>{item.farmer?.fullName} • {item.farmer?.phone}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
            <Ionicons name={sc.icon as any} size={10} color={sc.text} />
            <Text style={[styles.statusText, { color: sc.text }]}>{item.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.cardBody}>
          <View style={styles.detail}>
            <Ionicons name="leaf-outline" size={14} color="#9CA3AF" />
            <Text style={styles.detailText}>{item.commodityName} ({item.commodityCategory})</Text>
          </View>
          <View style={styles.detail}>
            <Ionicons name="scale-outline" size={14} color="#9CA3AF" />
            <Text style={styles.detailText}>{item.estimatedWeightKg} Kg{item.estimatedBags ? ` • ${item.estimatedBags} bags` : ''}</Text>
          </View>
          <View style={styles.detail}>
            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
            <Text style={styles.detailText}>
              {new Date(item.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {item.preferredSlot ? ` • ${item.preferredSlot}` : ''}
            </Text>
          </View>
          {item.farmerNote && (
            <View style={styles.detail}>
              <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" />
              <Text style={[styles.detailText, { fontStyle: 'italic' }]}>{item.farmerNote}</Text>
            </View>
          )}
        </View>

        {/* Action buttons based on status */}
        {item.status === 'PENDING' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => rejectBooking(item.id)}
              disabled={isActioning}
            >
              <Ionicons name="close" size={16} color="#EF4444" />
              <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 13 }}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => confirmBooking(item.id)}
              disabled={isActioning}
            >
              {isActioning ? <ActivityIndicator size="small" color="#FFF" /> : (
                <>
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Confirm</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'ARRIVED' && (
          <TouchableOpacity
            style={styles.weighBtn}
            onPress={() => startWeighing(item.id)}
            disabled={isActioning}
          >
            <LinearGradient colors={['#7C3AED', '#A78BFA']} style={styles.weighGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {isActioning ? <ActivityIndicator size="small" color="#FFF" /> : (
                <>
                  <Ionicons name="scale-outline" size={16} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Start Weighing</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {item.status === 'WEIGHING' && (
          <TouchableOpacity
            style={styles.weighBtn}
            onPress={() => {
              hapticLight();
              router.push({ pathname: '/owner-booking/weigh', params: { bookingId: item.id, bookingNumber: item.bookingNumber } });
            }}
          >
            <LinearGradient colors={['#059669', '#34D399']} style={styles.weighGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="checkmark-done-outline" size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Enter Weight & Confirm</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {item.status === 'DISPATCH_REQUESTED' && (
          <TouchableOpacity
            style={styles.weighBtn}
            onPress={() => handleAction(item.id, 'DISPATCHING')}
            disabled={isActioning}
          >
            <LinearGradient colors={['#0891B2', '#22D3EE']} style={styles.weighGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {isActioning ? <ActivityIndicator size="small" color="#FFF" /> : (
                <>
                  <Ionicons name="car-outline" size={16} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Start Dispatch</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#4C1D95', '#7C3AED']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Manage Bookings</Text>
          <Text style={styles.headerSub}>{total} total</Text>
        </View>
      </LinearGradient>

      {/* Filter chips */}
      <FlatList
        data={STATUS_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={f => f.key}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
            onPress={() => { setStatusFilter(f.key); hapticLight(); }}
          >
            <Text style={[styles.filterText, statusFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
          <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '500' }}>No bookings found</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={b => b.id}
          renderItem={renderBooking}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} tintColor="#7C3AED" />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F7FC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },

  header: {
    paddingTop: 12, paddingBottom: 16, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  filterRow: { paddingVertical: 12, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFF' },

  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    ...Shadows.sm, borderWidth: 1, borderColor: '#F3F4F6',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardDot: { width: 8, height: 8, borderRadius: 4 },
  cardBookingNo: { fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
  cardFarmer: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },

  cardBody: { gap: 6, marginBottom: 12 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  actionRow: { flexDirection: 'row', gap: 8 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2',
  },
  confirmBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 10, borderRadius: 10, backgroundColor: '#059669',
  },
  weighBtn: { borderRadius: 10, overflow: 'hidden' },
  weighGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
});
