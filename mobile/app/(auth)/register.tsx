/**
 * Register Screen — ColdStorage Mobile (Redesigned)
 *
 * Clean, high-contrast design matching the new discover page.
 * Light background, dark text, solid buttons.
 *
 * Multi-step registration wizard:
 * Step 1: Role selection + Basic info (name, phone, password)
 * Step 2: Address & Identity (Aadhaar, PAN, address)
 * Step 3: Role-specific KYC (farmer: land, buyer: GST/business)
 * Step 4: Document Upload & OTP verification
 *
 * All business logic preserved from original.
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
  Alert, Image, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { hapticLight, hapticError, hapticSuccess } from '@/lib/haptics';

// ── Role Colors (aligned with discover design) ──
const ROLE_META: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; iconBg: string; iconColor: string; activeBorder: string; activeBg: string; label: string; desc: string }> = {
  FARMER: {
    icon: 'leaf-outline',
    iconBg: '#E8F5EE',
    iconColor: '#14532D',
    activeBorder: '#14532D',
    activeBg: '#E8F5EE',
    label: 'Farmer',
    desc: 'Deposit & manage produce',
  },
  BUYER: {
    icon: 'cart-outline',
    iconBg: '#FFF7E8',
    iconColor: '#B8860B',
    activeBorder: '#B8860B',
    activeBg: '#FFF7E8',
    label: 'Buyer',
    desc: 'Purchase from marketplace',
  },
  OWNER: {
    icon: 'business-outline',
    iconBg: '#EEF4FF',
    iconColor: '#3B6FCF',
    activeBorder: '#3B6FCF',
    activeBg: '#EEF4FF',
    label: 'Owner',
    desc: 'Manage cold storage',
  },
};

const BUSINESS_TYPES = ['Wholesaler', 'Retailer', 'Processor', 'Exporter', 'Commission Agent', 'Other'];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register, sendOtp, verifyOtp } = useAuth();
  const router = useRouter();

  // Form state (all preserved)
  const [role, setRole] = useState<'FARMER' | 'BUYER' | 'OWNER'>('FARMER');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');

  // Phone OTP verification
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Step 2 fields
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // Step 3 — Farmer KYC
  const [villageName, setVillageName] = useState('');
  const [landHolding, setLandHolding] = useState('');
  const [khasraNumber, setKhasraNumber] = useState('');

  // Step 3 — Buyer KYC
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Step 3 — Owner KYC
  const [csRegistrationNumber, setCsRegistrationNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [csRegistrationPhotoAsset, setCsRegistrationPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fssaiPhotoAsset, setFssaiPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Step 4 — Documents
  const [aadhaarPhotoAsset, setAadhaarPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [gstPhotoAsset, setGstPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [panPhotoAsset, setPanPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Aadhaar Verification OTP State
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [isVerifyingAadhaar, setIsVerifyingAadhaar] = useState(false);
  const [showAadhaarOtpInput, setShowAadhaarOtpInput] = useState(false);

  const totalSteps = 4;

  // ── OTP Countdown (preserved) ──
  React.useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setInterval(() => setOtpCountdown(prev => prev <= 1 ? 0 : prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [otpCountdown]);

  // ── Phone OTP (preserved) ──
  const handleSendPhoneOtp = async () => {
    if (!phone || phone.length !== 10) { setError('Enter a valid 10-digit phone'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await sendOtp(phone, 'REGISTER');
      setOtpSent(true);
      setOtpCountdown(30);
      hapticSuccess();
      if (__DEV__ && result.devOtp) {
        setPhoneOtp(result.devOtp);
        Alert.alert('OTP Auto-Filled (Dev)', `Your OTP is: ${result.devOtp}\n\nIt has been auto-filled. Tap "Verify" to proceed.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
      hapticError();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.length !== 6) { setError('Enter 6-digit OTP'); return; }
    setError('');
    setLoading(true);
    try {
      await verifyOtp(phone, phoneOtp, 'REGISTER');
      setPhoneVerified(true);
      hapticSuccess();
      Alert.alert('Phone Verified!', 'Your phone number has been verified successfully.');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      setPhoneOtp('');
      hapticError();
    } finally {
      setLoading(false);
    }
  };

  // ── Aadhaar OTP (preserved) ──
  const sendAadhaarOtp = () => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      setError('Enter a valid 12-digit Aadhaar number first');
      return;
    }
    setError('');
    setIsVerifyingAadhaar(true);
    console.log(`[MSG91] Sending Aadhaar verification OTP to mobile linked with Aadhaar: ${aadhaarNumber}`);
    setTimeout(() => {
      setIsVerifyingAadhaar(false);
      setShowAadhaarOtpInput(true);
      Alert.alert('Verification OTP Sent', 'An OTP has been sent to your Aadhaar-registered mobile number.');
    }, 1000);
  };

  const confirmAadhaarOtp = () => {
    if (aadhaarOtp === '123456' || aadhaarOtp.length === 6) {
      setAadhaarVerified(true);
      setShowAadhaarOtpInput(false);
      setError('');
      Alert.alert('Verification Success', 'Your Aadhaar number has been verified successfully!');
    } else {
      setError('Invalid OTP. Please enter any 6-digit OTP (e.g., 123456) to verify.');
    }
  };

  // ── Document Selection (preserved) ──
  const handlePickImage = async (docType: 'aadhaar' | 'gst' | 'pan', source: 'camera' | 'gallery') => {
    setError('');
    try {
      const { status } = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        setError(`Permission to access the ${source} was denied`);
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
      };

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (docType === 'aadhaar') setAadhaarPhotoAsset(asset);
        if (docType === 'gst') setGstPhotoAsset(asset);
        if (docType === 'pan') setPanPhotoAsset(asset);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to select image');
    }
  };

  // ── Validation (preserved) ──
  const validateStep1 = () => {
    if (!fullName.trim()) return 'Full name is required';
    if (!phone || phone.length !== 10) return 'Enter a valid 10-digit phone number';
    if (!phoneVerified) return 'Please verify your phone number with OTP first';
    if (!password || password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const validateStep2 = () => {
    if (!addressLine1.trim()) return 'Address is required';
    if (!city.trim()) return 'City is required';
    if (!state.trim()) return 'State is required';
    if (!pincode || pincode.length !== 6) return 'Enter a valid 6-digit pincode';
    if (!aadhaarNumber || aadhaarNumber.length !== 12) return 'Enter a valid 12-digit Aadhaar number';
    return null;
  };

  const validateStep3 = () => {
    if (role === 'FARMER') {
      if (!villageName.trim()) return 'Village name is required';
    } else if (role === 'BUYER') {
      if (!businessName.trim()) return 'Business name is required';
      if (!businessType) return 'Select a business type';
      if (!gstNumber || gstNumber.length !== 15) return 'Enter a valid 15-digit GST number';
    } else if (role === 'OWNER') {
      if (!csRegistrationNumber.trim()) return 'Cold Storage registration number is required';
      if (!fssaiNumber.trim()) return 'FSSAI license number is required';
    }
    return null;
  };

  const validateStep4 = () => {
    if (role === 'FARMER') {
      if (!aadhaarVerified) return 'Please verify your Aadhaar number using OTP first';
      if (!aadhaarPhotoAsset) return 'Please upload Aadhaar Card photo';
    } else if (role === 'BUYER') {
      if (!gstPhotoAsset) return 'Please upload original GST Certificate image';
    } else if (role === 'OWNER') {
      if (!aadhaarPhotoAsset) return 'Please upload Aadhaar Card photo';
      if (!csRegistrationPhotoAsset) return 'Please upload Cold Storage Registration Certificate';
      if (!fssaiPhotoAsset) return 'Please upload FSSAI License document';
    }
    return null;
  };

  const handleNext = () => {
    let err: string | null = null;
    if (step === 1) err = validateStep1();
    if (step === 2) err = validateStep2();
    if (step === 3) err = validateStep3();
    if (err) { setError(err); return; }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    if (step > 1) setStep(step - 1);
  };

  // ── Register (preserved) ──
  async function handleRegister() {
    const err = validateStep4();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);

    try {
      const kycDocs = [];
      if (aadhaarPhotoAsset) {
        kycDocs.push({ asset: aadhaarPhotoAsset, type: 'AADHAAR_FRONT', number: aadhaarNumber });
      }
      if (role === 'BUYER') {
        if (gstPhotoAsset) {
          kycDocs.push({ asset: gstPhotoAsset, type: 'GST_CERTIFICATE', number: gstNumber });
        }
        if (panPhotoAsset) {
          kycDocs.push({ asset: panPhotoAsset, type: 'PAN_CARD', number: panNumber });
        }
      }
      if (role === 'OWNER') {
        if (csRegistrationPhotoAsset) {
          kycDocs.push({ asset: csRegistrationPhotoAsset, type: 'BUSINESS_LICENSE', number: csRegistrationNumber });
        }
        if (fssaiPhotoAsset) {
          kycDocs.push({ asset: fssaiPhotoAsset, type: 'OTHER', number: fssaiNumber });
        }
      }

      await register({
        fullName, phone, password, role,
        email: email || undefined,
        addressLine1, city, state, pincode,
        district: district || undefined,
        aadhaarNumber: aadhaarNumber || undefined,
        panNumber: panNumber || undefined,
        villageName: villageName || undefined,
        landHolding: landHolding || undefined,
        khasraNumber: khasraNumber || undefined,
        gstNumber: gstNumber || undefined,
        businessName: businessName || undefined,
        businessType: businessType || undefined,
        csRegistrationNumber: csRegistrationNumber || undefined,
        fssaiNumber: fssaiNumber || undefined,
        kycDocs,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const roleMeta = ROLE_META[role];

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <KeyboardAvoidingView style={st.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.scroll}
          keyboardShouldPersistTaps="always"
        >
          {/* ── Top Bar ── */}
          <View style={st.topBar}>
            {step > 1 ? (
              <TouchableOpacity style={st.topBackBtn} onPress={handleBack}>
                <Ionicons name="arrow-back" size={18} color="#0B2520" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={st.topBackBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={18} color="#0B2520" />
              </TouchableOpacity>
            )}
            <View style={st.topBrand}>
              <View style={st.topBrandMark}>
                <Ionicons name="snow-outline" size={14} color="#D3A03A" />
              </View>
              <Text style={st.topBrandName}>SheetKosh</Text>
            </View>
            <Text style={st.topStepText}>Step {step}/{totalSteps}</Text>
          </View>

          {/* ── Progress Bar ── */}
          <View style={st.progressBar}>
            <View style={[st.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
          </View>

          {/* ── Form Card ── */}
          <View style={st.formCard}>
            <Text style={st.formTitle}>
              {step === 1 ? 'Create Your Account' :
               step === 2 ? 'Address & Identity' :
               step === 3 ? (role === 'FARMER' ? 'Farmer Details' : role === 'BUYER' ? 'Business Details' : 'Owner Details') :
               'Document Upload'}
            </Text>

            {/* ═══ STEP 1 ═══ */}
            {step === 1 && (
              <View>
                <Text style={st.sectionLabel}>Choose your role</Text>

                {/* Role Cards */}
                <View style={st.roleRow}>
                  {(['FARMER', 'BUYER', 'OWNER'] as const).map(r => {
                    const meta = ROLE_META[r];
                    const isActive = role === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[
                          st.roleCard,
                          isActive && { borderColor: meta.activeBorder, backgroundColor: meta.activeBg },
                        ]}
                        onPress={() => setRole(r)}
                        activeOpacity={0.8}
                      >
                        <View style={[st.roleIconBox, { backgroundColor: isActive ? meta.activeBorder : '#F2F5F0' }]}>
                          <Ionicons name={meta.icon} size={22} color={isActive ? '#FFF' : '#9AA39E'} />
                        </View>
                        <Text style={[st.roleLabel, isActive && { color: meta.activeBorder }]}>{meta.label}</Text>
                        <Text style={st.roleDesc}>{meta.desc}</Text>
                        {isActive && (
                          <View style={[st.roleCheck, { backgroundColor: meta.activeBorder }]}>
                            <Ionicons name="checkmark" size={12} color="#FFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={st.sectionLabel}>Basic Information</Text>
                <Field icon="person-outline" label="Full Name *" value={fullName} onChangeText={setFullName} placeholder="e.g. Ramesh Kumar" />
                <Field icon="call-outline" label="Phone Number *" value={phone} onChangeText={(t: string) => { setPhone(t); setPhoneVerified(false); setOtpSent(false); }} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />

                {/* Phone OTP (preserved logic, reskinned) */}
                {phone.length === 10 && !phoneVerified && (
                  <View style={{ marginTop: -6, marginBottom: 14 }}>
                    {!otpSent ? (
                      <TouchableOpacity
                        style={st.verifyPhoneBtn}
                        onPress={handleSendPhoneOtp}
                        disabled={loading}
                      >
                        <Ionicons name="paper-plane-outline" size={16} color="#14532D" />
                        <Text style={st.verifyPhoneBtnText}>
                          {loading ? 'Sending...' : 'Verify Phone with OTP'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <TextInput
                            style={st.otpMiniInput}
                            value={phoneOtp}
                            onChangeText={(t) => setPhoneOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="Enter OTP"
                            placeholderTextColor="#9AA39E"
                            keyboardType="number-pad"
                            maxLength={6}
                          />
                          <TouchableOpacity
                            style={st.otpVerifyBtn}
                            onPress={handleVerifyPhoneOtp}
                            disabled={loading}
                          >
                            <Text style={st.otpVerifyBtnText}>
                              {loading ? '...' : 'Verify'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                          {otpCountdown > 0 ? (
                            <Text style={{ fontSize: 12, color: '#9AA39E' }}>Resend in {otpCountdown}s</Text>
                          ) : (
                            <TouchableOpacity onPress={handleSendPhoneOtp}>
                              <Text style={{ fontSize: 12, color: '#14532D', fontWeight: '700' }}>Resend OTP</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {phoneVerified && (
                  <View style={st.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" />
                    <Text style={st.verifiedBadgeText}>Phone Verified</Text>
                  </View>
                )}

                <Field icon="lock-closed-outline" label="Password *" value={password} onChangeText={setPassword} placeholder="Min. 6 characters" secureTextEntry />
                <Field icon="shield-checkmark-outline" label="Confirm Password *" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat password" secureTextEntry />
                <Field icon="mail-outline" label="Email (optional)" value={email} onChangeText={setEmail} placeholder="name@email.com" keyboardType="email-address" />
              </View>
            )}

            {/* ═══ STEP 2 ═══ */}
            {step === 2 && (
              <View>
                <View style={st.infoNotice}>
                  <Ionicons name="shield-checkmark" size={18} color="#14532D" />
                  <Text style={st.infoNoticeText}>
                    Identity verification helps prevent fraud and enables traceability for all transactions.
                  </Text>
                </View>

                <Field icon="home-outline" label="Address *" value={addressLine1} onChangeText={setAddressLine1} placeholder="House/Shop No., Street, Area" />
                <View style={st.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Field icon="business-outline" label="City *" value={city} onChangeText={setCity} placeholder="e.g. Agra" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field icon="map-outline" label="District" value={district} onChangeText={setDistrict} placeholder="e.g. Agra" />
                  </View>
                </View>
                <View style={st.fieldRow}>
                  <View style={{ flex: 1.5 }}>
                    <Field icon="location-outline" label="State *" value={state} onChangeText={setState} placeholder="e.g. Uttar Pradesh" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field icon="pin-outline" label="Pincode *" value={pincode} onChangeText={setPincode} placeholder="6 digits" keyboardType="number-pad" maxLength={6} />
                  </View>
                </View>

                <View style={st.divider} />
                <Text style={st.sectionLabel}>Identity Verification</Text>

                <Field icon="card-outline" label="Aadhaar Number *" value={aadhaarNumber} onChangeText={setAadhaarNumber} placeholder="12-digit Aadhaar number" keyboardType="number-pad" maxLength={12} />
                <Field icon="document-text-outline" label="PAN Number (optional)" value={panNumber} onChangeText={(t) => setPanNumber(t.toUpperCase())} placeholder="e.g. ABCDE1234F" autoCapitalize="characters" maxLength={10} />
              </View>
            )}

            {/* ═══ STEP 3 ═══ */}
            {step === 3 && (
              <View>
                {role === 'FARMER' ? (
                  <>
                    <View style={st.infoNotice}>
                      <Ionicons name="information-circle" size={18} color="#14532D" />
                      <Text style={st.infoNoticeText}>
                        Land details help verify your farming background and enable faster facility booking.
                      </Text>
                    </View>
                    <Field icon="trail-sign-outline" label="Village / Town *" value={villageName} onChangeText={setVillageName} placeholder="e.g. Kakori, Lucknow" />
                    <Field icon="resize-outline" label="Land Holding (optional)" value={landHolding} onChangeText={setLandHolding} placeholder="e.g. 5 acres" />
                    <Field icon="receipt-outline" label="Khasra / Land Record Number (optional)" value={khasraNumber} onChangeText={setKhasraNumber} placeholder="e.g. 123/45" />
                  </>
                ) : role === 'BUYER' ? (
                  <>
                    <View style={st.infoNotice}>
                      <Ionicons name="information-circle" size={18} color="#14532D" />
                      <Text style={st.infoNoticeText}>
                        Business details are required for invoicing and GST compliance. This helps prevent fraudulent transactions.
                      </Text>
                    </View>
                    <Field icon="briefcase-outline" label="Business / Firm Name *" value={businessName} onChangeText={setBusinessName} placeholder="e.g. Priya Enterprises" />

                    <Text style={st.fieldLabel}>Business Type *</Text>
                    <View style={st.typeGrid}>
                      {BUSINESS_TYPES.map(type => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            st.typeChip,
                            businessType === type && st.typeChipActive,
                          ]}
                          onPress={() => setBusinessType(type)}
                        >
                          <Text style={[
                            st.typeChipText,
                            businessType === type && st.typeChipTextActive,
                          ]}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Field icon="document-attach-outline" label="GST Number *" value={gstNumber} onChangeText={(t) => setGstNumber(t.toUpperCase())} placeholder="e.g. 09ABCDE1234F1Z5" autoCapitalize="characters" maxLength={15} />
                  </>
                ) : (
                  <>
                    <View style={st.infoNotice}>
                      <Ionicons name="information-circle" size={18} color="#14532D" />
                      <Text style={st.infoNoticeText}>
                        Your Cold Storage Registration and FSSAI license are required for facility verification and food safety compliance.
                      </Text>
                    </View>
                    <Field icon="business-outline" label="CS Registration Number *" value={csRegistrationNumber} onChangeText={setCsRegistrationNumber} placeholder="Cold Storage registration number" />
                    <Field icon="document-text-outline" label="FSSAI License Number *" value={fssaiNumber} onChangeText={setFssaiNumber} placeholder="14-digit FSSAI number" maxLength={20} />
                    <Field icon="briefcase-outline" label="Business / Firm Name" value={businessName} onChangeText={setBusinessName} placeholder="e.g. PK Cold Storage Pvt. Ltd." />
                    <Field icon="document-attach-outline" label="GST Number" value={gstNumber} onChangeText={(t) => setGstNumber(t.toUpperCase())} placeholder="e.g. 09ABCDE1234F1Z5" autoCapitalize="characters" maxLength={15} />
                  </>
                )}
              </View>
            )}

            {/* ═══ STEP 4 ═══ */}
            {step === 4 && (
              <View>
                {role === 'FARMER' ? (
                  <>
                    {/* Aadhaar OTP Section */}
                    <View style={st.kycSection}>
                      <Text style={st.kycSubTitle}>1. Verify Aadhaar via OTP</Text>
                      {aadhaarVerified ? (
                        <View style={st.kycVerifiedRow}>
                          <Ionicons name="checkmark-circle" size={20} color="#14532D" />
                          <Text style={st.kycVerifiedText}>Aadhaar Number Verified</Text>
                        </View>
                      ) : (
                        <View style={{ gap: 8 }}>
                          {showAadhaarOtpInput ? (
                            <View style={{ gap: 10 }}>
                              <Field
                                icon="key-outline"
                                label="Enter OTP Sent to Mobile *"
                                value={aadhaarOtp}
                                onChangeText={setAadhaarOtp}
                                placeholder="6-digit OTP"
                                keyboardType="number-pad"
                                maxLength={6}
                              />
                              <TouchableOpacity style={st.actionBtn} onPress={confirmAadhaarOtp}>
                                <Text style={st.actionBtnText}>Confirm OTP</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={st.actionBtn}
                              onPress={sendAadhaarOtp}
                              disabled={isVerifyingAadhaar}
                            >
                              {isVerifyingAadhaar ? (
                                <ActivityIndicator size="small" color="#FFF" />
                              ) : (
                                <Text style={st.actionBtnText}>Verify with OTP</Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>

                    <View style={st.divider} />

                    <Text style={st.kycSubTitle}>2. Upload Aadhaar Card Front *</Text>
                    <ImagePickerBox
                      asset={aadhaarPhotoAsset}
                      onPickCamera={() => handlePickImage('aadhaar', 'camera')}
                      onPickGallery={() => handlePickImage('aadhaar', 'gallery')}
                      placeholder="Take Aadhaar Photo"
                    />
                  </>
                ) : role === 'BUYER' ? (
                  <>
                    <View style={st.infoNotice}>
                      <Ionicons name="shield-checkmark" size={18} color="#14532D" />
                      <Text style={st.infoNoticeText}>
                        Please upload a clear picture of the original GST Certificate document for verification.
                      </Text>
                    </View>

                    <Text style={st.kycSubTitle}>GST Certificate Image *</Text>
                    <ImagePickerBox
                      asset={gstPhotoAsset}
                      onPickCamera={() => handlePickImage('gst', 'camera')}
                      onPickGallery={() => handlePickImage('gst', 'gallery')}
                      placeholder="Upload GST Certificate"
                    />

                    <View style={st.divider} />

                    <Text style={st.kycSubTitle}>PAN Card Image (Optional)</Text>
                    <ImagePickerBox
                      asset={panPhotoAsset}
                      onPickCamera={() => handlePickImage('pan', 'camera')}
                      onPickGallery={() => handlePickImage('pan', 'gallery')}
                      placeholder="Upload PAN Card Front"
                    />
                  </>
                ) : (
                  <>
                    <View style={st.infoNotice}>
                      <Ionicons name="shield-checkmark" size={18} color="#14532D" />
                      <Text style={st.infoNoticeText}>
                        Upload your identity and facility registration documents. These are required for admin verification.
                      </Text>
                    </View>

                    <Text style={st.kycSubTitle}>Aadhaar Card Front *</Text>
                    <ImagePickerBox
                      asset={aadhaarPhotoAsset}
                      onPickCamera={() => handlePickImage('aadhaar', 'camera')}
                      onPickGallery={() => handlePickImage('aadhaar', 'gallery')}
                      placeholder="Upload Aadhaar Card"
                    />

                    <View style={st.divider} />

                    <Text style={st.kycSubTitle}>CS Registration Certificate *</Text>
                    <ImagePickerBox
                      asset={csRegistrationPhotoAsset}
                      onPickCamera={async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') { setError('Camera permission denied'); return; }
                        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
                        if (!result.canceled && result.assets?.[0]) setCsRegistrationPhotoAsset(result.assets[0]);
                      }}
                      onPickGallery={async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') { setError('Gallery permission denied'); return; }
                        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
                        if (!result.canceled && result.assets?.[0]) setCsRegistrationPhotoAsset(result.assets[0]);
                      }}
                      placeholder="Upload Registration Certificate"
                    />

                    <View style={st.divider} />

                    <Text style={st.kycSubTitle}>FSSAI License *</Text>
                    <ImagePickerBox
                      asset={fssaiPhotoAsset}
                      onPickCamera={async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') { setError('Camera permission denied'); return; }
                        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
                        if (!result.canceled && result.assets?.[0]) setFssaiPhotoAsset(result.assets[0]);
                      }}
                      onPickGallery={async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') { setError('Gallery permission denied'); return; }
                        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
                        if (!result.canceled && result.assets?.[0]) setFssaiPhotoAsset(result.assets[0]);
                      }}
                      placeholder="Upload FSSAI License"
                    />
                  </>
                )}
              </View>
            )}

            {/* Error display */}
            {error ? (
              <View style={st.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={st.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={st.actions}>
              {step > 1 && (
                <TouchableOpacity style={st.backBtn} onPress={handleBack}>
                  <Ionicons name="arrow-back" size={18} color="#5F6B66" />
                  <Text style={st.backBtnText}>Back</Text>
                </TouchableOpacity>
              )}

              {step < totalSteps ? (
                <TouchableOpacity
                  style={[st.nextBtn, step === 1 && { flex: 1 }]}
                  onPress={handleNext}
                  activeOpacity={0.88}
                >
                  <Text style={st.nextBtnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[st.nextBtn, { opacity: loading ? 0.7 : 1 }]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name={roleMeta.icon} size={18} color="#FFF" />
                      <Text style={st.nextBtnText}>Create Account</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={() => router.back()} style={st.loginLink}>
              <Text style={st.loginLinkText}>Already have an account? <Text style={st.loginLinkBold}>Sign In</Text></Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Reusable Field Component ──
function Field({ label, icon, ...props }: { label: string; icon?: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={st.fieldLabel}>{label}</Text>
      <View style={st.inputRow}>
        {icon && <Ionicons name={icon as any} size={18} color="#9AA39E" style={{ marginRight: 8 }} />}
        <TextInput
          style={st.input}
          placeholderTextColor="#9AA39E"
          autoCapitalize="none"
          {...props}
        />
      </View>
    </View>
  );
}

// ── Reusable ImagePickerBox Component ──
function ImagePickerBox({
  asset,
  onPickCamera,
  onPickGallery,
  placeholder,
}: {
  asset: ImagePicker.ImagePickerAsset | null;
  onPickCamera: () => void;
  onPickGallery: () => void;
  placeholder: string;
}) {
  return (
    <View style={st.pickerBox}>
      {asset ? (
        <View style={st.previewWrap}>
          <Image source={{ uri: asset.uri }} style={st.previewImg} />
          <View style={st.previewOverlay}>
            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            <Text style={st.previewText}>Photo Added</Text>
          </View>
        </View>
      ) : (
        <Text style={st.pickerPlaceholder}>{placeholder}</Text>
      )}
      <View style={st.pickerBtnsRow}>
        <TouchableOpacity style={st.pickerSubBtn} onPress={onPickCamera}>
          <Ionicons name="camera-outline" size={18} color="#5F6B66" />
          <Text style={st.pickerSubBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.pickerSubBtn} onPress={onPickGallery}>
          <Ionicons name="image-outline" size={18} color="#5F6B66" />
          <Text style={st.pickerSubBtnText}>Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// STYLES — Clean design system matching discover
// ─────────────────────────────────────────────────────
const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8F5' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  topBackBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8E4',
    alignItems: 'center', justifyContent: 'center',
  },
  topBrand: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  topBrandMark: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8E4',
    alignItems: 'center', justifyContent: 'center',
  },
  topBrandName: {
    fontSize: 16, fontWeight: '800', color: '#0B2520', letterSpacing: -0.3,
  },
  topStepText: {
    fontSize: 12, fontWeight: '700', color: '#9AA39E',
  },

  // Progress
  progressBar: {
    height: 4, backgroundColor: '#E2E8E4', borderRadius: 2,
    overflow: 'hidden', marginBottom: 20,
  },
  progressFill: {
    height: '100%', backgroundColor: '#14532D', borderRadius: 2,
  },

  // Form card
  formCard: {
    backgroundColor: '#FFFFFF', borderRadius: 22, padding: 22,
    borderWidth: 1, borderColor: '#E8ECE9',
    shadowColor: '#163C2D', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
  },
  formTitle: {
    fontSize: 22, fontWeight: '800', color: '#0B2520',
    letterSpacing: -0.3, marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 15, fontWeight: '700', color: '#0B2520', marginBottom: 14,
  },

  // Role cards
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  roleCard: {
    flex: 1, borderWidth: 2, borderColor: '#E2E8E4', borderRadius: 16,
    padding: 12, alignItems: 'center', gap: 6, backgroundColor: '#F2F5F0',
    position: 'relative',
  },
  roleIconBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  roleLabel: { fontSize: 14, fontWeight: '700', color: '#0B2520' },
  roleDesc: { fontSize: 10, color: '#9AA39E', textAlign: 'center', lineHeight: 14, fontWeight: '500' },
  roleCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },

  // Fields
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#5F6B66', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F2F5F0', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 8,
    borderWidth: 1.5, borderColor: '#E2E8E4', minHeight: 52,
  },
  input: { flex: 1, fontSize: 15, color: '#0B2520', fontWeight: '600' },

  // Info notice
  infoNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#E8F5EE', borderRadius: 14, padding: 14,
    marginBottom: 18, borderWidth: 1, borderColor: '#D4E8DC',
  },
  infoNoticeText: { flex: 1, fontSize: 12, color: '#0B2520', lineHeight: 18, fontWeight: '500' },

  // Type chips
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8E4',
    backgroundColor: '#F2F5F0',
  },
  typeChipActive: { backgroundColor: '#14532D', borderColor: '#14532D' },
  typeChipText: { fontSize: 12, fontWeight: '700', color: '#5F6B66' },
  typeChipTextActive: { color: '#FFFFFF' },

  // Divider
  divider: { height: 1, backgroundColor: '#E2E8E4', marginVertical: 18 },

  // Phone verify
  verifyPhoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: '#E8F5EE', borderRadius: 12,
    borderWidth: 1, borderColor: '#14532D',
  },
  verifyPhoneBtnText: { color: '#14532D', fontWeight: '700', fontSize: 13 },
  otpMiniInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#E2E8E4', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 16,
    letterSpacing: 4, textAlign: 'center', fontWeight: '700',
    backgroundColor: '#F2F5F0', color: '#0B2520',
  },
  otpVerifyBtn: {
    backgroundColor: '#14532D', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 18,
  },
  otpVerifyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: -6, marginBottom: 14, paddingHorizontal: 12,
    paddingVertical: 8, backgroundColor: '#E8F5EE', borderRadius: 10,
    alignSelf: 'flex-start',
  },
  verifiedBadgeText: { color: '#059669', fontWeight: '700', fontSize: 13 },

  // KYC step
  kycSection: { marginVertical: 8 },
  kycSubTitle: { fontSize: 14, fontWeight: '700', color: '#0B2520', marginBottom: 10 },
  kycVerifiedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5EE', padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#D4E8DC',
  },
  kycVerifiedText: { fontSize: 14, fontWeight: '700', color: '#14532D' },
  actionBtn: {
    backgroundColor: '#14532D', padding: 14, borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14,
    marginTop: 16, borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { color: '#991B1B', fontSize: 13, flex: 1, fontWeight: '500' },

  // Actions
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 15,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8E4',
    backgroundColor: '#F2F5F0',
  },
  backBtnText: { fontSize: 14, fontWeight: '700', color: '#5F6B66' },
  nextBtn: {
    flex: 1, borderRadius: 14, backgroundColor: '#14532D',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, minHeight: 54,
  },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Login link
  loginLink: { marginTop: 20, alignItems: 'center' },
  loginLinkText: { fontSize: 14, color: '#5F6B66', fontWeight: '500' },
  loginLinkBold: { color: '#14532D', fontWeight: '800' },

  // Image picker
  pickerBox: {
    borderWidth: 1.5, borderColor: '#E2E8E4', borderRadius: 16,
    padding: 14, backgroundColor: '#F2F5F0', gap: 10,
  },
  pickerPlaceholder: { fontSize: 14, color: '#9AA39E', textAlign: 'center', marginVertical: 14, fontWeight: '500' },
  pickerBtnsRow: { flexDirection: 'row', gap: 10 },
  pickerSubBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderWidth: 1.5, borderColor: '#E2E8E4',
    borderRadius: 12, backgroundColor: '#FFF',
  },
  pickerSubBtnText: { fontSize: 13, fontWeight: '700', color: '#5F6B66' },
  previewWrap: { height: 120, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  previewImg: { width: '100%', height: '100%' },
  previewOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  previewText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
