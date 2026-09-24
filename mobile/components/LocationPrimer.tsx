/**
 * Premium Location Primer — ColdStorage Mobile
 *
 * Full-screen immersive onboarding view explaining location access
 * with animated visual elements, trust indicators, and a premium feel.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, Platform, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface LocationPrimerProps {
  onAcknowledge: () => void;
  onSkip?: () => void;
}

export default function LocationPrimer({ onAcknowledge, onSkip }: LocationPrimerProps) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const ringScale1 = useRef(new Animated.Value(0.6)).current;
  const ringScale2 = useRef(new Animated.Value(0.6)).current;
  const ringOpacity1 = useRef(new Animated.Value(0.5)).current;
  const ringOpacity2 = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();

    // Pulse ring animation
    const pulseRing = () => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringScale1, { toValue: 2.2, duration: 2000, useNativeDriver: true }),
            Animated.timing(ringOpacity1, { toValue: 0, duration: 2000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ringScale1, { toValue: 0.6, duration: 0, useNativeDriver: true }),
            Animated.timing(ringOpacity1, { toValue: 0.5, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();

      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(ringScale2, { toValue: 2.2, duration: 2000, useNativeDriver: true }),
              Animated.timing(ringOpacity2, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(ringScale2, { toValue: 0.6, duration: 0, useNativeDriver: true }),
              Animated.timing(ringOpacity2, { toValue: 0.5, duration: 0, useNativeDriver: true }),
            ]),
          ])
        ).start();
      }, 1000);
    };

    // Icon gentle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    pulseRing();
  }, []);

  const features = [
    { icon: 'navigate-circle', text: 'Calculate exact distance to cold storages', color: '#34D399' },
    { icon: 'pricetags', text: 'Show live local mandi market prices', color: '#FBBF24' },
    { icon: 'thermometer', text: 'Monitor real-time storage temperatures', color: '#60A5FA' },
    { icon: 'shield-checkmark', text: 'Verify facility certifications & ratings', color: '#A78BFA' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0F2419', '#1B4332', '#2D6A4F']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Background decoration circles */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        {/* Animated Location Icon with Pulse Rings */}
        <View style={styles.iconSection}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: ringScale1 }], opacity: ringOpacity1 }]} />
          <Animated.View style={[styles.pulseRing, styles.pulseRing2, { transform: [{ scale: ringScale2 }], opacity: ringOpacity2 }]} />
          <Animated.View style={[styles.iconOuter, { transform: [{ scale: pulseScale }] }]}>
            <LinearGradient
              colors={['#40916C', '#2D6A4F']}
              style={styles.iconGradient}
            >
              <Ionicons name="location" size={42} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Discover What's{'\n'}Near You</Text>
        <Text style={styles.subtitle}>
          Enable location to find cold storage facilities, live mandi prices, and storage availability — all personalized to your area.
        </Text>

        {/* Feature cards */}
        <View style={styles.featuresGrid}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: `${f.color}20` }]}>
                <Ionicons name={f.icon as any} size={20} color={f.color} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Trust badge */}
        <View style={styles.trustBadge}>
          <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
          <Text style={styles.trustText}>Your location is never shared or stored. Used only for finding nearby services.</Text>
        </View>

        {/* CTA Buttons */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={onAcknowledge}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#40916C', '#2D6A4F']}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="locate" size={20} color="#FFFFFF" />
            <Text style={styles.ctaText}>Enable Location</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip || onAcknowledge}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip for now — I'll search manually</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(64, 145, 108, 0.08)',
    top: -80,
    right: -100,
  },
  bgCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(64, 145, 108, 0.06)',
    bottom: 100,
    left: -60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 80 : 50,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  // ── Animated icon ──
  iconSection: {
    alignItems: 'center',
    marginBottom: 32,
    height: 120,
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#40916C',
  },
  pulseRing2: {
    borderColor: '#52B788',
  },
  iconOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    shadowColor: '#40916C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Typography ──
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
    paddingHorizontal: 8,
  },
  // ── Feature cards ──
  featuresGrid: {
    gap: 10,
    marginBottom: 28,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    flex: 1,
  },
  // ── Trust ──
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  trustText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
  // ── CTA ──
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 14,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
});
