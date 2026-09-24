/**
 * DiscoverHero — Role-specific hero section for the discover page.
 *
 * Shows brand header, role-specific headline + subtitle, and CTAs.
 * Clean white/light background with high-contrast text.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { DiscoverRole } from './RoleSelectionModal';

interface Props {
  role: DiscoverRole;
  onSignIn: () => void;
  onGetStarted: () => void;
  onSwitchRole: () => void;
}

const ROLE_CONTENT: Record<
  DiscoverRole,
  {
    eyebrow: string;
    eyebrowHi: string;
    title: string;
    titleHi: string;
    subtitle: string;
    subtitleHi: string;
    cta: string;
    ctaHi: string;
    eyebrowColor: string;
    eyebrowBg: string;
    ctaBg: string;
  }
> = {
  OWNER: {
    eyebrow: 'FOR COLD STORAGE OWNERS',
    eyebrowHi: 'कोल्ड स्टोरेज मालिकों के लिए',
    title: 'Run your facility\nsmarter',
    titleHi: 'अपनी सुविधा को\nबेहतर चलाएं',
    subtitle: 'Digital management for bookings, chambers, inventory, and billing — all in one place.',
    subtitleHi: 'बुकिंग, चैम्बर, इन्वेंटरी और बिलिंग का डिजिटल प्रबंधन — एक ही जगह पर।',
    cta: 'Register Your Facility',
    ctaHi: 'अपनी सुविधा पंजीकृत करें',
    eyebrowColor: '#3B6FCF',
    eyebrowBg: '#EEF4FF',
    ctaBg: '#14532D',
  },
  FARMER: {
    eyebrow: 'FOR FARMERS & PRODUCERS',
    eyebrowHi: 'किसानों और उत्पादकों के लिए',
    title: 'Store your crops,\ntrack prices',
    titleHi: 'फसल स्टोर करें,\nभाव देखें',
    subtitle: 'Find verified cold storage, book space, and check today\'s mandi prices — all from your phone.',
    subtitleHi: 'सत्यापित कोल्ड स्टोरेज खोजें, जगह बुक करें, और आज का मंडी भाव देखें।',
    cta: 'Find Storage Near You',
    ctaHi: 'अपने पास स्टोरेज खोजें',
    eyebrowColor: '#14532D',
    eyebrowBg: '#E8F5EE',
    ctaBg: '#14532D',
  },
  BUYER: {
    eyebrow: 'FOR BUYERS & TRADERS',
    eyebrowHi: 'खरीदारों और व्यापारियों के लिए',
    title: 'Source quality\nproduce directly',
    titleHi: 'सीधे गुणवत्ता वाली\nउपज खरीदें',
    subtitle: 'Browse marketplace listings, place orders, and connect with farmers and cold storages.',
    subtitleHi: 'मार्केटप्लेस ब्राउज़ करें, ऑर्डर दें, और किसानों से जुड़ें।',
    cta: 'Browse Marketplace',
    ctaHi: 'मार्केटप्लेस ब्राउज़ करें',
    eyebrowColor: '#B8860B',
    eyebrowBg: '#FFF7E8',
    ctaBg: '#14532D',
  },
};

export default function DiscoverHero({ role, onSignIn, onGetStarted, onSwitchRole }: Props) {
  const insets = useSafeAreaInsets();
  const content = ROLE_CONTENT[role];

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.brandRow}>
          <View style={s.brandMark}>
            <Ionicons name="snow-outline" size={16} color="#D3A03A" />
          </View>
          <Text style={s.brandName}>SheetKosh</Text>
        </View>

        <View style={s.topBarActions}>
          <TouchableOpacity style={s.switchBtn} onPress={onSwitchRole} activeOpacity={0.84}>
            <Ionicons name="swap-horizontal-outline" size={16} color="#5F6B66" />
          </TouchableOpacity>

          <TouchableOpacity style={s.signInBtn} onPress={onSignIn} activeOpacity={0.84}>
            <Ionicons name="person-outline" size={14} color="#14532D" />
            <Text style={s.signInText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Eyebrow */}
      <View style={[s.eyebrow, { backgroundColor: content.eyebrowBg }]}>
        <Text style={[s.eyebrowText, { color: content.eyebrowColor }]}>{content.eyebrow}</Text>
      </View>

      {/* Title */}
      <Text style={s.title}>{content.title}</Text>
      <Text style={s.subtitle}>{content.subtitle}</Text>

      {/* CTAs */}
      <View style={s.ctaRow}>
        <TouchableOpacity
          style={[s.primaryCta, { backgroundColor: content.ctaBg }]}
          onPress={onGetStarted}
          activeOpacity={0.88}
        >
          <Text style={s.primaryCtaText}>{content.cta}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#F7F8F5',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0B2520',
    letterSpacing: -0.4,
  },

  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F2F5F0',
    borderWidth: 1,
    borderColor: '#E4E9E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F5F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E4E9E1',
  },
  signInText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14532D',
  },

  eyebrow: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0B2520',
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5F6B66',
    fontWeight: '500',
    marginBottom: 24,
  },

  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  primaryCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
