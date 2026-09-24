/**
 * AuthModalShell — Base modal wrapper for auth flows
 *
 * Centered overlay with:
 * - Dark scrim background
 * - White rounded card (max-width on tablets)
 * - Close "X" in top-right corner
 * - KeyboardAvoidingView for input handling
 * - ScrollView for overflow content
 * - Android back button support via onRequestClose
 */
import React from 'react';
import {
  View, StyleSheet, Modal, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

interface AuthModalShellProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** If true, closing shows "Discard changes?" confirmation */
  showCloseConfirm?: boolean;
}

export default function AuthModalShell({
  visible,
  onClose,
  children,
  showCloseConfirm = false,
}: AuthModalShellProps) {
  const insets = useSafeAreaInsets();

  const handleClose = () => {
    if (showCloseConfirm) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved progress. Are you sure you want to close?',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.scrim}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.card,
              {
                marginTop: insets.top + 20,
                marginBottom: insets.bottom + 20,
              },
            ]}
          >
            {/* Close X */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color="#5F6B66" />
            </TouchableOpacity>

            {/* Scrollable content */}
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              bounces={false}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(11, 37, 32, 0.50)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    width: '100%',
    maxHeight: SCREEN_H * 0.90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: Math.min(SCREEN_W - 32, 420),
    maxHeight: SCREEN_H * 0.85,
    overflow: 'hidden',
    shadowColor: '#0B2520',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#E8ECE9',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F2F5F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8E4',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
});
