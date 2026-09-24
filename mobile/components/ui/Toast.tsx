/**
 * ColdStorage Mobile — Toast Notification Component
 *
 * Non-blocking toast notification with auto-dismiss and swipe-to-dismiss.
 * Usage: wrap app with <ToastProvider>, call useToast().show()
 */
import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastConfig {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 3000
}

interface ToastContextType {
  show: (config: ToastConfig) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICON_MAP: Record<ToastType, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { name: 'checkmark-circle', color: '#059669' },
  error: { name: 'close-circle', color: '#DC2626' },
  info: { name: 'information-circle', color: '#0891B2' },
  warning: { name: 'warning', color: '#D97706' },
};

const BG_MAP: Record<ToastType, { light: string; dark: string }> = {
  success: { light: '#ECFDF5', dark: '#064E3B' },
  error: { light: '#FEF2F2', dark: '#7F1D1D' },
  info: { light: '#ECFEFF', dark: '#164E63' },
  warning: { light: '#FFFBEB', dark: '#78350F' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [toast, setToast] = useState<ToastConfig | null>(null);
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => setToast(null), 250);
  }, []);

  const show = useCallback((config: ToastConfig) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setToast(config);
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 150 });

    timeoutRef.current = setTimeout(() => {
      hide();
    }, config.duration || 3000);
  }, [hide]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const iconConfig = toast ? ICON_MAP[toast.type] : ICON_MAP.info;
  const bgColor = toast ? BG_MAP[toast.type][colorScheme] : BG_MAP.info[colorScheme];

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            animatedStyle,
            {
              backgroundColor: bgColor,
              borderColor: `${iconConfig.color}30`,
            },
          ]}
        >
          <Ionicons name={iconConfig.name} size={22} color={iconConfig.color} />
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {toast.title}
            </Text>
            {toast.message && (
              <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
                {toast.message}
              </Text>
            )}
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within <ToastProvider>');
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
    gap: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  message: {
    fontSize: FontSize.sm,
    marginTop: 2,
    lineHeight: 18,
  },
});
