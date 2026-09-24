/**
 * RoleSelectionModal — First-time role picker
 *
 * Shown once when a new user opens the app for the first time.
 * Persists selection to AsyncStorage so it's not shown again.
 *
 * Design: Full-screen, high-contrast, large tap targets.
 * No blur/glass effects — clean solid backgrounds for performance.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export type DiscoverRole = 'OWNER' | 'FARMER' | 'BUYER';

interface Props {
  onSelect: (role: DiscoverRole) => void;
  onSkip: () => void;
}

const ROLES: {
  key: DiscoverRole;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconBg: string;
  iconColor: string;
  title: string;
  titleHi: string;
  subtitle: string;
  subtitleHi: string;
}[] = [
  {
    key: 'OWNER',
    icon: 'business-outline',
    iconBg: '#EEF4FF',
    iconColor: '#3B6FCF',
    title: 'Cold Storage Owner',
    titleHi: 'कोल्ड स्टोरेज मालिक',
    subtitle: 'Manage your facility digitally',
    subtitleHi: 'अपनी सुविधा को डिजिटल रूप से प्रबंधित करें',
  },
  {
    key: 'FARMER',
    icon: 'leaf-outline',
    iconBg: '#E8F5EE',
    iconColor: '#14532D',
    title: 'Farmer / Producer',
    titleHi: 'किसान / उत्पादक',
    subtitle: 'Store your crops safely',
    subtitleHi: 'अपनी फसल सुरक्षित रखें',
  },
  {
    key: 'BUYER',
    icon: 'cart-outline',
    iconBg: '#FFF7E8',
    iconColor: '#B8860B',
    title: 'Buyer / Trader',
    titleHi: 'खरीदार / व्यापारी',
    subtitle: 'Source quality produce directly',
    subtitleHi: 'सीधे गुणवत्ता वाली उपज खरीदें',
  },
];

export default function RoleSelectionModal({ onSelect, onSkip }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Brand */}
      <View style={s.brandRow}>
        <View style={s.brandMark}>
          <Ionicons name="snow-outline" size={20} color="#D3A03A" />
        </View>
        <Text style={s.brandName}>SheetKosh</Text>
      </View>

      <Text style={s.heading}>India's Cold Storage{'\n'}Platform</Text>
      <Text style={s.subheading}>
        One platform for cold storage owners, farmers, and buyers.
      </Text>

      {/* Role label */}
      <Text style={s.roleLabel}>I am a...</Text>

      {/* Role Cards */}
      <View style={s.cardsWrap}>
        {ROLES.map((role) => (
          <TouchableOpacity
            key={role.key}
            style={s.roleCard}
            onPress={() => onSelect(role.key)}
            activeOpacity={0.88}
          >
            <View style={[s.roleIcon, { backgroundColor: role.iconBg }]}>
              <Ionicons name={role.icon} size={24} color={role.iconColor} />
            </View>

            <View style={s.roleTextWrap}>
              <Text style={s.roleTitle}>{role.title}</Text>
              <Text style={s.roleSubtitle}>{role.subtitle}</Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#B0B8B4" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Skip */}
      <TouchableOpacity style={s.skipBtn} onPress={onSkip} activeOpacity={0.8}>
        <Text style={s.skipText}>Just exploring? </Text>
        <Text style={s.skipLink}>Skip →</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F5',
    paddingHorizontal: 24,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B2520',
    letterSpacing: -0.5,
  },

  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0B2520',
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: 10,
  },
  subheading: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5F6B66',
    fontWeight: '500',
    marginBottom: 36,
  },

  roleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9AA39E',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },

  cardsWrap: {
    gap: 12,
  },

  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8E4',
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },

  roleIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  roleTextWrap: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0B2520',
    letterSpacing: -0.2,
  },
  roleSubtitle: {
    fontSize: 13,
    color: '#5F6B66',
    marginTop: 2,
    fontWeight: '500',
  },

  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    paddingVertical: 14,
  },
  skipText: {
    fontSize: 14,
    color: '#9AA39E',
    fontWeight: '500',
  },
  skipLink: {
    fontSize: 14,
    color: '#14532D',
    fontWeight: '700',
  },
});
