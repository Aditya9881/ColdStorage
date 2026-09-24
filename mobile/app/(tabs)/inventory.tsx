import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { SkeletonList } from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import SubPageHeader from '@/components/SubPageHeader';

const COMMODITY_ICON: Record<string, string> = {
  POTATO: 'nutrition-outline',
  ONION: 'ellipse-outline',
  VEGETABLES: 'leaf-outline',
  FRUITS: 'nutrition',
  GRAINS: 'sunny-outline',
  DAIRY: 'water-outline',
  SPICES: 'flame-outline',
  OTHER: 'cube-outline',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  STORED: {
    label: 'In storage',
    color: '#0B7450',
    bg: '#E9F7EF',
    border: '#C9E9D7',
    icon: 'checkmark-circle',
  },
  PARTIALLY_RELEASED: {
    label: 'Partly taken out',
    color: '#926214',
    bg: '#FFF5DF',
    border: '#F0DEB0',
    icon: 'pie-chart-outline',
  },
  FULLY_RELEASED: {
    label: 'Taken out',
    color: '#5E6A74',
    bg: '#F3F5F7',
    border: '#E3E8ED',
    icon: 'exit-outline',
  },
  INTAKE_PENDING: {
    label: 'Waiting',
    color: '#15617A',
    bg: '#E9F8FD',
    border: '#C7EAF4',
    icon: 'time-outline',
  },
  EXPIRED: {
    label: 'Expired',
    color: '#A43939',
    bg: '#FFF0F0',
    border: '#F2CCCC',
    icon: 'alert-circle-outline',
  },
};

const FILTERS = [
  { key: 'All', label: 'All', status: '' },
  { key: 'Stored', label: 'In storage', status: 'STORED' },
  { key: 'Partial', label: 'Partly out', status: 'PARTIALLY_RELEASED' },
  { key: 'Pending', label: 'Waiting', status: 'INTAKE_PENDING' },
  { key: 'Released', label: 'Taken out', status: 'FULLY_RELEASED' },
] as const;

const SORT_OPTIONS = [
  { key: 'newest', label: 'Latest', icon: 'time-outline' },
  { key: 'weight', label: 'More stock', icon: 'scale-outline' },
  { key: 'rent', label: 'More charges', icon: 'wallet-outline' },
] as const;

const UI = {
  canvas: '#F4F5F1',
  surface: '#FFFFFF',
  surfaceSoft: '#F8F8F4',
  surfaceMuted: '#F1F4EF',
  border: '#E1E6DE',
  text: '#18231D',
  textMuted: '#6F7C75',
  textSoft: '#98A39C',
  forest: '#104036',
  forestSoft: '#EAF5EF',
  gold: '#D3A03A',
};

