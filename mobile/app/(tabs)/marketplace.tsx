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

const STATUS_CONFIGS: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  ACTIVE: { label: 'Open', color: '#086C4B', bg: '#E8F7EF', border: '#BFE6CE' },
  SOLD: { label: 'Sold', color: '#155E75', bg: '#E7F9FD', border: '#BDECF7' },
  EXPIRED: { label: 'Ended', color: '#55616C', bg: '#F3F5F7', border: '#E5E9ED' },
  CANCELLED: { label: 'Cancelled', color: '#A33434', bg: '#FFF0F0', border: '#F6C9C9' },
};

const GRADE_LABELS: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  A: { label: 'Best', color: '#8A5A0F', bg: '#FFF6E1', border: '#F1DEAD' },
  B: { label: 'Good', color: '#086C4B', bg: '#E8F7EF', border: '#BFE6CE' },
  C: { label: 'Regular', color: '#55616C', bg: '#F3F5F7', border: '#E5E9ED' },
};

const UI = {
  canvas: '#F4F5F1',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAF7',
  surfaceMuted: '#EEF3EE',
  border: '#E1E7E1',
  text: '#17231D',
  textMuted: '#6F7C75',
  textSoft: '#97A39C',
  forest: '#103F35',
  forestSoft: '#EAF5EF',
  gold: '#D39E36',
};

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<'browse' | 'mine'>('browse');
  const [listings, setListings] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchListings = useCallback(async () => {
    try {
      setError(false);

      const [browseRes, myRes] = await Promise.all([
        api.get<any>('/marketplace/listings?limit=30'),
        api.get<any>('/marketplace/my-listings'),
      ]);

      if (browseRes.success) {
        setListings(browseRes.data?.listings || []);
      } else {
        setListings([]);
      }

      if (myRes.success) {
        setMyListings(myRes.data || []);
      } else {
        setMyListings([]);
      }
    } catch (err) {
      console.error('Marketplace fetch error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  };

  const data = useMemo(() => {
    const source = tab === 'browse' ? listings : myListings;

    if (!search.trim()) return source;

    const q = search.toLowerCase();

    return source.filter((item: any) => {
      return (
        item.lot?.commodityName?.toLowerCase().includes(q) ||
        item.lot?.lotNumber?.toLowerCase().includes(q)
      );
    });
  }, [tab, listings, myListings, search]);

  const daysAgo = (date: string) => {
    if (!date) return 0;
    return Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={UI.canvas} />
          <View style={[styles.topSpacer, { height: insets.top + 8 }]} />

          <View style={styles.topBar}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={19} color={UI.text} />
            </TouchableOpacity>

            <View style={styles.titleWrap}>
              <Text style={styles.screenTitle}>Sell Crops</Text>
            </View>

            <View style={styles.topActionGhost} />
          </View>

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

  const renderListing = ({ item, index }: { item: any; index: number }) => {
    const statusConfig = STATUS_CONFIGS[item.status] || STATUS_CONFIGS.ACTIVE;
    const grade = item.lot?.qualityGrade || '—';
    const gradeConfig = GRADE_LABELS[grade];
    const days = daysAgo(item.createdAt);
    const weight = Number(item.lot?.currentWeightKg || 0);
    const pricePerKg = Number(item.askingPricePerKg || 0);
    const totalValue = pricePerKg * weight;

    const iconTone =
      index % 3 === 0 ? '#1AA56F' : index % 3 === 1 ? '#D39E36' : '#2D98C0';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          router.push(`/listing/${item.id}`);
          hapticLight();
        }}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.commodityIconWrap, { borderColor: `${iconTone}25` }]}>
            <View style={[styles.commodityIconInner, { backgroundColor: iconTone }]}>
              <Ionicons name="leaf-outline" size={18} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.cardTitleWrap}>
            <View style={styles.titleRow}>
              <Text style={styles.commodityName} numberOfLines={1}>
                {item.lot?.commodityName || 'Unknown'}
              </Text>

              <View style={styles.priceWrap}>
                <Text style={styles.priceValue}>
                  ₹{pricePerKg.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.priceUnit}>per kg</Text>
              </View>
            </View>

            <Text style={styles.lotNumber} numberOfLines={1}>
              Lot #{item.lot?.lotNumber || '—'}
            </Text>
          </View>
        </View>

        <View style={styles.mainInfoCard}>
          <View style={styles.mainInfoLeft}>
            <Text style={styles.mainInfoLabel}>Quantity</Text>
            <Text style={styles.mainInfoValue}>
              {(weight / 1000).toFixed(1)} MT
            </Text>
          </View>

          <View style={styles.mainInfoDivider} />

          <View style={styles.mainInfoRight}>
            <Text style={styles.mainInfoLabel}>Total amount</Text>
            <Text style={styles.mainInfoValueGold}>
              ₹{Math.round(totalValue).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.badgesRow}>
            {gradeConfig ? (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: gradeConfig.bg,
                    borderColor: gradeConfig.border,
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: gradeConfig.color }]}>
                  {gradeConfig.label}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: statusConfig.bg,
                  borderColor: statusConfig.border,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          <View style={styles.postedWrap}>
            <Ionicons name="time-outline" size={11} color={UI.textSoft} />
            <Text style={styles.postedText}>
              {days > 0 ? `${days} days ago` : 'Today'}
            </Text>
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

        <View style={[styles.topSpacer, { height: insets.top + 8 }]} />

        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              router.back();
              hapticLight();
            }}
          >
            <Ionicons name="arrow-back" size={19} color={UI.text} />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={styles.screenTitle}>Sell Crops</Text>
            <Text style={styles.screenSub}>
              Browse crop posts or manage your own selling posts
            </Text>
          </View>

          {tab === 'mine' ? (
            <TouchableOpacity
              style={styles.topActionBtn}
              activeOpacity={0.86}
              onPress={() => {
                router.push('/listing/create');
                hapticLight();
              }}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.topActionGhost} />
          )}
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search crop or lot number..."
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

        <View style={styles.segmentWrap}>
          <View style={styles.segmentControl}>
            {(['browse', 'mine'] as const).map((t) => {
              const active = tab === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  activeOpacity={0.84}
                  onPress={() => {
                    setTab(t);
                    hapticSelection();
                  }}
                >
                  <Ionicons
                    name={t === 'browse' ? 'storefront-outline' : 'pricetag-outline'}
                    size={14}
                    color={active ? UI.forest : UI.textSoft}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[styles.segmentText, active && styles.segmentTextActive]}
                    numberOfLines={1}
                  >
                    {t === 'browse'
                      ? `Buy (${listings.length})`
                      : `My Posts (${myListings.length})`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {data.length} post{data.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        <FlatList
          data={data}
          renderItem={renderListing}
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
            <EmptyState
              icon={tab === 'mine' ? 'pricetag-outline' : 'storefront-outline'}
              title={
                search
                  ? 'No matching posts'
                  : tab === 'mine'
                  ? 'No sell posts yet'
                  : 'No crops available'
              }
              subtitle={
                search
                  ? 'Try a different crop or lot number.'
                  : tab === 'mine'
                  ? 'Add your first crop post to start selling.'
                  : 'Please check again later.'
              }
              action={
                tab === 'mine'
                  ? {
                      label: 'Add Post',
                      onPress: () => router.push('/listing/create'),
                    }
                  : undefined
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
    height: 24,
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

  topActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: UI.forest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: UI.forest,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },

  topActionGhost: {
    width: 40,
    height: 40,
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

  segmentWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },

  segmentControl: {
    backgroundColor: '#ECF1EC',
    borderRadius: 16,
    padding: 4,
    flexDirection: 'row',
  },

  segmentBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  segmentBtnActive: {
    backgroundColor: UI.surface,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },

  segmentText: {
    color: UI.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },

  segmentTextActive: {
    color: UI.forest,
  },

  countRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },

  countText: {
    fontSize: 11,
    color: '#7C8A9F',
    fontWeight: '600',
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: Platform.OS === 'ios' ? 108 : 90,
  },

  card: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  cardHeader: {
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

  cardTitleWrap: {
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

  commodityName: {
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

  priceWrap: {
    alignItems: 'flex-end',
  },

  priceValue: {
    color: UI.gold,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
  },

  priceUnit: {
    marginTop: 2,
    color: UI.textSoft,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  mainInfoCard: {
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: UI.surfaceAlt,
    borderWidth: 1,
    borderColor: '#EDF1ED',
    flexDirection: 'row',
    alignItems: 'center',
  },

  mainInfoLeft: {
    flex: 1,
  },

  mainInfoRight: {
    flex: 1,
    alignItems: 'flex-end',
  },

  mainInfoDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#E3E9E3',
    marginHorizontal: 12,
  },

  mainInfoLabel: {
    color: UI.textSoft,
    fontSize: 10,
    fontWeight: '700',
  },

  mainInfoValue: {
    marginTop: 4,
    color: UI.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  mainInfoValueGold: {
    marginTop: 4,
    color: UI.gold,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  bottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    flex: 1,
  },

  badge: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFCFA',
  },

  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  postedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  postedText: {
    color: UI.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
});