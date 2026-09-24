/**
 * app/(tabs)/profile.tsx
 *
 * Premium Profile Screen
 * - Full complete code
 * - KYC text visibility fixed
 * - Premium hero card
 * - Account info card
 * - Workspace card list
 * - Logout CTA
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { hapticLight } from '@/lib/haptics';
import SharedTabHeader from '@/components/SharedTabHeader';

interface MenuItem {
  icon: string;
  label: string;
  subtitle: string;
  route: string;
  badge?: string;
  dot?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  {
    icon: 'calendar-outline',
    label: 'My Bookings',
    subtitle: 'Track bookings and requests',
    route: '/bookings',
    badge: '3 Active',
  },
  {
    icon: 'cube-outline',
    label: 'My Lots',
    subtitle: 'Storage and inventory',
    route: '/(tabs)/inventory',
  },
  {
    icon: 'bag-handle-outline',
    label: 'My Orders',
    subtitle: 'Orders and dispatch',
    route: '/orders',
  },
  {
    icon: 'receipt-outline',
    label: 'Invoices & Receipts',
    subtitle: 'Billing and documents',
    route: '/invoices',
  },
  {
    icon: 'notifications-outline',
    label: 'Notifications',
    subtitle: 'Alerts and updates',
    route: '/notifications',
    dot: true,
  },
  {
    icon: 'settings-outline',
    label: 'Settings',
    subtitle: 'Preferences and account',
    route: '/settings',
  },
  {
    icon: 'help-circle-outline',
    label: 'Help & Support',
    subtitle: 'Need assistance?',
    route: '/settings',
  },
];

const UI = {
  canvas: '#F5F6F2',
  surface: '#FFFFFF',
  surfaceSoft: '#F8FAF7',
  border: '#DCE3DC',
  borderSoft: '#E7ECE7',
  text: '#16231D',
  textMuted: '#6E7C76',
  textSoft: '#99A39E',
  forest: '#032F25',
  forestDeep: '#02261E',
  forestMid: '#0A5A4B',
  gold: '#E6CB85',
  goldText: '#7A6531',
  goldSoft: '#F8EFD8',
  kycPanel: '#F1F4F0',
  kycBorder: '#D8E1D9',
  kycTitleVerified: '#2E8B63',
  kycSubVerified: '#577C69',
  kycTitlePending: '#9A6A16',
  kycSubPending: '#7E6B44',
  kycTitleRejected: '#B23A3A',
  kycSubRejected: '#7D4D4D',
  dangerSoft: '#F4D3CF',
  dangerText: '#A61F22',
  dot: '#CD2D2D',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  const kycStatus =
    user?.status === 'ACTIVE'
      ? 'verified'
      : user?.status === 'PENDING_VERIFICATION'
      ? 'pending'
      : user?.kycRejectionReason
      ? 'rejected'
      : 'pending';

  const location =
    [user?.city, user?.state].filter(Boolean).join(', ') || 'Location not set';

  const membershipLabel =
    user?.role === 'FARMER' ? 'Premium Producer' : user?.role || 'Member';

  const kycTitleColor =
    kycStatus === 'verified'
      ? UI.kycTitleVerified
      : kycStatus === 'rejected'
      ? UI.kycTitleRejected
      : UI.kycTitlePending;

  const kycSubtitleColor =
    kycStatus === 'verified'
      ? UI.kycSubVerified
      : kycStatus === 'rejected'
      ? UI.kycSubRejected
      : UI.kycSubPending;

  const kycLabel =
    kycStatus === 'verified'
      ? 'KYC Verified'
      : kycStatus === 'rejected'
      ? 'KYC Rejected'
      : 'KYC Pending';

  const kycMessage =
    kycStatus === 'verified'
      ? 'Identity validated on Jan 2024'
      : kycStatus === 'rejected'
      ? user?.kycRejectionReason || 'Please re-upload your documents'
      : 'Your documents are under review by our team';

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          hapticLight();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 36 }}
        >
          {/* Shared header with hamburger + avatar */}
          <SharedTabHeader subtitle="My profile" />

          <View style={styles.content}>
            <LinearGradient
              colors={[UI.forestDeep, UI.forest, UI.forestMid]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroGlowOne} />
              <View style={styles.heroGlowTwo} />

              <View style={styles.heroHeaderRow}>
                <View style={styles.heroTextWrap}>
                  <Text style={styles.heroName} numberOfLines={2}>
                    {user?.fullName || 'Ram Prasad Verma'}
                  </Text>

                  <View style={styles.heroPhoneRow}>
                    <Ionicons
                      name="call-outline"
                      size={13}
                      color="rgba(255,255,255,0.62)"
                    />
                    <Text style={styles.heroPhone}>
                      {user?.phone || '9800000001'}
                    </Text>
                  </View>
                </View>

                <View style={styles.roleBadge}>
                  <Ionicons name="leaf-outline" size={13} color={UI.goldText} />
                  <Text style={styles.roleBadgeText}>
                    {user?.role === 'FARMER' ? 'Farmer' : user?.role || 'Member'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.kycCard}
                activeOpacity={0.86}
                onPress={() => {
                  if (kycStatus === 'rejected') {
                    router.push('/kyc/reupload');
                  }
                  hapticLight();
                }}
              >
                <View style={styles.kycContent}>
                  <View style={styles.kycIconWrap}>
                    <Ionicons
                      name={
                        kycStatus === 'verified'
                          ? 'shield-checkmark'
                          : kycStatus === 'rejected'
                          ? 'close-circle'
                          : 'time'
                      }
                      size={18}
                      color={
                        kycStatus === 'verified'
                          ? '#DDB75D'
                          : kycStatus === 'rejected'
                          ? '#D94A4A'
                          : '#CF9525'
                      }
                    />
                  </View>

                  <View style={styles.kycTextWrap}>
                    <Text style={[styles.kycTitle, { color: kycTitleColor }]}>
                      {kycLabel}
                    </Text>
                    <Text
                      style={[styles.kycSubtitle, { color: kycSubtitleColor }]}
                      numberOfLines={2}
                    >
                      {kycMessage}
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#78A88B" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Account Information</Text>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => {
                  router.push('/edit-profile' as any);
                  hapticLight();
                }}
              >
                <Text style={styles.sectionAction}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <InfoRow
                icon="mail-outline"
                label="EMAIL ADDRESS"
                value={user?.email || 'Not set'}
              />
              <Divider />
              <InfoRow
                icon="location-outline"
                label="PRIMARY LOCATION"
                value={location}
              />
              <Divider />
              <InfoRow
                icon="person-circle-outline"
                label="MEMBERSHIP STATUS"
                value={membershipLabel}
                badge="LIFETIME"
              />
            </View>

            <Text style={styles.workspaceTitle}>Workspace</Text>

            <View style={styles.workspaceCard}>
              {MENU_ITEMS.map((item, index) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    style={styles.workspaceItem}
                    activeOpacity={0.84}
                    onPress={() => {
                      router.push(item.route as any);
                      hapticLight();
                    }}
                  >
                    <View style={styles.workspaceIcon}>
                      <Ionicons name={item.icon as any} size={20} color={UI.forest} />
                    </View>

                    <View style={styles.workspaceTextWrap}>
                      <Text style={styles.workspaceLabel}>{item.label}</Text>
                      <Text style={styles.workspaceSubtitle}>{item.subtitle}</Text>
                    </View>

                    <View style={styles.workspaceRight}>
                      {item.badge ? (
                        <View style={styles.itemBadge}>
                          <Text style={styles.itemBadgeText}>{item.badge}</Text>
                        </View>
                      ) : null}

                      {item.dot ? <View style={styles.itemDot} /> : null}

                      <Ionicons name="chevron-forward" size={20} color="#53605A" />
                    </View>
                  </TouchableOpacity>

                  {index < MENU_ITEMS.length - 1 ? <Divider /> : null}
                </React.Fragment>
              ))}
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.84}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={21} color={UI.dangerText} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>ColdStorage • Farmer Edition</Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
  badge,
}: {
  icon: string;
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon as any} size={20} color={UI.forest} />
      </View>

      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>

        <View style={styles.infoValueRow}>
          <Text style={styles.infoValue}>{value}</Text>
          {badge ? (
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  topBarShell: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E7ECE6',
  },

  topBar: {
    minHeight: 70,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandText: {
    flex: 1,
    marginLeft: 10,
    color: UI.forest,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  avatarButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },

  avatarGradient: {
    flex: 1,
    borderRadius: 26,
    padding: 2,
  },

  avatarInner: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#F4F1E4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarLetter: {
    color: UI.forest,
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
    marginBottom: 16,
  },

  heroTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  heroName: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -1.1,
  },

  heroPhoneRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  heroPhone: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 13.5,
    fontWeight: '600',
  },

  roleBadge: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 19,
    backgroundColor: UI.gold,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },

  roleBadgeText: {
    color: UI.goldText,
    fontSize: 12.5,
    fontWeight: '800',
  },

  kycCard: {
    minHeight: 88,
    borderRadius: 18,
    backgroundColor: UI.kycPanel,
    borderWidth: 1,
    borderColor: UI.kycBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  kycContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },

  kycIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: UI.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  kycTextWrap: {
    flex: 1,
  },

  kycTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },

  kycSubtitle: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 15.5,
    fontWeight: '700',
  },

  sectionHeader: {
    marginTop: 2,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: UI.forest,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.8,
  },

  sectionAction: {
    color: '#9C7A33',
    fontSize: 13,
    fontWeight: '700',
  },

  infoCard: {
    backgroundColor: UI.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#CCD5CD',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 30,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  infoRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },

  infoIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#EEF2EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  infoTextWrap: {
    flex: 1,
  },

  infoLabel: {
    color: '#58615C',
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.8,
  },

  infoValueRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },

  infoValue: {
    color: '#1F2522',
    fontSize: 15.5,
    fontWeight: '700',
    flexShrink: 1,
  },

  infoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F6EFD9',
  },

  infoBadgeText: {
    color: '#82672A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  divider: {
    height: 1,
    backgroundColor: '#E7ECE6',
  },

  workspaceTitle: {
    color: UI.forest,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 14,
  },

  workspaceCard: {
    backgroundColor: UI.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#CCD5CD',
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  workspaceItem: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  workspaceIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F2EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  workspaceTextWrap: {
    flex: 1,
    paddingRight: 8,
  },

  workspaceLabel: {
    color: '#1F2522',
    fontSize: 15.5,
    fontWeight: '800',
  },

  workspaceSubtitle: {
    marginTop: 3,
    color: UI.textMuted,
    fontSize: 11.5,
    lineHeight: 15,
  },

  workspaceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  itemBadge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#0D5C43',
  },

  itemBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },

  itemDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: UI.dot,
  },

  logoutButton: {
    minHeight: 68,
    borderRadius: 20,
    backgroundColor: UI.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 18,
  },

  logoutText: {
    color: UI.dangerText,
    fontSize: 16.5,
    fontWeight: '800',
  },

  versionText: {
    textAlign: 'center',
    color: UI.textSoft,
    fontSize: 11,
    fontWeight: '600',
  },
});