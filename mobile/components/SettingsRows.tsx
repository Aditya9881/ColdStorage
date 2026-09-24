/**
 * Reusable settings/list row components.
 * Extracted from settings.tsx to be shared across profile, settings, and detail screens.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ── Section Header ──

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  theme: { teal: string; text: string; textMuted: string };
}

export function SectionHeader({ eyebrow, title, subtitle, theme }: SectionHeaderProps) {
  return (
    <View style={rowStyles.sectionHeaderWrap}>
      <Text style={[rowStyles.sectionEyebrow, { color: theme.teal }]}>{eyebrow}</Text>
      <Text style={[rowStyles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[rowStyles.sectionSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

// ── Premium Row (navigatable) ──

interface PremiumRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  label: string;
  subtitle: string;
  value?: string;
  onPress?: () => void;
  theme: { text: string; textMuted: string; textSoft: string; borderSoft: string };
  showArrow?: boolean;
  first?: boolean;
  last?: boolean;
}

export function PremiumRow({
  icon, iconColor, iconBg, label, subtitle, value,
  onPress, theme, showArrow, first, last,
}: PremiumRowProps) {
  const Wrapper: any = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[
        rowStyles.rowBase,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.borderSoft },
        first && { marginTop: 2 },
      ]}
      onPress={onPress}
      activeOpacity={0.84}
    >
      <View style={[rowStyles.rowIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <View style={rowStyles.rowTextWrap}>
        <Text style={[rowStyles.rowTitle, { color: theme.text }]}>{label}</Text>
        <Text style={[rowStyles.rowSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      </View>

      {value ? <Text style={[rowStyles.rowValue, { color: theme.textMuted }]}>{value}</Text> : null}
      {showArrow ? <Ionicons name="chevron-forward" size={18} color={theme.textSoft} /> : null}
    </Wrapper>
  );
}

// ── Premium Toggle ──

interface PremiumToggleProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  label: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
  theme: { text: string; textMuted: string; teal: string; border: string; borderSoft: string; white: string };
  first?: boolean;
  last?: boolean;
}

export function PremiumToggle({
  icon, iconColor, iconBg, label, subtitle, value,
  onToggle, theme, first, last,
}: PremiumToggleProps) {
  return (
    <View
      style={[
        rowStyles.rowBase,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.borderSoft },
        first && { marginTop: 2 },
      ]}
    >
      <View style={[rowStyles.rowIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <View style={rowStyles.rowTextWrap}>
        <Text style={[rowStyles.rowTitle, { color: theme.text }]}>{label}</Text>
        <Text style={[rowStyles.rowSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.border, true: `${theme.teal}77` }}
        thumbColor={value ? theme.white : '#F4F3F4'}
        ios_backgroundColor={theme.border}
      />
    </View>
  );
}

// ── Danger Action Row ──

interface DangerActionProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  subtitle: string;
  color: string;
  bg: string;
  onPress: () => void;
  theme: { textMuted: string; textSoft: string; borderSoft: string };
  first?: boolean;
  last?: boolean;
}

export function DangerAction({
  icon, label, subtitle, color, bg,
  onPress, theme, first, last,
}: DangerActionProps) {
  return (
    <TouchableOpacity
      style={[
        rowStyles.rowBase,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.borderSoft },
        first && { marginTop: 2 },
      ]}
      activeOpacity={0.84}
      onPress={onPress}
    >
      <View style={[rowStyles.rowIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <View style={rowStyles.rowTextWrap}>
        <Text style={[rowStyles.rowTitle, { color }]}>{label}</Text>
        <Text style={[rowStyles.rowSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={theme.textSoft} />
    </TouchableOpacity>
  );
}

// ── Shared Styles ──

const rowStyles = StyleSheet.create({
  sectionHeaderWrap: {
    marginBottom: 10,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  rowBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 4,
  },
});
