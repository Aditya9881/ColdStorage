/**
 * DetailBottomBar — Unified sticky bottom action bar for detail screens
 *
 * Provides:
 * - Frosted background matching the app canvas
 * - Primary action (gradient button)
 * - Secondary action (outline button)
 * - Danger action (red outline button)
 * - Safe area bottom padding
 *
 * Usage:
 *   <DetailBottomBar
 *     primaryLabel="Request Dispatch"
 *     primaryIcon="arrow-up-circle-outline"
 *     onPrimary={handleDispatch}
 *     secondaryLabel="Cancel"
 *     secondaryIcon="close-circle-outline"
 *     onSecondary={handleCancel}
 *     secondaryDanger
 *   />
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticLight } from '@/lib/haptics';
import { DetailUI } from './DetailScreenCard';

interface DetailBottomBarProps {
  /** Primary action (gradient button) */
  primaryLabel?: string;
  primaryIcon?: string;
  onPrimary?: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;

  /** Secondary action (outline button) */
  secondaryLabel?: string;
  secondaryIcon?: string;
  onSecondary?: () => void;
  /** Red outline style for destructive actions */
  secondaryDanger?: boolean;
}

export default function DetailBottomBar({
  primaryLabel,
  primaryIcon,
  onPrimary,
  primaryLoading,
  primaryDisabled,
  secondaryLabel,
  secondaryIcon,
  onSecondary,
  secondaryDanger,
}: DetailBottomBarProps) {
  const insets = useSafeAreaInsets();

  const hasSecondary = !!(secondaryLabel && onSecondary);
  const hasPrimary = !!(primaryLabel && onPrimary);

  if (!hasSecondary && !hasPrimary) return null;

  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 12) }]}>
      {/* Secondary (Outline) */}
      {hasSecondary && (
        <TouchableOpacity
          style={[
            s.secondaryBtn,
            secondaryDanger && s.secondaryDanger,
          ]}
          onPress={() => { hapticLight(); onSecondary!(); }}
          activeOpacity={0.84}
        >
          {secondaryIcon && (
            <Ionicons
              name={secondaryIcon as any}
              size={17}
              color={secondaryDanger ? DetailUI.danger : DetailUI.primary}
            />
          )}
          <Text
            style={[
              s.secondaryText,
              secondaryDanger && { color: DetailUI.danger },
            ]}
          >
            {secondaryLabel}
          </Text>
        </TouchableOpacity>
      )}

      {/* Primary (Gradient) */}
      {hasPrimary && (
        <TouchableOpacity
          style={[s.primaryBtn, (primaryLoading || primaryDisabled) && { opacity: 0.7 }]}
          onPress={() => { hapticLight(); onPrimary!(); }}
          activeOpacity={0.88}
          disabled={primaryLoading || primaryDisabled}
        >
          <LinearGradient
            colors={[DetailUI.primaryMid, DetailUI.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.primaryGradient}
          >
            {primaryLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                {primaryIcon && <Ionicons name={primaryIcon as any} size={18} color="#FFF" />}
                <Text style={s.primaryText}>{primaryLabel}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(242,244,240,0.97)',
    borderTopWidth: 1,
    borderTopColor: '#ECEFE8',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: DetailUI.primary,
    backgroundColor: 'rgba(10,78,64,0.04)',
  },
  secondaryDanger: {
    borderColor: '#FCA5A5',
    backgroundColor: DetailUI.dangerSoft,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: DetailUI.primary,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
