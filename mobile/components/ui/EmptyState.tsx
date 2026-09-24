/**
 * ColdStorage Mobile — EmptyState Component
 *
 * Illustrated empty state with icon, title, subtitle, and optional CTA.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  compact?: boolean;
}

export default function EmptyState({
  icon = 'cube-outline',
  title,
  subtitle,
  action,
  compact = false,
}: EmptyStateProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}12` }]}>
        <Ionicons name={icon} size={compact ? 32 : 44} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
      {action && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={action.onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    minHeight: 260,
  },
  compact: {
    paddingVertical: Spacing.xl,
    minHeight: 160,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  actionBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
