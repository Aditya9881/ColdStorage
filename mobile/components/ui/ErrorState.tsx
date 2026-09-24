/**
 * SheetKosh — Error State Component
 *
 * Consistent error display with icon, message, retry button.
 * Variants: network, not-found, permission, generic.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '@/constants/Colors';

type ErrorVariant = 'network' | 'not-found' | 'permission' | 'server' | 'generic';

interface ErrorStateProps {
  variant?: ErrorVariant;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}

const ERROR_CONFIG: Record<ErrorVariant, { icon: keyof typeof Ionicons.glyphMap; title: string; message: string; color: string }> = {
  network: {
    icon: 'cloud-offline-outline',
    title: 'No Connection',
    message: 'Check your internet connection and try again.',
    color: '#D97706',
  },
  'not-found': {
    icon: 'search-outline',
    title: 'Not Found',
    message: 'The item you are looking for could not be found.',
    color: '#6B7280',
  },
  permission: {
    icon: 'lock-closed-outline',
    title: 'Access Denied',
    message: 'You don\'t have permission to view this content.',
    color: '#DC2626',
  },
  server: {
    icon: 'warning-outline',
    title: 'Something Went Wrong',
    message: 'Our servers are having trouble. Please try again later.',
    color: '#DC2626',
  },
  generic: {
    icon: 'alert-circle-outline',
    title: 'Error',
    message: 'Something unexpected happened. Please try again.',
    color: '#DC2626',
  },
};

export default function ErrorState({
  variant = 'generic',
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  compact = false,
}: ErrorStateProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const config = ERROR_CONFIG[variant];

  const iconSize = compact ? 36 : 56;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[
        styles.iconCircle,
        compact && styles.iconCircleCompact,
        { backgroundColor: `${config.color}12` },
      ]}>
        <Ionicons name={config.icon} size={iconSize} color={config.color} />
      </View>

      <Text style={[
        styles.title,
        compact && styles.titleCompact,
        { color: colors.text },
      ]}>
        {title || config.title}
      </Text>

      <Text style={[
        styles.message,
        compact && styles.messageCompact,
        { color: colors.textSecondary },
      ]}>
        {message || config.message}
      </Text>

      {onRetry && (
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={16} color="#FFF" />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
  },
  containerCompact: {
    flex: 0,
    paddingVertical: Spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  iconCircleCompact: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  titleCompact: {
    fontSize: FontSize.lg,
  },
  message: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  messageCompact: {
    fontSize: FontSize.sm,
    maxWidth: 240,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  retryText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#FFFFFF',
  },
});
