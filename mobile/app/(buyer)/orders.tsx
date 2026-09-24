import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

const BUYER_PRIMARY = '#0F766E';
const BUYER_DARK = '#0B3B36';
const SCREEN_BG = '#F4F7F6';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  PENDING_APPROVAL: {
    label: 'Awaiting Farmer',
    color: '#C98212',
    bg: '#FFF8E8',
    icon: 'hourglass-outline',
  },
  APPROVED: {
    label: 'Approved',
    color: '#0F8A63',
    bg: '#EAFBF4',
    icon: 'checkmark-circle',
  },
  REJECTED: {
    label: 'Rejected',
    color: '#DC2626',
    bg: '#FEE2E2',
    icon: 'close-circle',
  },
  DISPATCHED: {
    label: 'Dispatched',
    color: '#0284C7',
    bg: '#EAF6FF',
    icon: 'car-outline',
  },
  COMPLETED: {
    label: 'Completed',
    color: '#64748B',
    bg: '#F1F5F9',
    icon: 'checkbox-outline',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#64748B',
    bg: '#F1F5F9',
    icon: 'ban-outline',
  },
};

const TABS = ['All', 'Pending', 'Approved', 'Dispatched', 'Completed'];

const COMMODITY_ICON: Record<string, string> = {
  Potato: 'nutrition-outline',
  Onion: 'ellipse-outline',
  Tomato: 'ellipse',
  Apple: 'nutrition',
  Mango: 'leaf-outline',
  Garlic: 'flower-outline',
  Ginger: 'leaf',
  Wheat: 'sunny-outline',
  Rice: 'water-outline',
  default: 'cube-outline',
};

