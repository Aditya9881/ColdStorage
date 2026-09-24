/**
 * SignInModal — Auth modal for sign-in flow
 *
 * 3 internal steps: phone → OTP → password
 * All login logic (OTP send/verify, password login) preserved.
 * Rendered as a centered modal overlay via AuthModalShell.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Keyboard, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { hapticLight, hapticError, hapticSuccess } from '@/lib/haptics';
import AuthModalShell from './AuthModalShell';

type LoginStep = 'phone' | 'otp' | 'password';

interface SignInModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToSignUp: () => void;
}

export default function SignInModal({
  visible,
  onClose,
  onSwitchToSignUp,
}: SignInModalProps) {
  const { login, sendOtp, verifyOtp } = useAuth();

  // ── State ──
  const [step, setStep] = useState<LoginStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const otpInputRef = useRef<TextInput>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setStep('phone');
      setOtp('');
      setPassword('');
      setError('');
      setShowPassword(false);
      setCountdown(0);
    }
  }, [visible]);

  // ── Countdown Timer ──
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [countdown]);

  const stepConfig: Record<LoginStep, { title: string; help: string }> = {
    phone: {
      title: 'Welcome Back',
      help: 'Enter your registered phone number',
    },
    otp: {
      title: 'Verify OTP',
      help: `Enter the 6-digit code sent to +91 ${phone}`,
    },
    password: {
      title: 'Sign In',
      help: 'Use your phone number and password',
    },
  };

  // ── Send OTP ──
  const handleSendOtp = useCallback(async () => {
    Keyboard.dismiss();
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      hapticError();
      return;
    }
    setError('');
    setLoading(true);
    hapticLight();
    try {
      const result = await sendOtp(phone, 'LOGIN');
      setStep('otp');
      setCountdown(30);
      hapticSuccess();
      if (__DEV__ && (result as any).devOtp) {
        setOtp((result as any).devOtp);
      }
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [phone, sendOtp]);

  // ── Verify OTP ──
  const handleVerifyOtp = useCallback(async (otpValue: string) => {
    if (otpValue.length !== 6) return;
    Keyboard.dismiss();
    setError('');
    setLoading(true);
    hapticLight();
    try {
      await verifyOtp(phone, otpValue, 'LOGIN');
      hapticSuccess();
      // Auth context will trigger navigation via _layout.tsx
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      setOtp('');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [phone, verifyOtp]);

  const handleOtpChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(cleaned);
    if (cleaned.length === 6) {
      handleVerifyOtp(cleaned);
    }
  }, [handleVerifyOtp]);

  // ── Password Login ──
  const handlePasswordLogin = useCallback(async () => {
    Keyboard.dismiss();
    if (!phone || !password) {
      setError('Please enter phone and password');
      hapticError();
      return;
    }
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      hapticError();
      return;
    }
    setError('');
    setLoading(true);
    hapticLight();
    try {
      await login(phone, password);
      hapticSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [phone, password, login]);

  // ── Resend OTP ──
  const handleResendOtp = useCallback(async () => {
    if (countdown > 0) return;
    setError('');
    setLoading(true);
    hapticLight();
    try {
      await sendOtp(phone, 'LOGIN');
      setCountdown(30);
      hapticSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [phone, countdown, sendOtp]);

  return (
    <AuthModalShell visible={visible} onClose={onClose}>
      {/* ── Brand ── */}
      <View style={s.brandArea}>
        <View style={s.brandMark}>
          <Ionicons name="snow-outline" size={16} color="#D3A03A" />
        </View>
        <Text style={s.brandName}>SheetKosh</Text>
        <Text style={s.brandSub}>India's Cold Storage Platform</Text>
      </View>

      {/* ── Title ── */}
      <Text style={s.title}>{stepConfig[step].title}</Text>
      <Text style={s.subtitle}>{stepConfig[step].help}</Text>

      {/* ── Error ── */}
      {error ? (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ── PHONE STEP ── */}
      {step === 'phone' && (
        <>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>PHONE NUMBER</Text>
            <View style={[s.inputRow, phoneFocused && s.inputRowFocused]}>
              <View style={s.countryBadge}>
                <Text style={s.countryFlag}>🇮🇳</Text>
                <Text style={s.countryCode}>+91</Text>
              </View>
              <View style={s.inputSep} />
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter mobile number"
                placeholderTextColor="#9AA39E"
                keyboardType="phone-pad"
                maxLength={10}
                editable={!loading}
                autoFocus
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
            onPress={handleSendOtp}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={s.primaryBtnText}>Get OTP</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </>
            )}
          </TouchableOpacity>

          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          <TouchableOpacity
            style={s.outlineBtn}
            onPress={() => { setStep('password'); setError(''); hapticLight(); }}
            activeOpacity={0.7}
          >
            <Ionicons name="lock-closed-outline" size={16} color="#14532D" />
            <Text style={s.outlineBtnText}>Login with Password</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── OTP STEP ── */}
      {step === 'otp' && (
        <>
          <View style={s.otpWrap}>
            <TextInput
              ref={otpInputRef}
              style={s.otpInput}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="● ● ● ● ● ●"
              placeholderTextColor="#C4CBC7"
              autoFocus
              editable={!loading}
            />
          </View>

          {loading && (
            <View style={s.verifyingRow}>
              <ActivityIndicator size="small" color="#14532D" />
              <Text style={s.verifyingText}>Verifying...</Text>
            </View>
          )}

          <View style={s.resendRow}>
            {countdown > 0 ? (
              <Text style={s.resendTimer}>
                Resend code in <Text style={s.resendBold}>{countdown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                <Text style={s.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={s.backRow}
            onPress={() => { setStep('phone'); setOtp(''); setError(''); hapticLight(); }}
          >
            <Ionicons name="arrow-back" size={14} color="#5F6B66" />
            <Text style={s.backText}>Change phone number</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── PASSWORD STEP ── */}
      {step === 'password' && (
        <>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>PHONE NUMBER</Text>
            <View style={[s.inputRow, phoneFocused && s.inputRowFocused]}>
              <View style={s.countryBadge}>
                <Text style={s.countryFlag}>🇮🇳</Text>
                <Text style={s.countryCode}>+91</Text>
              </View>
              <View style={s.inputSep} />
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter mobile number"
                placeholderTextColor="#9AA39E"
                keyboardType="phone-pad"
                maxLength={10}
                editable={!loading}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
              />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>PASSWORD</Text>
            <View style={[s.inputRow, passFocused && s.inputRowFocused]}>
              <Ionicons name="lock-closed-outline" size={17} color={passFocused ? '#14532D' : '#9AA39E'} />
              <TextInput
                style={s.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#9AA39E"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
              <TouchableOpacity
                onPress={() => { setShowPassword(!showPassword); hapticLight(); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9AA39E" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
            onPress={handlePasswordLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={s.primaryBtnText}>Sign In</Text>
                <Ionicons name="log-in-outline" size={18} color="#FFF" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.backRow}
            onPress={() => { setStep('phone'); setError(''); hapticLight(); }}
          >
            <Ionicons name="arrow-back" size={14} color="#5F6B66" />
            <Text style={s.backText}>Login with OTP instead</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Footer ── */}
      <View style={s.footer}>
        <View style={s.registerRow}>
          <Text style={s.registerText}>New to SheetKosh? </Text>
          <TouchableOpacity onPress={() => { onSwitchToSignUp(); hapticLight(); }}>
            <Text style={s.registerLink}>Create Account</Text>
          </TouchableOpacity>
        </View>

        <View style={s.trustRow}>
          <View style={s.trustBadge}>
            <Ionicons name="shield-checkmark-outline" size={11} color="#9AA39E" />
            <Text style={s.trustText}>Bank-grade security</Text>
          </View>
          <View style={s.trustDot} />
          <View style={s.trustBadge}>
            <Ionicons name="checkmark-circle-outline" size={11} color="#9AA39E" />
            <Text style={s.trustText}>FSSAI Verified</Text>
          </View>
        </View>
      </View>
    </AuthModalShell>
  );
}

// ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Brand
  brandArea: {
    alignItems: 'center',
    marginBottom: 20,
    paddingRight: 32, // offset for close X
  },
  brandMark: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: '#F2F5F0', borderWidth: 1, borderColor: '#E2E8E4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  brandName: {
    fontSize: 20, fontWeight: '800', color: '#0B2520', letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 11, color: '#9AA39E', fontWeight: '500', marginTop: 2,
  },

  // Title
  title: {
    fontSize: 22, fontWeight: '800', color: '#0B2520', letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13, color: '#5F6B66', fontWeight: '500', marginTop: 4, marginBottom: 18, lineHeight: 19,
  },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { fontSize: 13, color: '#991B1B', flex: 1, lineHeight: 18, fontWeight: '500' },

  // Fields
  fieldWrap: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 11, fontWeight: '800', color: '#5F6B66', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8E4', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 13 : 7,
    backgroundColor: '#F2F5F0', gap: 8, minHeight: 50,
  },
  inputRowFocused: { borderColor: '#14532D', backgroundColor: '#FFFFFF' },
  countryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countryFlag: { fontSize: 14 },
  countryCode: { fontSize: 14, fontWeight: '700', color: '#0B2520' },
  inputSep: { width: 1, height: 20, backgroundColor: '#D4DAD6' },
  input: { flex: 1, fontSize: 15, color: '#0B2520', fontWeight: '600', padding: 0, margin: 0 },

  // OTP
  otpWrap: { marginBottom: 16 },
  otpInput: {
    borderWidth: 1.5, borderColor: '#E2E8E4', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 8,
    backgroundColor: '#F2F5F0', fontSize: 22, fontWeight: '700', color: '#0B2520',
    textAlign: 'center', letterSpacing: 10, minHeight: 54,
  },
  verifyingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 12,
  },
  verifyingText: { fontSize: 13, color: '#14532D', fontWeight: '600' },
  resendRow: { alignItems: 'center', marginBottom: 12 },
  resendTimer: { fontSize: 13, color: '#5F6B66', fontWeight: '500' },
  resendBold: { fontWeight: '800', color: '#0B2520' },
  resendLink: { fontSize: 14, fontWeight: '700', color: '#14532D' },

  // Buttons
  primaryBtn: {
    backgroundColor: '#14532D', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, marginBottom: 12, minHeight: 52,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#D4E8DC', backgroundColor: '#F0F8F3', minHeight: 50,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700', color: '#14532D' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8E4' },
  dividerText: { fontSize: 12, color: '#9AA39E', fontWeight: '600' },
  backRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, marginTop: 4,
  },
  backText: { fontSize: 13, color: '#5F6B66', fontWeight: '600' },

  // Footer
  footer: { alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E8ECE9' },
  registerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  registerText: { fontSize: 13, color: '#5F6B66', fontWeight: '500' },
  registerLink: { fontSize: 13, fontWeight: '800', color: '#14532D', textDecorationLine: 'underline' },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trustText: { fontSize: 10, color: '#9AA39E', fontWeight: '500' },
  trustDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#C4CBC7' },
});
