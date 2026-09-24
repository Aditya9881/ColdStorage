/**
 * ColdStorage — Owner Profile Screen (Premium)
 *
 * Matches the farmer profile's premium design language,
 * adapted with owner-specific purple gradient theme.
 * Shows: profile info, facility stats, menu items, settings, logout.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { hapticLight } from '@/lib/haptics';

/* ─── Theme ─── */
const UI = {
  canvas: '#F8F7FC',
  surface: '#FFFFFF',
  surfaceAlt: '#F9F8FE',
  text: '#1A1A2E',
  textMuted: '#6B7280',
  textSoft: '#9CA3AF',
  purple: '#7C3AED',
  purpleDeep: '#4C1D95',
  purpleMid: '#6D28D9',
  purpleSoft: '#F0EBFF',
  teal: '#0D8D8A',
  tealSoft: '#E8F9F7',
  emerald: '#17A56D',
  emeraldSoft: '#E8F7EF',
  blue: '#2589AA',
  blueSoft: '#EAF8FC',
  gold: '#C88C20',
  goldSoft: '#FFF5DE',
  orange: '#C97717',
  orangeSoft: '#FFF2E2',
  danger: '#D94A4A',
  dangerSoft: '#FFF0F0',
};

/* ─── Menu Items ─── */
const MENU_ITEMS = [
  {
    icon: 'grid-outline',
    label: 'Dashboard',
    subtitle: 'View facility overview and stats',
    route: '/(owner)',
    color: '#7C3AED',
    bg: '#F0EBFF',
  },
  {
    icon: 'calendar-outline',
    label: 'Manage Bookings',
    subtitle: 'Review and manage farmer bookings',
    route: '/(owner)/bookings',
    color: '#059669',
    bg: '#E8F7EF',
  },
  {
    icon: 'scan-outline',
    label: 'QR Scanner',
    subtitle: 'Scan lot QR codes for check-in/out',
    route: '/(owner)/scan',
    color: '#2563EB',
    bg: '#EAF8FC',
  },
  {
    icon: 'receipt-outline',
    label: 'Invoices',
    subtitle: 'View and manage billing documents',
    route: '/invoices',
    color: '#0D8D8A',
    bg: '#E8F9F7',
  },
  {
    icon: 'notifications-outline',
    label: 'Notifications',
    subtitle: 'Facility alerts and booking requests',
    route: '/notifications',
    color: '#C97717',
    bg: '#FFF2E2',
  },
  {
    icon: 'settings-outline',
    label: 'Settings',
    subtitle: 'Facility, staff, and preferences',
    route: '/settings',
    color: '#60726A',
    bg: '#EEF2EE',
  },
  {
    icon: 'help-circle-outline',
    label: 'Help & Support',
    subtitle: 'Get assistance for your facility',
    route: '/settings',
    color: '#2B78C5',
    bg: '#EAF2FF',
  },
] as const;

/* ─── Helper Components ─── */
function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

