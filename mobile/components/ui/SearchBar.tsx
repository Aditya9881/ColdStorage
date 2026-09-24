/**
 * SheetKosh — Animated Search Bar
 *
 * Reusable search input with icon, clear button, debounced callback.
 * Animates border color on focus.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  useColorScheme, Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, AnimDuration, Shadows } from '@/constants/Colors';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  debounceMs?: number;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  autoFocus = false,
  onSubmit,
}: SearchBarProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const inputRef = useRef<TextInput>(null);

  const focusAnim = useSharedValue(0);

  const handleFocus = () => {
    focusAnim.value = withTiming(1, { duration: AnimDuration.normal });
  };

  const handleBlur = () => {
    focusAnim.value = withTiming(0, { duration: AnimDuration.normal });
  };

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      [colors.border, colors.borderFocus]
    ),
  }));

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.card }, containerStyle]}>
      <Ionicons name="search-outline" size={18} color={colors.textTertiary} style={styles.icon} />
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    ...Shadows.sm,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.xs,
  },
});
