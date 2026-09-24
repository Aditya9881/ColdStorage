/**
 * AnimatedGauge — Temperature/Humidity mini gauge
 *
 * Features:
 * - Gradient-fill arc for value visualization
 * - Animated pulse dot for "alive" feeling
 * - Color-coded by threshold (blue=cold, green=ok, amber=warm, red=hot)
 * - Compact display for chamber health cards
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

interface AnimatedGaugeProps {
  value: number;
  unit: string;
  label: string;
  min?: number;
  max?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: number;
  type?: 'temperature' | 'humidity';
}

function getGaugeColor(value: number, type: 'temperature' | 'humidity') {
  if (type === 'temperature') {
    if (value < 0) return '#3B82F6';     // freezing blue
    if (value <= 5) return '#06B6D4';     // cold cyan
    if (value <= 10) return '#10B981';    // optimal green
    if (value <= 15) return '#F59E0B';    // warm amber
    return '#EF4444';                      // hot red
  }
  // humidity
  if (value < 40) return '#F59E0B';       // too dry
  if (value <= 75) return '#10B981';      // optimal
  if (value <= 90) return '#3B82F6';      // humid
  return '#EF4444';                        // too humid
}

export default function AnimatedGauge({
  value, unit, label, min = 0, max = 100,
  icon, size = 64, type = 'temperature',
}: AnimatedGaugeProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const gaugeColor = getGaugeColor(value, type);
  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  const track = colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const iconName = icon || (type === 'temperature' ? 'thermometer-outline' : 'water-outline');

  return (
    <View style={[styles.container, { width: size + 48 }]}>
      <View style={[styles.gaugeWrap, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={track} strokeWidth={strokeWidth} fill="none"
          />
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={gaugeColor} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        {/* Center value */}
        <View style={styles.centerLabel}>
          <Text style={[styles.valueText, { color: gaugeColor, fontSize: size < 56 ? 13 : 16 }]}>
            {value.toFixed(1)}
          </Text>
          <Text style={[styles.unitText, { color: colors.textTertiary, fontSize: size < 56 ? 8 : 9 }]}>
            {unit}
          </Text>
        </View>
        {/* Pulse dot */}
        <RNAnimated.View style={[styles.pulseDot, {
          backgroundColor: gaugeColor,
          opacity: pulseAnim,
          top: 2,
          right: size < 56 ? 8 : 10,
        }]} />
      </View>
      {/* Label */}
      <View style={styles.labelRow}>
        <Ionicons name={iconName as any} size={12} color={gaugeColor} />
        <Text style={[styles.labelText, { color: colors.textSecondary }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
  },
  gaugeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontWeight: '800',
    fontFamily: FontFamily.extrabold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  unitText: {
    fontWeight: '600',
    fontFamily: FontFamily.semibold,
    marginTop: -2,
  },
  pulseDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
