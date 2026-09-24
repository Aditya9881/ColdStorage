/**
 * ColdStorage — Login Screen (Redesigned)
 *
 * Clean, high-contrast auth matching the new discover design system.
 * Light background, dark text, solid buttons — readable in sunlight.
 *
 * Flow:
 *   Step 1: Enter phone → "Send OTP"
 *   Step 2: Enter 6-digit OTP → auto-verify → logged in
 *   Alt:    "Login with Password" toggle
 *
 * All business logic preserved from original.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Keyboard, ScrollView, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { hapticLight, hapticError, hapticSuccess } from '@/lib/haptics';

type LoginStep = 'phone' | 'otp' | 'password';

export default function LoginScreen() {
  const { login, sendOtp, verifyOtp } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── State (preserved) ──
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
  const [showDevCreds, setShowDevCreds] = useState(false);

  const otpInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Countdown Timer (preserved) ──
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

  // ── Step config ──
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

  // ── Send OTP (preserved) ──
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

  // ── Verify OTP (preserved) ──
  const handleVerifyOtp = useCallback(async (otpValue: string) => {
    if (otpValue.length !== 6) return;
    Keyboard.dismiss();
    setError('');
    setLoading(true);
    hapticLight();
    try {
      await verifyOtp(phone, otpValue, 'LOGIN');
      hapticSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      setOtp('');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [phone, verifyOtp]);

  // ── OTP Input Change (preserved) ──
  const handleOtpChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(cleaned);
    if (cleaned.length === 6) {
      handleVerifyOtp(cleaned);
    }
  }, [handleVerifyOtp]);

  // ── Password Login (preserved) ──
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

  // ── Resend OTP (preserved) ──
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
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand Header ── */}
          <View style={s.brandArea}>
            <View style={s.brandRow}>
              <View style={s.brandMark}>
                <Ionicons name="snow-outline" size={18} color="#D3A03A" />
              </View>
              <View>
                <Text style={s.brandName}>SheetKosh</Text>
                <Text style={s.brandSub}>India's Cold Storage Platform</Text>
              </View>
            </View>
          </View>

          {/* ── Form Section ── */}
          <View style={s.formSection}>
            <Text style={s.title}>{stepConfig[step].title}</Text>
            <Text style={s.subtitle}>{stepConfig[step].help}</Text>

            {/* Error Banner */}
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
                      ref={phoneInputRef}
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

                {/* Send OTP Button */}
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

                {/* Divider */}
                <View style={s.dividerRow}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>or</Text>
                  <View style={s.dividerLine} />
                </View>

                {/* Password login toggle */}
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

                {/* Resend */}
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

                {/* Back */}
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

            {/* ── Dev Credentials (preserved) ── */}
            {__DEV__ && (
              <View style={s.devSection}>
                <TouchableOpacity
                  style={s.devToggle}
                  onPress={() => { setShowDevCreds(!showDevCreds); hapticLight(); }}
                >
                  <View style={s.devToggleLine} />
                  <View style={s.devTogglePill}>
                    <Ionicons name="code-slash-outline" size={10} color="#D9A441" />
                    <Text style={s.devToggleText}>DEV</Text>
                    <Ionicons name={showDevCreds ? 'chevron-up' : 'chevron-down'} size={10} color="#9AA39E" />
                  </View>
                  <View style={s.devToggleLine} />
                </TouchableOpacity>

                {showDevCreds && (
                  <View style={s.devCredsWrap}>
                    {[
                      { phone: '9800000001', label: 'Farmer', pw: 'test1234', icon: 'leaf-outline' as const },
                      { phone: '9900000001', label: 'Buyer', pw: 'test1234', icon: 'cart-outline' as const },
                    ].map((cred) => (
                      <TouchableOpacity
                        key={cred.phone}
                        style={s.devCredBtn}
                        onPress={() => {
                          setPhone(cred.phone);
                          setPassword(cred.pw);
                          setStep('password');
                          hapticLight();
                        }}
                      >
                        <View style={[s.devCredIcon, { backgroundColor: cred.label === 'Farmer' ? '#E8F5EE' : '#E8F5EE' }]}>
                          <Ionicons name={cred.icon} size={12} color="#14532D" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.devCredLabel}>{cred.label}</Text>
                          <Text style={s.devCredPhone}>{cred.phone} / {cred.pw}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#9AA39E" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Bottom: Register + Trust ── */}
          <View style={s.bottomArea}>
            <View style={s.registerRow}>
              <Text style={s.registerText}>New to SheetKosh? </Text>
              <TouchableOpacity onPress={() => { router.replace('/(auth)/register'); hapticLight(); }}>
                <Text style={s.registerLink}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* Trust Badges */}
            <View style={s.trustRow}>
              <View style={s.trustBadge}>
                <Ionicons name="shield-checkmark-outline" size={12} color="#9AA39E" />
                <Text style={s.trustText}>Bank-grade security</Text>
              </View>
              <View style={s.trustDot} />
              <View style={s.trustBadge}>
                <Ionicons name="checkmark-circle-outline" size={12} color="#9AA39E" />
                <Text style={s.trustText}>FSSAI Verified</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// STYLES — Clean, high-contrast design system
// ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F5',
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // ── Brand ──
  brandArea: {
    paddingTop: 20,
    paddingBottom: 8,
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B2520',
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 12,
    color: '#5F6B66',
    fontWeight: '500',
    marginTop: 1,
  },

  // ── Form Section ──
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E8ECE9',
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0B2520',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: '#5F6B66',
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 22,
    lineHeight: 20,
  },

  // ── Error ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },

  // ── Fields ──
  fieldWrap: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5F6B66',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8E4',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 8,
    backgroundColor: '#F2F5F0',
    gap: 10,
    minHeight: 54,
  },
  inputRowFocused: {
    borderColor: '#14532D',
    backgroundColor: '#FFFFFF',
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countryFlag: {
    fontSize: 16,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B2520',
  },
  inputSep: {
    width: 1,
    height: 22,
    backgroundColor: '#D4DAD6',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0B2520',
    fontWeight: '600',
    padding: 0,
    margin: 0,
  },

  // ── OTP ──
  otpWrap: {
    marginBottom: 18,
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8E4',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 16 : 10,
    backgroundColor: '#F2F5F0',
    fontSize: 24,
    fontWeight: '700',
    color: '#0B2520',
    textAlign: 'center',
    letterSpacing: 10,
    minHeight: 58,
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  verifyingText: {
    fontSize: 14,
    color: '#14532D',
    fontWeight: '600',
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  resendTimer: {
    fontSize: 13,
    color: '#5F6B66',
    fontWeight: '500',
  },
  resendBold: {
    fontWeight: '800',
    color: '#0B2520',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14532D',
  },

  // ── Buttons ──
  primaryBtn: {
    backgroundColor: '#14532D',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    minHeight: 54,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D4E8DC',
    backgroundColor: '#F0F8F3',
    minHeight: 52,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14532D',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8E4',
  },
  dividerText: {
    fontSize: 12,
    color: '#9AA39E',
    fontWeight: '600',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  backText: {
    fontSize: 14,
    color: '#5F6B66',
    fontWeight: '600',
  },

  // ── Bottom ──
  bottomArea: {
    alignItems: 'center',
    marginTop: 28,
    paddingBottom: 16,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  registerText: {
    fontSize: 14,
    color: '#5F6B66',
    fontWeight: '500',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14532D',
    textDecorationLine: 'underline',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    color: '#9AA39E',
    fontWeight: '500',
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#C4CBC7',
  },

  // ── Dev (preserved) ──
  devSection: {
    marginTop: 18,
  },
  devToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devToggleLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8E4',
  },
  devTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E4C4',
    backgroundColor: '#FFF9ED',
  },
  devToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D9A441',
  },
  devCredsWrap: {
    marginTop: 10,
    gap: 6,
  },
  devCredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F2F5F0',
    borderWidth: 1,
    borderColor: '#E2E8E4',
  },
  devCredIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devCredLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B2520',
  },
  devCredPhone: {
    fontSize: 11,
    color: '#9AA39E',
    marginTop: 1,
  },
});
