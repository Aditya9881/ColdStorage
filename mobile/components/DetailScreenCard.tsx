/**
 * DetailScreenCard — Unified card components for all farmer detail screens
 *
 * Exports:
 * - SectionCard: White card with consistent radius/shadow/border
 * - SectionHeader: Icon-box + eyebrow + title pattern
 * - DetailRow: Icon + label + value row for info display
 * - DetailGrid: Container for DetailRow items
 * - InfoPill: Small colored pill badge
 *
 * All tokens match the tab screens (canvas #F2F4F0, border #E5E9E2, etc.)
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Unified Design Tokens ─────────────────────────────────

export const DetailUI = {
  canvas: '#F2F4F0',
  surface: '#FFFFFF',
  primary: '#0A4E40',
  primaryDark: '#082B24',
  primaryMid: '#0E6B5A',
  gold: '#D8B24A',
  ink: '#0B2520',
  inkSecondary: '#17202C',
  muted: '#86908B',
  subtle: '#9DA6B4',
  border: '#E5E9E2',
  borderSoft: '#ECEFE8',
  danger: '#EF4444',
  dangerSoft: '#FEF2F2',
  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
} as const;

// ─── SectionCard ────────────────────────────────────────────

interface SectionCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Accent left border color */
  accentColor?: string;
}

export function SectionCard({ children, style, accentColor }: SectionCardProps) {
  return (
    <View
      style={[
        s.card,
        accentColor ? { borderLeftWidth: 3, borderLeftColor: accentColor } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── SectionHeader ──────────────────────────────────────────

interface SectionHeaderProps {
  icon: string;
  iconBg?: string;
  iconColor?: string;
  eyebrow?: string;
  title: string;
  rightElement?: React.ReactNode;
}

export function SectionHeader({
  icon,
  iconBg = '#E8F3EE',
  iconColor = DetailUI.primaryMid,
  eyebrow,
  title,
  rightElement,
}: SectionHeaderProps) {
  return (
    <View style={s.sectionHeader}>
      <View style={[s.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={s.sectionTitleWrap}>
        {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {rightElement || null}
    </View>
  );
}

// ─── DetailRow ──────────────────────────────────────────────

interface DetailRowProps {
  icon?: string;
  iconColor?: string;
  label: string;
  value: string | React.ReactNode;
  /** Highlight value text (e.g. for money) */
  valueColor?: string;
  valueBold?: boolean;
}

export function DetailRow({
  icon,
  iconColor = DetailUI.subtle,
  label,
  value,
  valueColor,
  valueBold,
}: DetailRowProps) {
  return (
    <View style={s.detailRow}>
      {icon ? (
        <View style={s.detailRowIcon}>
          <Ionicons name={icon as any} size={15} color={iconColor} />
        </View>
      ) : null}
      <View style={s.detailRowContent}>
        <Text style={s.detailLabel}>{label}</Text>
        {typeof value === 'string' ? (
          <Text
            style={[
              s.detailValue,
              valueColor ? { color: valueColor } : undefined,
              valueBold ? { fontWeight: '800' } : undefined,
            ]}
            numberOfLines={2}
          >
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

// ─── DetailGrid ─────────────────────────────────────────────

export function DetailGrid({ children }: { children: React.ReactNode }) {
  return <View style={s.detailGrid}>{children}</View>;
}

// ─── InfoPill ───────────────────────────────────────────────

interface InfoPillProps {
  icon?: string;
  text: string;
  bg?: string;
  textColor?: string;
}

export function InfoPill({
  icon,
  text,
  bg = '#F3F5F1',
  textColor = '#636E7A',
}: InfoPillProps) {
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon as any} size={12} color={textColor} /> : null}
      <Text style={[s.pillText, { color: textColor }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

// ─── Divider ────────────────────────────────────────────────

export function CardDivider() {
  return <View style={s.divider} />;
}

// ─── Styles ─────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: DetailUI.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DetailUI.border,
    shadowColor: '#182D20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitleWrap: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: DetailUI.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DetailUI.ink,
    letterSpacing: -0.2,
  },
  detailGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3F5F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  detailRowContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: DetailUI.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: DetailUI.inkSecondary,
    lineHeight: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 9,
  },
  pillText: {
    fontSize: 11.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DetailUI.borderSoft,
    marginVertical: 12,
  },
});
