/**
 * GlassMeshBackground — Rich gradient background for glass effects
 *
 * Provides a multi-layered gradient surface so GlassCard's blur
 * has something colorful underneath. Includes abstract "blob" accents
 * for a mesh-gradient approximation.
 *
 * Variants:
 * - forest: Deep greens → teals (farmer dashboard)
 * - violet: Purple → indigo (owner dashboard)
 * - teal: Teal → cyan (buyer dashboard)
 * - neutral: Charcoal → slate (profile/settings)
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '@/constants/Colors';

type MeshVariant = 'forest' | 'violet' | 'teal' | 'neutral';

interface GlassMeshBackgroundProps {
  variant?: MeshVariant;
  children: React.ReactNode;
  style?: ViewStyle;
}

const VARIANT_CONFIG: Record<MeshVariant, {
  light: readonly string[];
  dark: readonly string[];
  blob1: string;
  blob2: string;
}> = {
  forest: {
    light: Gradients.mesh,
    dark: Gradients.meshDark,
    blob1: 'rgba(52, 211, 153, 0.15)',
    blob2: 'rgba(232, 190, 106, 0.1)',
  },
  violet: {
    light: Gradients.meshViolet,
    dark: Gradients.meshVioletDark,
    blob1: 'rgba(167, 139, 250, 0.15)',
    blob2: 'rgba(236, 72, 153, 0.1)',
  },
  teal: {
    light: Gradients.meshTeal,
    dark: Gradients.meshTealDark,
    blob1: 'rgba(20, 184, 166, 0.15)',
    blob2: 'rgba(56, 189, 248, 0.1)',
  },
  neutral: {
    light: Gradients.meshNeutral,
    dark: Gradients.meshNeutralDark,
    blob1: 'rgba(148, 163, 184, 0.1)',
    blob2: 'rgba(100, 116, 139, 0.08)',
  },
};

export default function GlassMeshBackground({
  variant = 'forest',
  children,
  style,
}: GlassMeshBackgroundProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const config = VARIANT_CONFIG[variant];
  const gradientColors = colorScheme === 'dark' ? config.dark : config.light;

  return (
    <View style={[styles.container, style]}>
      {/* Base gradient */}
      <LinearGradient
        colors={gradientColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Abstract blob accents for mesh feel */}
      <View style={[styles.blob1, { backgroundColor: config.blob1 }]} />
      <View style={[styles.blob2, { backgroundColor: config.blob2 }]} />

      {/* Grain texture overlay */}
      <View style={styles.grain} />

      {/* Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blob1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -60,
    right: -80,
  },
  blob2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    bottom: 100,
    left: -60,
  },
  grain: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
});
