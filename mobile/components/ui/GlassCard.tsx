/**
 * GlassCard — Premium Frosted Glass Card Component
 *
 * A reusable glassmorphism card for use across all dashboards.
 *
 * Features:
 * - expo-blur BlurView (iOS) with layered gradient fallback (Android)
 * - Lighting-edge borders: brighter top-left, dimmer bottom-right
 * - Soft dispersed drop shadow
 * - Theme-aware: auto-selects light/dark blur tint + overlay opacity
 * - Optional press animation (scale + opacity spring)
 * - Variants: 'elevated' (deep shadow), 'flat' (no shadow), 'header' (for gradient headers)
 */
import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle, Platform, Animated, Pressable, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Shadows } from '@/constants/Colors';
import { hapticLight } from '@/lib/haptics';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** BlurView intensity (default: 50) */
  intensity?: number;
  /** Override auto theme tint */
  tint?: 'light' | 'dark';
  /** Shadow & blur presets */
  variant?: 'elevated' | 'flat' | 'header';
  /** Optional pressable with scale animation */
  onPress?: () => void;
  /** Remove default padding */
  noPadding?: boolean;
  disabled?: boolean;
}

export default function GlassCard({
  children,
  style,
  intensity = 50,
  tint,
  variant = 'elevated',
  onPress,
  noPadding,
  disabled,
}: GlassCardProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const resolvedTint = tint ?? (colorScheme === 'dark' ? 'dark' : 'light');

  // Press animation
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 100, friction: 10 }),
      Animated.timing(opacity, { toValue: 0.88, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = () => {
    if (!disabled && onPress) {
      hapticLight();
      onPress();
    }
  };

  // Variant-based shadow
  const shadowStyle = variant === 'elevated'
    ? Shadows.glass
    : variant === 'flat'
      ? {}
      : Shadows.sm; // header variant

  // Overlay opacity based on theme
  const overlayColor = colorScheme === 'dark'
    ? 'rgba(28, 38, 32, 0.25)'
    : 'rgba(255, 255, 255, 0.15)';

  // Intensity override for header variant (lighter blur on gradient)
  const resolvedIntensity = variant === 'header' ? Math.min(intensity, 35) : intensity;

  const containerStyle: ViewStyle[] = [
    styles.container,
    shadowStyle as ViewStyle,
    style as ViewStyle,
  ];

  // ── iOS: Real BlurView ──
  const renderContent = () => {
    if (Platform.OS === 'ios') {
      return (
        <View style={containerStyle}>
          <BlurView
            intensity={resolvedIntensity}
            tint={resolvedTint}
            style={StyleSheet.absoluteFill}
          />
          {/* Semi-transparent overlay for glass tint */}
          <View style={[styles.overlay, { backgroundColor: overlayColor }]} />
          {/* Lighting border: bright top-left inner glow */}
          <View style={[styles.lightingEdge, {
            borderTopColor: colors.glassBorderTop,
            borderLeftColor: colors.glassBorderTop,
            borderBottomColor: colors.glassBorderBottom,
            borderRightColor: colors.glassBorderBottom,
          }]} />
          <View style={[styles.content, noPadding ? styles.noPadding : undefined]}>
            {children}
          </View>
        </View>
      );
    }

    // ── Android Fallback: Layered gradient approximation ──
    return (
      <View style={containerStyle}>
        <LinearGradient
          colors={
            colorScheme === 'dark'
              ? ['rgba(28, 38, 32, 0.55)', 'rgba(28, 38, 32, 0.35)']
              : ['rgba(255, 255, 255, 0.28)', 'rgba(255, 255, 255, 0.12)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Lighting border */}
        <View style={[styles.lightingEdge, {
          borderTopColor: colors.glassBorderTop,
          borderLeftColor: colors.glassBorderTop,
          borderBottomColor: colors.glassBorderBottom,
          borderRightColor: colors.glassBorderBottom,
        }]} />
        <View style={[styles.content, noPadding ? styles.noPadding : undefined]}>
          {children}
        </View>
      </View>
    );
  };

  // Wrap in Pressable if onPress provided
  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        <Animated.View style={{ transform: [{ scale }], opacity }}>
          {renderContent()}
        </Animated.View>
      </Pressable>
    );
  }

  return renderContent();
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lightingEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  content: {
    padding: 16,
  },
  noPadding: {
    padding: 0,
  },
});
