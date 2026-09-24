 /** 
 * ColdStorage — Mandi Prices Tab (Premium Compact Redesign)
 *
 * Redesigned to match the updated Bookings tab exactly in density and feel:
 * - Removed oversized hero layout
 * - Removed unnecessary big title block and extra spacing
 * - Compact header, compact search, compact filter chips
 * - Premium white cards with tighter hierarchy
 * - Cleaner loading / empty / error states
 * - Same visual language as Bookings tab
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { getCommodityVisual, getCommodityCategory } from '@/lib/commodityImages';
import SharedTabHeader from '@/components/SharedTabHeader';

interface MandiPrice {
  id: string;
  commodity: string;
  state: string;
  district: string;
  mandi: string;
  variety: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  arrivalDate: string;
  trend: 'up' | 'down' | 'stable';
}

interface PricesMeta {
  fetchedAt: string;
  source: 'live' | 'cached' | 'fallback';
  totalCommodities: number;
  totalMandis: number;
}

const COMMODITY_FILTERS = [
  { key: '', label: 'All' },
  { key: 'Potato', label: 'Potato' },
  { key: 'Onion', label: 'Onion' },
  { key: 'Tomato', label: 'Tomato' },
  { key: 'Apple', label: 'Apple' },
  { key: 'Rice', label: 'Rice' },
  { key: 'Wheat', label: 'Wheat' },
  { key: 'Soybean', label: 'Soyabean' },
  { key: 'Maize', label: 'Maize' },
];

const TREND_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  up: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', icon: 'trending-up-outline' },
  down: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', icon: 'trending-down-outline' },
  stable: { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB', icon: 'remove-outline' },
};

const ICON_BACKGROUNDS = ['#E8F4F0', '#EEEEFF', '#FFF3E6', '#E8F1FB'];
const ICON_COLORS = ['#0E6E5A', '#5555CC', '#C2700F', '#2563EB'];

function formatTimeAgo(isoStr?: string): string {
  if (!isoStr) return 'just now';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MandiPricesTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [meta, setMeta] = useState<PricesMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [commodityFilter, setCommodityFilter] = useState('');
  const [detectedState, setDetectedState] = useState<string | null>(null);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const [addr] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (addr) {
            setDetectedState(addr.region || null);
            setDetectedCity(addr.city || addr.subregion || null);
          }
        }
      } catch {
        // fallback to user profile location
      }
    })();
  }, []);

  const userState = detectedState || user?.state || null;
  const locationLabel = detectedCity
    ? `${detectedCity}${userState ? `, ${userState}` : ''}`
    : userState || 'All India';

  const fetchPrices = useCallback(async () => {
    try {
      setError(false);
      const params = new URLSearchParams();
      if (userState) params.set('state', userState);
      const url = `/market-prices${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await api.get<any>(url);

      if (res.success && res.data) {
        const mapped: MandiPrice[] = [];
        let idx = 0;

        for (const group of res.data) {
          for (const mandi of group.mandis || []) {
            idx += 1;
            mapped.push({
              id: `${idx}-${group.commodity || ''}-${mandi.mandi || ''}-${mandi.variety || ''}`,
              commodity: group.commodity || 'Unknown',
              state: mandi.state || '',
              district: mandi.district || '',
              mandi: mandi.mandi || '',
              variety: mandi.variety || '-',
              minPrice: mandi.minPrice || 0,
              maxPrice: mandi.maxPrice || 0,
              modalPrice: mandi.modalPrice || 0,
              unit: mandi.unit || 'Qtl',
              arrivalDate: mandi.arrivalDate || new Date().toISOString(),
              trend: mandi.trend || 'stable',
            });
          }
        }

        setPrices(mapped);
        setMeta((res as any).meta || null);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userState]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    hapticLight();
    fetchPrices();
  }, [fetchPrices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prices.filter((item) => {
      if (commodityFilter && item.commodity.toLowerCase() !== commodityFilter.toLowerCase()) return false;
      if (!q) return true;
      return (
        item.commodity.toLowerCase().includes(q) ||
        item.mandi.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q) ||
        item.variety.toLowerCase().includes(q)
      );
    });
  }, [prices, search, commodityFilter]);

  const renderPrice = ({ item, index }: { item: MandiPrice; index: number }) => {
    const visual = getCommodityVisual(item.commodity);
    const category = getCommodityCategory(item.commodity);
    const trend = TREND_STYLES[item.trend] || TREND_STYLES.stable;

    const trendColor = item.trend === 'up' ? '#059669' : item.trend === 'down' ? '#DC2626' : '#6B7280';
    const trendIcon = item.trend === 'up' ? 'trending-up' : item.trend === 'down' ? 'trending-down' : 'remove';

    return (
      <View style={s.card}>
        {/* ── LEFT: Commodity Image ── */}
        <View style={[s.cardImageWrap, { backgroundColor: visual.bg }]}>
          {visual?.imageUrl ? (
            <Image source={{ uri: visual.imageUrl }} style={s.cardImage} resizeMode="cover" />
          ) : (
            <View style={s.cardImageFallback}>
              <Text style={s.cardImageEmoji}>{visual.emoji}</Text>
            </View>
          )}

          {/* Bottom gradient for readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={s.cardImageGradient}
          />

          {/* Category badge top-left */}
          <View style={s.categoryBadge}>
            <Ionicons name="leaf-outline" size={9} color="#FFF" />
            <Text style={s.categoryBadgeText}>{category}</Text>
          </View>

          {/* Price overlay bottom-left */}
          <View style={s.priceOverlay}>
            <Text style={s.priceOverlayLabel}>PER ₹/{item.unit || 'QUINTAL'}</Text>
            <Text style={s.priceOverlayValue}>
              ₹{item.modalPrice?.toLocaleString('en-IN') || '0'}
            </Text>
          </View>
        </View>

        {/* ── RIGHT: Content ── */}
        <View style={s.cardContent}>
          {/* Commodity name */}
          <Text style={s.cardCommodity} numberOfLines={1}>{item.commodity}</Text>

          {/* Trend row */}
          <View style={s.trendRow}>
            <View style={[s.trendDot, { backgroundColor: trendColor }]} />
            <Ionicons name={trendIcon as any} size={11} color={trendColor} />
            <Text style={[s.trendLabel, { color: trendColor }]}>
              {item.trend === 'up' ? 'Rising' : item.trend === 'down' ? 'Falling' : 'Stable'}
            </Text>
            <Text style={s.trendSeparator}>•</Text>
            <Text style={s.minMaxInline}>
              ₹{item.minPrice?.toLocaleString('en-IN')} – ₹{item.maxPrice?.toLocaleString('en-IN')}
            </Text>
          </View>

          {/* Variety + Category */}
          <Text style={s.tagsText} numberOfLines={1}>
            {item.variety && item.variety !== '-' && item.variety !== 'Other' ? `${item.variety}, ` : ''}{category}
          </Text>

          {/* Location */}
          <View style={s.locationRow}>
            <Ionicons name="location-outline" size={11} color="#96A19B" />
            <Text style={s.cardLocationText} numberOfLines={1}>
              {item.mandi}{item.district ? `, ${item.district}` : ''}
            </Text>
          </View>

          {/* Footer: State + Date */}
          <View style={s.cardFooterRow}>
            {!!item.state && (
              <View style={s.statePill}>
                <Text style={s.statePillText}>{item.state}</Text>
              </View>
            )}
            {!!item.arrivalDate && (
              <Text style={s.dateText}>
                {new Date(item.arrivalDate).toLocaleDateString('en-IN', { day: 'numeric', month: '2-digit', year: 'numeric' })}
              </Text>
            )}
          </View>
        </View>

        {/* ── Three dots menu ── */}
        <View style={s.menuDots}>
          <Ionicons name="ellipsis-vertical" size={16} color="#C0C8CC" />
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View style={s.headerShell}>
      {/* Shared header with hamburger + avatar */}
      <SharedTabHeader subtitle="Market prices" />

      <View style={s.controlsArea}>
        <View style={s.metaRow}>
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>
              {meta?.source === 'live' ? 'Live prices' : meta?.source === 'cached' ? 'Cached prices' : 'Market data'}
              {meta?.fetchedAt ? ` · ${formatTimeAgo(meta.fetchedAt)}` : ''}
            </Text>
          </View>

          <View style={s.locationPill}>
            <Ionicons name="location-outline" size={12} color="#6B7785" />
            <Text style={s.locationText} numberOfLines={1}>{locationLabel}</Text>
          </View>
        </View>

        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={17} color="#8B939D" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search commodity, mandi, district..."
            placeholderTextColor="#9FA8B2"
            style={s.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={17} color="#B2BAC6" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={COMMODITY_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key || 'all'}
          contentContainerStyle={s.chipList}
          renderItem={({ item }) => {
            const active = commodityFilter === item.key;
            return (
              <TouchableOpacity
                style={[s.chip, active && s.chipActive]}
                onPress={() => {
                  setCommodityFilter(item.key);
                  hapticSelection();
                }}
                activeOpacity={0.84}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={s.centerState}>
          <ActivityIndicator size="large" color="#0A4E40" />
          <Text style={s.stateSubText}>Fetching latest prices...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={s.centerState}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="cloud-offline-outline" size={28} color="#BCC5CE" />
          </View>
          <Text style={s.stateTitle}>Failed to load prices</Text>
          <Text style={s.stateSubText}>Please try again in a moment.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchPrices} activeOpacity={0.84}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={s.centerState}>
        <View style={s.emptyIconWrap}>
          <Ionicons name="leaf-outline" size={28} color="#BCC5CE" />
        </View>
        <Text style={s.stateTitle}>No prices found</Text>
        <Text style={s.stateSubText}>Try a different commodity or search term.</Text>
      </View>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <FlatList
        data={loading || error ? [] : filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderPrice}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0A4E40"
            colors={['#0A4E40']}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={s.footerWrap}>
            {!loading && !error && meta ? (
              <Text style={s.footerText}>
                {filtered.length} results · {meta.totalCommodities || 0} commodities · {meta.totalMandis || 0} mandis
              </Text>
            ) : (
              <View style={{ height: 8 }} />
            )}
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F4F0',
  },

  headerShell: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E6DF',
    marginBottom: 12,
    shadowColor: '#182A1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F2EE',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E4DC',
  },

  brandBlock: {
    flex: 1,
    marginLeft: 11,
  },

  brandName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#061D15',
    letterSpacing: -0.5,
    lineHeight: 25,
  },

  brandSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E9A93',
    marginTop: 1,
  },

  avatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 2,
    backgroundColor: '#D4A635',
    shadowColor: '#8B6820',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },

  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E6EAE3',
    marginHorizontal: 16,
  },

  controlsArea: {
    paddingTop: 14,
    paddingBottom: 12,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },

  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EEF8F3',
    borderWidth: 1,
    borderColor: '#D5EBDD',
    flexShrink: 1,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0B8A68',
    marginRight: 7,
  },

  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#185B4B',
    letterSpacing: 0.1,
  },

  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#F4F6F3',
    borderWidth: 1,
    borderColor: '#E2E7E0',
    maxWidth: '45%',
  },

  locationText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '600',
    color: '#66727F',
    flexShrink: 1,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F6F8F4',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DADDD6',
    paddingHorizontal: 13,
    shadowColor: '#182A1E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1C2830',
    paddingVertical: 0,
  },

  chipList: {
    paddingLeft: 16,
    paddingRight: 32,
    gap: 7,
  },

  chip: {
    height: 34,
    paddingHorizontal: 15,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECF0E8',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDE2D9',
  },

  chipActive: {
    backgroundColor: '#0B2B22',
    borderColor: '#0B2B22',
  },

  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4E5D56',
  },

  chipTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 108 : 90,
    flexGrow: 1,
  },

  /* ═══ Premium Horizontal Card (Swiggy-style) ═══ */
  card: {
    backgroundColor: '#FFFFFF',
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
    color: '#15231D',
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
  trendLabel: {
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
  cardLocationText: {
    flex: 1,
    fontSize: 11,
    color: '#96A19B',
    fontWeight: '500',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statePill: {
    backgroundColor: '#E8F5EF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#103E34',
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

  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: 30,
  },

  emptyIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: '#ECF0EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDE3D9',
  },

  stateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#141E2A',
    marginBottom: 8,
    letterSpacing: -0.2,
  },

  stateSubText: {
    fontSize: 13,
    color: '#6C7880',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 260,
  },

  retryBtn: {
    marginTop: 16,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 13,
    backgroundColor: '#0A4E40',
  },

  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  footerWrap: {
    height: 110,
    justifyContent: 'flex-start',
  },

  footerText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#A0A8B4',
    marginTop: 16,
  },
});