export default function InventoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');

  const fetchLots = useCallback(async () => {
    try {
      setError(false);
      const res = await api.get<any>('/inventory/my-lots?limit=100');
      if (res.success && res.data?.lots) {
        setLots(res.data.lots);
      } else {
        setLots([]);
      }
    } catch (err) {
      console.error('Fetch lots error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLots();
    setRefreshing(false);
  };

  const filteredLots = useMemo(() => {
    let result = [...lots];
    const filterConfig = FILTERS.find((f) => f.key === activeFilter);

    if (filterConfig?.status) {
      result = result.filter((l) => l.status === filterConfig.status);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.lotNumber?.toLowerCase().includes(q) ||
          l.commodityName?.toLowerCase().includes(q) ||
          l.facility?.name?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'weight') {
      result.sort((a, b) => Number(b.currentWeightKg) - Number(a.currentWeightKg));
    } else if (sortBy === 'rent') {
      result.sort((a, b) => (b.estimatedRent || 0) - (a.estimatedRent || 0));
    } else {
      result.sort(
        (a, b) =>
          new Date(b.intakeDate || 0).getTime() -
          new Date(a.intakeDate || 0).getTime()
      );
    }

    return result;
  }, [lots, activeFilter, search, sortBy]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={UI.canvas} />
          <SubPageHeader title="My Storage" />
          <SkeletonList count={4} />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <ErrorState variant="network" onRetry={fetchLots} />
        </View>
      </>
    );
  }

  const renderLot = ({ item, index }: { item: any; index: number }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.STORED;
    const weight = Number(item.currentWeightKg || 0);
    const intakeWeight = Number(item.intakeWeightKg || weight);
    const stockLeftPercent =
      intakeWeight > 0 ? Math.min(100, (weight / intakeWeight) * 100) : 100;
    const days = item.daysSinceIntake || 0;
    const commodityIcon = COMMODITY_ICON[item.commodityCategory] || 'cube-outline';

    const iconTone =
      index % 3 === 0 ? '#12A66D' : index % 3 === 1 ? '#D2A03A' : '#2C9BC3';

    return (
      <TouchableOpacity
        style={styles.lotCard}
        onPress={() => {
          router.push(`/lots/${item.id}`);
          hapticLight();
        }}
        activeOpacity={0.9}
      >
        <View style={styles.cardTop}>
          <View style={[styles.commodityIconWrap, { borderColor: `${iconTone}25` }]}>
            <View style={[styles.commodityIconInner, { backgroundColor: iconTone }]}>
              <Ionicons name={commodityIcon as any} size={18} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.lotTextWrap}>
            <View style={styles.titleRow}>
              <Text style={styles.lotCommodity} numberOfLines={1}>
                {item.commodityName || 'Unknown'}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: status.bg,
                    borderColor: status.border,
                  },
                ]}
              >
                <Ionicons name={status.icon as any} size={10} color={status.color} />
                <Text style={[styles.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            <Text style={styles.lotNumber} numberOfLines={1}>
              {item.lotNumber || '—'}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricPrimaryCard}>
            <Text style={styles.metricPrimaryLabel}>Current stock</Text>
            <Text style={styles.metricPrimaryValue}>
              {(weight / 1000).toFixed(2)} MT
            </Text>
          </View>

          <View style={styles.metricSideCol}>
            <View style={styles.metricMiniCard}>
              <Text style={styles.metricMiniLabel}>Initial</Text>
              <Text style={styles.metricMiniValue}>
                {(intakeWeight / 1000).toFixed(2)} MT
              </Text>
            </View>

            <View style={styles.metricMiniCard}>
              <Text style={styles.metricMiniLabel}>Charges</Text>
              <Text style={styles.metricMiniValueGold}>
                ₹{(item.estimatedRent || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressTitle}>Stock left</Text>
            <Text style={styles.progressValue}>{stockLeftPercent.toFixed(0)}%</Text>
          </View>

          <View style={styles.weightBar}>
            <View
              style={[
                styles.weightFill,
                {
                  width: `${stockLeftPercent}%`,
                  backgroundColor:
                    stockLeftPercent < 50
                      ? '#E4584D'
                      : stockLeftPercent < 80
                      ? '#D69B2D'
                      : '#17A26B',
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerItem}>
            <Ionicons name="business-outline" size={11} color={UI.textSoft} />
            <Text style={styles.footerText} numberOfLines={1}>
              {item.facility?.name || '—'}
            </Text>
          </View>

          <View style={styles.footerDot} />

          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={11} color={UI.textSoft} />
            <Text style={styles.footerText}>{days} days</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={UI.canvas} />

        <SubPageHeader
          title="My Storage"
          subtitle="Check stored crops, stock left, and charges"
        />

        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search crop, lot, or storage..."
              placeholderTextColor="#98A2B3"
              style={styles.searchInput}
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.84}>
                <Ionicons name="close-circle" size={17} color="#A0A8B5" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.controlsWrap}>
          <FlatList
            data={FILTERS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.filterRow}
            renderItem={({ item }) => {
              const active = activeFilter === item.key;
              return (
                <TouchableOpacity
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  activeOpacity={0.84}
                  onPress={() => {
                    setActiveFilter(item.key);
                    hapticSelection();
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.sortRow}>
            {SORT_OPTIONS.map((opt) => {
              const active = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sortPill, active && styles.sortPillActive]}
                  activeOpacity={0.84}
                  onPress={() => {
                    setSortBy(opt.key);
                    hapticSelection();
                  }}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={12}
                    color={active ? UI.forest : UI.textSoft}
                  />
                  <Text
                    style={[styles.sortPillText, active && styles.sortPillTextActive]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {filteredLots.length} lot{filteredLots.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        <FlatList
          data={filteredLots}
          renderItem={renderLot}
          keyExtractor={(item) => item.id}
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
            <EmptyState
              icon="cube-outline"
              title={search ? 'No matching crops' : 'No crops yet'}
              subtitle={
                search
                  ? 'Try a different crop, lot, or storage name.'
                  : 'Your stored crops will appear here.'
              }
              action={
                search
                  ? undefined
                  : {
                      label: 'Find Storage',
                      onPress: () => router.push('/discover'),
                    }
              }
            />
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  topSpacer: {
    height: 24, // overridden inline with insets.top
  },

  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EBE6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBtnGhost: {
    width: 40,
    height: 40,
  },

  titleWrap: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
  },

  screenTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    color: UI.text,
    letterSpacing: -0.4,
  },

  screenSub: {
    fontSize: 11,
    lineHeight: 15,
    color: UI.textMuted,
    marginTop: 2,
  },

  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
  },

  searchBox: {
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E4E8E4',
    shadowColor: '#173528',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 8,
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    color: '#23323D',
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: Platform.OS === 'ios' ? 13 : 9,
  },

  controlsWrap: {
    paddingTop: 12,
    paddingBottom: 4,
  },

  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },

  filterChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterChipActive: {
    backgroundColor: UI.forest,
    borderColor: UI.forest,
  },

  filterChipText: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 8,
  },

  sortPill: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E5EBE4',
    backgroundColor: UI.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  sortPillActive: {
    backgroundColor: '#EEF6F1',
    borderColor: '#BED8C8',
  },

  sortPillText: {
    color: UI.textSoft,
    fontSize: 11,
    fontWeight: '700',
  },

  sortPillTextActive: {
    color: UI.forest,
  },

  countRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },

  countText: {
    fontSize: 11,
    color: '#7C8A9F',
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: Platform.OS === 'ios' ? 108 : 90,
  },

  lotCard: {
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    padding: 14,
    shadowColor: '#162C22',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  commodityIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAF8',
  },

  commodityIconInner: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  lotTextWrap: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },

  lotCommodity: {
    flex: 1,
    color: UI.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    paddingRight: 4,
  },

  lotNumber: {
    marginTop: 3,
    color: UI.textSoft,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  statusBadge: {
    minHeight: 28,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  metricsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },

  metricPrimaryCard: {
    flex: 1.05,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 13,
    backgroundColor: UI.surfaceSoft,
    borderWidth: 1,
    borderColor: '#ECEFE9',
    justifyContent: 'center',
  },

  metricPrimaryLabel: {
    color: UI.textSoft,
    fontSize: 11,
    fontWeight: '700',
  },

  metricPrimaryValue: {
    marginTop: 6,
    color: UI.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  metricSideCol: {
    flex: 0.95,
    gap: 8,
  },

  metricMiniCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#FAFBF8',
    borderWidth: 1,
    borderColor: '#ECEFE9',
    justifyContent: 'center',
  },

  metricMiniLabel: {
    color: UI.textSoft,
    fontSize: 10,
    fontWeight: '700',
  },

  metricMiniValue: {
    marginTop: 4,
    color: UI.text,
    fontSize: 13,
    fontWeight: '800',
  },

  metricMiniValueGold: {
    marginTop: 4,
    color: UI.gold,
    fontSize: 13,
    fontWeight: '800',
  },

  progressSection: {
    marginTop: 14,
  },

  progressTopRow: {
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  progressTitle: {
    color: UI.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  progressValue: {
    color: UI.text,
    fontSize: 11,
    fontWeight: '800',
  },

  weightBar: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#ECF0EB',
    overflow: 'hidden',
  },

  weightFill: {
    height: '100%',
    borderRadius: 999,
  },

  footerRow: {
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDF1ED',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },

  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },

  footerText: {
    color: UI.textMuted,
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 170,
  },

  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D3DAD4',
  },
});