/**
 * StatusChip — Refined status indicator
 *
 * Soft pastel backgrounds instead of saturated fills.
 * Refined typography with uppercase tracked labels.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, BorderRadius } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

type ChipVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

interface StatusChipProps {
  label?: string;
  status?: string;
  variant?: ChipVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const CHIP_COLORS = {
  light: {
    success: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
    warning: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
    danger:  { bg: '#FECACA', text: '#991B1B', border: '#FCA5A5' },
    info:    { bg: '#CFFAFE', text: '#155E75', border: '#A5F3FC' },
    neutral: { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
    gold:    { bg: '#FBF5E8', text: '#92400E', border: '#E8BE6A' },
  },
  dark: {
    success: { bg: '#064E3B', text: '#6EE7B7', border: '#065F46' },
    warning: { bg: '#78350F', text: '#FDE68A', border: '#92400E' },
    danger:  { bg: '#7F1D1D', text: '#FCA5A5', border: '#991B1B' },
    info:    { bg: '#164E63', text: '#67E8F9', border: '#155E75' },
    neutral: { bg: '#374151', text: '#D1D5DB', border: '#4B5563' },
    gold:    { bg: '#2A2210', text: '#E8BE6A', border: '#78350F' },
  },
};

const STATUS_VARIANT_MAP: Record<string, ChipVariant> = {
  ACTIVE: 'success', STORED: 'success', PAID: 'success', APPROVED: 'success', VERIFIED: 'success',
  COMPLETED: 'success', DELIVERED: 'success', OPERATIONAL: 'success',
  PENDING: 'warning', PENDING_REVIEW: 'warning', PROCESSING: 'warning', IN_TRANSIT: 'warning',
  DISPATCHED: 'warning', DRAFT: 'warning',
  CANCELLED: 'danger', REJECTED: 'danger', FAILED: 'danger', EXPIRED: 'danger', OVERDUE: 'danger',
  RELEASED: 'info', REFUNDED: 'info',
};

export default function StatusChip({ label, status, variant, icon, size = 'md', style }: StatusChipProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const displayLabel = label || status || '';
  const displayVariant = variant || STATUS_VARIANT_MAP[status || ''] || 'neutral';
  const chipColor = CHIP_COLORS[colorScheme][displayVariant];
  const isSm = size === 'sm';

  return (
    <View style={[
      styles.chip,
      {
        backgroundColor: chipColor.bg,
        borderColor: chipColor.border,
        paddingHorizontal: isSm ? 8 : 10,
        paddingVertical: isSm ? 3 : 5,
      },
      style,
    ]}>
      {icon && (
        <Ionicons
          name={icon}
          size={isSm ? 10 : 12}
          color={chipColor.text}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[
        styles.label,
        {
          color: chipColor.text,
          fontSize: isSm ? 10 : 11,
        },
      ]}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '700',
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
