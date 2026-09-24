import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { DetailUI } from '@/components/DetailScreenCard';

const WATCHLIST_KEY = 'buyer_watchlist';

const UI = {
  canvas: DetailUI.canvas,
  surface: DetailUI.surface,
  forest: DetailUI.primary,
  forestDeep: DetailUI.primaryDark,
  emerald: '#17A56D',
  emeraldSoft: '#E8F7EF',
  teal: DetailUI.primaryMid,
  tealSoft: '#E8F9F7',
  blue: '#2589AA',
  blueSoft: '#EAF8FC',
  gold: '#D8B24A',
  goldSoft: '#FFF7E5',
  ink: DetailUI.ink,
  muted: DetailUI.muted,
  subtle: DetailUI.subtle,
  border: DetailUI.border,
  whiteTransparent: 'rgba(255,255,255,0.14)',
};

const COMMODITY_ICON: Record<
  string,
  React.ComponentProps<typeof Ionicons>['name']
> = {
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

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isWatchlisted, setIsWatchlisted] = useState(false);

  const isBuyer = user?.role === 'BUYER';

  useEffect(() => {
    fetchListing();
    checkWatchlist();
  }, [id]);

  async function fetchListing() {
    try {
      const directResponse = await api.get<any>(`/marketplace/listings/${id}`);

      if (directResponse.success && directResponse.data) {
        setListing(directResponse.data);
        return;
      }

      const listResponse = await api.get<any>('/marketplace/listings?limit=100');

      if (listResponse.success) {
        const found = listResponse.data?.listings?.find(
          (item: any) => item.id === id
        );
        setListing(found || null);
      }
    } catch {
      try {
        const listResponse = await api.get<any>('/marketplace/listings?limit=100');

        if (listResponse.success) {
          const found = listResponse.data?.listings?.find(
            (item: any) => item.id === id
          );
          setListing(found || null);
        }
      } catch (error) {
        console.error('Failed to load listing:', error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function checkWatchlist() {
    try {
      const raw = await AsyncStorage.getItem(WATCHLIST_KEY);

      if (!raw) return;

      const saved: any[] = JSON.parse(raw);
      setIsWatchlisted(saved.some((item) => item.id === id));
    } catch (error) {
      console.error('Watchlist check failed:', error);
    }
  }

  async function toggleWatchlist() {
    if (!listing) return;

    try {
      const raw = await AsyncStorage.getItem(WATCHLIST_KEY);
      let saved: any[] = raw ? JSON.parse(raw) : [];

      if (isWatchlisted) {
        saved = saved.filter((item) => item.id !== id);
        setIsWatchlisted(false);
      } else {
        saved.push({ ...listing, _savedAt: new Date().toISOString() });
        setIsWatchlisted(true);
      }

      await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(saved));
    } catch (error) {
      console.error('Watchlist update failed:', error);
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <View style={styles.center}>
          <ActivityIndicator size="large" color={UI.forest} />
          <Text style={styles.loadingText}>Loading listing details...</Text>
        </View>
      </>
    );
  }

  if (!listing) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="alert-circle-outline" size={42} color={UI.muted} />
          </View>

          <Text style={styles.emptyTitle}>Listing not found</Text>
          <Text style={styles.emptyDescription}>
            This listing may have expired or is no longer available.
          </Text>

          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            style={styles.emptyButton}
          >
            <Ionicons name="arrow-back" size={17} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const lot = listing.lot || {};
  const iconName = COMMODITY_ICON[lot.commodityName] || COMMODITY_ICON.default;

  const price = Number(listing.askingPricePerKg || 0);
  const availableWeightKg = Number(lot.currentWeightKg || 0);
  const weightMT = availableWeightKg / 1000;
  const totalValue = price * availableWeightKg;
  const minQty = Number(listing.minQuantityKg || 0);

  const facilityName = lot.facility?.name || 'Verified Cold Storage';
  const facilityCity = lot.facility?.city || 'Location unavailable';
  const facilityState = lot.facility?.state || '';
  const facilityLocation = [facilityCity, facilityState]
    .filter(Boolean)
    .join(', ');

  const chamberText = lot.chamber?.chamberNumber
    ? `Chamber ${lot.chamber.chamberNumber}`
    : 'Temperature-controlled chamber';

  const temperatureRange =
    lot.chamber?.targetTempMin !== null &&
    lot.chamber?.targetTempMin !== undefined &&
    lot.chamber?.targetTempMax !== null &&
    lot.chamber?.targetTempMax !== undefined
      ? `${lot.chamber.targetTempMin}°C to ${lot.chamber.targetTempMax}°C`
      : 'Controlled storage range';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.screen}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Premium marketplace hero */}
          <LinearGradient
            colors={[UI.forestDeep, UI.forest, '#087B73']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.topIconButton}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.verifiedPill}>
                <Ionicons name="shield-checkmark" size={14} color="#B9F5D5" />
                <Text style={styles.verifiedPillText}>VERIFIED LOT</Text>
              </View>

              {isBuyer ? (
                <TouchableOpacity
                  style={styles.topIconButton}
                  onPress={toggleWatchlist}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isWatchlisted ? 'bookmark' : 'bookmark-outline'}
                    size={19}
                    color={isWatchlisted ? UI.gold : '#FFFFFF'}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.topIconPlaceholder} />
              )}
            </View>

            <View style={styles.heroContent}>
              <View style={styles.commodityIconBox}>
                <Ionicons name={iconName} size={27} color="#FFFFFF" />
              </View>

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroEyebrow}>MARKETPLACE LISTING</Text>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {lot.commodityName || 'Commodity Listing'}
                </Text>

                <View style={styles.heroLocationRow}>
                  <Ionicons
                    name="location"
                    size={14}
                    color="rgba(255,255,255,0.72)"
                  />
                  <Text style={styles.heroLocation} numberOfLines={2}>
                    {facilityName}, {facilityLocation}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaItem}>
                <Ionicons name="cube-outline" size={15} color="#B9F5D5" />
                <Text style={styles.heroMetaText}>
                  {weightMT.toFixed(2)} MT Available
                </Text>
              </View>

              <View style={styles.heroMetaDivider} />

              <View style={styles.heroMetaItem}>
                <Ionicons name="ribbon-outline" size={15} color="#B9F5D5" />
                <Text style={styles.heroMetaText}>
                  Grade {lot.qualityGrade || 'N/A'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Price card */}
          <View style={styles.priceCard}>
            <View style={styles.priceCardTop}>
              <View>
                <Text style={styles.priceLabel}>ASKING PRICE</Text>
                <View style={styles.priceValueRow}>
                  <Text style={styles.priceValue}>₹{price.toFixed(0)}</Text>
                  <Text style={styles.priceUnit}>/kg</Text>
                </View>
              </View>

              <View style={styles.priceDivider} />

              <View style={styles.totalValueBlock}>
                <Text style={styles.priceLabel}>TOTAL LOT VALUE</Text>
                <Text style={styles.totalValue}>
                  ₹
                  {totalValue.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </Text>
              </View>
            </View>

            {minQty > 0 && (
              <View style={styles.minQtyBanner}>
                <View style={styles.minQtyIcon}>
                  <Ionicons
                    name="layers-outline"
                    size={17}
                    color={UI.blue}
                  />
                </View>

                <View style={styles.minQtyTextWrap}>
                  <Text style={styles.minQtyLabel}>MINIMUM ORDER QUANTITY</Text>
                  <Text style={styles.minQtyText}>
                    {minQty.toLocaleString()} kg · {(minQty / 1000).toFixed(1)} MT
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Lot information */}
          <View style={styles.sectionCard}>
            <SectionHeading
              icon="cube-outline"
              eyebrow="INVENTORY OVERVIEW"
              title="Lot Information"
              color="#596DCC"
              background="#EEF1FF"
            />

            <View style={styles.statsGrid}>
              <MarketStat
                icon="scale-outline"
                label="AVAILABLE"
                value={`${weightMT.toFixed(2)} MT`}
                color={UI.teal}
                background={UI.tealSoft}
              />
              <MarketStat
                icon="cube-outline"
                label="BAGS"
                value={`${lot.bagCount || '—'}`}
                color={UI.emerald}
                background={UI.emeraldSoft}
              />
              <MarketStat
                icon="time-outline"
                label="DAYS STORED"
                value={`${lot.daysSinceIntake || 0}d`}
                color={UI.gold}
                background={UI.goldSoft}
              />
              <MarketStat
                icon="ribbon-outline"
                label="GRADE"
                value={lot.qualityGrade || 'N/A'}
                color={UI.blue}
                background={UI.blueSoft}
              />
            </View>

            {lot.moistureContent !== null &&
              lot.moistureContent !== undefined && (
                <View style={styles.detailFooter}>
                  <Ionicons name="water-outline" size={17} color={UI.blue} />
                  <Text style={styles.detailFooterText}>
                    Moisture content: {Number(lot.moistureContent)}%
                  </Text>
                </View>
              )}
          </View>

          {/* Facility */}
          <View style={styles.sectionCard}>
            <SectionHeading
              icon="snow-outline"
              eyebrow="VERIFIED STORAGE"
              title="Storage Facility"
              color={UI.teal}
              background={UI.tealSoft}
            />

            <View style={styles.facilityRow}>
              <View style={styles.facilityIcon}>
                <Ionicons name="business-outline" size={22} color={UI.forest} />
              </View>

              <View style={styles.facilityTextWrap}>
                <Text style={styles.facilityName} numberOfLines={2}>
                  {facilityName}
                </Text>
                <Text style={styles.facilityLocation}>{facilityLocation}</Text>
              </View>

              {!!lot.facility?.id && (
                <TouchableOpacity
                  onPress={() => router.push(`/facility/${lot.facility.id}`)}
                  activeOpacity={0.8}
                  style={styles.facilityViewButton}
                >
                  <Text style={styles.facilityViewText}>View</Text>
                  <Ionicons name="arrow-forward" size={14} color={UI.teal} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.chamberRow}>
              <Ionicons
                name="thermometer-outline"
                size={16}
                color={UI.muted}
              />
              <Text style={styles.chamberText}>
                {chamberText} · {temperatureRange}
              </Text>
            </View>
          </View>

          {/* Conditions */}
          <View style={styles.sectionCard}>
            <SectionHeading
              icon="pulse-outline"
              eyebrow="QUALITY ASSURANCE"
              title="Storage Conditions"
              color={UI.emerald}
              background={UI.emeraldSoft}
            />

            <Text style={styles.iotNote}>
              This lot is monitored through the cold-storage facility’s IoT
              systems to help preserve product quality until delivery.
            </Text>

            <View style={styles.iotBadge}>
              <View style={styles.iotBadgeIcon}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>

              <View>
                <Text style={styles.iotBadgeTitle}>IoT Monitored Facility</Text>
                <Text style={styles.iotBadgeSubtitle}>
                  Verified controlled storage
                </Text>
              </View>
            </View>
          </View>

          {/* Seller */}
          {listing.seller && isBuyer && (
            <View style={styles.sectionCard}>
              <SectionHeading
                icon="person-outline"
                eyebrow="LISTED BY"
                title="Seller Details"
                color="#7A5CC7"
                background="#F0EBFF"
              />

              <View style={styles.sellerRow}>
                <View style={styles.sellerAvatar}>
                  <Text style={styles.sellerInitial}>
                    {listing.seller.fullName?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>

                <View style={styles.sellerInfo}>
                  <Text style={styles.sellerName}>
                    {listing.seller.fullName || 'Verified Seller'}
                  </Text>
                  <Text style={styles.sellerLocation}>
                    {[listing.seller.city, listing.seller.state]
                      .filter(Boolean)
                      .join(', ') || 'India'}
                  </Text>
                </View>

                <View style={styles.verifiedSeller}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={UI.emerald}
                  />
                  <Text style={styles.verifiedSellerText}>Verified</Text>
                </View>
              </View>
            </View>
          )}

          {/* Description */}
          {listing.description && (
            <View style={styles.sectionCard}>
              <SectionHeading
                icon="document-text-outline"
                eyebrow="SELLER NOTE"
                title="Description"
                color={UI.gold}
                background={UI.goldSoft}
              />

              <Text style={styles.descriptionText}>{listing.description}</Text>
            </View>
          )}

          <View style={{ height: isBuyer ? 112 : 35 }} />
        </ScrollView>

        {/* Sticky action */}
        {isBuyer && (
          <View style={styles.actionDock}>
            <TouchableOpacity
              style={styles.dockSaveButton}
              activeOpacity={0.8}
              onPress={toggleWatchlist}
            >
              <Ionicons
                name={isWatchlisted ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={isWatchlisted ? UI.gold : UI.forest}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.orderButton}
              activeOpacity={0.85}
              onPress={() => router.push(`/place-order/${listing.id}`)}
            >
              <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
              <Text style={styles.orderButtonText}>Place Order</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

function SectionHeading({
  icon,
  eyebrow,
  title,
  color,
  background,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  eyebrow: string;
  title: string;
  color: string;
  background: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={[styles.sectionIconBox, { backgroundColor: background }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <View style={styles.sectionHeadingText}>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    </View>
  );
}

function MarketStat({
  icon,
  label,
  value,
  color,
  background,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  color: string;
  background: string;
}) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {value}
      </Text>

      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  container: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  scrollContent: {
    paddingBottom: 20,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: UI.canvas,
  },

  loadingText: {
    marginTop: 13,
    color: UI.muted,
    fontSize: 13,
    fontWeight: '600',
  },

  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9F0EB',
  },

  emptyTitle: {
    marginTop: 18,
    color: UI.ink,
    fontSize: 21,
    fontWeight: '800',
  },

  emptyDescription: {
    marginTop: 7,
    color: UI.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  emptyButton: {
    marginTop: 23,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: UI.forest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  hero: {
    paddingTop: 67,
    paddingHorizontal: 20,
    paddingBottom: 76,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  topIconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.whiteTransparent,
  },

  topIconPlaceholder: {
    width: 44,
    height: 44,
  },

  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(143, 240, 194, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(185, 245, 213, 0.14)',
  },

  verifiedPillText: {
    color: '#B9F5D5',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.65,
  },

  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 31,
  },

  commodityIconBox: {
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  heroTextWrap: {
    flex: 1,
    marginLeft: 15,
  },

  heroEyebrow: {
    color: 'rgba(255,255,255,0.63)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  heroTitle: {
    marginTop: 5,
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.7,
    fontWeight: '800',
  },

  heroLocationRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },

  heroLocation: {
    flex: 1,
    color: 'rgba(255,255,255,0.73)',
    fontSize: 12,
    lineHeight: 17,
  },

  heroMetaRow: {
    marginTop: 25,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.09)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroMetaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  heroMetaText: {
    color: '#D4F5E4',
    fontSize: 11,
    fontWeight: '700',
  },

  heroMetaDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  priceCard: {
    marginHorizontal: 16,
    marginTop: -50,
    padding: 18,
    borderRadius: 23,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: '#ECF0EB',
    shadowColor: UI.forest,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },

  priceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  priceLabel: {
    color: '#88958D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.65,
  },

  priceValueRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  priceValue: {
    color: UI.teal,
    fontSize: 37,
    fontWeight: '900',
    letterSpacing: -1.1,
  },

  priceUnit: {
    marginLeft: 3,
    color: UI.subtle,
    fontSize: 14,
    fontWeight: '700',
  },

  priceDivider: {
    width: 1,
    height: 49,
    marginHorizontal: 17,
    backgroundColor: '#E7ECE7',
  },

  totalValueBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },

  totalValue: {
    marginTop: 9,
    color: UI.ink,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'right',
  },

  minQtyBanner: {
    marginTop: 17,
    padding: 12,
    borderRadius: 15,
    backgroundColor: UI.blueSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  minQtyIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  minQtyTextWrap: {
    flex: 1,
  },

  minQtyLabel: {
    color: '#5D97AC',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.55,
  },

  minQtyText: {
    marginTop: 2,
    color: UI.blue,
    fontSize: 13,
    fontWeight: '800',
  },

  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 22,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.045,
    shadowRadius: 12,
    elevation: 2,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  sectionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeadingText: {
    flex: 1,
  },

  sectionEyebrow: {
    color: '#7A8780',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  sectionTitle: {
    marginTop: 2,
    color: UI.ink,
    fontSize: 18,
    fontWeight: '800',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 19,
  },

  statBox: {
    width: '47%',
    minHeight: 124,
    padding: 14,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9F6',
  },

  statIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statValue: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  statLabel: {
    marginTop: 5,
    color: '#7D8982',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.55,
  },

  detailFooter: {
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF1EC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  detailFooterText: {
    color: UI.muted,
    fontSize: 13,
    fontWeight: '600',
  },

  facilityRow: {
    marginTop: 19,
    flexDirection: 'row',
    alignItems: 'center',
  },

  facilityIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.emeraldSoft,
  },

  facilityTextWrap: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  facilityName: {
    color: UI.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },

  facilityLocation: {
    marginTop: 3,
    color: UI.muted,
    fontSize: 12,
  },

  facilityViewButton: {
    paddingVertical: 8,
    paddingLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  facilityViewText: {
    color: UI.teal,
    fontSize: 13,
    fontWeight: '800',
  },

  chamberRow: {
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF1EC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  chamberText: {
    flex: 1,
    color: UI.muted,
    fontSize: 13,
    lineHeight: 18,
  },

  iotNote: {
    marginTop: 19,
    color: UI.muted,
    fontSize: 14,
    lineHeight: 21,
  },

  iotBadge: {
    marginTop: 17,
    padding: 13,
    borderRadius: 15,
    backgroundColor: UI.emeraldSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  iotBadgeIcon: {
    width: 25,
    height: 25,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.emerald,
  },

  iotBadgeTitle: {
    color: '#087D58',
    fontSize: 13,
    fontWeight: '800',
  },

  iotBadgeSubtitle: {
    marginTop: 1,
    color: '#4B8B70',
    fontSize: 11,
  },

  sellerRow: {
    marginTop: 19,
    flexDirection: 'row',
    alignItems: 'center',
  },

  sellerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0EBFF',
  },

  sellerInitial: {
    color: '#7457BE',
    fontSize: 20,
    fontWeight: '800',
  },

  sellerInfo: {
    flex: 1,
    marginLeft: 11,
  },

  sellerName: {
    color: UI.ink,
    fontSize: 15,
    fontWeight: '800',
  },

  sellerLocation: {
    marginTop: 3,
    color: UI.muted,
    fontSize: 12,
  },

  verifiedSeller: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  verifiedSellerText: {
    color: UI.emerald,
    fontSize: 11,
    fontWeight: '800',
  },

  descriptionText: {
    marginTop: 19,
    color: UI.muted,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },

  actionDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    gap: 11,
    borderTopWidth: 1,
    borderTopColor: '#E3E8E1',
    backgroundColor: 'rgba(245,247,244,0.98)',
  },

  dockSaveButton: {
    width: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F0E9',
  },

  orderButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    backgroundColor: UI.forest,
    shadowColor: UI.forest,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },

  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});