export default function BuyerOrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get<any>('/orders?limit=50');
      if (res.success && res.data?.orders) {
        setOrders(res.data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = useMemo(() => {
    if (activeTab === 'All') return orders;

    const map: Record<string, string[]> = {
      Pending: ['PENDING_APPROVAL'],
      Approved: ['APPROVED'],
      Dispatched: ['DISPATCHED'],
      Completed: ['COMPLETED', 'CANCELLED'],
    };

    return orders.filter((o) => map[activeTab]?.includes(o.status));
  }, [orders, activeTab]);

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'PENDING_APPROVAL').length,
    [orders]
  );

  const approvedCount = useMemo(
    () => orders.filter((o) => o.status === 'APPROVED').length,
    [orders]
  );

  const completedValue = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'COMPLETED')
        .reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0),
    [orders]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const renderOrder = ({ item }: { item: any }) => {
    const s = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING_APPROVAL;
    const commodity = item.listing?.lot?.commodityName || 'Unknown';
    const iconName = COMMODITY_ICON[commodity] || COMMODITY_ICON.default;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/orders/${item.id}`)}
        activeOpacity={0.84}
      >
        <View style={styles.orderCardTop}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Ionicons name={iconName as any} size={20} color={BUYER_PRIMARY} />
            </View>

            <View style={styles.cardHeaderMain}>
              <View style={styles.cardTitleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.commodityName} numberOfLines={1}>
                    {commodity}
                  </Text>
                  <Text style={styles.lotText} numberOfLines={1}>
                    Lot: {item.listing?.lot?.lotNumber || '—'}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon as any} size={12} color={s.color} />
                  <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.metricsPanel}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total</Text>
              <Text style={styles.metricPrimary}>
                ₹{Number(item.totalAmount || 0).toLocaleString()}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Qty</Text>
              <Text style={styles.metricValue}>{Number(item.quantityKg || 0)} kg</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Rate</Text>
              <Text style={styles.metricValue}>
                ₹{Number(item.agreedPricePerKg || 0)}/kg
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.orderCardBottom}>
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <Ionicons name="business-outline" size={12} color="#7C8A9F" />
              <Text style={styles.footerText} numberOfLines={1}>
                {item.listing?.lot?.facility?.name || '—'}
              </Text>
            </View>

            <Text style={styles.footerText}>
              {new Date(item.createdAt).toLocaleDateString('en-IN')}
            </Text>
          </View>

          {item.status === 'PENDING_APPROVAL' && (
            <View style={styles.pendingBanner}>
              <Ionicons name="time-outline" size={14} color="#C98212" />
              <Text style={styles.pendingText}>Waiting for farmer to approve release</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const Header = () => (
    <View style={styles.headerWrap}>
      <View style={{ height: insets.top + 8 }} />

      <View style={styles.topRow}>
        <Text style={styles.topKicker}>Orders</Text>
        <View style={styles.topBadge}>
          <Ionicons name="receipt-outline" size={13} color="#D7FFFA" />
          <Text style={styles.topBadgeText}>{orders.length}</Text>
        </View>
      </View>

      <Text style={styles.pageTitle}>My Orders</Text>
      <Text style={styles.pageSubtitle}>
        Track approvals, dispatch, and completed purchases
      </Text>

      <LinearGradient
        colors={['#0B3B36', '#0F766E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroCardRow}>
          <View style={styles.heroPrimaryBlock}>
            <Text style={styles.heroCardLabel}>Completed Value</Text>
            <Text style={styles.heroCardValue}>₹{completedValue.toLocaleString()}</Text>
          </View>

          <View style={styles.heroMiniStats}>
            <View style={styles.heroMiniPill}>
              <Text style={styles.heroMiniValue}>{orders.length}</Text>
              <Text style={styles.heroMiniLabel}>Orders</Text>
            </View>

            <View style={styles.heroMiniPill}>
              <Text style={[styles.heroMiniValue, { color: '#FFD089' }]}>{pendingCount}</Text>
              <Text style={styles.heroMiniLabel}>Pending</Text>
            </View>

            <View style={styles.heroMiniPill}>
              <Text style={[styles.heroMiniValue, { color: '#9AF0C8' }]}>{approvedCount}</Text>
              <Text style={styles.heroMiniLabel}>Approved</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabsWrap}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.tabsList}
          renderItem={({ item }) => {
            const active = activeTab === item;
            return (
              <TouchableOpacity
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(item)}
                activeOpacity={0.82}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {filtered.length} order{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BUYER_PRIMARY} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <FlatList
          data={filtered}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BUYER_PRIMARY}
              colors={[BUYER_PRIMARY]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="receipt-outline" size={30} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Orders Yet</Text>
              <Text style={styles.emptyText}>
                Browse the marketplace to find and buy produce
              </Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SCREEN_BG,
  },

  list: {
    paddingBottom: Platform.OS === 'ios' ? 96 : 28,
  },

  headerWrap: {
    backgroundColor: SCREEN_BG,
    paddingBottom: 8,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },

  topKicker: {
    fontSize: FontSize.sm,
    color: '#7C8A9F',
    fontWeight: FontWeight.medium,
  },

  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F766E',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  topBadgeText: {
    fontSize: FontSize.xs,
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
  },

  pageTitle: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
    marginTop: 14,
    paddingHorizontal: Spacing.lg,
  },

  pageSubtitle: {
    fontSize: FontSize.sm,
    color: '#7C8A9F',
    marginTop: 6,
    paddingHorizontal: Spacing.lg,
  },

  heroCard: {
    marginHorizontal: Spacing.lg,
    marginTop: 18,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#0B3B36',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },

  heroCardRow: {
    gap: 16,
  },

  heroPrimaryBlock: {
    paddingBottom: 2,
  },

  heroCardLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.72)',
  },

  heroCardValue: {
    fontSize: 30,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    marginTop: 4,
  },

  heroMiniStats: {
    flexDirection: 'row',
    gap: 10,
  },

  heroMiniPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },

  heroMiniValue: {
    fontSize: 18,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  heroMiniLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
    textAlign: 'center',
  },

  tabsWrap: {
    marginTop: 16,
    marginBottom: 2,
  },

  tabsList: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },

  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: '#EEF2F1',
    borderWidth: 1,
    borderColor: '#DCE5E3',
  },

  tabActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },

  tabText: {
    fontSize: FontSize.sm,
    color: '#5F6C80',
    fontWeight: FontWeight.semibold,
  },

  tabTextActive: {
    color: '#FFFFFF',
  },

  resultsRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 10,
    paddingBottom: 10,
  },

  resultsText: {
    fontSize: FontSize.xs,
    color: '#7C8A9F',
  },

  orderCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: 14,
    borderRadius: 24,
    backgroundColor: '#FFFDF9',
    overflow: 'hidden',
    shadowColor: '#102A26',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EEF2EF',
  },

  orderCardTop: {
    padding: 16,
    backgroundColor: '#FFFDF9',
  },

  orderCardBottom: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FCFAF6',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },

  cardHeaderMain: {
    flex: 1,
  },

  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E7F6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  commodityName: {
    fontSize: 18,
    fontWeight: FontWeight.bold,
    color: '#111827',
  },

  lotText: {
    fontSize: FontSize.xs,
    color: '#8A94A6',
    marginTop: 4,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },

  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  metricsPanel: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#F4F6F8',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 2,
  },

  metricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  metricDivider: {
    width: 1,
    backgroundColor: '#D8E0E7',
    marginVertical: 4,
  },

  metricLabel: {
    fontSize: FontSize.xs,
    color: '#8A94A6',
    marginBottom: 4,
  },

  metricPrimary: {
    fontSize: 18,
    fontWeight: FontWeight.bold,
    color: BUYER_PRIMARY,
  },

  metricValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#111827',
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },

  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 10,
  },

  footerText: {
    fontSize: FontSize.xs,
    color: '#7C8A9F',
  },

  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F7F1DD',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 14,
  },

  pendingText: {
    fontSize: FontSize.xs,
    color: '#C98212',
    flex: 1,
  },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 72,
  },

  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: '#0F172A',
  },

  emptyText: {
    fontSize: FontSize.sm,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
});