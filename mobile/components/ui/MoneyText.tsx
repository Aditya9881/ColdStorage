/**
 * MoneyText — Formatted ₹ currency display
 *
 * Features:
 * - Large tabular-nums with tight letter spacing
 * - Gold accent for money values
 * - Indian locale formatting (₹8,46,720)
 * - Optional trend arrow (↑/↓)
 * - Optional unit suffix (per MT, per kg)
 */
import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

interface MoneyTextProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  color?: string;
  useGold?: boolean;
  showSymbol?: boolean;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  style?: TextStyle;
  decimals?: number;
}

export default function MoneyText({
  amount, size = 'md', color, useGold = true, showSymbol = true,
  unit, trend, trendValue, style, decimals = 0,
}: MoneyTextProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const textColor = color || (useGold ? colors.moneyGold : colors.text);
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sizeStyles: Record<string, TextStyle> = {
    sm: { fontSize: 15, lineHeight: 20 },
    md: { fontSize: 20, lineHeight: 26 },
    lg: { fontSize: 28, lineHeight: 34 },
    hero: { fontSize: 36, lineHeight: 42 },
  };

  const trendColor = trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.textTertiary;
  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';

  return (
    <View style={styles.container}>
      <Text style={[styles.amount, sizeStyles[size], { color: textColor }, style]}>
        {showSymbol ? '₹' : ''}{formatted}
      </Text>
      {unit && (
        <Text style={[styles.unit, { color: colors.textTertiary }]}>{unit}</Text>
      )}
      {trend && (
        <View style={[styles.trendBadge, { backgroundColor: `${trendColor}12` }]}>
          <Ionicons name={trendIcon as any} size={12} color={trendColor} />
          {trendValue && (
            <Text style={[styles.trendText, { color: trendColor }]}>{trendValue}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  amount: {
    fontWeight: '800',
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: FontFamily.medium,
    marginBottom: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FontFamily.bold,
  },
});
