/**
 * ColdStorage Mobile — Bottom Sheet Component
 *
 * Animated bottom sheet using react-native-reanimated.
 * Supports backdrop, title, and dismiss on backdrop press.
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPRING_CONFIG = { damping: 25, stiffness: 250, mass: 0.5 };

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Height as percentage of screen (0-100), default 50 */
  height?: number;
  children: React.ReactNode;
  showHandle?: boolean;
  scrollable?: boolean;
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  height = 50,
  children,
  showHandle = true,
  scrollable = false,
}: BottomSheetProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const sheetHeight = (SCREEN_HEIGHT * height) / 100;
  const translateY = useSharedValue(sheetHeight);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(sheetHeight, SPRING_CONFIG);
      backdropOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const dismiss = () => {
    translateY.value = withSpring(sheetHeight, SPRING_CONFIG);
    backdropOpacity.value = withTiming(0, { duration: 150 });
    setTimeout(onClose, 200);
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const ContentWrapper = scrollable ? ScrollView : View;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              height: sheetHeight,
              backgroundColor: colors.card,
              borderTopLeftRadius: BorderRadius.xl,
              borderTopRightRadius: BorderRadius.xl,
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Drag Handle */}
            {showHandle && (
              <View style={styles.handleWrapper}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>
            )}

            {/* Title */}
            {title && (
              <View style={[styles.titleRow, { borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <TouchableOpacity onPress={dismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={[styles.closeBtn, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Content */}
            <ContentWrapper
              style={styles.content}
              {...(scrollable ? { showsVerticalScrollIndicator: false, bounces: false } : {})}
            >
              {children}
            </ContentWrapper>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  handleWrapper: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    flex: 1,
  },
  closeBtn: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
});
