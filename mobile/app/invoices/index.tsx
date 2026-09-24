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

interface Invoice {
  id: string;
  invoiceNumber: string;
  facilityName?: string;
  facility?: { name: string };
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
  lineItems?: any[];
}

const TABS = ['ALL', 'ISSUED', 'PAID', 'OVERDUE'] as const;
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
  gold: '#D8B24A',
  goldSoft: '#FFF7E5',
  goldBorder: '#F2DFB2',
  danger: DetailUI.danger,
  dangerSoft: DetailUI.dangerSoft,
  success: DetailUI.success,
  successSoft: DetailUI.successSoft,
};

export default function InvoiceListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('ALL');

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await api.get<any>('/invoices?limit=100');
      if (res.success && res.data) {
        const items = Array.isArray(res.data) ? res.data : res.data.invoices || [];
        setInvoices(items);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.error('[Invoices] Fetch error:', err);
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchInvoices();
    }, [fetchInvoices])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoices();
  }, [fetchInvoices]);

  const filtered = useMemo(() => {
    if (activeTab === 'ALL') return invoices;
    return invoices.filter((i) => i.status === activeTab);
  }, [activeTab, invoices]);

  const counts = useMemo(() => {
    return {
      ALL: invoices.length,
      ISSUED: invoices.filter((i) => i.status === 'ISSUED').length,
      PAID: invoices.filter((i) => i.status === 'PAID').length,
      OVERDUE: invoices.filter((i) => i.status === 'OVERDUE').length,
    };
  }, [invoices]);

  const totalUnpaid = useMemo(() => {
    return invoices
      .filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED')
      .reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);
  }, [invoices]);

  const totalPaid = useMemo(() => {
    return invoices.reduce((sum, i) => sum + Number(i.paidAmount || 0), 0);
  }, [invoices]);

  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderInvoice = ({ item }: { item: Invoice }) => {
    const facilityName = item.facility?.name || item.facilityName || 'Cold Storage';
    const isOverdue = item.status === 'OVERDUE';
    const remaining = item.totalAmount - item.paidAmount;
    const isSettled = remaining <= 0 || item.status === 'PAID';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isOverdue && styles.cardOverdue,
        ]}
        activeOpacity={0.88}
        onPress={() => router.push(`/invoices/${item.id}`)}
      >
        <View style={styles.cardTopRow}>
          <View
            style={[
              styles.iconWrap,
              isOverdue
                ? styles.iconWrapDanger
                : isSettled
                ? styles.iconWrapSuccess
                : styles.iconWrapDefault,
            ]}
          >
            <Ionicons
              name={
                isOverdue
                  ? 'alert-circle-outline'
                  : isSettled
                  ? 'checkmark-done-outline'
                  : 'receipt-outline'
              }
              size={20}
              color={isOverdue ? UI.danger : isSettled ? UI.success : UI.forest}
            />
          </View>

          <View style={styles.cardHeaderText}>
            <View style={styles.invoiceTitleRow}>
              <Text style={styles.invoiceNumber} numberOfLines={1}>
                {item.invoiceNumber}
              </Text>
              <StatusChip status={item.status} />
            </View>

            <Text style={styles.facilityName} numberOfLines={1}>
              {facilityName}
            </Text>
          </View>
        </View>

        <View style={styles.metricStrip}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Total</Text>
            <Text style={styles.metricValue}>{formatCurrency(item.totalAmount)}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>
              {isSettled ? 'Status' : 'Balance'}
            </Text>
            <Text
              style={[
                styles.metricValue,
                isSettled
                  ? styles.metricValueSuccess
                  : isOverdue
                  ? styles.metricValueDanger
                  : styles.metricValueGold,
              ]}
            >
              {isSettled ? 'Settled' : formatCurrency(remaining)}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Date</Text>
            <Text style={styles.metricDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerPill}>
            <Ionicons name="calendar-outline" size={12} color={UI.textSoft} />
            <Text style={styles.footerText}>
              {item.dueDate ? `Due ${formatDate(item.dueDate)}` : 'No due date'}
            </Text>
          </View>

          <View style={styles.footerPill}>
            <Ionicons name="wallet-outline" size={12} color={UI.textSoft} />
            <Text style={styles.footerText}>
              Paid {formatCurrency(item.paidAmount || 0)}
            </Text>
          </View>
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
          <Text style={styles.headerKicker}>Billing</Text>
          <Text style={styles.headerTitle}>Invoices</Text>
          <Text style={styles.headerSubtitle}>Track issued, paid, and overdue bills</Text>
        </View>

        <View style={styles.rightSlot} />
      </View>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
          <Text style={styles.summaryCardLabel}>Outstanding</Text>
          <Text style={styles.summaryCardValue}>{formatCurrency(totalUnpaid)}</Text>
          <Text style={styles.summaryCardSub}>{counts.OVERDUE} overdue invoices</Text>
        </View>

        <View style={styles.summarySideCol}>
          <View style={styles.summaryMiniCard}>
            <Text style={styles.summaryMiniLabel}>Total invoices</Text>
            <Text style={styles.summaryMiniValue}>{counts.ALL}</Text>
          </View>

          <View style={styles.summaryMiniCard}>
            <Text style={styles.summaryMiniLabel}>Paid amount</Text>
            <Text style={[styles.summaryMiniValue, { color: UI.success }]}>
              {formatCurrency(totalPaid)}
            </Text>
          </View>
        </View>
      </View>

      {totalUnpaid > 0 && (
        <View style={styles.alertBanner}>
          <Ionicons name="alert-circle" size={17} color={UI.gold} />
          <Text style={styles.alertText}>
            Outstanding amount <Text style={styles.alertHighlight}>{formatCurrency(totalUnpaid)}</Text>
          </Text>
        </View>
      )}

      <View style={styles.tabsOuter}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.tabsRow}
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
          {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingWrap}>
          <StatusBar barStyle="dark-content" backgroundColor={UI.bg} />
          <View style={styles.loadingOrb}>
            <Ionicons name="receipt-outline" size={28} color={UI.forest} />
          </View>
          <ActivityIndicator size="small" color={UI.forest} />
          <Text style={styles.loadingTitle}>Loading invoices</Text>
          <Text style={styles.loadingSub}>Fetching your latest billing records</Text>
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
          renderItem={renderInvoice}
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
                icon="receipt-outline"
                title="No Invoices"
                subtitle={
                  activeTab !== 'ALL'
                    ? `No ${activeTab.toLowerCase()} invoices found`
                    : 'Your invoices will appear here once billing begins'
                }
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

  loadingWrap: {
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
    paddingBottom: 8,
    backgroundColor: UI.bg,
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
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: UI.textMuted,
    textAlign: 'center',
  },

  summaryGrid: {
    marginTop: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },

  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },

  summaryCardPrimary: {
    flex: 1.15,
    backgroundColor: UI.forest,
    borderColor: UI.forest,
    padding: 16,
  },

  summaryCardLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '600',
  },

  summaryCardValue: {
    marginTop: 6,
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },

  summaryCardSub: {
    marginTop: 5,
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
  },

  summarySideCol: {
    flex: 0.85,
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

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: UI.goldSoft,
    borderWidth: 1,
    borderColor: UI.goldBorder,
  },

  alertText: {
    flex: 1,
    fontSize: 13,
    color: UI.text,
    fontWeight: '500',
  },

  alertHighlight: {
    color: UI.gold,
    fontWeight: '800',
  },

  tabsOuter: {
    marginTop: 12,
  },

  tabsRow: {
    paddingHorizontal: 16,
    gap: 10,
  },

  tab: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
    backgroundColor: UI.forestSoft,
  },

  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    paddingBottom: 36,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 22,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#1D1D1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  cardOverdue: {
    borderColor: '#F2C9C9',
    backgroundColor: '#FFFDFD',
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrapDefault: {
    backgroundColor: UI.forestSoft,
  },

  iconWrapSuccess: {
    backgroundColor: UI.successSoft,
  },

  iconWrapDanger: {
    backgroundColor: UI.dangerSoft,
  },

  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  invoiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },

  invoiceNumber: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: UI.forest,
    letterSpacing: -0.2,
    paddingTop: 1,
  },

  facilityName: {
    marginTop: 4,
    fontSize: 13,
    color: UI.textMuted,
  },

  metricStrip: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: UI.surfaceAlt,
    borderWidth: 1,
    borderColor: UI.borderSoft,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  metricBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  metricDivider: {
    width: 1,
    height: 34,
    backgroundColor: UI.border,
  },

  metricLabel: {
    fontSize: 11,
    color: UI.textSoft,
    marginBottom: 5,
    fontWeight: '600',
  },

  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.text,
    textAlign: 'center',
  },

  metricValueGold: {
    color: UI.gold,
  },

  metricValueDanger: {
    color: UI.danger,
  },

  metricValueSuccess: {
    color: UI.success,
  },

  metricDate: {
    fontSize: 13,
    fontWeight: '600',
    color: UI.textMuted,
    textAlign: 'center',
  },

  footerRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },

  footerPill: {
    flex: 1,
    minHeight: 34,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.borderSoft,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  footerText: {
    flex: 1,
    fontSize: 11,
    color: UI.textMuted,
    fontWeight: '600',
  },

  emptyWrap: {
    paddingTop: 68,
    paddingHorizontal: 16,
  },
});