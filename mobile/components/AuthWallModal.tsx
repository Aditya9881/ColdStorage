/**
 * Premium Auth Wall Modal — ColdStorage Mobile
 *
 * Bottom-sheet style modal with gradient header, benefit icons,
 * and premium button styling for gated action prompts.
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface AuthWallModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
  actionMessage: string;
}

export default function AuthWallModal({
  visible, onClose, onLogin, onRegister, actionMessage,
}: AuthWallModalProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, tension: 50, friction: 10, useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible]);

  const benefits = [
    { icon: 'snow-outline', text: 'Book cold storage instantly', color: '#2D6A4F' },
    { icon: 'cart-outline', text: 'Buy produce via secure marketplace', color: '#7C3AED' },
    { icon: 'receipt-outline', text: 'Get digital eNWR receipts', color: '#0891B2' },
    { icon: 'notifications-outline', text: 'Real-time price & temperature alerts', color: '#F59E0B' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Header */}
            <LinearGradient
              colors={['#1B4332', '#2D6A4F']}
              style={styles.header}
            >
              <View style={styles.lockIcon}>
                <Ionicons name="lock-open-outline" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.headerTitle}>Unlock Full Access</Text>
              <Text style={styles.headerSubtitle}>
                {actionMessage || 'Create a free account to access all features'}
              </Text>
            </LinearGradient>

            {/* Benefits */}
            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsLabel}>WHAT YOU GET</Text>
              {benefits.map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <View style={[styles.benefitIcon, { backgroundColor: `${b.color}12` }]}>
                    <Ionicons name={b.icon as any} size={18} color={b.color} />
                  </View>
                  <Text style={styles.benefitText}>{b.text}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.registerBtn}
                onPress={onRegister}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#2D6A4F', '#40916C']}
                  style={styles.registerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.registerText}>Create Free Account</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginBtn}
                onPress={onLogin}
                activeOpacity={0.7}
              >
                <Text style={styles.loginText}>Already have an account? <Text style={styles.loginBold}>Sign In</Text></Text>
              </TouchableOpacity>
            </View>

            {/* Trust */}
            <View style={styles.trustRow}>
              <Ionicons name="shield-checkmark" size={14} color="#9CA3AF" />
              <Text style={styles.trustText}>No credit card required • Free for farmers</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handleBar: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 6,
  },

  // Header
  header: {
    padding: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  lockIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22, fontWeight: '800', color: '#FFFFFF',
    marginBottom: 6, letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', lineHeight: 20,
    paddingHorizontal: 16,
  },

  // Benefits
  benefitsSection: {
    padding: 20,
    paddingTop: 18,
    gap: 10,
  },
  benefitsLabel: {
    fontSize: 10, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 1.2, marginBottom: 4,
  },
  benefitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  benefitIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  benefitText: {
    fontSize: 14, fontWeight: '500', color: '#374151', flex: 1,
  },

  // Actions
  actions: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 14,
  },
  registerBtn: {
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8,
    elevation: 4,
  },
  registerGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16,
  },
  registerText: {
    fontSize: 16, fontWeight: '700', color: '#FFFFFF',
  },
  loginBtn: {
    alignItems: 'center', paddingVertical: 10,
  },
  loginText: {
    fontSize: 14, color: '#6B7280',
  },
  loginBold: {
    fontWeight: '700', color: '#2D6A4F',
  },

  // Trust
  trustRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 20, paddingBottom: 4,
  },
  trustText: {
    fontSize: 11, color: '#9CA3AF', fontWeight: '500',
  },
});
