/**
 * DetailScreenHeader — Unified gradient header for all farmer sub-screens
 *
 * Provides:
 * - LinearGradient background matching the app's forest-green identity
 * - Back button (left) with consistent sizing
 * - Title + optional subtitle
 * - Optional right action button
 * - Safe area padding handled internally
 *
 * Usage:
 *   <DetailScreenHeader
 *     title="Booking #BK-001"
 *     subtitle="PENDING"
 *     onBack={() => router.back()}
 *     rightAction={{ icon: 'share-outline', onPress: handleShare }}
 *   />
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticLight } from '@/lib/haptics';

interface RightAction {
  icon: string;
  onPress: () => void;
  color?: string;
}

interface DetailScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Status dot color (renders a colored dot before subtitle) */
  statusColor?: string;
  onBack: () => void;
  rightAction?: RightAction;
  /** Secondary right action (e.g. share + more) */
  rightActionSecondary?: RightAction;
  /** Override gradient colors */
  gradientColors?: readonly [string, string, ...string[]];
}

export default function DetailScreenHeader({
  title,
  subtitle,
  statusColor,
  onBack,
  rightAction,
  rightActionSecondary,
  gradientColors = ['#082B24', '#0E6B5A'],
}: DetailScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={gradientColors as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.header, { paddingTop: insets.top + 8 }]}
    >
      {/* Back */}
      <TouchableOpacity
        style={s.iconBtn}
        onPress={() => { hapticLight(); onBack(); }}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Title Block */}
      <View style={s.titleBlock}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <View style={s.subtitleRow}>
            {statusColor && <View style={[s.statusDot, { backgroundColor: statusColor }]} />}
            <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
        ) : null}
      </View>

      {/* Right Actions */}
      <View style={s.rightWrap}>
        {rightActionSecondary && (
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => { hapticLight(); rightActionSecondary.onPress(); }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={rightActionSecondary.icon as any}
              size={20}
              color={rightActionSecondary.color || '#FFFFFF'}
            />
          </TouchableOpacity>
        )}
        {rightAction ? (
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => { hapticLight(); rightAction.onPress(); }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={rightAction.icon as any}
              size={20}
              color={rightAction.color || '#FFFFFF'}
            />
          </TouchableOpacity>
        ) : (
          <View style={s.iconBtnSpacer} />
        )}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSpacer: {
    width: 40,
  },
  titleBlock: {
    flex: 1,
    marginHorizontal: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rightWrap: {
    flexDirection: 'row',
    gap: 6,
  },
});
