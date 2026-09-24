import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonList } from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { getCommodityVisual, getCommodityCategory } from '@/lib/commodityImages';
import { DetailUI } from '@/components/DetailScreenCard';


interface MandiPrice {
  id: string;
  commodity: string;
  variety?: string;
  state: string;
  district: string;
  market: string;
  mandi: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  arrivalDate: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

interface GroupedPrices {
  commodity: string;
  prices: {
    id: string;
    state: string;
    district: string;
    market: string;
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
  }[];
}

interface PricesMeta {
  fetchedAt: string;
  source: 'live' | 'cached' | 'fallback';
  totalCommodities: number;
  totalMandis: number;
  filters: { state: string | null; district: string | null; commodity: string | null };
}

/* ─── Theme ─── */
const UI = {
  canvas: DetailUI.canvas,
  surface: DetailUI.surface,
  surfaceAlt: '#FBFCFA',
  surfaceMuted: '#F3F5F1',
  border: DetailUI.border,
  text: DetailUI.ink,
  muted: DetailUI.muted,
  subtle: DetailUI.subtle,
  forest: DetailUI.primary,
  forestMid: DetailUI.primaryMid,
  forestSoft: '#E8F3EE',
  gold: '#D8B24A',
  goldSoft: '#FFF7E5',
  emerald: DetailUI.success,
  emeraldSoft: '#DCFCE7',
  danger: DetailUI.danger,
  dangerSoft: DetailUI.dangerSoft,
};

function formatTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}



/* ─── Price Card Component (Swiggy-style horizontal) ─── */
function PriceCard({ item, onPress }: { item: MandiPrice; onPress?: () => void }) {
  const visual = getCommodityVisual(item.commodity);
  const category = getCommodityCategory(item.commodity);
  const [imgError, setImgError] = useState(false);

  const trendColor = item.trend === 'up' ? UI.emerald : item.trend === 'down' ? UI.danger : '#6B7280';
  const trendBg = item.trend === 'up' ? UI.emeraldSoft : item.trend === 'down' ? UI.dangerSoft : '#F3F4F6';
  const trendIcon = item.trend === 'up' ? 'trending-up' : item.trend === 'down' ? 'trending-down' : 'remove';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={onPress}>
      {/* ── LEFT: Image ── */}
      <View style={[styles.cardImageWrap, { backgroundColor: visual.bg }]}>
        {!imgError ? (
          <Image
            source={{ uri: visual.imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.cardImageFallback}>
            <Text style={styles.cardImageEmoji}>{visual.emoji}</Text>
          </View>
        )}

        {/* Bottom gradient for badge readability */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.cardImageGradient}
        />

        {/* Category badge top-left */}
        <View style={styles.categoryBadge}>
          <Ionicons name="leaf-outline" size={9} color="#FFF" />
          <Text style={styles.categoryBadgeText}>{category}</Text>
        </View>

        {/* Price overlay bottom */}
        <View style={styles.priceOverlay}>
          <Text style={styles.priceOverlayLabel}>per {item.unit}</Text>
          <Text style={styles.priceOverlayValue}>
            ₹{item.modalPrice.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* ── RIGHT: Content ── */}
      <View style={styles.cardContent}>
        {/* Commodity name */}
        <Text style={styles.cardCommodity} numberOfLines={1}>{item.commodity}</Text>

        {/* Trend row (like Swiggy's star rating) */}
        <View style={styles.trendRow}>
          <View style={[styles.trendDot, { backgroundColor: trendColor }]} />
          <Ionicons name={trendIcon as any} size={11} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]}>
            {item.trend === 'up' ? 'Rising' : item.trend === 'down' ? 'Falling' : 'Stable'}
          </Text>
          <Text style={styles.trendSeparator}>•</Text>
          <Text style={styles.minMaxInline}>
            ₹{item.minPrice.toLocaleString('en-IN')} – ₹{item.maxPrice.toLocaleString('en-IN')}
          </Text>
        </View>

        {/* Variety + Category tags */}
        <Text style={styles.tagsText} numberOfLines={1}>
          {item.variety && item.variety !== 'Other' ? `${item.variety}, ` : ''}{category}
        </Text>

        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={11} color={UI.subtle} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.mandi}, {item.district}
          </Text>
        </View>

        {/* Footer: State + Date */}
        <View style={styles.cardFooterRow}>
          <View style={styles.statePill}>
            <Text style={styles.statePillText}>{item.state}</Text>
          </View>
          {!!item.arrivalDate && (
            <Text style={styles.dateText}>{item.arrivalDate}</Text>
          )}
        </View>
      </View>

      {/* ── Three dots menu (like Swiggy) ── */}
      <View style={styles.menuDots}>
        <Ionicons name="ellipsis-vertical" size={16} color="#C0C8CC" />
      </View>
    </TouchableOpacity>
  );
}

