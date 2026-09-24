import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import SubPageHeader from '@/components/SubPageHeader';

const STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  PENDING_APPROVAL: {
    label: 'Pending',
    color: '#C27A12',
    bg: '#FFF7E7',
    icon: 'time-outline',
  },
  APPROVED: {
    label: 'Approved',
    color: '#0F8A5F',
    bg: '#EAF8F1',
    icon: 'checkmark-circle-outline',
  },
  REJECTED: {
    label: 'Rejected',
    color: '#D14343',
    bg: '#FDECEC',
    icon: 'close-circle-outline',
  },
  DISPATCHED: {
    label: 'Dispatched',
    color: '#0D8DB3',
    bg: '#E9F9FD',
    icon: 'car-outline',
  },
  COMPLETED: {
    label: 'Completed',
    color: '#5E6B7C',
    bg: '#F1F4F7',
    icon: 'checkbox-outline',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#7A808A',
    bg: '#F3F4F6',
    icon: 'ban-outline',
  },
};

const FILTERS = ['All', 'Pending', 'Approved', 'Dispatched', 'Completed', 'Rejected'];

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get<any>('/orders?limit=30');
      if (res.success && res.data?.orders) setOrders(res.data.orders);
      else setOrders([]);
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'PENDING_APPROVAL').length;
    const approved = orders.filter(
      (o) => o.status === 'APPROVED' || o.status === 'DISPATCHED'
    ).length;
    const completed = orders.filter((o) => o.status === 'COMPLETED').length;
    return {
      total: orders.length,
      pending,
      approved,
      completed,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'All') return orders;
    if (activeFilter === 'Pending')
      return orders.filter((o) => o.status === 'PENDING_APPROVAL');
    if (activeFilter === 'Approved')
      return orders.filter((o) => o.status === 'APPROVED');
    if (activeFilter === 'Dispatched')
      return orders.filter((o) => o.status === 'DISPATCHED');
    if (activeFilter === 'Completed')
      return orders.filter((o) => o.status === 'COMPLETED');
    if (activeFilter === 'Rejected')
      return orders.filter((o) => o.status === 'REJECTED');
    return orders;
  }, [orders, activeFilter]);

  const renderOrder = ({ item }: { item: any }) => {
    const status = STATUS_MAP[item.status] || STATUS_MAP.PENDING_APPROVAL;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/orders/${item.id}`)}
        activeOpacity={0.82}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.commodity}>
              {item.listing?.lot?.commodityName || 'Unknown'}
            </Text>
            <Text style={styles.meta}>
              {item.listing?.lot?.lotNumber || '—'} • {Number(item.quantityKg || 0)} kg
            </Text>
          </View>

          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon as any} size={13} color={status.color} />
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.amountPanel}>
          <Text style={styles.amountLabel}>Order Value</Text>
          <Text style={styles.price}>
            ₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.priceDetail}>
            Agreed price: ₹{Number(item.agreedPricePerKg || 0).toLocaleString('en-IN')}/kg
          </Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoPill}>
            <Ionicons name="person-outline" size={12} color="#7C8A9F" />
            <Text style={styles.infoPillText}>{item.buyer?.fullName || '—'}</Text>
          </View>

          <View style={styles.infoPill}>
            <Ionicons name="calendar-outline" size={12} color="#7C8A9F" />
            <Text style={styles.infoPillText}>
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString('en-IN')
                : '—'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#F4F6F3' }]}>
        <ActivityIndicator size="large" color="#14532D" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <SubPageHeader
        title="Orders"
        subtitle="Track approvals, dispatches, and completed sales"
      />

      <View style={styles.statsRow}>
        <LinearGradient
          colors={['#0D2F2A', '#14532D', '#1A6B52']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsCard}
        >
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {FILTERS.map((filter) => {
            const active = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[styles.filterChipText, active && styles.filterChipTextActive]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#14532D"
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={30} color="#8B97A8" />
            </View>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyText}>
              Orders will appear here when buyers purchase your listed produce.
            </Text>
          </View>
        }
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F4',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    textTransform: 'uppercase',
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  filtersWrap: {
    paddingTop: 14,
  },

  filterChips: {
    paddingHorizontal: 16,
    paddingRight: 32,
    gap: 8,
  },

  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E9E3',
  },

  filterChipActive: {
    backgroundColor: '#14532D',
    borderColor: '#14532D',
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },

  filterChipText: {
    fontSize: 13,
    color: '#6B7A72',
    fontWeight: '600',
  },

  filterChipTextActive: {
    color: '#FFF',
  },

  countRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },

  countText: {
    fontSize: 12,
    color: '#86908B',
    fontWeight: '500',
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 110 : 32,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E9E3',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  commodity: {
    fontSize: 17,
    color: '#0B2520',
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  meta: {
    fontSize: 12,
    color: '#86908B',
    marginTop: 3,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  amountPanel: {
    backgroundColor: '#F0F7F4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0EDE6',
  },

  amountLabel: {
    fontSize: 11,
    color: '#86908B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  price: {
    marginTop: 4,
    fontSize: 28,
    lineHeight: 34,
    color: '#14532D',
    fontWeight: '800',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'] as any,
  },

  priceDetail: {
    marginTop: 3,
    fontSize: 12,
    color: '#6B7A72',
    fontWeight: '500',
  },

  infoRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F2F5F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E4E9E1',
  },

  infoPillText: {
    fontSize: 11.5,
    color: '#6B7A72',
    fontWeight: '500',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 72,
    paddingHorizontal: 24,
  },

  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B2520',
    marginTop: 18,
  },

  emptyText: {
    fontSize: 13,
    color: '#86908B',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});