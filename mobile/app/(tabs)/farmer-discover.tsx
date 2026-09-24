/**
 * ColdStorage — Discover Screen
 *
 * Updated:
 * - Header same as updated bookings style
 * - Search outside header
 * - Facility cards compacted to reduce oversized layout
 * - API logic and behavior unchanged
 */
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
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { hapticLight, hapticSelection } from '@/lib/haptics';

const INDIAN_STATES = [
  'All',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Gujarat',
  'Maharashtra',
  'Punjab',
  'Rajasthan',
  'Bihar',
  'West Bengal',
];

const UI = {
  canvas: '#F6F7F3',
  surface: '#FFFFFF',
  surfaceSoft: '#F5F7F4',
  border: '#E2E9E3',
  text: '#1A1A2E',
  textMuted: '#5F6B7A',
  textSoft: '#94A3B8',

  forestDeep: '#082B24',
  forest: '#103E34',
  forestRich: '#0A8B7D',

  green: '#0F766E',
  greenSoft: '#ECFDF5',

  gold: '#B7791F',
  goldSoft: '#FFF7E6',

  orange: '#C2410C',
  orangeSoft: '#FFF7ED',

  red: '#DC2626',
  redSoft: '#FEF2F2',

  blue: '#2563EB',
  blueSoft: '#EFF6FF',
};

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('All');

  const fetchFacilities = useCallback(async () => {
    try {
      setError(false);

      // Use the PUBLIC /discover/facilities endpoint (no auth required)
      const res = await api.get<any>('/discover/facilities?limit=50');

      if (res.success && res.data) {
        const facs = Array.isArray(res.data)
          ? res.data
          : res.data.facilities || [];

        const verified = facs.filter(
          (f: any) => f.status === 'ACTIVE' || f.isVerified || f.verifiedAt
        );

        setFacilities(verified);
      } else {
        setFacilities([]);
      }
    } catch (err: any) {
      // Don't show error for auth issues (user may be logging out)
      if (err?.status === 401 || err?.code === 'UNAUTHORIZED') {
        setFacilities([]);
      } else {
        console.error('Discovery error:', err);
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFacilities();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let result = [...facilities];

    if (selectedState !== 'All') {
      result = result.filter((f) => f.state === selectedState);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();

      result = result.filter(
        (f) =>
          f.name?.toLowerCase().includes(q) ||
          f.city?.toLowerCase().includes(q) ||
          f.state?.toLowerCase().includes(q) ||
          String(f.pincode || '').includes(q)
      );
    }

    return result;
  }, [facilities, selectedState, search]);

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    facilities.forEach((f) => {
      if (f.state) counts[f.state] = (counts[f.state] || 0) + 1;
    });
    return counts;
  }, [facilities]);

  const summary = useMemo(() => {
    return {
      total: facilities.length,
      found: filtered.length,
      states: Object.keys(stateCounts).length,
    };
  }, [facilities, filtered, stateCounts]);

  const renderFacility = ({ item, index }: { item: any; index: number }) => {
    const totalCap = Number(item.totalCapacity ?? item.totalCapacityMt ?? 0);
    const chambers = Array.isArray(item.chambers) ? item.chambers : [];

    const occupiedMt = chambers.reduce(
      (sum: number, c: any) => sum + Number(c?.occupiedMt || 0),
      0
    );

    const availableMt = Math.max(0, totalCap - occupiedMt);
    const usedPercent =
      totalCap > 0 ? Math.round((occupiedMt / totalCap) * 100) : 0;

    const rating = Number(item.averageRating || 0);
    const isVerified = !!item.verifiedAt || !!item.isVerified;

    const tempText =
      chambers.length > 0 &&
      chambers[0]?.targetTempMin !== undefined &&
      chambers[0]?.targetTempMax !== undefined
        ? `${Number(chambers[0].targetTempMin)}–${Number(
            chambers[0].targetTempMax
          )}°C`
        : 'Cold storage';

    const occupancyTone =
      usedPercent >= 85
        ? {
            bg: UI.redSoft,
            text: UI.red,
            label: 'Almost full',
            fill: UI.red,
          }
        : usedPercent >= 60
          ? {
              bg: UI.orangeSoft,
              text: UI.orange,
              label: 'Filling fast',
              fill: UI.orange,
            }
          : {
              bg: UI.greenSoft,
              text: UI.green,
              label: 'Available',
              fill: UI.green,
            };

    const iconBg = index % 2 === 0 ? '#E8F5F0' : '#EEF2FF';
    const iconColor = index % 2 === 0 ? UI.green : '#4F46E5';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          router.push(`/facility/${item.id}`);
          hapticLight();
        }}
        activeOpacity={0.84}
      >
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
            <Ionicons name="snow-outline" size={17} color={iconColor} />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name || 'Storage Facility'}
            </Text>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={UI.textSoft} />
              <Text style={styles.locationText} numberOfLines={1}>
                {[item.city, item.state].filter(Boolean).join(', ') || 'Location not available'}
              </Text>
            </View>
          </View>

          {isVerified ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={11} color={UI.green} />
            </View>
          ) : null}
        </View>

        <View style={styles.capacityBox}>
          <View style={styles.capacityTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.capacityLabel}>Available space</Text>
              <Text style={styles.capacityValue}>
                {availableMt.toLocaleString('en-IN')} MT
              </Text>
              <Text style={styles.capacitySub}>
                Total {totalCap.toLocaleString('en-IN')} MT
              </Text>
            </View>

            <View style={[styles.statusPill, { backgroundColor: occupancyTone.bg }]}>
              <Text style={[styles.statusPillText, { color: occupancyTone.text }]}>
                {occupancyTone.label}
              </Text>
            </View>
          </View>

          <View style={styles.capacityBar}>
            <View
              style={[
                styles.capacityFill,
                {
                  width: `${Math.min(usedPercent, 100)}%`,
                  backgroundColor: occupancyTone.fill,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoPill}>
            <Ionicons name="thermometer-outline" size={12} color={UI.textMuted} />
            <Text style={styles.infoPillText}>{tempText}</Text>
          </View>

          {item.storageType ? (
            <View style={styles.infoPill}>
              <Ionicons name="cube-outline" size={12} color={UI.textMuted} />
              <Text style={styles.infoPillText}>{item.storageType}</Text>
            </View>
          ) : null}

          {rating > 0 ? (
            <View
              style={[
                styles.infoPill,
                { backgroundColor: UI.goldSoft, borderColor: '#F3E1B4' },
              ]}
            >
              <Ionicons name="star" size={11} color={UI.gold} />
              <Text style={[styles.infoPillText, { color: UI.gold }]}>
                {rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.bookBtn}
            activeOpacity={0.84}
            onPress={() => {
              hapticLight();
              router.push({
                pathname: '/book-storage',
                params: {
                  facilityId: item.id,
                  facilityName: item.name,
                },
              } as any);
            }}
          >
            <LinearGradient
              colors={[UI.forestDeep, UI.forest, UI.forestRich]}
              style={styles.bookGradient}
            >
              <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
              <Text style={styles.bookText}>Book now</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailsBtn}
            activeOpacity={0.84}
            onPress={() => {
              router.push(`/facility/${item.id}`);
              hapticLight();
            }}
          >
            <Text style={styles.detailsBtnText}>Details</Text>
            <Ionicons name="chevron-forward" size={13} color={UI.forestRich} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <LinearGradient
          colors={[UI.forestDeep, UI.forest, UI.forestRich]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.heroGlowTop} />
          <View style={styles.heroGlowRight} />
          <View style={styles.heroGlowBottom} />

          <View style={{ height: insets.top + 8 }} />

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Find Storage</Text>
            <Text style={styles.headerSub}>
              {summary.total} storage facilities available
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{summary.total}</Text>
              <Text style={styles.summaryLabel}>TOTAL</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{summary.found}</Text>
              <Text style={styles.summaryLabel}>FOUND</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{summary.states}</Text>
              <Text style={styles.summaryLabel}>STATES</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search facility, city or pincode..."
              placeholderTextColor="#98A2B3"
              style={styles.searchInput}
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.8}>
                <Ionicons name="close-circle" size={18} color="#A0A8B5" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.filterRow}>
          <FlatList
            data={INDIAN_STATES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterContent}
            renderItem={({ item }) => {
              const active = selectedState === item;
              const count =
                item === 'All' ? facilities.length : stateCounts[item] || 0;

              return (
                <TouchableOpacity
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => {
                    setSelectedState(item);
                    hapticSelection();
                  }}
                  activeOpacity={0.84}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item}
                  </Text>

                  {count > 0 ? (
                    <View
                      style={[
                        styles.filterBadge,
                        active && styles.filterBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterBadgeText,
                          active && styles.filterBadgeTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={UI.forestRich} />
            <Text style={styles.loadingLabel}>Loading storage...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cloud-offline-outline" size={40} color="#C7CDD6" />
            </View>
            <Text style={styles.emptyTitle}>Something went wrong</Text>
            <Text style={styles.emptyText}>
              Please check your internet and try again.
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={fetchFacilities}
              activeOpacity={0.84}
            >
              <Ionicons name="refresh-outline" size={16} color={UI.forestRich} />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="search-outline" size={40} color="#C7CDD6" />
            </View>
            <Text style={styles.emptyTitle}>No storage found</Text>
            <Text style={styles.emptyText}>
              Try another search or select a different state.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderFacility}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={UI.forestRich}
              />
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },

  heroGlowTop: {
    position: 'absolute',
    top: -84,
    right: -18,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  heroGlowRight: {
    position: 'absolute',
    top: 18,
    right: -64,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(28,214,192,0.11)',
  },

  heroGlowBottom: {
    position: 'absolute',
    left: -86,
    bottom: -88,
    width: 250,
    height: 150,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  headerContent: {
    marginBottom: 16,
  },

  headerTitle: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.7,
  },

  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 6,
  },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },

  summaryNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.62)',
    marginTop: 5,
    letterSpacing: 0.8,
  },

  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
    backgroundColor: UI.canvas,
  },

  searchBox: {
    minHeight: 52,
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
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    color: '#23323D',
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
  },

  filterRow: {
    paddingVertical: 10,
    backgroundColor: UI.canvas,
  },

  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.border,
  },

  filterChipActive: {
    backgroundColor: '#1B5E4A',
    borderColor: '#1B5E4A',
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: UI.textMuted,
    maxWidth: 140,
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  filterBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: '#EEF2EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  filterBadgeText: {
    color: UI.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },

  filterBadgeTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 108 : 90,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8ECE8',
    shadowColor: '#1B332A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 7,
    elevation: 2,
    marginBottom: 10,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: UI.text,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },

  locationText: {
    fontSize: 12,
    color: UI.textSoft,
    flex: 1,
  },

  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: UI.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  capacityBox: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: UI.surfaceSoft,
    borderWidth: 1,
    borderColor: '#EDF1ED',
  },

  capacityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'flex-start',
  },

  capacityLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: UI.textSoft,
  },

  capacityValue: {
    fontSize: 22,
    fontWeight: '800',
    color: UI.text,
    marginTop: 4,
    letterSpacing: -0.4,
  },

  capacitySub: {
    fontSize: 12,
    color: UI.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },

  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },

  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },

  capacityBar: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E7ECE7',
    marginTop: 12,
    overflow: 'hidden',
  },

  capacityFill: {
    height: '100%',
    borderRadius: 999,
  },

  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: '#F5F7F4',
    borderWidth: 1,
    borderColor: '#E8ECE8',
  },

  infoPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: UI.textMuted,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  bookBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },

  bookGradient: {
    minHeight: 42,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  bookText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  detailsBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F2F5F0',
    borderWidth: 1,
    borderColor: '#DCE3DA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.forestRich,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  loadingLabel: {
    marginTop: 12,
    fontSize: 14,
    color: UI.textMuted,
  },

  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#F0F2EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: UI.text,
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    color: UI.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: UI.greenSoft,
    borderWidth: 1,
    borderColor: '#D4E8DC',
  },

  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.forestRich,
  },
});