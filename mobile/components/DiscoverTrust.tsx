/**
 * DiscoverTrust — Trust stats strip + final CTA section.
 *
 * Shows platform-wide numbers and a prominent call-to-action
 * to drive sign-up conversions from the discover page.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const STATS = [
  { value: '500+', label: 'Cold Storages', icon: 'business-outline' as const },
  { value: '10K+', label: 'Farmers', icon: 'people-outline' as const },
  { value: '50+', label: 'Cities', icon: 'location-outline' as const },
];

export default function DiscoverTrust({ onGetStarted, onSignIn }: Props) {
  return (
    <View style={s.container}>
      {/* Stats */}
      <View style={s.statsWrap}>
        <Text style={s.statsTitle}>Trusted across India</Text>

        <LinearGradient
          colors={['#0D2F26', '#14532D', '#1A6B52']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.statsCard}
        >
          {STATS.map((stat, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={s.statDivider} />}
              <View style={s.statItem}>
                <Ionicons name={stat.icon} size={16} color="rgba(255,255,255,0.5)" />
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </LinearGradient>
      </View>

      {/* Final CTA */}
      <View style={s.ctaSection}>
        <Text style={s.ctaTitle}>Ready to get started?</Text>
        <Text style={s.ctaSub}>
          Create a free account in under 2 minutes.
        </Text>

        <TouchableOpacity
          style={s.ctaButton}
          onPress={onGetStarted}
          activeOpacity={0.88}
        >
          <Text style={s.ctaButtonText}>Create Free Account</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.signInLink}
          onPress={onSignIn}
          activeOpacity={0.8}
        >
          <Text style={s.signInLinkText}>
            Already have an account? <Text style={s.signInLinkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },

  statsWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0B2520',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  ctaSection: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B2520',
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: 'center',
  },
  ctaSub: {
    fontSize: 14,
    color: '#5F6B66',
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532D',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 16,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 14,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signInLink: {
    paddingVertical: 8,
  },
  signInLinkText: {
    fontSize: 14,
    color: '#5F6B66',
    fontWeight: '500',
  },
  signInLinkBold: {
    color: '#14532D',
    fontWeight: '700',
  },
});
