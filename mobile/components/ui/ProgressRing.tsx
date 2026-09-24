/**
 * ProgressRing — SVG circular progress indicator
 *
 * Features:
 * - Animated fill with react-native-svg
 * - Color-coded thresholds (green/amber/red)
 * - Center label (percentage or custom text)
 * - Gradient stroke option
 * - Configurable size and thickness
 */
import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, FontFamily } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  autoColor?: boolean; // green < 60, amber 60-85, red > 85
  label?: string;
  labelSize?: number;
  sublabel?: string;
  trackColor?: string;
  showPercent?: boolean;
}

export default function ProgressRing({
  percent, size = 56, strokeWidth = 5, color, autoColor = true,
  label, labelSize, sublabel, trackColor, showPercent = true,
}: ProgressRingProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  let strokeColor = color || colors.success;
  if (autoColor && !color) {
    if (clamped > 85) strokeColor = colors.danger;
    else if (clamped > 60) strokeColor = colors.warning;
    else strokeColor = colors.success;
  }

  const track = trackColor || (colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)');
  const displayLabel = label || (showPercent ? `${Math.round(clamped)}%` : '');
  const dynamicLabelSize = labelSize || (size < 48 ? 11 : size < 64 ? 13 : 16);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {/* Center label */}
      <View style={styles.labelContainer}>
        {displayLabel ? (
          <Text style={[
            styles.label,
            { fontSize: dynamicLabelSize, color: strokeColor },
          ]}>
            {displayLabel}
          </Text>
        ) : null}
        {sublabel ? (
          <Text style={[styles.sublabel, { color: colors.textTertiary, fontSize: dynamicLabelSize - 4 }]}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '800',
    fontFamily: FontFamily.extrabold,
    fontVariant: ['tabular-nums'],
  },
  sublabel: {
    fontWeight: '600',
    fontFamily: FontFamily.semibold,
    marginTop: -1,
  },
});
