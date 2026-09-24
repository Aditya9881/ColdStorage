import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import AuthWallModal from '@/components/AuthWallModal';
import RoleSelectionModal, { DiscoverRole } from '@/components/RoleSelectionModal';
import DiscoverHero from '@/components/DiscoverHero';
import DiscoverFeatures from '@/components/DiscoverFeatures';
import DiscoverTrust from '@/components/DiscoverTrust';
import SignInModal from '@/components/SignInModal';
import SignUpModal from '@/components/SignUpModal';

const ROLE_STORAGE_KEY = 'sheetkosh_discover_role';

interface Facility {
  id: string;
  name: string;
  city: string;
  state: string;
  pincode?: string;
  storageType: string;
  totalCapacity: number;
  availableCapacity: number;
  avgRating?: number;
  reviewCount?: number;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
  commodities?: string[];
  operatingSince?: string;
  status?: string;
  chambers?: {
    id: string;
    chamberNumber: string;
    name?: string;
    targetTempMin?: number;
    targetTempMax?: number;
    commodityCategory?: string;
  }[];
}

interface MarketPrice {
  commodity: string;
  category: string;
  unit: string;
  imageUrl?: string;
  image?: string;
  commodityImage?: string;
  iconUrl?: string;
  photo?: string;
  mandis: {
    name: string;
    state: string;
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
  }[];
}

type LanguageKey = 'hi' | 'en';

import { DetailUI } from '@/components/DetailScreenCard';

const UI = {
  bg: DetailUI.canvas,
  bgAlt: '#EEF4EE',
  surface: DetailUI.surface,
  surfaceWarm: '#FBFCFA',
  border: DetailUI.border,
  text: DetailUI.ink,
  textMuted: DetailUI.muted,
  textSoft: DetailUI.subtle,

  forest: DetailUI.primary,
  forestDeep: DetailUI.primaryDark,
  forestAlt: DetailUI.primaryMid,
  forestSoft: '#E8F3EE',
  forestSoftStrong: '#D7EBDD',

  gold: '#D8B24A',
  goldSoft: '#FFF7E5',

  blue: '#3F76C4',
  blueSoft: '#EAF2FF',

  danger: DetailUI.danger,
  dangerSoft: DetailUI.dangerSoft,

  warning: DetailUI.warning,
  warningSoft: DetailUI.warningSoft,

  white: '#FFFFFF',
};

// ── Curated warehouse / cold-storage stock images ──
const WAREHOUSE_IMAGES = [
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1565891741441-64926e441838?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
];

const COPY = {
  hi: {
    appName: 'शीतकोष',
    trusted: 'विश्वसनीय कोल्ड स्टोरेज नेटवर्क',
    homeSub: 'सही स्टोरेज और आज का मंडी भाव',
    signIn: 'लॉगिन',
    yourPlace: 'आपकी जगह',
    noLocation: 'लोकेशन बंद है',
    allIndia: 'पूरे भारत के स्टोरेज दिख रहे हैं',
    enable: 'चालू करें',
    nearbyStorage: 'नज़दीकी स्टोरेज',
    seeAll: 'सभी देखें',
    todayPrices: 'आज का भाव',
    updatedToday: 'आज अपडेट',
    emptyFacilities: 'कोई स्टोरेज नहीं मिला',
    emptyFacilitiesSub: 'थोड़ा बाद में फिर देखें',
    emptyPrices: 'आज भाव उपलब्ध नहीं है',
    emptyPricesSub: 'बाद में फिर देखें',
    km: 'किमी',
    spaceAvailable: 'जगह उपलब्ध',
    almostFull: 'जगह कम है',
    full: 'पूरा भरा',
    bookNow: 'बुक करें',
    perUnit: 'प्रति',
    needLoginBook: 'बुकिंग के लिए किसान के रूप में लॉगिन करें।',
    needLoginDetails: 'पूरी जानकारी देखने के लिए लॉगिन करें।',
    getStarted: 'शुरू करें',
    createAccount: 'खाता बनाएं',
    alreadyAccount: 'पहले से खाता है? लॉगिन करें',
    storageNearYou: 'नज़दीकी स्टोरेज',
    liveCapacity: 'लाइव क्षमता',
    verified: 'सत्यापित',
    mandiRate: 'मंडी भाव',
    mtAvailable: 'MT उपलब्ध',
    mtTotal: 'MT कुल',
    produce: 'उत्पाद',
    accountEyebrow: 'शीतकोष खाता',
    accountSub: 'अपनी बुकिंग सेव करें और स्टोरेज एक जगह मैनेज करें।',
  },
  en: {
    appName: 'SheetKosh',
    trusted: 'TRUSTED COLD STORAGE NETWORK',
    homeSub: 'Better storage and today’s mandi prices',
    signIn: 'Sign in',
    yourPlace: 'Your location',
    noLocation: 'Location is off',
    allIndia: 'Showing storage across India',
    enable: 'Enable',
    nearbyStorage: 'Nearby storage',
    seeAll: 'See all',
    todayPrices: 'Today’s prices',
    updatedToday: 'Updated today',
    emptyFacilities: 'No storage found',
    emptyFacilitiesSub: 'Please try again later',
    emptyPrices: 'No prices today',
    emptyPricesSub: 'Please check again later',
    km: 'km',
    spaceAvailable: 'Space available',
    almostFull: 'Almost full',
    full: 'Full',
    bookNow: 'Book storage',
    perUnit: 'per',
    needLoginBook: 'Sign in as a farmer to book storage.',
    needLoginDetails: 'Sign in to view full details.',
    getStarted: 'Get started',
    createAccount: 'Create account',
    alreadyAccount: 'Already have an account? Sign in',
    storageNearYou: 'Storage near you',
    liveCapacity: 'LIVE CAPACITY',
    verified: 'Verified',
    mandiRate: 'MANDI PRICE',
    mtAvailable: 'MT available',
    mtTotal: 'MT total',
    produce: 'Produce',
    accountEyebrow: 'SHEETKOSH ACCOUNT',
    accountSub: 'Save your bookings and manage your storage in one place.',
  },
} as const;

