import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  Platform,
  Animated as RNAnimated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
} from '@/constants/Colors';
import { SkeletonList } from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import SearchBar from '@/components/ui/SearchBar';
import SyncBadge from '@/components/SyncBadge';
import { hapticLight, hapticSelection } from '@/lib/haptics';

const COMMODITY_FILTERS = [
  { label: 'All', icon: 'grid-outline', value: '' },
  { label: 'Potato', icon: 'nutrition-outline', value: 'Potato' },
  { label: 'Onion', icon: 'ellipse-outline', value: 'Onion' },
  { label: 'Apple', icon: 'nutrition', value: 'Apple' },
  { label: 'Mango', icon: 'leaf-outline', value: 'Mango' },
  { label: 'Wheat', icon: 'sunny-outline', value: 'Wheat' },
  { label: 'Rice', icon: 'water-outline', value: 'Rice' },
];

const GRADE_FILTERS = ['All', 'A', 'B', 'C'];

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price ↑', value: 'price_asc' },
  { label: 'Price ↓', value: 'price_desc' },
  { label: 'Weight ↓', value: 'weight_desc' },
];

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

const SCREEN_BG = '#F4F7F6';
const BUYER_PRIMARY = '#0F766E';
const BUYER_DARK = '#0B3B36';

export default function BuyerBrowseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedSort, setSelectedSort] = useState('newest');

  const headerAnim = useRef(new RNAnimated.Value(0)).current;

  const fetchListings = useCallback(async () => {
    try {
      setError(false);
      const res = await api.get<any>('/marketplace/listings?limit=50&status=ACTIVE');
      if (res.success && res.data?.listings) {
        setListings(res.data.listings);
      } else {
        setListings([]);
      }
    } catch (err) {
      console.error('Browse error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchListings();
  }, [fetchListings, isAuthenticated]);

  useEffect(() => {
    RNAnimated.timing(headerAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  };

  const cycleGrade = () => {
    const currentIndex = GRADE_FILTERS.indexOf(selectedGrade);
    const nextIndex = (currentIndex + 1) % GRADE_FILTERS.length;
    setSelectedGrade(GRADE_FILTERS[nextIndex]);
    hapticSelection();
  };

  const cycleSort = () => {
    const currentIndex = SORT_OPTIONS.findIndex((s) => s.value === selectedSort);
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
    setSelectedSort(SORT_OPTIONS[nextIndex].value);
    hapticSelection();
  };

  const activeSortLabel =
    SORT_OPTIONS.find((s) => s.value === selectedSort)?.label || 'Newest';

  const filtered = useMemo(() => {
    let result = [...listings];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.lot?.commodityName?.toLowerCase().includes(q) ||
          l.seller?.fullName?.toLowerCase().includes(q)
      );
    }

    if (selectedCommodity) {
      result = result.filter((l) =>
        l.lot?.commodityName?.toLowerCase().includes(selectedCommodity.toLowerCase())
      );
    }

    if (selectedGrade !== 'All') {
      result = result.filter((l) => l.lot?.qualityGrade === selectedGrade);
    }

    switch (selectedSort) {
      case 'price_asc':
        result.sort((a, b) => Number(a.askingPricePerKg) - Number(b.askingPricePerKg));
        break;
      case 'price_desc':
        result.sort((a, b) => Number(b.askingPricePerKg) - Number(a.askingPricePerKg));
        break;
      case 'weight_desc':
        result.sort(
          (a, b) => Number(b.lot?.currentWeightKg || 0) - Number(a.lot?.currentWeightKg || 0)
        );
        break;
      default:
        result.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return result;
  }, [listings, search, selectedCommodity, selectedGrade, selectedSort]);

  const renderListing = useCallback(
    ({ item }: { item: any }) => {
      const commodity = item.lot?.commodityName || 'Unknown';
      const icon = COMMODITY_ICON[commodity] || COMMODITY_ICON.default;
      const weight = Number(item.lot?.currentWeightKg || 0);
      const grade = item.lot?.qualityGrade || '—';
      const price = Number(item.askingPricePerKg || 0);
      const totalValue = price * weight;

      return (
        <TouchableOpacity
          style={styles.premiumCard}
          onPress={() => {
            router.push(`/listing/${item.id}`);
            hapticLight();
          }}
          activeOpacity={0.84}
        >
          <View style={styles.cardUpper}>
            <View style={styles.cardTop}>
              <View style={styles.commodityCircle}>
                <Ionicons name={icon as any} size={20} color={BUYER_PRIMARY} />
              </View>

              <View style={styles.cardMain}>
                <View style={styles.cardTitleRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.commodityName} numberOfLines={1}>
                      {commodity}
                    </Text>
                    <Text style={styles.sellerName} numberOfLines={1}>
                      by {item.seller?.fullName || 'Unknown Seller'}
                    </Text>
                  </View>

                  <View style={styles.priceBox}>
                    <Text style={styles.priceMain}>₹{price.toFixed(0)}</Text>
                    <Text style={styles.priceUnit}>per kg</Text>
                  </View>
                </View>

                <View style={styles.metricStrip}>
                  <View style={styles.metricPill}>
                    <Ionicons name="scale-outline" size={11} color="#6B7280" />
                    <Text style={styles.metricPillText}>{(weight / 1000).toFixed(1)} MT</Text>
                  </View>

                  {grade !== '—' && (
                    <View style={[styles.metricPill, styles.gradePill]}>
                      <Ionicons name="star" size={11} color="#C98212" />
                      <Text style={[styles.metricPillText, { color: '#C98212' }]}>
                        Grade {grade}
                      </Text>
                    </View>
                  )}

                  <View style={styles.metricPill}>
                    <Ionicons name="wallet-outline" size={11} color="#6B7280" />
                    <Text style={styles.metricPillText}>
                      Total ₹{(totalValue / 1000).toFixed(0)}k
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.cardLower}>
            <TouchableOpacity
              style={styles.orderBtn}
              onPress={() => {
                router.push(`/place-order/${item.id}`);
                hapticLight();
              }}
              activeOpacity={0.88}
            >
              <Ionicons name="cart" size={15} color="#FFF" />
              <Text style={styles.orderBtnText}>Place Order</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [router]
  );

  const Header = () => (
    <>
      <LinearGradient
        colors={['#0B3B36', '#0F766E', '#14B8A6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={{ height: insets.top + 8 }} />
        <RNAnimated.View style={{ opacity: headerAnim }}>
          <View style={styles.topBar}>
            <View style={{ flex: 1 }} />
            <SyncBadge />
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.headerGreeting}>Welcome, {user?.fullName || 'Buyer'}</Text>
            <Text style={styles.headerTitle}>Browse Produce</Text>
            <Text style={styles.headerSubtitle}>
              Discover fresh lots from verified sellers
            </Text>
          </View>

          <View style={styles.searchWrap}>
            <View style={styles.searchShell}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search commodity, seller..."
              />
            </View>
          </View>
        </RNAnimated.View>
      </LinearGradient>

      <View style={styles.filtersShell}>
        <FlatList
          data={COMMODITY_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value || 'all'}
          contentContainerStyle={styles.filterChips}
          renderItem={({ item }) => {
            const active = selectedCommodity === item.value;
            return (
              <TouchableOpacity
                style={[
                  styles.commodityChip,
                  active ? styles.commodityChipActive : styles.commodityChipIdle,
                ]}
                onPress={() => {
                  setSelectedCommodity(item.value);
                  hapticSelection();
                }}
                activeOpacity={0.84}
              >
                <Ionicons
                  name={item.icon as any}
                  size={14}
                  color={active ? '#FFF' : '#5F6C80'}
                />
                <Text
                  style={[
                    styles.commodityChipText,
                    { color: active ? '#FFF' : '#5F6C80' },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionPill,
              selectedGrade !== 'All' ? styles.actionPillActive : styles.actionPillIdle,
            ]}
            onPress={cycleGrade}
            activeOpacity={0.85}
          >
            <Ionicons
              name="options-outline"
              size={15}
              color={selectedGrade !== 'All' ? BUYER_PRIMARY : '#5F6C80'}
            />
            <Text
              style={[
                styles.actionPillText,
                { color: selectedGrade !== 'All' ? BUYER_PRIMARY : '#5F6C80' },
              ]}
            >
              {selectedGrade === 'All' ? 'Filter' : `Grade ${selectedGrade}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionPill,
              selectedSort !== 'newest' ? styles.actionPillActive : styles.actionPillIdle,
            ]}
            onPress={cycleSort}
            activeOpacity={0.85}
          >
            <Ionicons
              name="swap-vertical-outline"
              size={15}
              color={selectedSort !== 'newest' ? BUYER_PRIMARY : '#5F6C80'}
            />
            <Text
              style={[
                styles.actionPillText,
                { color: selectedSort !== 'newest' ? BUYER_PRIMARY : '#5F6C80' },
              ]}
            >
              {activeSortLabel}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resultsBar}>
          <Text style={styles.resultsText}>
            {filtered.length} listing{filtered.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <LinearGradient
            colors={['#0B3B36', '#0F766E', '#14B8A6']}
            style={styles.header}
          >
            <View style={{ height: insets.top + 8 }} />
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Browse Produce</Text>
            </View>
          </LinearGradient>
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
          <ErrorState variant="network" onRetry={fetchListings} />
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
          renderItem={renderListing}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={10}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.buyerPrimary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="storefront-outline"
              title={search || selectedCommodity ? 'No Results' : 'No Listings Available'}
              subtitle={
                search || selectedCommodity
                  ? 'Try different filters or search terms'
                  : 'No produce is listed for sale right now. Check back soon!'
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
    backgroundColor: SCREEN_BG,
  },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },

  headerContent: {
    marginBottom: 12,
  },

  headerGreeting: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.74)',
    fontFamily: 'Inter_400Regular',
  },

  headerTitle: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    marginTop: 4,
  },

  headerSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Inter_400Regular',
    marginTop: 5,
  },

  searchWrap: {
    marginTop: 4,
  },

  searchShell: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 22,
    padding: 6,
  },

  filtersShell: {
    paddingTop: 12,
    backgroundColor: SCREEN_BG,
  },

  filterChips: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
    paddingBottom: 8,
  },

  commodityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },

  commodityChipActive: {
    backgroundColor: BUYER_PRIMARY,
    borderColor: BUYER_PRIMARY,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },

  commodityChipIdle: {
    backgroundColor: '#EEF2F1',
    borderColor: '#DCE5E3',
  },

  commodityChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    fontFamily: 'Inter_600SemiBold',
  },

  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 10,
    paddingTop: 2,
    paddingBottom: 8,
  },

  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },

  actionPillIdle: {
    backgroundColor: '#EEF2F1',
    borderColor: '#DCE5E3',
  },

  actionPillActive: {
    backgroundColor: '#E7F6F1',
    borderColor: '#BFE8DB',
  },

  actionPillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    fontFamily: 'Inter_500Medium',
  },

  resultsBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 4,
    paddingBottom: 10,
  },

  resultsText: {
    fontSize: FontSize.xs,
    color: '#7C8A9F',
    fontFamily: 'Inter_400Regular',
  },

  list: {
    paddingBottom: Platform.OS === 'ios' ? 96 : 28,
  },

  premiumCard: {
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

  cardUpper: {
    padding: 16,
    backgroundColor: '#FFFDF9',
  },

  cardLower: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FCFAF6',
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  cardMain: {
    flex: 1,
    marginLeft: 12,
  },

  commodityCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F6F1',
  },

  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  commodityName: {
    fontSize: 17,
    fontWeight: FontWeight.bold,
    fontFamily: 'Inter_700Bold',
    color: '#111827',
  },

  sellerName: {
    fontSize: FontSize.xs,
    marginTop: 3,
    fontFamily: 'Inter_400Regular',
    color: '#8A94A6',
  },

  priceBox: {
    alignItems: 'flex-end',
  },

  priceMain: {
    fontSize: 20,
    fontWeight: FontWeight.extrabold,
    fontFamily: 'Inter_800ExtraBold',
    color: BUYER_PRIMARY,
  },

  priceUnit: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
    color: '#8A94A6',
  },

  metricStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    marginBottom: 2,
  },

  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F3F5F7',
  },

  gradePill: {
    backgroundColor: '#FFF3DB',
  },

  metricPillText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
  },

  orderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: BUYER_PRIMARY,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },

  orderBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
  },
});