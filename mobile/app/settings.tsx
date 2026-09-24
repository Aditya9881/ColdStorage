/**
 * Premium Settings Screen
 * Redesigned to match the premium profile/workspace style
 * - White top bar
 * - Light premium background
 * - Refined hero summary card
 * - Dense premium sections
 * - Better row hierarchy
 * - Premium language, notifications, support, and logout UI
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  useColorScheme,
  Alert,
  Linking,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { storage } from '@/lib/storage';
import { hapticLight } from '@/lib/haptics';
import Constants from 'expo-constants';
import { DetailUI } from '@/components/DetailScreenCard';
import { SectionHeader, PremiumRow, PremiumToggle, DangerAction } from '@/components/SettingsRows';

type Language = 'en' | 'hi';

interface NotifPrefs {
  temperatureAlerts: boolean;
  orderUpdates: boolean;
  priceAlerts: boolean;
  promotions: boolean;
}

const UI = {
  light: {
    bg: DetailUI.canvas,
    surface: DetailUI.surface,
    surfaceSoft: '#FBFCFA',
    border: DetailUI.border,
    borderSoft: DetailUI.borderSoft,
    text: DetailUI.ink,
    textMuted: DetailUI.muted,
    textSoft: DetailUI.subtle,
    forest: DetailUI.primaryDark,
    forestDeep: '#02261E',
    forestMid: DetailUI.primaryMid,
    mintBg: '#E8F3EE',
    teal: '#0D7A72',
    tealSoft: '#E8F7F5',
    emerald: '#2F8E65',
    emeraldSoft: '#E9F5EE',
    blue: '#2E89A7',
    blueSoft: '#EAF6FB',
    purple: '#7A63BE',
    purpleSoft: '#F2EEFF',
    gold: '#D8B24A',
    goldSoft: '#FFF7E5',
    orange: '#C47A22',
    orangeSoft: '#FFF1E3',
    red: DetailUI.danger,
    redSoft: DetailUI.dangerSoft,
    white: '#FFFFFF',
  },
  dark: {
    bg: '#0F1513',
    surface: '#16201C',
    surfaceSoft: '#1A2621',
    border: '#24312B',
    borderSoft: '#29362F',
    text: '#F4F7F4',
    textMuted: '#AAB7B1',
    textSoft: '#82918B',
    forest: '#2AA184',
    forestDeep: '#123E34',
    forestMid: '#1D6B59',
    mintBg: '#213129',
    teal: '#36B6AC',
    tealSoft: '#173633',
    emerald: '#58C88F',
    emeraldSoft: '#183427',
    blue: '#69B5CF',
    blueSoft: '#16323A',
    purple: '#A48BE6',
    purpleSoft: '#29213E',
    gold: '#D8AF57',
    goldSoft: '#372C18',
    orange: '#E49A46',
    orangeSoft: '#382818',
    red: '#FF8A8A',
    redSoft: '#382020',
    white: '#FFFFFF',
  },
};

const ROLE_CONFIG: Record<string, { colors: string[]; label: string; profileRoute: string }> = {
  OWNER: {
    colors: ['#3F1D83', '#5E28B3', '#7857D7'],
    label: 'Owner Settings',
    profileRoute: '/(owner)/profile',
  },
  BUYER: {
    colors: ['#08352E', '#0D695E', '#169F92'],
    label: 'Buyer Settings',
    profileRoute: '/(buyer)/profile',
  },
  FARMER: {
    colors: ['#02261E', '#032F25', '#0A5A4B'],
    label: 'Settings',
    profileRoute: '/edit-profile',
  },
  STAFF: {
    colors: ['#3B245E', '#5E3A8C', '#7C5BC6'],
    label: 'Staff Settings',
    profileRoute: '/(owner)/profile',
  },
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout, user } = useAuth();

  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const theme = UI[colorScheme];
  const role = user?.role || 'FARMER';
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.FARMER;

  const [language, setLanguage] = useState<Language>('en');
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    temperatureAlerts: true,
    orderUpdates: true,
    priceAlerts: true,
    promotions: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const lang = await storage.getItem('app_language');
      if (lang === 'hi' || lang === 'en') {
        setLanguage(lang);
      }

      const prefs = await storage.getItem('notification_prefs');
      if (prefs) {
        setNotifPrefs(JSON.parse(prefs));
      }
    } catch {}
  };

  const saveLanguage = async (lang: Language) => {
    try {
      setLanguage(lang);
      await storage.setItem('app_language', lang);
      Alert.alert(
        lang === 'hi' ? 'भाषा बदली गई' : 'Language Changed',
        lang === 'hi'
          ? 'हिंदी चुनी गई है। कुछ बदलाव के लिए ऐप रीस्टार्ट करना पड़ सकता है।'
          : 'English selected. Some changes may require app restart.'
      );
    } catch {}
  };

  const toggleNotif = async (key: keyof NotifPrefs) => {
    try {
      const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
      setNotifPrefs(updated);
      await storage.setItem('notification_prefs', JSON.stringify(updated));
    } catch {}
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear locally cached data. Your account data will remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await storage.deleteItem('offline_queue');
              await storage.deleteItem('last_sync_time');
              Alert.alert('Done', 'Cache cleared successfully.');
            } catch {}
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const enabledNotifCount = Object.values(notifPrefs).filter(Boolean).length;

  const subtitle = useMemo(() => {
    if (role === 'OWNER' || role === 'STAFF') {
      return 'Manage facility preferences, alerts, and team-related actions.';
    }
    if (role === 'BUYER') {
      return 'Manage language, order alerts, support, and account preferences.';
    }
    return 'Manage language, notifications, support, and account preferences.';
  }, [role]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.screen, { backgroundColor: theme.bg }]}>
        <StatusBar
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          translucent
          backgroundColor="transparent"
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 34 }}
        >
          <View
            style={[
              styles.topBarShell,
              {
                paddingTop: insets.top + 8,
                backgroundColor: theme.surface,
                borderBottomColor: theme.borderSoft,
              },
            ]}
          >
            <View style={styles.topBar}>
              <TouchableOpacity
                style={[styles.topIconButton, { backgroundColor: theme.surfaceSoft }]}
                activeOpacity={0.84}
                onPress={() => {
                  router.back();
                  hapticLight();
                }}
              >
                <Ionicons name="chevron-back" size={22} color={theme.text} />
              </TouchableOpacity>

              <Text style={[styles.brandText, { color: theme.forest }]}>SheetKosh</Text>

              <TouchableOpacity
                style={[styles.topAvatarButton, { borderColor: theme.gold }]}
                activeOpacity={0.84}
                onPress={() => {
                  router.push(roleConfig.profileRoute as any);
                  hapticLight();
                }}
              >
                <Text style={[styles.topAvatarLetter, { color: theme.forest }]}>
                  {user?.fullName?.[0]?.toUpperCase() || 'R'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.content}>
            <LinearGradient
              colors={roleConfig.colors as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroGlowOne} />
              <View style={styles.heroGlowTwo} />

              <View style={styles.heroHeaderRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.heroEyebrow}>PREFERENCES</Text>
                  <Text style={styles.heroTitle}>{roleConfig.label}</Text>
                  <Text style={styles.heroSubtitle}>{subtitle}</Text>
                </View>

                <View style={styles.heroBadge}>
                  <Ionicons name="options-outline" size={14} color="#7A6531" />
                  <Text style={styles.heroBadgeText}>
                    {language === 'hi' ? 'Hindi' : 'English'}
                  </Text>
                </View>
              </View>

              <View style={styles.heroStatsRow}>
                <HeroStat label="Alerts On" value={String(enabledNotifCount)} />
                <View style={styles.heroDivider} />
                <HeroStat label="Theme" value={colorScheme === 'dark' ? 'Dark' : 'Light'} />
                <View style={styles.heroDivider} />
                <HeroStat label="Version" value={`v${appVersion}`} />
              </View>
            </LinearGradient>

            {role !== 'OWNER' && role !== 'STAFF' ? (
              <>
                <SectionHeader
                  eyebrow="ACCOUNT"
                  title="My Account"
                  subtitle="Manage your profile details and KYC documents."
                  theme={theme}
                />

                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      shadowColor: colorScheme === 'dark' ? '#000000' : '#173D31',
                    },
                  ]}
                >
                  <PremiumRow
                    icon="person-outline"
                    iconColor={theme.blue}
                    iconBg={theme.blueSoft}
                    label="Edit Profile"
                    subtitle="View and update personal account details"
                    onPress={() => {
                      router.push(roleConfig.profileRoute as any);
                      hapticLight();
                    }}
                    theme={theme}
                    showArrow
                    first
                  />
                  <PremiumRow
                    icon="shield-checkmark-outline"
                    iconColor={theme.emerald}
                    iconBg={theme.emeraldSoft}
                    label="KYC Documents"
                    subtitle="Manage identity verification documents"
                    onPress={() => {
                      router.push('/kyc/reupload');
                      hapticLight();
                    }}
                    theme={theme}
                    showArrow
                    last
                  />
                </View>
              </>
            ) : (
              <>
                <SectionHeader
                  eyebrow="OPERATIONS"
                  title="Facility & Team"
                  subtitle="Manage operational shortcuts for your facility workspace."
                  theme={theme}
                />

                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      shadowColor: colorScheme === 'dark' ? '#000000' : '#173D31',
                    },
                  ]}
                >
                  <PremiumRow
                    icon="business-outline"
                    iconColor={theme.purple}
                    iconBg={theme.purpleSoft}
                    label="Edit Facility Details"
                    subtitle="Update facility information and metadata"
                    value="Soon"
                    theme={theme}
                    first
                  />
                  <PremiumRow
                    icon="layers-outline"
                    iconColor={theme.teal}
                    iconBg={theme.tealSoft}
                    label="View Chambers"
                    subtitle="Inspect chamber availability and capacity"
                    value="Soon"
                    theme={theme}
                  />
                  <PremiumRow
                    icon="people-outline"
                    iconColor={theme.emerald}
                    iconBg={theme.emeraldSoft}
                    label="Manage Staff"
                    subtitle="Control staff access and permissions"
                    value="Soon"
                    theme={theme}
                    last
                  />
                </View>
              </>
            )}

            <SectionHeader
              eyebrow="LOCALIZATION"
              title="Language"
              subtitle="Choose how the app should appear to you."
              theme={theme}
            />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  shadowColor: colorScheme === 'dark' ? '#000000' : '#173D31',
                },
              ]}
            >
              <LanguageCard
                flag="🇬🇧"
                title="English"
                subtitle="Default app language"
                selected={language === 'en'}
                onPress={() => {
                  saveLanguage('en');
                  hapticLight();
                }}
                theme={theme}
                colorScheme={colorScheme}
              />
              <LanguageCard
                flag="🇮🇳"
                title="हिंदी"
                subtitle="Hindi language"
                selected={language === 'hi'}
                onPress={() => {
                  saveLanguage('hi');
                  hapticLight();
                }}
                theme={theme}
                colorScheme={colorScheme}
              />
            </View>

            <SectionHeader
              eyebrow="NOTIFICATIONS"
              title="Alert Center"
              subtitle={
                role === 'OWNER'
                  ? 'Control operational alerts for your cold storage facility.'
                  : role === 'BUYER'
                  ? 'Control order and marketplace alerts.'
                  : 'Control crop, booking, and service alerts.'
              }
              theme={theme}
            />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  shadowColor: colorScheme === 'dark' ? '#000000' : '#173D31',
                },
              ]}
            >
              {(role === 'OWNER' || role === 'STAFF') && (
                <>
                  <PremiumToggle
                    icon="calendar-outline"
                    iconColor={theme.teal}
                    iconBg={theme.tealSoft}
                    label="New Booking Requests"
                    subtitle="Get notified when farmers request storage"
                    value={notifPrefs.orderUpdates}
                    onToggle={() => toggleNotif('orderUpdates')}
                    theme={theme}
                    first
                  />
                  <PremiumToggle
                    icon="thermometer-outline"
                    iconColor={theme.red}
                    iconBg={theme.redSoft}
                    label="Temperature Alerts"
                    subtitle="Unusual chamber temperature conditions"
                    value={notifPrefs.temperatureAlerts}
                    onToggle={() => toggleNotif('temperatureAlerts')}
                    theme={theme}
                  />
                  <PremiumToggle
                    icon="bar-chart-outline"
                    iconColor={theme.orange}
                    iconBg={theme.orangeSoft}
                    label="Capacity Warnings"
                    subtitle="Alert when chambers are nearing full capacity"
                    value={notifPrefs.priceAlerts}
                    onToggle={() => toggleNotif('priceAlerts')}
                    theme={theme}
                  />
                  <PremiumToggle
                    icon="wallet-outline"
                    iconColor={theme.emerald}
                    iconBg={theme.emeraldSoft}
                    label="Payment Alerts"
                    subtitle="Notifications when payments are received"
                    value={notifPrefs.promotions}
                    onToggle={() => toggleNotif('promotions')}
                    theme={theme}
                    last
                  />
                </>
              )}

              {role === 'FARMER' && (
                <>
                  <PremiumToggle
                    icon="calendar-outline"
                    iconColor={theme.teal}
                    iconBg={theme.tealSoft}
                    label="Booking Updates"
                    subtitle="Confirmations, arrivals, and booking status"
                    value={notifPrefs.orderUpdates}
                    onToggle={() => toggleNotif('orderUpdates')}
                    theme={theme}
                    first
                  />
                  <PremiumToggle
                    icon="time-outline"
                    iconColor={theme.orange}
                    iconBg={theme.orangeSoft}
                    label="Lot Expiry Alerts"
                    subtitle="Warnings when stored crop is nearing expiry"
                    value={notifPrefs.temperatureAlerts}
                    onToggle={() => toggleNotif('temperatureAlerts')}
                    theme={theme}
                  />
                  <PremiumToggle
                    icon="trending-up-outline"
                    iconColor={theme.emerald}
                    iconBg={theme.emeraldSoft}
                    label="Mandi Price Alerts"
                    subtitle="Daily market signals for your tracked crops"
                    value={notifPrefs.priceAlerts}
                    onToggle={() => toggleNotif('priceAlerts')}
                    theme={theme}
                  />
                  <PremiumToggle
                    icon="megaphone-outline"
                    iconColor={theme.purple}
                    iconBg={theme.purpleSoft}
                    label="Promotions"
                    subtitle="Offers and service announcements"
                    value={notifPrefs.promotions}
                    onToggle={() => toggleNotif('promotions')}
                    theme={theme}
                    last
                  />
                </>
              )}

              {role === 'BUYER' && (
                <>
                  <PremiumToggle
                    icon="receipt-outline"
                    iconColor={theme.orange}
                    iconBg={theme.orangeSoft}
                    label="Order Updates"
                    subtitle="Approvals, dispatch progress, and order status"
                    value={notifPrefs.orderUpdates}
                    onToggle={() => toggleNotif('orderUpdates')}
                    theme={theme}
                    first
                  />
                  <PremiumToggle
                    icon="pricetag-outline"
                    iconColor={theme.emerald}
                    iconBg={theme.emeraldSoft}
                    label="Price Drop Alerts"
                    subtitle="Get notified when tracked listing prices drop"
                    value={notifPrefs.priceAlerts}
                    onToggle={() => toggleNotif('priceAlerts')}
                    theme={theme}
                  />
                  <PremiumToggle
                    icon="storefront-outline"
                    iconColor={theme.blue}
                    iconBg={theme.blueSoft}
                    label="Marketplace Alerts"
                    subtitle="New listings matching your preferences"
                    value={notifPrefs.temperatureAlerts}
                    onToggle={() => toggleNotif('temperatureAlerts')}
                    theme={theme}
                  />
                  <PremiumToggle
                    icon="megaphone-outline"
                    iconColor={theme.purple}
                    iconBg={theme.purpleSoft}
                    label="Promotions"
                    subtitle="Offers and product announcements"
                    value={notifPrefs.promotions}
                    onToggle={() => toggleNotif('promotions')}
                    theme={theme}
                    last
                  />
                </>
              )}
            </View>

            <SectionHeader
              eyebrow="SUPPORT"
              title="Support & Information"
              subtitle="Review app details, help links, and legal information."
              theme={theme}
            />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  shadowColor: colorScheme === 'dark' ? '#000000' : '#173D31',
                },
              ]}
            >
              <PremiumRow
                icon="information-circle-outline"
                iconColor={theme.blue}
                iconBg={theme.blueSoft}
                label="Version"
                subtitle="Current application version"
                value={appVersion}
                theme={theme}
                first
              />
              <PremiumRow
                icon="document-text-outline"
                iconColor={theme.teal}
                iconBg={theme.tealSoft}
                label="Privacy Policy"
                subtitle="Read how your data is handled"
                onPress={() => {
                  Linking.openURL('https://coldstorage.in/privacy');
                  hapticLight();
                }}
                theme={theme}
                showArrow
              />
              <PremiumRow
                icon="help-circle-outline"
                iconColor={theme.gold}
                iconBg={theme.goldSoft}
                label="Help & Support"
                subtitle="Reach support or review help resources"
                onPress={() => {
                  Linking.openURL('https://coldstorage.in/support');
                  hapticLight();
                }}
                theme={theme}
                showArrow
                last
              />
            </View>

            <SectionHeader
              eyebrow="ACCOUNT ACTIONS"
              title="Security & Cleanup"
              subtitle="Manage local data and securely sign out from this device."
              theme={theme}
            />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  shadowColor: colorScheme === 'dark' ? '#000000' : '#173D31',
                  marginBottom: 18,
                },
              ]}
            >
              <DangerAction
                icon="trash-outline"
                label="Clear Cache"
                subtitle="Remove local offline data and sync timestamps"
                color={theme.orange}
                bg={theme.orangeSoft}
                onPress={handleClearCache}
                theme={theme}
                first
              />
              <DangerAction
                icon="log-out-outline"
                label="Sign Out"
                subtitle="Sign out from this device securely"
                color={theme.red}
                bg={theme.redSoft}
                onPress={handleLogout}
                theme={theme}
                last
              />
            </View>

            <View style={styles.footerWrap}>
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                ColdStorage © {new Date().getFullYear()}
              </Text>
              <Text style={[styles.footerSubText, { color: theme.textSoft }]}>
                Made with care for Indian farmers
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStatItem}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function LanguageCard({
  flag,
  title,
  subtitle,
  selected,
  onPress,
  theme,
  colorScheme,
}: {
  flag: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  theme: any;
  colorScheme: 'light' | 'dark';
}) {
  return (
    <TouchableOpacity
      style={[
        styles.languageCard,
        {
          backgroundColor: selected
            ? colorScheme === 'dark'
              ? '#173633'
              : '#EFF8F5'
            : theme.surfaceSoft,
          borderColor: selected ? theme.teal : theme.border,
        },
      ]}
      activeOpacity={0.84}
      onPress={onPress}
    >
      <View style={[styles.languageFlagWrap, { backgroundColor: theme.surface }]}>
        <Text style={styles.languageFlag}>{flag}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.languageTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.languageSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      </View>

      {selected ? (
        <Ionicons name="checkmark-circle" size={22} color={theme.teal} />
      ) : (
        <Ionicons name="ellipse-outline" size={22} color={theme.textSoft} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  topBarShell: {
    borderBottomWidth: 1,
  },

  topBar: {
    minHeight: 70,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  topIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  topAvatarButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F1E4',
  },

  topAvatarLetter: {
    fontSize: 19,
    fontWeight: '800',
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  heroCard: {
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },

  heroGlowOne: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -26,
    top: -22,
    backgroundColor: 'rgba(87, 194, 156, 0.10)',
  },

  heroGlowTwo: {
    position: 'absolute',
    width: 170,
    height: 120,
    borderRadius: 85,
    left: -35,
    bottom: -42,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  heroEyebrow: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  heroTitle: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: -1,
  },

  heroSubtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12.5,
    lineHeight: 18,
    maxWidth: '95%',
  },

  heroBadge: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 19,
    backgroundColor: '#E6CB85',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },

  heroBadgeText: {
    color: '#7A6531',
    fontSize: 12.5,
    fontWeight: '800',
  },

  heroStatsRow: {
    minHeight: 84,
    borderRadius: 20,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },

  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },

  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  heroStatLabel: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.58)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },

  heroDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  sectionHeaderWrap: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },

  sectionTitle: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  sectionSubtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
  },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  languageCard: {
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },

  languageFlagWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  languageFlag: {
    fontSize: 24,
  },

  languageTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  languageSubtitle: {
    marginTop: 3,
    fontSize: 12,
  },

  rowBase: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },

  rowIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  rowTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  rowSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },

  rowValue: {
    marginRight: 8,
    fontSize: 13,
    fontWeight: '700',
  },

  footerWrap: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 4 : 8,
  },

  footerText: {
    fontSize: 12,
    fontWeight: '700',
  },

  footerSubText: {
    marginTop: 4,
    fontSize: 11,
  },
});