/* ─── Main Component ─── */
export default function OwnerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => { logout(); hapticLight(); },
      },
    ]);
  };

  const location = [user?.city, user?.state].filter(Boolean).join(', ') || 'Location not set';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* ─── Hero Header ─── */}
          <LinearGradient
            colors={[UI.purpleDeep, UI.purpleMid, UI.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroGlowTop} />
            <View style={styles.heroGlowBottom} />

            <View style={{ height: insets.top + 8 }} />

            <View style={styles.heroContent}>
              {/* Top bar */}
              <View style={styles.heroTopRow}>
                <View style={styles.heroTopTitleWrap}>
                  <Text style={styles.heroTopTitle}>Profile</Text>
                </View>
                <TouchableOpacity
                  style={styles.heroIconButton}
                  activeOpacity={0.82}
                  onPress={() => { router.push('/settings'); hapticLight(); }}
                >
                  <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Identity */}
              <View style={styles.profileIdentityRow}>
                <View style={styles.avatarWrap}>
                  <LinearGradient
                    colors={['#A78BFA', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {user?.fullName?.[0]?.toUpperCase() || 'O'}
                    </Text>
                  </LinearGradient>
                </View>

                <View style={styles.profileTextWrap}>
                  <Text style={styles.profileEyebrow}>ACCOUNT</Text>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {user?.fullName || 'Owner'}
                  </Text>
                  <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={12} color="rgba(255,255,255,0.62)" />
                    <Text style={styles.profilePhone}>{user?.phone || '—'}</Text>
                  </View>
                </View>

                <View style={styles.roleBadge}>
                  <Ionicons name="business-outline" size={12} color="#E9D5FF" />
                  <Text style={styles.roleText}>OWNER</Text>
                </View>
              </View>

              {/* Meta strip */}
              <View style={styles.heroMetaStrip}>
                <View style={styles.heroMetaItem}>
                  <Text style={styles.heroMetaValue}>
                    {user?.status === 'ACTIVE' ? 'Verified' : 'Pending'}
                  </Text>
                  <Text style={styles.heroMetaLabel}>KYC</Text>
                </View>

                <View style={styles.heroMetaDivider} />

                <View style={styles.heroMetaItem}>
                  <Text style={styles.heroMetaValue} numberOfLines={1}>
                    {user?.uniqueId || 'Not set'}
                  </Text>
                  <Text style={styles.heroMetaLabel}>UNIQUE ID</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* ─── Body ─── */}
          <View style={styles.body}>

            {/* Personal Details */}
            <SectionHeader
              eyebrow="PERSONAL DETAILS"
              title="Account Information"
              subtitle="Key profile details linked to your ColdStorage account."
            />

            <View style={styles.card}>
              <View style={styles.infoItem}>
                <View style={[styles.infoIconWrap, { backgroundColor: UI.blueSoft }]}>
                  <Ionicons name="mail-outline" size={16} color={UI.blue} />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>EMAIL</Text>
                  <Text style={styles.infoValue}>{user?.email || 'Not set'}</Text>
                </View>
              </View>
              <Divider />
              <View style={styles.infoItem}>
                <View style={[styles.infoIconWrap, { backgroundColor: UI.emeraldSoft }]}>
                  <Ionicons name="location-outline" size={16} color={UI.emerald} />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>LOCATION</Text>
                  <Text style={styles.infoValue}>{location}</Text>
                </View>
              </View>
              <Divider />
              <View style={styles.infoItem}>
                <View style={[styles.infoIconWrap, { backgroundColor: UI.tealSoft }]}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={UI.teal} />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>ACCOUNT STATUS</Text>
                  <Text style={[styles.infoValue, { color: user?.status === 'ACTIVE' ? UI.emerald : UI.orange }]}>
                    {user?.status === 'ACTIVE' ? 'Verified & Active' : 'Verification Pending'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Profile Actions */}
            <SectionHeader
              eyebrow="WORKSPACE"
              title="Profile Actions"
              subtitle="Manage your facility, bookings, and support."
            />

            <View style={styles.card}>
              {MENU_ITEMS.map((item, index) => (
                <React.Fragment key={index}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    activeOpacity={0.78}
                    onPress={() => { router.push(item.route as any); hapticLight(); }}
                  >
                    <View style={[styles.menuIconWrap, { backgroundColor: item.bg }]}>
                      <Ionicons name={item.icon as any} size={18} color={item.color} />
                    </View>
                    <View style={styles.menuTextWrap}>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color="#D1D5DB" />
                  </TouchableOpacity>
                  {index < MENU_ITEMS.length - 1 ? <Divider /> : null}
                </React.Fragment>
              ))}
            </View>

            {/* Sign Out */}
            <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.82} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color={UI.danger} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            <View style={styles.footerWrap}>
              <Text style={styles.footerText}>ColdStorage • Owner Edition</Text>
            </View>

            <View style={{ height: insets.top + 54 }} />
          </View>
        </ScrollView>
      </View>
    </>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.canvas },

  scrollContent: { paddingBottom: 20 },

  /* Hero */
  hero: {
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  heroGlowTop: {
    position: 'absolute', top: -90, right: -70,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(167, 139, 250, 0.18)',
  },
  heroGlowBottom: {
    position: 'absolute', bottom: -120, left: -90,
    width: 260, height: 180, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroContent: { paddingHorizontal: 16 },
  heroTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  heroTopTitleWrap: { flex: 1 },
  heroTopTitle: {
    color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.2,
  },
  heroIconButton: {
    width: 44, height: 44, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },

  /* Identity */
  profileIdentityRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 12,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  profileTextWrap: { flex: 1 },
  profileEyebrow: {
    color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: '900', letterSpacing: 0.8,
  },
  profileName: {
    marginTop: 2, color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.3,
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 },
  profilePhone: { color: 'rgba(255,255,255,0.62)', fontSize: 12, fontWeight: '500' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  roleText: { color: '#E9D5FF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  /* Meta strip */
  heroMetaStrip: {
    marginTop: 22, minHeight: 78, paddingHorizontal: 8,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)',
  },
  heroMetaItem: { flex: 1, alignItems: 'center' },
  heroMetaValue: {
    color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: -0.3,
  },
  heroMetaLabel: {
    marginTop: 5, color: 'rgba(255,255,255,0.56)',
    fontSize: 8, fontWeight: '900', letterSpacing: 0.6,
  },
  heroMetaDivider: {
    width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.16)',
  },

  /* Body */
  body: { paddingTop: 24 },

  sectionHeaderWrap: { paddingHorizontal: 16, marginBottom: 12 },
  sectionEyebrow: {
    fontSize: 10, fontWeight: '900', letterSpacing: 0.85, color: UI.purple,
  },
  sectionTitle: {
    marginTop: 4, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: UI.text,
  },
  sectionSubtitle: {
    marginTop: 5, fontSize: 13, lineHeight: 19, color: UI.textMuted,
  },

  card: {
    marginHorizontal: 16, marginBottom: 24,
    borderRadius: 22, borderWidth: 1, borderColor: '#E8E5F0',
    backgroundColor: UI.surface,
    paddingHorizontal: 4, paddingVertical: 4,
    shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },

  /* Info items */
  infoItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 14,
  },
  infoIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  infoTextWrap: { flex: 1 },
  infoLabel: {
    fontSize: 9, fontWeight: '900', letterSpacing: 0.6, color: UI.textSoft,
  },
  infoValue: {
    marginTop: 2, fontSize: 14, fontWeight: '700', color: UI.text,
  },

  /* Menu items */
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 14,
  },
  menuIconWrap: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  menuTextWrap: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '800', color: UI.text },
  menuSubtitle: { marginTop: 3, fontSize: 12, color: UI.textMuted },

  divider: {
    height: 1, backgroundColor: '#F0EDF5', marginHorizontal: 12,
  },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 4, paddingVertical: 15,
    borderRadius: 16, borderWidth: 1.5, borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: UI.danger },

  /* Footer */
  footerWrap: { alignItems: 'center', marginTop: 20, paddingBottom: 10 },
  footerText: { fontSize: 12, fontWeight: '600', color: UI.textSoft },
});
