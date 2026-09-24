/**
 * PremiumCard — Elevated card with multi-layer shadow & press animation
 *
 * Replaces flat white cards with warm, premium feeling:
 * - Multi-layer shadow for depth
 * - 24px border radius
 * - Scale + opacity press animation
 * - Warm white background
 */
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Shadows, BorderRadius } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

interface PremiumCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
  noPadding?: boolean;
}

export default function PremiumCard({ children, style, onPress, disabled, noPadding }: PremiumCardProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, tension: 100, friction: 10 }),
      Animated.timing(opacity, { toValue: 0.92, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const cardStyle: ViewStyle[] = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.borderLight,
    },
    noPadding ? {} : styles.padded,
    style as ViewStyle,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled}>
        <Animated.View style={[...cardStyle, { transform: [{ scale }], opacity }]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return <Animated.View style={cardStyle}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    ...Shadows.card,
  },
  padded: {
    padding: 20,
  },
});
