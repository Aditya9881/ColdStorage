/**
 * GradientButton — Premium primary button with gradient fill
 *
 * Features:
 * - Mesh gradient fill (deep forest → teal)
 * - Press scale animation + haptic feedback
 * - Colored glow shadow
 * - Loading state with spinner
 * - Outlined variant
 */
import React, { useRef } from 'react';
import { Animated, Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, BorderRadius, FontFamily, Gradients } from '@/constants/Colors';
import { hapticLight } from '@/lib/haptics';
import { useColorScheme } from 'react-native';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export default function GradientButton({
  title, onPress, icon, loading, disabled,
  variant = 'primary', size = 'md', style, textStyle, fullWidth = true,
}: GradientButtonProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 120, friction: 10 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 10 }).start();
  };
  const handlePress = () => {
    if (!loading && !disabled) {
      hapticLight();
      onPress();
    }
  };

  const isDisabled = loading || disabled;
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;
  const paddingV = size === 'sm' ? 10 : size === 'lg' ? 18 : 14;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  if (variant === 'outline') {
    return (
      <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={isDisabled}>
        <Animated.View style={[
          styles.outline,
          { borderColor: colors.primary, opacity: isDisabled ? 0.5 : 1, paddingVertical: paddingV },
          fullWidth ? {} : styles.inline,
          { transform: [{ scale }] },
          style,
        ]}>
          {icon && <Ionicons name={icon} size={iconSize} color={colors.primary} style={{ marginRight: 8 }} />}
          <Text style={[styles.outlineText, { color: colors.primary, fontSize }, textStyle]}>{title}</Text>
        </Animated.View>
      </Pressable>
    );
  }

  const gradientColors = variant === 'gold' ? Gradients.gold : Gradients.mesh;
  const shadowStyle = variant === 'gold'
    ? { ...Shadows.glow, shadowColor: '#D9A441' }
    : Shadows.glow;

  return (
    <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={isDisabled}>
      <Animated.View style={[
        isDisabled ? {} : shadowStyle,
        { opacity: isDisabled ? 0.5 : 1, borderRadius: BorderRadius.lg },
        fullWidth ? {} : styles.inline,
        { transform: [{ scale }] },
        style,
      ]}>
        <LinearGradient
          colors={gradientColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { paddingVertical: paddingV }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              {icon && <Ionicons name={icon} size={iconSize} color="#FFFFFF" style={{ marginRight: 8 }} />}
              <Text style={[styles.gradientText, { fontSize }, textStyle]}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 24,
  },
  gradientText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: FontFamily.bold,
    letterSpacing: 0.3,
  },
  outline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  outlineText: {
    fontWeight: '600',
    fontFamily: FontFamily.semibold,
    letterSpacing: 0.3,
  },
  inline: {
    alignSelf: 'flex-start',
  },
});