function getSpaceStatus(
  available: number,
  total: number,
  t: typeof COPY.hi | typeof COPY.en
) {
  if (!total || total <= 0) {
    return {
      label: t.spaceAvailable,
      bg: UI.forestSoft,
      color: UI.forest,
      icon: 'checkmark-circle' as const,
    };
  }

  const freeRatio = available / total;

  if (freeRatio <= 0.05) {
    return {
      label: t.full,
      bg: UI.dangerSoft,
      color: UI.danger,
      icon: 'close-circle' as const,
    };
  }

  if (freeRatio <= 0.2) {
    return {
      label: t.almostFull,
      bg: UI.warningSoft,
      color: UI.warning,
      icon: 'alert-circle' as const,
    };
  }

  return {
    label: t.spaceAvailable,
    bg: UI.forestSoft,
    color: UI.forest,
    icon: 'checkmark-circle' as const,
  };
}

function getCommodityVisualMeta(name: string) {
  const n = (name || '').toLowerCase();

  if (n.includes('potato') || n.includes('aaloo') || n.includes('आलू')) {
    return {
      bg: '#F5E8D4',
      fallbackUrl:
        'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('onion') || n.includes('प्याज') || n.includes('प्याज़')) {
    return {
      bg: '#F7E4E5',
      fallbackUrl:
        'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('tomato') || n.includes('टमाटर')) {
    return {
      bg: '#F9E2DE',
      fallbackUrl:
        'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('apple') || n.includes('सेब')) {
    return {
      bg: '#F6E2E5',
      fallbackUrl:
        'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('banana') || n.includes('केला')) {
    return {
      bg: '#FBF1CF',
      fallbackUrl:
        'https://images.unsplash.com/photo-1574226516831-e1dff420e37f?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('grape') || n.includes('अंगूर')) {
    return {
      bg: '#EEE5F6',
      fallbackUrl:
        'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('mango') || n.includes('आम')) {
    return {
      bg: '#FFE7CF',
      fallbackUrl:
        'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('orange') || n.includes('संतरा')) {
    return {
      bg: '#FFE7D8',
      fallbackUrl:
        'https://images.unsplash.com/photo-1580052614034-c55d20bfee3b?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('lemon') || n.includes('नींबू')) {
    return {
      bg: '#FCF6D7',
      fallbackUrl:
        'https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('chilli') || n.includes('mirchi') || n.includes('मिर्च')) {
    return {
      bg: '#FBE4DB',
      fallbackUrl:
        'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=700&q=85',
    };
  }

  return {
    bg: '#EDF1E5',
    fallbackUrl: `https://source.unsplash.com/700x500/?${encodeURIComponent(
      name || 'fresh vegetables'
    )}`,
  };
}

function getCommodityImageUri(price: MarketPrice) {
  const apiImage =
    price.imageUrl ||
    price.image ||
    price.commodityImage ||
    price.iconUrl ||
    price.photo;

  if (apiImage && typeof apiImage === 'string' && apiImage.trim()) {
    return apiImage.trim();
  }

  return getCommodityVisualMeta(price.commodity).fallbackUrl;
}

function PriceImage({
  uri,
  commodity,
  cardKey,
  brokenMap,
  setBrokenMap,
}: {
  uri: string;
  commodity: string;
  cardKey: string;
  brokenMap: Record<string, boolean>;
  setBrokenMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const hasBrokenImage = brokenMap[cardKey];

  if (hasBrokenImage) {
    return (
      <View style={styles.priceImageFallback}>
        <Ionicons name="leaf-outline" size={24} color={UI.forest} />
        <Text style={styles.priceImageFallbackText} numberOfLines={1}>
          {commodity}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.priceImage}
      resizeMode="cover"
      onError={() =>
        setBrokenMap((prev) => ({
          ...prev,
          [cardKey]: true,
        }))
      }
    />
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  /* ─── Role Selection State ─── */
  const [selectedRole, setSelectedRole] = useState<DiscoverRole | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);

  // Load persisted role on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
        if (stored && ['OWNER', 'FARMER', 'BUYER'].includes(stored)) {
          setSelectedRole(stored as DiscoverRole);
        } else {
          setShowRoleModal(true);
        }
      } catch {
        setShowRoleModal(true);
      } finally {
        setRoleLoaded(true);
      }
    })();
  }, []);

  const handleRoleSelect = async (role: DiscoverRole) => {
    setSelectedRole(role);
    setShowRoleModal(false);
    try {
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch {}
  };

  const handleRoleSkip = () => {
    handleRoleSelect('FARMER'); // Default to farmer
  };

  const handleSwitchRole = () => {
    setShowRoleModal(true);
  };

  /* ─── Existing State ─── */
  const [uiState, setUiState] = useState<'loading' | 'loaded' | 'denied'>('loading');
  const [language, setLanguage] = useState<LanguageKey>('en');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationState, setLocationState] = useState('');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authActionMessage, setAuthActionMessage] = useState('');
  const [brokenPriceImages, setBrokenPriceImages] = useState<Record<string, boolean>>({});
  const [brokenFacilityImages, setBrokenFacilityImages] = useState<Record<string, boolean>>({});

  /* ─── Auth Modal State ─── */
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(20)).current;
  const cardAnims = useRef<Animated.Value[]>([]).current;
  const t = COPY[language];

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(contentSlide, {
        toValue: 0,
        tension: 55,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchAllData = useCallback(async (lat?: number, lng?: number, state?: string) => {
    try {
      const priceQuery = state
        ? `/market-prices?state=${encodeURIComponent(state)}`
        : '/market-prices';

      const [facilitiesRes, pricesRes] = await Promise.all([
        api.get<any>(
          `/discover/facilities?limit=50${lat ? `&latitude=${lat}&longitude=${lng}` : ''}`
        ),
        api.get<any>(priceQuery),
      ]);

      if (facilitiesRes.success && facilitiesRes.data) {
        const rawFacilities = Array.isArray(facilitiesRes.data)
          ? facilitiesRes.data
          : facilitiesRes.data.facilities || [];

        const activeFacilities = rawFacilities
          .filter((facility: any) => facility.status === 'ACTIVE')
          .map((facility: any) => ({
            ...facility,
            totalCapacity: Number(facility.totalCapacity ?? facility.totalCapacityMt ?? 0),
            availableCapacity: Number(facility.availableCapacity ?? 0),
            avgRating:
              Number(facility.avgRating ?? facility.averageRating ?? 0) || undefined,
            reviewCount:
              Number(facility.reviewCount ?? facility._count?.reviews ?? 0) || undefined,
          }));

        setFacilities(activeFacilities);
      }

      if (pricesRes.success && pricesRes.data) {
        setMarketPrices(Array.isArray(pricesRes.data) ? pricesRes.data : []);
      }
    } catch (error) {
      console.error('Discover fetch error:', error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          setLocation(currentLocation);

          let userState = '';
          try {
            const [address] = await Location.reverseGeocodeAsync({
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            });

            if (address) {
              const parts = [
                address.subregion || address.city || address.district,
                address.region,
              ].filter(Boolean);

              setLocationAddress(parts.join(', '));
              userState = address.region || '';
              setLocationState(userState);
            }
          } catch {
            setLocationAddress(
              `${currentLocation.coords.latitude.toFixed(4)}°N, ${currentLocation.coords.longitude.toFixed(4)}°E`
            );
          }

          await fetchAllData(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude,
            userState
          );
          setUiState('loaded');
        } else {
          await fetchAllData();
          setUiState('denied');
        }
      } catch {
        await fetchAllData();
        setUiState('denied');
      }

      animateIn();
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestLocation = async () => {
    setUiState('loading');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLocation(currentLocation);

        let userState = '';
        try {
          const [address] = await Location.reverseGeocodeAsync({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });

          if (address) {
            const parts = [
              address.subregion || address.city || address.district,
              address.region,
            ].filter(Boolean);

            setLocationAddress(parts.join(', '));
            userState = address.region || '';
            setLocationState(userState);
          }
        } catch {}

        await fetchAllData(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          userState
        );
        setUiState('loaded');
      } else {
        setUiState('denied');
        await fetchAllData();
      }
    } catch {
      setUiState('denied');
      await fetchAllData();
    }

    animateIn();
  };

  const onRefresh = async () => {
    setRefreshing(true);

    if (location) {
      await fetchAllData(
        location.coords.latitude,
        location.coords.longitude,
        locationState
      );
    } else {
      await fetchAllData();
    }

    setRefreshing(false);
  };

  const handleGatedAction = (actionType: 'book' | 'details') => {
    const messages: Record<'book' | 'details', string> = {
      book: t.needLoginBook,
      details: t.needLoginDetails,
    };

    setAuthActionMessage(messages[actionType]);
    setAuthModalVisible(true);
  };

  const visibleFacilities = useMemo(() => {
    return [...facilities]
      .sort((a, b) => Number(a.distanceKm ?? 999999) - Number(b.distanceKm ?? 999999))
      .slice(0, 6);
  }, [facilities]);

  // Staggered card animations
  useEffect(() => {
    while (cardAnims.length < visibleFacilities.length) {
      cardAnims.push(new Animated.Value(0));
    }
    if (visibleFacilities.length > 0) {
      const anims = visibleFacilities.map((_, i) =>
        Animated.timing(cardAnims[i], { toValue: 1, duration: 400, delay: i * 100, useNativeDriver: true })
      );
      Animated.stagger(80, anims).start();
    }
  }, [visibleFacilities.length]);

  const visiblePrices = useMemo(() => {
    return marketPrices.filter((item) => item?.commodity && item?.mandis?.length).slice(0, 8);
  }, [marketPrices]);

  /* ─── Role modal (shown before anything else) ─── */
  if (showRoleModal) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <RoleSelectionModal onSelect={handleRoleSelect} onSkip={handleRoleSkip} />
      </>
    );
  }

  if (uiState === 'loading') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <View style={styles.loadingMark}>
            <View style={styles.loadingInner}>
              <Ionicons name="snow-outline" size={28} color={UI.gold} />
            </View>
          </View>
          <ActivityIndicator size="small" color={UI.gold} style={{ marginBottom: 17 }} />
          <Text style={styles.loadingTitle}>SheetKosh</Text>
          <Text style={styles.loadingSub}>{t.homeSub}</Text>
        </View>
      </>
    );
  }

  const currentRole = selectedRole || 'FARMER';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UI.forest} />
          }
        >
          {/* ─── Role-specific Hero ─── */}
          <DiscoverHero
            role={currentRole}
            onSignIn={() => setShowSignInModal(true)}
            onGetStarted={() => setShowSignUpModal(true)}
            onSwitchRole={handleSwitchRole}
          />

          {/* ─── Role-specific Features ─── */}
          <DiscoverFeatures role={currentRole} />

          {/* ─── FARMER: Show facility + price listings ─── */}
          {currentRole === 'FARMER' && (
          <Animated.View style={{ transform: [{ translateY: contentSlide }] }}>
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <View>
                  <View style={styles.sectionEyebrowRow}>
                    <Ionicons name="snow-outline" size={14} color={UI.gold} />
                    <Text style={styles.sectionEyebrow}>{t.liveCapacity}</Text>
                  </View>
                  <Text style={styles.sectionTitle}>{t.nearbyStorage}</Text>
                </View>

                {visibleFacilities.length > 0 && (
                  <TouchableOpacity style={styles.seeAllButton} activeOpacity={0.82}>
                    <Text style={styles.seeAllText}>{t.seeAll}</Text>
                    <Ionicons name="arrow-forward" size={15} color={UI.forest} />
                  </TouchableOpacity>
                )}
              </View>

              {visibleFacilities.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="search-outline" size={25} color={UI.forest} />
                  </View>
                  <Text style={styles.emptyTitle}>{t.emptyFacilities}</Text>
                  <Text style={styles.emptySub}>{t.emptyFacilitiesSub}</Text>
                </View>
              ) : (
                visibleFacilities.map((facility, idx) => {
                  const spaceStatus = getSpaceStatus(
                    Number(facility.availableCapacity || 0),
                    Number(facility.totalCapacity || 0),
                    t
                  );

                  const available = Number(facility.availableCapacity || 0);
                  const total = Number(facility.totalCapacity || 0);
                  const capacityPercentage =
                    total > 0 ? Math.max(0, Math.min(100, (available / total) * 100)) : 0;

                  const distanceText =
                    facility.distanceKm !== undefined && facility.distanceKm !== null
                      ? `${Number(facility.distanceKm).toFixed(1)} ${t.km}`
                      : null;

                  const imageUrl = WAREHOUSE_IMAGES[idx % WAREHOUSE_IMAGES.length];
                  const hasBrokenImage = brokenFacilityImages[facility.id];
                  const avgRating = Number(facility.avgRating || 0);
                  const commodityList = facility.commodities?.slice(0, 3).join(', ') || facility.storageType || 'Cold storage';

                  // Card animation
                  const anim = cardAnims[idx];
                  const cardStyle = anim ? {
                    opacity: anim,
                    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
                  } : {};

                  return (
                    <Animated.View key={facility.id} style={[styles.facilityCard, cardStyle]}>
                      <TouchableOpacity
                        activeOpacity={0.93}
                        onPress={() => {
                          if (isAuthenticated) {
                            router.push(`/facility/${facility.id}`);
                          } else {
                            handleGatedAction('details');
                          }
                        }}
                      >
                        {/* ── Image Section ── */}
                        <View style={styles.facilityImageWrap}>
                          {!hasBrokenImage ? (
                            <Image
                              source={{ uri: imageUrl }}
                              style={styles.facilityImage}
                              resizeMode="cover"
                              onError={() => setBrokenFacilityImages(prev => ({ ...prev, [facility.id]: true }))}
                            />
                          ) : (
                            <LinearGradient colors={['#0F3D30', '#1A5746']} style={styles.facilityImageFallback}>
                              <Ionicons name="snow-outline" size={32} color="rgba(255,255,255,0.35)" />
                            </LinearGradient>
                          )}
                          {/* Verified badge on image */}
                          <View style={styles.imageVerifiedBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                            <Text style={styles.imageVerifiedText}>{t.verified}</Text>
                          </View>
                        </View>

                        {/* ── Info Section ── */}
                        <View style={styles.facilityInfoSection}>
                          {/* Name + Rating row */}
                          <View style={styles.facilityNameRatingRow}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.facilityName} numberOfLines={1}>{facility.name}</Text>
                              <View style={styles.facilityLocDistRow}>
                                <Ionicons name="location-outline" size={12} color={UI.textMuted} />
                                <Text style={styles.facilityLocation} numberOfLines={1}>
                                  {facility.city}, {facility.state}
                                  {distanceText ? ` • ` : ''}
                                </Text>
                                {distanceText && <Text style={styles.distanceHighlight}>{distanceText} away</Text>}
                              </View>
                            </View>
                            {avgRating > 0 && (
                              <View style={styles.ratingBox}>
                                <Ionicons name="star" size={14} color="#D8B24A" />
                                <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
                              </View>
                            )}
                          </View>

                          {/* Capacity + details (only after login) */}
                          {isAuthenticated ? (
                            <>
                              <View style={styles.capacitySection}>
                                <View style={styles.capacityTextRow}>
                                  <Text style={styles.capacityLabel}>{t.spaceAvailable}</Text>
                                  <Text style={styles.capacityAmount}>
                                    {available.toLocaleString('en-IN')} / {total.toLocaleString('en-IN')} MT
                                  </Text>
                                </View>
                                <View style={styles.capacityTrack}>
                                  <View style={[styles.capacityFill, { width: `${capacityPercentage}%`, backgroundColor: spaceStatus.color }]} />
                                </View>
                                <View style={styles.capacityStatusRow}>
                                  <Ionicons name={spaceStatus.icon} size={13} color={spaceStatus.color} />
                                  <Text style={[styles.capacityStatusText, { color: spaceStatus.color }]}>
                                    {capacityPercentage > 50 ? 'High capacity available' : spaceStatus.label}
                                  </Text>
                                </View>
                              </View>

                              <View style={styles.commodityInfoRow}>
                                <Ionicons name="information-circle-outline" size={13} color={UI.textSoft} />
                                <Text style={styles.commodityInfoText} numberOfLines={1}>
                                  Ideal for {commodityList}
                                </Text>
                              </View>

                              <View style={styles.facilityDivider} />

                              <View style={styles.facilityBottomRow}>
                                <View>
                                  <Text style={styles.startingFromLabel}>Starting from</Text>
                                  <Text style={styles.startingPrice}>₹13<Text style={styles.startingPriceUnit}>/MT/mo</Text></Text>
                                </View>
                                <TouchableOpacity
                                  style={styles.bookButton}
                                  activeOpacity={0.87}
                                  onPress={() => router.push(`/facility/${facility.id}`)}
                                >
                                  <Text style={styles.bookButtonText}>{t.bookNow}</Text>
                                  <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                                </TouchableOpacity>
                              </View>
                            </>
                          ) : (
                            <>
                              <View style={styles.facilityDivider} />
                              <View style={styles.facilityBottomRow}>
                                <TouchableOpacity
                                  style={styles.signInTeaser}
                                  onPress={() => handleGatedAction('details')}
                                  activeOpacity={0.8}
                                >
                                  <Ionicons name="lock-closed-outline" size={13} color={UI.forest} />
                                  <Text style={styles.signInTeaserText}>Sign in to see capacity & pricing</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.bookButton}
                                  activeOpacity={0.87}
                                  onPress={() => handleGatedAction('book')}
                                >
                                  <Text style={styles.bookButtonText}>{t.bookNow}</Text>
                                  <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                                </TouchableOpacity>
                              </View>
                            </>
                          )}
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <View>
                  <View style={styles.sectionEyebrowRow}>
                    <Ionicons name="trending-up-outline" size={14} color={UI.gold} />
                    <Text style={styles.sectionEyebrow}>{t.mandiRate}</Text>
                  </View>
                  <Text style={styles.sectionTitle}>{t.todayPrices}</Text>
                </View>

                <View style={styles.updatedBadge}>
                  <View style={styles.updatedDot} />
                  <Text style={styles.updatedText}>{t.updatedToday}</Text>
                </View>
              </View>

              {visiblePrices.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="bar-chart-outline" size={25} color={UI.forest} />
                  </View>
                  <Text style={styles.emptyTitle}>{t.emptyPrices}</Text>
                  <Text style={styles.emptySub}>{t.emptyPricesSub}</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.priceScroll}
                >
                  {visiblePrices.map((price, index) => {
                    const mandi = price.mandis?.[0];
                    if (!mandi) return null;

                    const imageUri = getCommodityImageUri(price);
                    const cardKey = `${price.commodity}-${index}-${mandi.name}`;

                    return (
                      <TouchableOpacity
                        key={cardKey}
                        style={styles.priceCard}
                        activeOpacity={0.92}
                      >
                        <View style={styles.priceImageWrap}>
                          <PriceImage
                            uri={imageUri}
                            commodity={price.commodity}
                            cardKey={cardKey}
                            brokenMap={brokenPriceImages}
                            setBrokenMap={setBrokenPriceImages}
                          />
                          <View style={styles.priceImageShade} />

                          <View style={styles.priceCategoryBadge}>
                            <Ionicons name="leaf-outline" size={12} color="#FFFFFF" />
                            <Text style={styles.priceCategoryText}>
                              {price.category || t.produce}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.priceContent}>
                          <Text style={styles.priceCommodityName} numberOfLines={1}>
                            {price.commodity}
                          </Text>

                          <View style={styles.priceMandiRow}>
                            <Ionicons name="location-outline" size={13} color={UI.textSoft} />
                            <Text style={styles.priceMandiText} numberOfLines={1}>
                              {mandi.name}
                            </Text>
                          </View>

                          <View style={styles.priceFooter}>
                            <View>
                              <Text style={styles.priceUnitText}>
                                {t.perUnit} ₹/{price.unit}
                              </Text>
                              <Text style={styles.priceValue}>
                                ₹{Number(mandi.modalPrice || 0).toLocaleString('en-IN')}
                              </Text>
                            </View>

                            <View style={styles.priceArrowButton}>
                              <Ionicons name="arrow-forward" size={16} color={UI.forest} />
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={{ height: 34 }} />
          </Animated.View>
          )}

          {/* ─── Trust section (all roles) ─── */}
          <DiscoverTrust
            onGetStarted={() => setShowSignUpModal(true)}
            onSignIn={() => setShowSignInModal(true)}
          />

          <View style={{ height: 34 }} />
        </ScrollView>

        <AuthWallModal
          visible={authModalVisible}
          onClose={() => setAuthModalVisible(false)}
          onLogin={() => {
            setAuthModalVisible(false);
            setShowSignInModal(true);
          }}
          onRegister={() => {
            setAuthModalVisible(false);
            setShowSignUpModal(true);
          }}
          actionMessage={authActionMessage}
        />

        {/* ─── Auth Modals ─── */}
        <SignInModal
          visible={showSignInModal}
          onClose={() => setShowSignInModal(false)}
          onSwitchToSignUp={() => { setShowSignInModal(false); setShowSignUpModal(true); }}
        />
        <SignUpModal
          visible={showSignUpModal}
          onClose={() => setShowSignUpModal(false)}
          onSwitchToSignIn={() => { setShowSignUpModal(false); setShowSignInModal(true); }}
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

  scrollContent: {
    paddingBottom: 18,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: UI.forestDeep,
  },

  loadingMark: {
    width: 88,
    height: 88,
    marginBottom: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  loadingInner: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(215,162,63,0.16)',
  },

  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  loadingSub: {
    marginTop: 8,
    color: '#BDD1C3',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },

  hero: {
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  heroGlowOne: {
    position: 'absolute',
    top: -90,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(215,162,63,0.18)',
  },

  heroGlowTwo: {
    position: 'absolute',
    left: -80,
    bottom: -120,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(114,193,146,0.14)',
  },

  heroGlowThree: {
    position: 'absolute',
    top: 90,
    right: 32,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  brandRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  brandTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  brandMiniText: {
    color: '#BBD0C2',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  brandName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
    letterSpacing: -0.3,
  },

  loginButton: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  loginButtonText: {
    color: '#F8FBF8',
    fontSize: 13,
    fontWeight: '800',
  },

  heroMainContent: {
    marginTop: 16,
  },

  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  heroBadgeText: {
    color: '#E3BF76',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  heroHeading: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    letterSpacing: -0.4,
  },

  heroSubheading: {
    marginTop: 2,
    color: '#9CB8A7',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },

  heroUtilityRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },

  locationCard: {
    flex: 1,
    minHeight: 74,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(8,28,22,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(215,162,63,0.14)',
  },

  locationTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  locationPillLabel: {
    color: '#AFC6B7',
    fontSize: 10,
    fontWeight: '700',
  },

  locationPillValue: {
    marginTop: 3,
    color: '#F3FAF3',
    fontSize: 13,
    fontWeight: '700',
  },

  enablePill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: UI.gold,
  },

  enablePillText: {
    color: UI.forestDeep,
    fontSize: 10,
    fontWeight: '800',
  },

  languageToggle: {
    width: 62,
    padding: 4,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'space-between',
  },

  languageButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 31,
  },

  languageButtonActive: {
    backgroundColor: '#FFFFFF',
  },

  languageButtonText: {
    color: '#D3E0D6',
    fontSize: 12,
    fontWeight: '800',
  },

  languageButtonTextActive: {
    color: UI.forestDeep,
  },

  section: {
    marginTop: 30,
    paddingHorizontal: 16,
  },

  sectionHead: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },

  sectionEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },

  sectionEyebrow: {
    color: '#A27422',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  sectionTitle: {
    color: UI.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    letterSpacing: -0.35,
  },

  seeAllButton: {
    paddingVertical: 8,
    paddingLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  seeAllText: {
    color: UI.forest,
    fontSize: 14,
    fontWeight: '800',
  },

  updatedBadge: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.forestSoft,
  },

  updatedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#3FA365',
  },

  updatedText: {
    color: UI.forest,
    fontSize: 10,
    fontWeight: '800',
  },

  facilityCard: {
    marginBottom: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    shadowColor: '#173726',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 22,
    elevation: 4,
    overflow: 'hidden',
  },

  // Image section
  facilityImageWrap: {
    height: 170,
    backgroundColor: '#E8EFE9',
    position: 'relative',
  },

  facilityImage: {
    width: '100%',
    height: '100%',
  },

  facilityImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  imageVerifiedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 78, 64, 0.82)',
  },

  imageVerifiedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // Info section (below image)
  facilityInfoSection: {
    padding: 16,
  },

  facilityNameRatingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },

  facilityName: {
    color: UI.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    letterSpacing: -0.2,
  },

  facilityLocDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    flexWrap: 'wrap',
  },

  facilityLocation: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },

  distanceHighlight: {
    color: UI.forest,
    fontSize: 12,
    fontWeight: '700',
  },

  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  ratingText: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '800',
  },

  // Capacity section
  capacitySection: {
    marginBottom: 10,
  },

  capacityTextRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  capacityLabel: {
    color: UI.text,
    fontSize: 13,
    fontWeight: '700',
  },

  capacityAmount: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },

  capacityTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E8EFE9',
  },

  capacityFill: {
    height: '100%',
    minWidth: 3,
    borderRadius: 999,
  },

  capacityStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },

  capacityStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Commodity info
  commodityInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },

  commodityInfoText: {
    flex: 1,
    color: UI.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },

  facilityDivider: {
    height: 1,
    marginVertical: 14,
    backgroundColor: '#E9EFEB',
  },

  // Bottom: price + book
  facilityBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  startingFromLabel: {
    color: UI.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },

  startingPrice: {
    color: UI.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  startingPriceUnit: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0,
  },

  bookButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: UI.forest,
  },

  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  signInTeaser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },

  signInTeaserText: {
    flex: 1,
    color: UI.forest,
    fontSize: 12,
    fontWeight: '700',
  },

  priceScroll: {
    gap: 14,
    paddingRight: 16,
  },

  priceCard: {
    width: 196,
    overflow: 'hidden',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    shadowColor: '#173726',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },

  priceImageWrap: {
    position: 'relative',
    height: 112,
    overflow: 'hidden',
    backgroundColor: '#EAF1E8',
  },

  priceImage: {
    width: '100%',
    height: '100%',
  },

  priceImageShade: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(8,35,25,0.10)',
  },

  priceCategoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    maxWidth: 125,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(18,48,34,0.72)',
  },

  priceCategoryText: {
    maxWidth: 86,
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },

  priceImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    backgroundColor: '#EAF1E8',
  },

  priceImageFallbackText: {
    color: UI.forest,
    fontSize: 11,
    fontWeight: '800',
  },

  priceContent: {
    padding: 13,
  },

  priceCommodityName: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },

  priceMandiRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  priceMandiText: {
    flex: 1,
    minWidth: 0,
    color: UI.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  priceFooter: {
    marginTop: 14,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: '#EDF1ED',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  priceUnitText: {
    marginBottom: 2,
    color: UI.textSoft,
    fontSize: 9,
    fontWeight: '700',
  },

  priceValue: {
    color: UI.forest,
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 25,
    letterSpacing: -0.35,
  },

  priceArrowButton: {
    width: 33,
    height: 33,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.forestSoft,
  },

  emptyCard: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },

  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.forestSoft,
  },

  emptyTitle: {
    marginTop: 12,
    color: UI.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptySub: {
    marginTop: 6,
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  guestSection: {
    marginTop: 32,
    paddingHorizontal: 16,
  },

  guestCard: {
    overflow: 'hidden',
    borderRadius: 24,
    padding: 20,
  },

  guestGlowOne: {
    position: 'absolute',
    top: -70,
    right: -45,
    width: 170,
    height: 170,
    borderRadius: 100,
    backgroundColor: 'rgba(215,162,63,0.18)',
  },

  guestGlowTwo: {
    position: 'absolute',
    left: -55,
    bottom: -90,
    width: 150,
    height: 150,
    borderRadius: 90,
    backgroundColor: 'rgba(103,191,130,0.14)',
  },

  guestIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },

  guestContent: {
    marginTop: 15,
  },

  guestEyebrow: {
    color: '#DFB768',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  guestTitle: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  guestSub: {
    marginTop: 6,
    maxWidth: '88%',
    color: '#BDD1C2',
    fontSize: 13,
    lineHeight: 19,
  },

  guestPrimaryButton: {
    minHeight: 49,
    marginTop: 18,
    paddingHorizontal: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F5D88E',
  },

  guestPrimaryText: {
    color: UI.forestDeep,
    fontSize: 14,
    fontWeight: '800',
  },

  guestLoginButton: {
    minHeight: 40,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  guestLoginText: {
    color: '#D7E4D9',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});