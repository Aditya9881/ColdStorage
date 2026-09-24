import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

const BUYER_PRIMARY = '#0F766E';
const BUYER_DARK = '#0B3B36';
const SCREEN_BG = '#F4F7F6';
const WATCHLIST_KEY = 'buyer_watchlist';

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

export default function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [saved, setSaved] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadWatchlist();
    }, [])
  );

  async function loadWatchlist() {
    try {
      const raw = await AsyncStorage.getItem(WATCHLIST_KEY);
      if (raw) {
        setSaved(JSON.parse(raw));
      } else {
        setSaved([]);
      }
    } catch {
      setSaved([]);
    }
  }

  async function removeFromWatchlist(id: string) {
    Alert.alert('Remove from Watchlist', 'Remove this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = saved.filter((item) => item.id !== id);
          setSaved(updated);
          await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
        },
      },
    ]);
  }

  async function clearAll() {
    Alert.alert('Clear Watchlist', 'Remove all saved listings?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          setSaved([]);
          await AsyncStorage.removeItem(WATCHLIST_KEY);
        },
      },
    ]);
  }

  const savedCountText = useMemo(() => {
    return `${saved.length} saved listing${saved.length !== 1 ? 's' : ''}`;
  }, [saved]);

  const totalSavedValue = useMemo(() => {
    return saved.reduce((sum, item) => {
      const price = Number(item.askingPricePerKg || 0);
      const weightKg = Number(item.lot?.currentWeightKg || 0);
      return sum + price * weightKg;
    }, 0);
  }, [saved]);

  const renderItem = ({ item }: { item: any }) => {
    const iconName = COMMODITY_ICON[item.lot?.commodityName] || COMMODITY_ICON.default;
    const price = Number(item.askingPricePerKg || 0);
    const weightMT = (Number(item.lot?.currentWeightKg || 0) / 1000).toFixed(1);
    const savedAt = item._savedAt
      ? new Date(item._savedAt).toLocaleDateString('en-IN')
      : '—';

    return (
      <TouchableOpacity
        style={styles.watchCard}
        onPress={() => router.push(`/listing/${item.id}`)}
        activeOpacity={0.84}
      >
        <View style={styles.watchCardTop}>
          <View style={styles.cardTop}>
            <View style={styles.cardIconBox}>
              <Ionicons name={iconName as any} size={20} color={BUYER_PRIMARY} />
            </View>

            <View style={styles.cardMain}>
              <View style={styles.cardTitleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.commodityName} numberOfLines={1}>
                    {item.lot?.commodityName || 'Unknown'}
                  </Text>
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.lot?.facility?.city || '—'}, {item.lot?.facility?.state || '—'}
                  </Text>
                  <Text style={styles.savedDate}>Saved {savedAt}</Text>
                </View>

                <TouchableOpacity
                  style={styles.bookmarkBtn}
                  onPress={() => removeFromWatchlist(item.id)}
                  activeOpacity={0.78}
                >
                  <Ionicons name="bookmark" size={18} color={BUYER_PRIMARY} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.statPanel}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₹{price.toFixed(0)}/kg</Text>
              <Text style={styles.statLabel}>Ask Price</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weightMT} MT</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>

            {item.lot?.qualityGrade && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.gradeValue}>Grade {item.lot.qualityGrade}</Text>
                  <Text style={styles.statLabel}>Quality</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.watchCardBottom}>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => removeFromWatchlist(item.id)}
              activeOpacity={0.82}
            >
              <Ionicons name="trash-outline" size={15} color="#64748B" />
              <Text style={styles.secondaryBtnText}>Remove</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buyBtn}
              onPress={() => router.push(`/place-order/${item.id}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="cart-outline" size={16} color="#FFF" />
              <Text style={styles.buyBtnText}>Buy Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const Header = () => (
    <View style={styles.headerWrap}>
      <View style={{ height: insets.top + 8 }} />

      <View style={styles.headerTopRow}>
        <Text style={styles.headerKicker}>Saved Items</Text>
        <View style={styles.savedPill}>
          <Ionicons name="bookmark" size={13} color="#D7FFFA" />
          <Text style={styles.savedPillText}>{saved.length}</Text>
        </View>
      </View>

      <Text style={styles.headerTitle}>Watchlist</Text>
      <Text style={styles.headerSubtitle}>
        Saved listings you may want to buy later
      </Text>

      <LinearGradient
        colors={['#0B3B36', '#0F766E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroCardLabel}>Saved Inventory Value</Text>
        <Text style={styles.heroCardValue}>₹{Math.round(totalSavedValue).toLocaleString()}</Text>

        <View style={styles.heroMiniStats}>
          <View style={styles.heroMiniPill}>
            <Text style={styles.heroMiniValue}>{saved.length}</Text>
            <Text style={styles.heroMiniLabel}>Saved</Text>
          </View>

          <View style={styles.heroMiniPill}>
            <Text style={styles.heroMiniValue}>
              {saved.filter((item) => item.lot?.qualityGrade).length}
            </Text>
            <Text style={styles.heroMiniLabel}>Graded</Text>
          </View>

          <View style={styles.heroMiniPill}>
            <Text style={styles.heroMiniValue}>
              {saved.length > 0
                ? (
                    saved.reduce(
                      (sum, item) => sum + Number(item.lot?.currentWeightKg || 0),
                      0
                    ) / 1000
                  ).toFixed(1)
                : '0.0'}
            </Text>
            <Text style={styles.heroMiniLabel}>MT Saved</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.headerActionRow}>
        <Text style={styles.headerCount}>{savedCountText}</Text>

        {saved.length > 0 && (
          <TouchableOpacity style={styles.clearPill} onPress={clearAll} activeOpacity={0.82}>
            <Ionicons name="trash-outline" size={14} color="#DC2626" />
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (saved.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyScreen}>
          <Header />

          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="bookmark-outline" size={30} color="#64748B" />
            </View>
            <Text style={styles.emptyTitle}>Watchlist is Empty</Text>
            <Text style={styles.emptyText}>
              Tap the bookmark icon on any listing to save it here for later.
            </Text>

            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => router.push('/(buyer)')}
              activeOpacity={0.86}
            >
              <Ionicons name="search-outline" size={16} color="#FFF" />
              <Text style={styles.browseBtnText}>Browse Listings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <FlatList
          data={saved}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={10}
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

  emptyScreen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },

  list: {
    paddingBottom: Platform.OS === 'ios' ? 96 : 28,
  },

  headerWrap: {
    backgroundColor: SCREEN_BG,
    paddingBottom: 8,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },

  headerKicker: {
    fontSize: FontSize.sm,
    color: '#7C8A9F',
    fontWeight: FontWeight.medium,
  },

  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F766E',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  savedPillText: {
    fontSize: FontSize.xs,
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
  },

  headerTitle: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
    marginTop: 14,
    paddingHorizontal: Spacing.lg,
  },

  headerSubtitle: {
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
    marginTop: 16,
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

  headerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingHorizontal: Spacing.lg,
  },

  headerCount: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#64748B',
    fontWeight: FontWeight.medium,
  },

  clearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FDECEC',
  },

  clearText: {
    fontSize: FontSize.sm,
    color: '#DC2626',
    fontWeight: FontWeight.semibold,
  },

  watchCard: {
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

  watchCardTop: {
    padding: 16,
    backgroundColor: '#FFFDF9',
  },

  watchCardBottom: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FCFAF6',
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },

  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E7F6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardMain: {
    flex: 1,
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

  locationText: {
    fontSize: FontSize.xs,
    color: '#8A94A6',
    marginTop: 4,
  },

  savedDate: {
    fontSize: FontSize.xs,
    color: '#8A94A6',
    marginTop: 4,
  },

  bookmarkBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F6F1',
  },

  statPanel: {
    flexDirection: 'row',
    backgroundColor: '#F4F6F8',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 2,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  statDivider: {
    width: 1,
    backgroundColor: '#D8E0E7',
    marginVertical: 4,
  },

  statValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: BUYER_PRIMARY,
  },

  gradeValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#C98212',
  },

  statLabel: {
    fontSize: FontSize.xs,
    color: '#8A94A6',
    marginTop: 3,
  },

  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },

  secondaryBtn: {
    flex: 0.95,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F4F6F8',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#DEE6EC',
  },

  secondaryBtnText: {
    color: '#64748B',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.sm,
  },

  buyBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BUYER_PRIMARY,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },

  buyBtnText: {
    color: '#FFF',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.sm,
  },

  emptyCard: {
    marginHorizontal: Spacing.lg,
    marginTop: 10,
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 36,
    alignItems: 'center',
    shadowColor: '#102A26',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EEF2EF',
  },

  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#E8EEF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
  },

  emptyText: {
    fontSize: FontSize.sm,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },

  browseBtn: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BUYER_PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },

  browseBtnText: {
    color: '#FFF',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
});