/**
 * SharedTabHeader — Premium header used across all farmer tabs
 *
 * Features:
 * - SheetKosh branding with subtitle
 * - Hamburger ≡ opens Quick Actions drawer
 * - Gold-ring avatar showing user's actual photo (or initial)
 * - Avatar tap → Profile or Edit Profile
 * - Quick Actions modal drawer with all workspace actions
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { hapticLight } from '@/lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SharedTabHeaderProps {
  subtitle?: string;
}

/* ─── Quick Actions Data ─── */
const QUICK_ACTIONS = [
  {
    key: 'bookings',
    icon: 'calendar-outline',
    label: 'My Bookings',
    subtitle: 'Track bookings and requests',
    color: '#0D7A62',
    background: '#E8F7F1',
    route: '/bookings',
  },
  {
    key: 'inventory',
    icon: 'cube-outline',
    label: 'Inventory',
    subtitle: 'Manage stored lots',
    color: '#2589AA',
    background: '#EAF8FC',
    route: '/(tabs)/inventory',
  },
  {
    key: 'marketplace',
    icon: 'storefront-outline',
    label: 'Marketplace',
    subtitle: 'Buy & sell commodities',
    color: '#0D8D8A',
    background: '#E8F9F7',
    route: '/(tabs)/marketplace',
  },
  {
    key: 'mandi',
    icon: 'trending-up-outline',
    label: 'Mandi Prices',
    subtitle: 'Live rates near you',
    color: '#D45B4E',
    background: '#FFF0EE',
    route: '/(tabs)/mandi-prices',
  },
  {
    key: 'invoices',
    icon: 'receipt-outline',
    label: 'Invoices',
    subtitle: 'Billing and payments',
    color: '#D29424',
    background: '#FFF6E1',
    route: '/invoices',
  },
  {
    key: 'receipts',
    icon: 'document-text-outline',
    label: 'Warehouse Receipts',
    subtitle: 'Negotiable receipts',
    color: '#7457BE',
    background: '#F0EBFF',
    route: '/receipts',
  },
  {
    key: 'discover',
    icon: 'compass-outline',
    label: 'Discover Storage',
    subtitle: 'Find nearby facilities',
    color: '#0D6B5B',
    background: '#E4F5EE',
    route: '/discover',
  },
  {
    key: 'settings',
    icon: 'settings-outline',
    label: 'Settings',
    subtitle: 'App settings',
    color: '#5E6B64',
    background: '#EDF1EE',
    route: '/settings',
  },
];

export default function SharedTabHeader({ subtitle = '' }: SharedTabHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [showDrawer, setShowDrawer] = useState(false);

  const userInitial = user?.fullName?.charAt(0)?.toUpperCase() || 'U';
  const hasAvatar = !!user?.avatarUrl;

  const handleNavigation = useCallback((route: string) => {
    setShowDrawer(false);
    hapticLight();
    setTimeout(() => {
      router.push(route as any);
    }, 100);
  }, [router]);

  return (
    <>
      <View
        style={[s.topShell, { paddingTop: insets.top + 8 }]}
      >
        <View style={s.topBar}>
          {/* Hamburger Menu */}
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.84}
            onPress={() => { hapticLight(); setShowDrawer(true); }}
          >
            <Ionicons name="menu" size={24} color="#062F27" />
          </TouchableOpacity>

          {/* Brand */}
          <View style={s.brandWrap}>
            <Text style={s.brandText}>SheetKosh</Text>
            {subtitle ? <Text style={s.brandSub}>{subtitle}</Text> : null}
          </View>

          {/* Avatar */}
          <TouchableOpacity
            style={s.avatarRing}
            activeOpacity={0.86}
            onPress={() => { hapticLight(); router.push('/(tabs)/profile'); }}
          >
            {hasAvatar ? (
              <Image source={{ uri: user.avatarUrl! }} style={s.avatar} />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarLetter}>{userInitial}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Quick Actions Drawer Modal ── */}
      <Modal
        visible={showDrawer}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDrawer(false)}
      >
        <TouchableOpacity
          style={s.drawerOverlay}
          activeOpacity={1}
          onPress={() => setShowDrawer(false)}
        >
          <View style={s.drawerSheet}>
            <View style={s.drawerHandle} />

            <View style={s.drawerHeader}>
              <Text style={s.drawerTitle}>Quick Actions</Text>
              <TouchableOpacity
                style={s.drawerClose}
                onPress={() => setShowDrawer(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={20} color="#718079" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.drawerList}
            >
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.key}
                  style={s.drawerItem}
                  activeOpacity={0.85}
                  onPress={() => handleNavigation(action.route)}
                >
                  <View style={[s.drawerItemIcon, { backgroundColor: action.background }]}>
                    <Ionicons name={action.icon as any} size={20} color={action.color} />
                  </View>
                  <View style={s.drawerItemText}>
                    <Text style={s.drawerItemLabel}>{action.label}</Text>
                    <Text style={s.drawerItemSub}>{action.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#C4CBC7" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

/* ═══════════════════════════════════════════ */
/*               STYLES                        */
/* ═══════════════════════════════════════════ */
const s = StyleSheet.create({
  /* ── Top Bar ── */
  topShell: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F5F0',
    borderWidth: 1,
    borderColor: '#E4E9E1',
  },
  brandWrap: {
    flex: 1,
    marginLeft: 12,
  },
  brandText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    color: '#062F27',
    letterSpacing: -0.5,
  },
  brandSub: {
    marginTop: 1,
    fontSize: 11.5,
    color: '#86908B',
    fontWeight: '500',
  },

  /* ── Avatar ── */
  avatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 2,
    backgroundColor: '#D8B24A',
    shadowColor: '#9E7B24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#F8F6F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B7A40',
  },

  /* ── Drawer Overlay ── */
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  drawerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  drawerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDE2DD',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2EE',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B2520',
    letterSpacing: -0.3,
  },
  drawerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F4F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7F4',
  },
  drawerItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  drawerItemText: {
    flex: 1,
  },
  drawerItemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B2520',
    letterSpacing: -0.2,
  },
  drawerItemSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#86908B',
    marginTop: 2,
  },
});
