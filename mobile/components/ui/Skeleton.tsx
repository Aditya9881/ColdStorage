/**
 * SheetKosh — Skeleton Shimmer Loading Component
 *
 * Replaces all ActivityIndicator-based loading screens with
 * premium shimmer placeholders.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

/** Single shimmer bar */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.4, 0.7, 0.4]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.skeletonBase,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Skeleton card for lot/invoice/receipt cards */
export function SkeletonCard() {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  return (
    <View style={[skStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={skStyles.cardHeader}>
        <Skeleton width={44} height={44} borderRadius={10} />
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} style={{ marginTop: Spacing.sm }} />
        </View>
        <Skeleton width={64} height={24} borderRadius={BorderRadius.full} />
      </View>
      <View style={[skStyles.divider, { backgroundColor: colors.borderLight }]} />
      <View style={skStyles.cardFooter}>
        <Skeleton width="30%" height={12} />
        <Skeleton width="25%" height={12} />
        <Skeleton width="20%" height={12} />
      </View>
    </View>
  );
}

/** Skeleton stat card (for dashboard) */
export function SkeletonStatCard() {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  return (
    <View style={[skStyles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton width={36} height={36} borderRadius={BorderRadius.sm} />
      <Skeleton width="60%" height={20} style={{ marginTop: Spacing.sm }} />
      <Skeleton width="80%" height={12} style={{ marginTop: Spacing.xs }} />
    </View>
  );
}

/** Full-screen loading with multiple skeleton cards */
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={skStyles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

/** Stats grid skeleton */
export function SkeletonStatsGrid() {
  return (
    <View style={skStyles.statsGrid}>
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '47%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
});

export default Skeleton;