/* ─── Main Screen ─── */
export default function MarketPricesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [meta, setMeta] = useState<PricesMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCommodity, setSelectedCommodity] = useState('All');

  const fetchPrices = useCallback(async () => {
    try {
      setError(false);
      const params = new URLSearchParams();
      if (user?.state) params.set('state', user.state);

      const url = `/market-prices${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await api.get<any>(url);

      if (res.success && res.data) {
        const mapped: MandiPrice[] = [];

        for (const group of res.data) {
          const mandis = group.mandis || [];

          for (let i = 0; i < mandis.length; i++) {
            const m = mandis[i];
            const modalPrice = Number(m.modalPrice || 0);
            const minPrice = Number(m.minPrice || 0);
            const maxPrice = Number(m.maxPrice || 0);
            const midpoint = (minPrice + maxPrice) / 2;

            const trend: 'up' | 'down' | 'stable' =
              modalPrice > midpoint * 1.05
                ? 'up'
                : modalPrice < midpoint * 0.95
                ? 'down'
                : 'stable';

            mapped.push({
              id: `${group.commodity}-${m.name}-${i}`,
              commodity: group.commodity || 'Unknown',
              state: m.state || '—',
              district: m.district || '',
              market: m.name || '—',
              mandi: m.name || '—',
              variety: m.variety || 'Other',
              minPrice,
              maxPrice,
              modalPrice,
              unit: group.unit || '₹/Quintal',
              arrivalDate: m.arrivalDate || group.date || '',
              trend,
            });
          }
        }

        setPrices(mapped);
        if (res.meta) setMeta(res.meta as PricesMeta);
      }
    } catch (err) {
      console.error('Market prices fetch error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.state]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrices();
    setRefreshing(false);
  };

  const filteredPrices = React.useMemo(() => {
    let result = prices;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.commodity.toLowerCase().includes(q) ||
          p.mandi.toLowerCase().includes(q) ||
          p.district.toLowerCase().includes(q)
      );
    }

    if (selectedState !== 'All') {
      result = result.filter((p) => p.state === selectedState);
    }

    if (selectedCommodity !== 'All') {
      result = result.filter((p) => p.commodity === selectedCommodity);
    }

    return result;
  }, [prices, searchQuery, selectedState, selectedCommodity]);

  const statesList = ['All', ...Array.from(new Set(prices.map((p) => p.state).filter(Boolean)))];
  const commoditiesList = [
    'All',
    ...Array.from(new Set(prices.map((p) => p.commodity).filter(Boolean))),
  ];

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <LinearGradient colors={[UI.forest, UI.forestMid]} style={[styles.heroHeader, { paddingTop: insets.top + 12 }]}>
            <View style={styles.heroHeaderRow}>
              <TouchableOpacity style={styles.heroBackBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color="#FFF" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Mandi Prices</Text>
                <Text style={styles.heroSub}>Loading latest prices...</Text>
              </View>
            </View>
          </LinearGradient>
          <SkeletonList count={5} />
        </View>
      </>
    );
  }

  /* ─── Error State ─── */
  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <LinearGradient colors={[UI.forest, UI.forestMid]} style={[styles.heroHeader, { paddingTop: insets.top + 12 }]}>
            <View style={styles.heroHeaderRow}>
              <TouchableOpacity style={styles.heroBackBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color="#FFF" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Mandi Prices</Text>
                <Text style={styles.heroSub}>Could not load prices</Text>
              </View>
            </View>
          </LinearGradient>
          <ErrorState variant="network" onRetry={fetchPrices} />
        </View>
      </>
    );
  }

  /* ─── Main UI ─── */
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Premium Hero Header */}
        <LinearGradient
          colors={[UI.forest, UI.forestMid, '#1A6B5A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroHeader, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.heroGlowA} />
          <View style={styles.heroGlowB} />

          <View style={styles.heroHeaderRow}>
            <TouchableOpacity
              style={styles.heroBackBtn}
              onPress={() => { router.back(); hapticLight(); }}
              activeOpacity={0.82}
            >
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <View style={styles.heroEyebrowRow}>
                <Ionicons name="trending-up-outline" size={14} color="#FBBF24" />
                <Text style={styles.heroEyebrow}>MANDI PRICE</Text>
              </View>
              <Text style={styles.heroTitle}>Today's Prices</Text>
            </View>

            {/* Live indicator */}
            {meta && (
              <View style={styles.liveIndicator}>
                <View style={[styles.liveDot, { backgroundColor: meta.source === 'live' ? '#34D399' : '#FBBF24' }]} />
                <Text style={styles.liveText}>
                  {meta.source === 'live' ? 'Live' : meta.source === 'cached' ? 'Cached' : 'Offline'}
                </Text>
              </View>
            )}
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{filteredPrices.length}</Text>
              <Text style={styles.statLabel}>PRICES</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{commoditiesList.length - 1}</Text>
              <Text style={styles.statLabel}>COMMODITIES</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{statesList.length - 1}</Text>
              <Text style={styles.statLabel}>STATES</Text>
            </View>
          </View>

          {meta && (
            <Text style={styles.heroSubtitle}>
              Updated {formatTimeAgo(meta.fetchedAt)}
              {meta.filters.state ? ` • ${meta.filters.state}` : ''}
            </Text>
          )}
        </LinearGradient>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search commodity, mandi, district..."
              placeholderTextColor="#98A2B3"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={17} color="#A0A8B5" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {commoditiesList.map((c) => {
              const active = selectedCommodity === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => { setSelectedCommodity(c); hapticSelection(); }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {statesList.length > 2 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChips}
            >
              {statesList.map((st) => {
                const active = selectedState === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.stateChip, active && styles.stateChipActive]}
                    onPress={() => { setSelectedState(st); hapticSelection(); }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.stateChipText, active && styles.stateChipTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
        </View>

        {/* Price Cards */}
        <FlatList
          data={filteredPrices}
          renderItem={({ item }) => <PriceCard item={item} />}
          keyExtractor={(item) => item.id}
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
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="bar-chart-outline" size={28} color="#AAB4AE" />
              </View>
              <Text style={styles.emptyTitle}>No prices found</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'No mandi price data available for this filter'}
              </Text>
            </View>
          }
        />
      </View>
    </>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  /* Hero Header */
  heroHeader: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroGlowA: {
    position: 'absolute', top: -80, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroGlowB: {
    position: 'absolute', bottom: -100, left: -80,
    width: 240, height: 180, borderRadius: 120,
    backgroundColor: 'rgba(251,191,36,0.06)',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroBackBtn: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  heroEyebrowRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2,
  },
  heroEyebrow: {
    fontSize: 10, fontWeight: '900', letterSpacing: 1,
    color: '#FBBF24',
  },
  heroTitle: {
    fontSize: 26, fontWeight: '800', color: '#FFF', letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2,
  },
  heroSubtitle: {
    fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 10,
  },
  liveIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  liveDot: {
    width: 7, height: 7, borderRadius: 4,
  },
  liveText: {
    fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.3,
  },

  /* Stats strip */
  statsStrip: {
    marginTop: 16, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6, color: 'rgba(255,255,255,0.5)', marginTop: 3 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },

  /* Search */
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  searchBar: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    paddingHorizontal: 15,
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
    fontSize: 15,
    color: '#23323D',
    fontWeight: '500',
    paddingVertical: Platform.OS === 'ios' ? 13 : 9,
  },

  /* Filter Chips */
  filterSection: {
    paddingTop: 12,
    gap: 8,
  },
  filterChips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#EEF2EA',
    borderWidth: 1,
    borderColor: '#DDE5DA',
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: UI.forest,
    borderColor: UI.forest,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5F6B7A',
  },
  chipTextActive: {
    color: '#FFF',
  },
  stateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 11,
    backgroundColor: '#EEF2EA',
    borderWidth: 1,
    borderColor: '#DDE5DA',
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateChipActive: {
    backgroundColor: UI.forestSoft,
    borderColor: '#B8D4C8',
  },
  stateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C8A9F',
  },
  stateChipTextActive: {
    color: UI.forest,
    fontWeight: '800',
  },

  /* ═══ Swiggy-style Horizontal Card ═══ */
  card: {
    backgroundColor: UI.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEFEA',
    marginBottom: 12,
    flexDirection: 'row',
    height: 155,
    overflow: 'hidden',
    shadowColor: '#173528',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  /* Left: Image */
  cardImageWrap: {
    width: 140,
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageEmoji: {
    fontSize: 42,
  },
  cardImageGradient: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 70,
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: 'rgba(15,60,50,0.8)',
  },
  categoryBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  priceOverlayLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  priceOverlayValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  /* Right: Content */
  cardContent: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  cardCommodity: {
    fontSize: 17,
    fontWeight: '800',
    color: UI.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 5,
  },
  trendDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '800',
  },
  trendSeparator: {
    fontSize: 10,
    color: '#B0B8B4',
    marginHorizontal: 1,
  },
  minMaxInline: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E98A8',
  },
  tagsText: {
    fontSize: 11,
    color: '#8E98A8',
    fontWeight: '500',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 11,
    color: UI.subtle,
    fontWeight: '500',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statePill: {
    backgroundColor: UI.forestSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: UI.forest,
  },
  dateText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#B0B8B4',
  },

  /* Menu dots */
  menuDots: {
    position: 'absolute',
    top: 10,
    right: 6,
    padding: 4,
  },

  /* List */
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 100 : 28,
  },

  /* Empty */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#E8EEEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: UI.text,
  },
  emptySub: {
    marginTop: 8,
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});