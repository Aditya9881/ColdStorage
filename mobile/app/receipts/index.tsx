import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { api } from '@/lib/api-client';
import StatusChip from '@/components/ui/StatusChip';
import EmptyState from '@/components/ui/EmptyState';
import { DetailUI } from '@/components/DetailScreenCard';

interface Receipt {
  id: string;
  receiptNumber: string;
  lot?: {
    id: string;
    lotNumber: string;
    commodityName?: string;
    currentWeightKg?: number;
  };
  isNegotiable: boolean;
  isPledged: boolean;
  pledgedTo?: string | null;
  status: string;
  createdAt: string;
  expiresAt?: string | null;
}

const TABS = ['ALL', 'ACTIVE', 'PLEDGED', 'REVOKED'] as const;
type Tab = typeof TABS[number];

const UI = {
  bg: DetailUI.canvas,
  surface: DetailUI.surface,
  surfaceAlt: '#FBFCFA',
  surfaceSoft: '#F3F5F1',
  text: DetailUI.ink,
  textMuted: DetailUI.muted,
  textSoft: DetailUI.subtle,
  border: DetailUI.border,
  borderSoft: DetailUI.borderSoft,
  forest: DetailUI.primary,
  forestDeep: DetailUI.primaryDark,
  forestSoft: '#E8F3EE',
  successSoft: DetailUI.successSoft,
  violetSoft: '#F5F3FF',
  goldSoft: DetailUI.warningSoft,
  dangerSoft: DetailUI.dangerSoft,
  violet: '#7C3AED',
  gold: DetailUI.warning,
  danger: DetailUI.danger,
};

