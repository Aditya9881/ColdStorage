import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

const BUYER_PRIMARY = '#0F766E';
const BUYER_DARK = '#0B3B36';
const BUYER_BG = '#F4F7F6';

export default function BuyerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const initials =
    user?.fullName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: insets.top + 8 }} />

        <View style={styles.topBar}>
          <Text style={styles.topBarKicker}>Profile</Text>

          <View style={styles.rolePill}>
            <Ionicons name="storefront-outline" size={13} color="#D7FFFA" />
            <Text style={styles.rolePillText}>Buyer</Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>My Profile</Text>
        <Text style={styles.pageSubtitle}>
          Manage your account, activity, and preferences
        </Text>

        <LinearGradient
          colors={['#0B3B36', '#0F766E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeroCard}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <View style={styles.profileMain}>
              <Text style={styles.profileName}>{user?.fullName || 'User'}</Text>
              <Text style={styles.profilePhone}>{user?.phone || 'Phone not set'}</Text>
              <Text style={styles.profileMeta}>{user?.email || 'No email added'}</Text>
            </View>
          </View>

          <View style={styles.profileFooter}>
            <View style={styles.metaPill}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#DDFCF6" />
              <Text style={styles.metaPillText}>
                {user?.status === 'VERIFIED' ? 'Verified Account' : 'Profile Active'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push('/settings')}
              activeOpacity={0.82}
            >
              <Ionicons name="create-outline" size={15} color={BUYER_PRIMARY} />
              <Text style={styles.editBtnText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.overviewRow}>
          <OverviewCard icon="receipt-outline" label="Orders" value="—" />
          <OverviewCard icon="wallet-outline" label="Spent" value="—" />
          <OverviewCard icon="bookmark-outline" label="Watchlist" value="—" />
        </View>

        {user?.status === 'PENDING_VERIFICATION' && (
          <View
            style={[
              styles.kycCard,
              {
                backgroundColor: user.kycRejectionReason ? '#FFF1F1' : '#FFF6EA',
                borderColor: user.kycRejectionReason ? '#F7CACA' : '#F5D6A8',
              },
            ]}
          >
            <View style={styles.kycHeader}>
              <View
                style={[
                  styles.kycIconWrap,
                  {
                    backgroundColor: user.kycRejectionReason ? '#FEE2E2' : '#FFE8C7',
                  },
                ]}
              >
                <Ionicons
                  name={user.kycRejectionReason ? 'close-circle-outline' : 'time-outline'}
                  size={18}
                  color={user.kycRejectionReason ? '#DC2626' : '#C98212'}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.kycTitle,
                    { color: user.kycRejectionReason ? '#991B1B' : '#9A3412' },
                  ]}
                >
                  {user.kycRejectionReason
                    ? 'KYC Verification Rejected'
                    : 'KYC Verification Pending'}
                </Text>

                <Text
                  style={[
                    styles.kycText,
                    { color: user.kycRejectionReason ? '#B91C1C' : '#B45309' },
                  ]}
                >
                  {user.kycRejectionReason
                    ? `Reason: ${user.kycRejectionReason}`
                    : 'Our team is reviewing your documents. We will notify you once verification is complete.'}
                </Text>
              </View>
            </View>

            {user.kycRejectionReason && (
              <TouchableOpacity
                style={styles.kycActionBtn}
                onPress={() => router.push('/kyc/reupload')}
                activeOpacity={0.84}
              >
                <Text style={styles.kycActionText}>Re-upload Documents</Text>
                <Ionicons name="arrow-forward" size={15} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={user?.email || 'Not set'}
            last={false}
          />
          <InfoRow
            icon="location-outline"
            label="Location"
            value={`${user?.city || '—'}, ${user?.state || '—'}`}
            last
          />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>My Activity</Text>
          <NavRow
            icon="receipt-outline"
            label="My Orders"
            onPress={() => router.push('/(buyer)/orders')}
          />
          <NavRow
            icon="bookmark-outline"
            label="Watchlist"
            onPress={() => router.push('/(buyer)/watchlist')}
          />
          <NavRow
            icon="trending-up-outline"
            label="Market Prices"
            onPress={() => router.push('/market-prices')}
            last
          />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <NavRow
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push('/notifications')}
          />
          <NavRow
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push('/settings')}
            last
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>ColdStorage v2.0 • Buyer Edition</Text>
      </ScrollView>
    </>
  );
}

function OverviewCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.overviewCard}>
      <View style={styles.overviewIconWrap}>
        <Ionicons name={icon as any} size={18} color="#0F766E" />
      </View>
      <Text style={styles.overviewValue}>{value}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: string;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.rowBorder]}>
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon as any} size={18} color="#14B8A6" />
      </View>
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function NavRow({
  icon,
  label,
  onPress,
  value,
  last = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  value?: string;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.navRow, !last && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon as any} size={18} color="#64748B" />
      </View>

      <Text style={styles.navLabel}>{label}</Text>

      {value && <Text style={styles.navValue}>{value}</Text>}

      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BUYER_BG,
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 110 : 36,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  topBarKicker: {
    fontSize: FontSize.sm,
    color: '#7C8A9F',
    fontWeight: FontWeight.medium,
  },

  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F766E',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  rolePillText: {
    fontSize: FontSize.xs,
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
  },

  pageTitle: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
    marginTop: 12,
  },

  pageSubtitle: {
    fontSize: FontSize.sm,
    color: '#7C8A9F',
    marginTop: 6,
  },

  profileHeroCard: {
    borderRadius: 26,
    padding: 18,
    marginTop: 18,
    shadowColor: '#0B3B36',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrap: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  avatarText: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },

  profileMain: {
    flex: 1,
  },

  profileName: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },

  profilePhone: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },

  profileMeta: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
  },

  profileFooter: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },

  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },

  metaPillText: {
    fontSize: FontSize.xs,
    color: '#F8FAFC',
    fontWeight: FontWeight.medium,
  },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: '#E7F6F1',
  },

  editBtnText: {
    fontSize: FontSize.sm,
    color: BUYER_PRIMARY,
    fontWeight: FontWeight.semibold,
  },

  overviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  overviewCard: {
    flex: 1,
    backgroundColor: '#FFFDF9',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#102A26',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EEF2EF',
  },

  overviewIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#E7F6F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  overviewValue: {
    fontSize: 18,
    fontWeight: FontWeight.bold,
    color: BUYER_PRIMARY,
  },

  overviewLabel: {
    fontSize: FontSize.xs,
    color: '#8A94A6',
    marginTop: 3,
  },

  kycCard: {
    marginTop: 16,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },

  kycHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  kycIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  kycTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },

  kycText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: 4,
  },

  kycActionBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 12,
  },

  kycActionText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  menuSection: {
    backgroundColor: '#FFFDF9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    marginTop: 16,
    shadowColor: '#102A26',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EEF2EF',
  },

  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#8A94A6',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },

  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1EC',
  },

  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F3F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoLabel: {
    fontSize: FontSize.xs,
    color: '#8A94A6',
  },

  infoValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: '#0F172A',
    marginTop: 2,
  },

  navLabel: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: '#0F172A',
  },

  navValue: {
    fontSize: FontSize.sm,
    color: '#94A3B8',
    marginRight: 6,
  },

  logoutBtn: {
    marginTop: 22,
    backgroundColor: '#FDECEC',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#F8D4D4',
  },

  logoutText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#DC2626',
  },

  version: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: '#94A3B8',
    marginTop: 18,
  },
});