export default function ReceiptListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('ALL');

  const fetchReceipts = useCallback(async () => {
    try {
      const res = await api.get<any>('/warehouse-receipts?limit=100');
      if (res.success && res.data) {
        const items = Array.isArray(res.data) ? res.data : res.data.receipts || [];
        setReceipts(items);
      } else {
        setReceipts([]);
      }
    } catch (err) {
      console.error('[Receipts] Fetch error:', err);
      setReceipts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReceipts();
    }, [fetchReceipts])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReceipts();
  }, [fetchReceipts]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatWeight = (kg?: number) => {
    if (kg === undefined || kg === null) return '—';
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)} MT`;
    return `${kg.toFixed(1)} kg`;
  };

  const filtered = useMemo(() => {
    if (activeTab === 'ALL') return receipts;
    return receipts.filter((r) => r.status === activeTab);
  }, [activeTab, receipts]);

  const counts = useMemo(() => {
    return {
      ALL: receipts.length,
      ACTIVE: receipts.filter((r) => r.status === 'ACTIVE').length,
      PLEDGED: receipts.filter((r) => r.status === 'PLEDGED').length,
      REVOKED: receipts.filter((r) => r.status === 'REVOKED').length,
    };
  }, [receipts]);

  const pledgedCount = useMemo(
    () => receipts.filter((r) => r.isPledged).length,
    [receipts]
  );

  const negotiableCount = useMemo(
    () => receipts.filter((r) => r.isNegotiable).length,
    [receipts]
  );

  const renderReceipt = ({ item }: { item: Receipt }) => {
    const commodity = item.lot?.commodityName || 'Unknown commodity';
    const weight = formatWeight(item.lot?.currentWeightKg);
    const isPledged = item.isPledged || item.status === 'PLEDGED';
    const isRevoked = item.status === 'REVOKED';

    return (
      <TouchableOpacity
        style={[styles.card, isRevoked && styles.cardRevoked]}
        activeOpacity={0.88}
        onPress={() => router.push(`/receipts/${item.id}`)}
      >
        <View style={styles.cardTopRow}>
          <View
            style={[
              styles.receiptIcon,
              isRevoked
                ? styles.receiptIconDanger
                : isPledged
                ? styles.receiptIconViolet
                : styles.receiptIconDefault,
            ]}
          >
            <Ionicons
              name={isPledged ? 'shield-checkmark-outline' : 'document-text-outline'}
              size={20}
              color={isPledged ? UI.violet : UI.forest}
            />
          </View>

          <View style={styles.cardTopContent}>
            <View style={styles.titleRow}>
              <Text style={styles.receiptNumber} numberOfLines={1}>
                {item.receiptNumber}
              </Text>
              <StatusChip status={item.status} />
            </View>

            <Text style={styles.commodity} numberOfLines={1}>
              {commodity}
            </Text>

            <Text style={styles.weightText}>{weight}</Text>
          </View>
        </View>

        <View style={styles.metricStrip}>
          <View style={styles.metricBox}>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaValue}>{formatDate(item.createdAt)}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricBox}>
            <Text style={styles.metaLabel}>Lot</Text>
            <Text style={styles.metaValue}>{item.lot?.lotNumber || '—'}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricBox}>
            <Text style={styles.metaLabel}>Type</Text>
            <Text style={styles.metaValue}>
              {item.isNegotiable ? 'Negotiable' : 'Standard'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.badgeRow}>
            {item.isNegotiable && (
              <View style={[styles.inlineBadge, { backgroundColor: UI.successSoft }]}>
                <Ionicons
                  name="swap-horizontal-outline"
                  size={12}
                  color={UI.forest}
                />
                <Text style={[styles.inlineBadgeText, { color: UI.forest }]}>
                  Negotiable
                </Text>
              </View>
            )}

            {item.isPledged && (
              <View style={[styles.inlineBadge, { backgroundColor: UI.violetSoft }]}>
                <Ionicons name="lock-closed-outline" size={12} color={UI.violet} />
                <Text style={[styles.inlineBadgeText, { color: UI.violet }]}>
                  {item.pledgedTo ? `Pledged · ${item.pledgedTo}` : 'Pledged'}
                </Text>
              </View>
            )}

            {item.expiresAt && (
              <View style={[styles.inlineBadge, { backgroundColor: UI.goldSoft }]}>
                <Ionicons name="time-outline" size={12} color={UI.gold} />
                <Text style={[styles.inlineBadgeText, { color: UI.gold }]}>
                  Expires {formatDate(item.expiresAt)}
                </Text>
              </View>
            )}
          </View>

          <Ionicons name="chevron-forward" size={18} color="#A3ADB7" />
        </View>
      </TouchableOpacity>
    );
  };

  const Header = () => (
    <View style={styles.headerWrap}>
      <View style={{ height: insets.top + 8 }} />

      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.84}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={20} color={UI.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>eNWR</Text>
          <Text style={styles.headerTitle}>Warehouse Receipts</Text>
          <Text style={styles.headerSub}>Your verified digital receipt records</Text>
        </View>

        <View style={styles.rightSlot} />
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryPrimary}>
          <Text style={styles.summaryPrimaryLabel}>Active receipts</Text>
          <Text style={styles.summaryPrimaryValue}>{counts.ACTIVE}</Text>
          <Text style={styles.summaryPrimarySub}>
            {counts.ALL} total receipts
          </Text>
        </View>

        <View style={styles.summarySideCol}>
          <View style={styles.summaryMiniCard}>
            <Text style={styles.summaryMiniLabel}>Pledged</Text>
            <Text style={[styles.summaryMiniValue, { color: UI.violet }]}>
              {pledgedCount}
            </Text>
          </View>

          <View style={styles.summaryMiniCard}>
            <Text style={styles.summaryMiniLabel}>Negotiable</Text>
            <Text style={[styles.summaryMiniValue, { color: UI.forest }]}>
              {negotiableCount}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tabWrap}>
        <FlatList
          data={TABS}
          horizontal
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
          renderItem={({ item: tab }) => {
            const isActive = activeTab === tab;
            const count = counts[tab];

            return (
              <TouchableOpacity
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.84}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </Text>

                {count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text
                      style={[
                        styles.tabBadgeText,
                        isActive && styles.tabBadgeTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {filtered.length} receipt{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingScreen}>
          <StatusBar barStyle="dark-content" backgroundColor={UI.bg} />
          <View style={styles.loadingOrb}>
            <Ionicons name="document-text-outline" size={28} color={UI.forest} />
          </View>
          <ActivityIndicator size="small" color={UI.forest} />
          <Text style={styles.loadingTitle}>Loading receipts</Text>
          <Text style={styles.loadingSub}>Fetching your latest eNWR records</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={UI.bg} />

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderReceipt}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.listContent}
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
                icon="document-outline"
                title="No Receipts"
                subtitle="Warehouse receipts (eNWR) will appear here once generated for your stored lots"
              />
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
    backgroundColor: UI.bg,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: UI.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  loadingOrb: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: UI.forestSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: UI.text,
    marginTop: 16,
  },

  loadingSub: {
    fontSize: 13,
    color: UI.textMuted,
    marginTop: 6,
  },

  headerWrap: {
    backgroundColor: UI.bg,
    paddingBottom: 8,
  },

  topRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.border,
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  rightSlot: {
    width: 42,
    height: 42,
  },

  headerKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: UI.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  headerTitle: {
    marginTop: 3,
    fontSize: 24,
    fontWeight: '800',
    color: UI.text,
    letterSpacing: -0.3,
    textAlign: 'center',
  },

  headerSub: {
    fontSize: 12,
    fontWeight: '500',
    color: UI.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  summaryGrid: {
    marginTop: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },

  summaryPrimary: {
    flex: 1.1,
    borderRadius: 22,
    backgroundColor: UI.forest,
    borderWidth: 1,
    borderColor: UI.forest,
    padding: 16,
  },

  summaryPrimaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '600',
  },

  summaryPrimaryValue: {
    marginTop: 6,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },

  summaryPrimarySub: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
  },

  summarySideCol: {
    flex: 0.9,
    gap: 10,
  },

  summaryMiniCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },

  summaryMiniLabel: {
    fontSize: 11,
    color: UI.textSoft,
    fontWeight: '600',
  },

  summaryMiniValue: {
    marginTop: 6,
    fontSize: 17,
    color: UI.text,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  tabWrap: {
    paddingTop: 14,
  },

  tabRow: {
    paddingHorizontal: 16,
    gap: 10,
  },

  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.border,
  },

  tabActive: {
    backgroundColor: UI.forest,
    borderColor: UI.forest,
  },

  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.textMuted,
  },

  tabTextActive: {
    color: '#FFFFFF',
  },

  tabBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: '#EEF6F1',
  },

  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  tabBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: UI.forest,
  },

  tabBadgeTextActive: {
    color: '#FFFFFF',
  },

  resultsRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },

  resultsText: {
    fontSize: 11,
    color: UI.textSoft,
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.borderSoft,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.045,
    shadowRadius: 12,
    elevation: 2,
  },

  cardRevoked: {
    backgroundColor: '#FFFDFD',
    borderColor: '#F0E2E2',
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  receiptIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  receiptIconDefault: {
    backgroundColor: UI.forestSoft,
  },

  receiptIconViolet: {
    backgroundColor: UI.violetSoft,
  },

  receiptIconDanger: {
    backgroundColor: UI.dangerSoft,
  },

  cardTopContent: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },

  receiptNumber: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: UI.forest,
    letterSpacing: -0.2,
    paddingTop: 1,
  },

  commodity: {
    fontSize: 13,
    color: UI.text,
    marginTop: 4,
    fontWeight: '700',
  },

  weightText: {
    fontSize: 12,
    color: UI.textSoft,
    marginTop: 3,
    fontWeight: '500',
  },

  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: UI.surfaceAlt,
    borderWidth: 1,
    borderColor: '#EEF1EA',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },

  metricBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  metricDivider: {
    width: 1,
    height: 34,
    backgroundColor: UI.border,
  },

  metaLabel: {
    fontSize: 11,
    color: UI.textSoft,
    fontWeight: '700',
    marginBottom: 4,
  },

  metaValue: {
    fontSize: 12,
    color: UI.text,
    fontWeight: '700',
    textAlign: 'center',
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },

  badgeRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginRight: 8,
  },

  inlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  inlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  emptyWrap: {
    paddingTop: 64,
  },
});