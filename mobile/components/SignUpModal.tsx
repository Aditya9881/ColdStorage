/**
 * SignUpModal — Multi-step registration modal
 *
 * 4-step flow: Role → Basic Info → KYC → Documents
 * All register logic from register.tsx preserved.
 * Rendered as a centered modal overlay via AuthModalShell.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { hapticLight, hapticError, hapticSuccess } from '@/lib/haptics';
import AuthModalShell from './AuthModalShell';

const ROLE_META: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; border: string; bg: string; label: string; desc: string }> = {
  FARMER: { icon: 'leaf-outline', border: '#14532D', bg: '#E8F5EE', label: 'Farmer', desc: 'Deposit & manage produce' },
  BUYER: { icon: 'cart-outline', border: '#B8860B', bg: '#FFF7E8', label: 'Buyer', desc: 'Purchase from marketplace' },
  OWNER: { icon: 'business-outline', border: '#3B6FCF', bg: '#EEF4FF', label: 'Owner', desc: 'Manage cold storage' },
};

const BUSINESS_TYPES = ['Wholesaler', 'Retailer', 'Processor', 'Exporter', 'Commission Agent', 'Other'];

interface SignUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToSignIn: () => void;
}

export default function SignUpModal({
  visible,
  onClose,
  onSwitchToSignIn,
}: SignUpModalProps) {
  const { register, sendOtp, verifyOtp } = useAuth();

  // Form state
  const [role, setRole] = useState<'FARMER' | 'BUYER' | 'OWNER'>('FARMER');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Step 2
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // Step 3 — Farmer
  const [villageName, setVillageName] = useState('');
  const [landHolding, setLandHolding] = useState('');
  const [khasraNumber, setKhasraNumber] = useState('');

  // Step 3 — Buyer
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Step 3 — Owner
  const [csRegistrationNumber, setCsRegistrationNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [csRegistrationPhotoAsset, setCsRegistrationPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fssaiPhotoAsset, setFssaiPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Step 4
  const [aadhaarPhotoAsset, setAadhaarPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [gstPhotoAsset, setGstPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [panPhotoAsset, setPanPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [isVerifyingAadhaar, setIsVerifyingAadhaar] = useState(false);
  const [showAadhaarOtpInput, setShowAadhaarOtpInput] = useState(false);

  const totalSteps = 4;

  // ── OTP Countdown ──
  React.useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setInterval(() => setOtpCountdown(prev => prev <= 1 ? 0 : prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [otpCountdown]);

  // Reset when modal closes
  React.useEffect(() => {
    if (!visible) {
      setStep(1);
      setError('');
    }
  }, [visible]);

  // ── Phone OTP ──
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
        Alert.alert('OTP Auto-Filled (Dev)', `OTP: ${result.devOtp}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
      hapticError();
    } finally { setLoading(false); }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.length !== 6) { setError('Enter 6-digit OTP'); return; }
    setError('');
    setLoading(true);
    try {
      await verifyOtp(phone, phoneOtp, 'REGISTER');
      setPhoneVerified(true);
      hapticSuccess();
      Alert.alert('Phone Verified!', 'Your phone number has been verified.');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      setPhoneOtp('');
      hapticError();
    } finally { setLoading(false); }
  };

  // ── Aadhaar OTP ──
  const sendAadhaarOtp = () => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) { setError('Enter a valid 12-digit Aadhaar'); return; }
    setError('');
    setIsVerifyingAadhaar(true);
    setTimeout(() => {
      setIsVerifyingAadhaar(false);
      setShowAadhaarOtpInput(true);
      Alert.alert('OTP Sent', 'An OTP has been sent to your Aadhaar-registered mobile.');
    }, 1000);
  };

  const confirmAadhaarOtp = () => {
    if (aadhaarOtp === '123456' || aadhaarOtp.length === 6) {
      setAadhaarVerified(true);
      setShowAadhaarOtpInput(false);
      setError('');
      Alert.alert('Success', 'Aadhaar verified!');
    } else { setError('Invalid OTP'); }
  };

  // ── Image Pick ──
  const handlePickImage = async (docType: 'aadhaar' | 'gst' | 'pan', source: 'camera' | 'gallery') => {
    setError('');
    try {
      const { status } = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { setError(`Permission denied`); return; }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, quality: 0.6 };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!result.canceled && result.assets?.[0]) {
        if (docType === 'aadhaar') setAadhaarPhotoAsset(result.assets[0]);
        if (docType === 'gst') setGstPhotoAsset(result.assets[0]);
        if (docType === 'pan') setPanPhotoAsset(result.assets[0]);
      }
    } catch (err: any) { setError(err.message || 'Failed'); }
  };

  // ── Validation ──
  const validateStep1 = () => {
    if (!fullName.trim()) return 'Full name is required';
    if (!phone || phone.length !== 10) return 'Enter a valid 10-digit phone';
    if (!phoneVerified) return 'Please verify your phone with OTP first';
    if (!password || password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };
  const validateStep2 = () => {
    if (!addressLine1.trim()) return 'Address is required';
    if (!city.trim()) return 'City is required';
    if (!state.trim()) return 'State is required';
    if (!pincode || pincode.length !== 6) return 'Enter a valid 6-digit pincode';
    if (!aadhaarNumber || aadhaarNumber.length !== 12) return 'Enter a valid 12-digit Aadhaar';
    return null;
  };
  const validateStep3 = () => {
    if (role === 'FARMER') { if (!villageName.trim()) return 'Village name is required'; }
    else if (role === 'BUYER') {
      if (!businessName.trim()) return 'Business name is required';
      if (!businessType) return 'Select a business type';
      if (!gstNumber || gstNumber.length !== 15) return 'Enter a valid 15-digit GST';
    } else if (role === 'OWNER') {
      if (!csRegistrationNumber.trim()) return 'Registration number is required';
      if (!fssaiNumber.trim()) return 'FSSAI number is required';
    }
    return null;
  };
  const validateStep4 = () => {
    if (role === 'FARMER') {
      if (!aadhaarVerified) return 'Verify Aadhaar with OTP first';
      if (!aadhaarPhotoAsset) return 'Upload Aadhaar Card photo';
    } else if (role === 'BUYER') {
      if (!gstPhotoAsset) return 'Upload GST Certificate';
    } else if (role === 'OWNER') {
      if (!aadhaarPhotoAsset) return 'Upload Aadhaar Card photo';
      if (!csRegistrationPhotoAsset) return 'Upload CS Registration Certificate';
      if (!fssaiPhotoAsset) return 'Upload FSSAI License';
    }
    return null;
  };

  const handleNext = () => {
    let err: string | null = null;
    if (step === 1) err = validateStep1();
    if (step === 2) err = validateStep2();
    if (step === 3) err = validateStep3();
    if (err) { setError(err); hapticError(); return; }
    setError('');
    setStep(step + 1);
    hapticLight();
  };

  const handleBack = () => { setError(''); if (step > 1) setStep(step - 1); };

  // ── Register ──
  async function handleRegister() {
    const err = validateStep4();
    if (err) { setError(err); hapticError(); return; }
    setError('');
    setLoading(true);
    try {
      const kycDocs: any[] = [];
      if (aadhaarPhotoAsset) kycDocs.push({ asset: aadhaarPhotoAsset, type: 'AADHAAR_FRONT', number: aadhaarNumber });
      if (role === 'BUYER') {
        if (gstPhotoAsset) kycDocs.push({ asset: gstPhotoAsset, type: 'GST_CERTIFICATE', number: gstNumber });
        if (panPhotoAsset) kycDocs.push({ asset: panPhotoAsset, type: 'PAN_CARD', number: panNumber });
      }
      if (role === 'OWNER') {
        if (csRegistrationPhotoAsset) kycDocs.push({ asset: csRegistrationPhotoAsset, type: 'BUSINESS_LICENSE', number: csRegistrationNumber });
        if (fssaiPhotoAsset) kycDocs.push({ asset: fssaiPhotoAsset, type: 'OTHER', number: fssaiNumber });
      }
      await register({
        fullName, phone, password, role,
        email: email || undefined, addressLine1, city, state, pincode,
        district: district || undefined, aadhaarNumber: aadhaarNumber || undefined,
        panNumber: panNumber || undefined, villageName: villageName || undefined,
        landHolding: landHolding || undefined, khasraNumber: khasraNumber || undefined,
        gstNumber: gstNumber || undefined, businessName: businessName || undefined,
        businessType: businessType || undefined, csRegistrationNumber: csRegistrationNumber || undefined,
        fssaiNumber: fssaiNumber || undefined, kycDocs,
      });
      hapticSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
      hapticError();
    } finally { setLoading(false); }
  }

  return (
    <AuthModalShell visible={visible} onClose={onClose} showCloseConfirm={step > 1}>
      {/* ── Header ── */}
      <View style={st.header}>
        <Text style={st.headerTitle}>Create Your Account</Text>
        <View style={st.progressRow}>
          <View style={st.progressBar}>
            <View style={[st.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
          </View>
          <Text style={st.stepText}>Step {step}/{totalSteps}</Text>
        </View>
      </View>

      {/* ═══ STEP 1 ═══ */}
      {step === 1 && (
        <View>
          <Text style={st.sectionLabel}>Choose your role</Text>
          <View style={st.roleRow}>
            {(['FARMER', 'BUYER', 'OWNER'] as const).map(r => {
              const meta = ROLE_META[r];
              const active = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[st.roleCard, active && { borderColor: meta.border, backgroundColor: meta.bg }]}
                  onPress={() => setRole(r)}
                  activeOpacity={0.8}
                >
                  <View style={[st.roleIcon, { backgroundColor: active ? meta.border : '#F2F5F0' }]}>
                    <Ionicons name={meta.icon} size={20} color={active ? '#FFF' : '#9AA39E'} />
                  </View>
                  <Text style={[st.roleLabel, active && { color: meta.border }]}>{meta.label}</Text>
                  <Text style={st.roleDesc}>{meta.desc}</Text>
                  {active && (
                    <View style={[st.roleCheck, { backgroundColor: meta.border }]}>
                      <Ionicons name="checkmark" size={11} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={st.sectionLabel}>Basic Information</Text>
          <Field icon="person-outline" label="Full Name *" value={fullName} onChangeText={setFullName} placeholder="e.g. Ramesh Kumar" />
          <Field icon="call-outline" label="Phone Number *" value={phone} onChangeText={(t: string) => { setPhone(t); setPhoneVerified(false); setOtpSent(false); }} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />

          {phone.length === 10 && !phoneVerified && (
            <View style={{ marginTop: -4, marginBottom: 12 }}>
              {!otpSent ? (
                <TouchableOpacity style={st.verifyBtn} onPress={handleSendPhoneOtp} disabled={loading}>
                  <Ionicons name="paper-plane-outline" size={15} color="#14532D" />
                  <Text style={st.verifyBtnText}>{loading ? 'Sending...' : 'Verify Phone with OTP'}</Text>
                </TouchableOpacity>
              ) : (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <TextInput
                      style={st.otpMini}
                      value={phoneOtp}
                      onChangeText={(t) => setPhoneOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
                      placeholder="Enter OTP" placeholderTextColor="#9AA39E"
                      keyboardType="number-pad" maxLength={6}
                    />
                    <TouchableOpacity style={st.otpVerifyBtn} onPress={handleVerifyPhoneOtp} disabled={loading}>
                      <Text style={st.otpVerifyBtnText}>{loading ? '...' : 'Verify'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    {otpCountdown > 0 ? (
                      <Text style={{ fontSize: 11, color: '#9AA39E' }}>Resend in {otpCountdown}s</Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendPhoneOtp}>
                        <Text style={{ fontSize: 11, color: '#14532D', fontWeight: '700' }}>Resend OTP</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {phoneVerified && (
            <View style={st.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={15} color="#059669" />
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
            <Ionicons name="shield-checkmark" size={16} color="#14532D" />
            <Text style={st.infoNoticeText}>Identity verification helps prevent fraud and enables traceability.</Text>
          </View>
          <Field icon="home-outline" label="Address *" value={addressLine1} onChangeText={setAddressLine1} placeholder="House/Shop No., Street" />
          <View style={st.fieldRow}>
            <View style={{ flex: 1 }}><Field icon="business-outline" label="City *" value={city} onChangeText={setCity} placeholder="e.g. Agra" /></View>
            <View style={{ flex: 1 }}><Field icon="map-outline" label="District" value={district} onChangeText={setDistrict} placeholder="e.g. Agra" /></View>
          </View>
          <View style={st.fieldRow}>
            <View style={{ flex: 1.5 }}><Field icon="location-outline" label="State *" value={state} onChangeText={setState} placeholder="e.g. UP" /></View>
            <View style={{ flex: 1 }}><Field icon="pin-outline" label="Pincode *" value={pincode} onChangeText={setPincode} placeholder="6 digits" keyboardType="number-pad" maxLength={6} /></View>
          </View>
          <View style={st.divider} />
          <Text style={st.sectionLabel}>Identity Verification</Text>
          <Field icon="card-outline" label="Aadhaar Number *" value={aadhaarNumber} onChangeText={setAadhaarNumber} placeholder="12-digit Aadhaar" keyboardType="number-pad" maxLength={12} />
          <Field icon="document-text-outline" label="PAN (optional)" value={panNumber} onChangeText={(t) => setPanNumber(t.toUpperCase())} placeholder="e.g. ABCDE1234F" autoCapitalize="characters" maxLength={10} />
        </View>
      )}

      {/* ═══ STEP 3 ═══ */}
      {step === 3 && (
        <View>
          {role === 'FARMER' ? (
            <>
              <View style={st.infoNotice}>
                <Ionicons name="information-circle" size={16} color="#14532D" />
                <Text style={st.infoNoticeText}>Land details help verify farming background and enable faster booking.</Text>
              </View>
              <Field icon="trail-sign-outline" label="Village / Town *" value={villageName} onChangeText={setVillageName} placeholder="e.g. Kakori, Lucknow" />
              <Field icon="resize-outline" label="Land Holding (optional)" value={landHolding} onChangeText={setLandHolding} placeholder="e.g. 5 acres" />
              <Field icon="receipt-outline" label="Khasra Number (optional)" value={khasraNumber} onChangeText={setKhasraNumber} placeholder="e.g. 123/45" />
            </>
          ) : role === 'BUYER' ? (
            <>
              <View style={st.infoNotice}>
                <Ionicons name="information-circle" size={16} color="#14532D" />
                <Text style={st.infoNoticeText}>Business details required for invoicing and GST compliance.</Text>
              </View>
              <Field icon="briefcase-outline" label="Business Name *" value={businessName} onChangeText={setBusinessName} placeholder="e.g. Priya Enterprises" />
              <Text style={st.fieldLabel}>Business Type *</Text>
              <View style={st.typeGrid}>
                {BUSINESS_TYPES.map(type => (
                  <TouchableOpacity key={type} style={[st.typeChip, businessType === type && st.typeChipActive]} onPress={() => setBusinessType(type)}>
                    <Text style={[st.typeChipText, businessType === type && st.typeChipTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Field icon="document-attach-outline" label="GST Number *" value={gstNumber} onChangeText={(t) => setGstNumber(t.toUpperCase())} placeholder="e.g. 09ABCDE1234F1Z5" autoCapitalize="characters" maxLength={15} />
            </>
          ) : (
            <>
              <View style={st.infoNotice}>
                <Ionicons name="information-circle" size={16} color="#14532D" />
                <Text style={st.infoNoticeText}>Registration and FSSAI required for facility verification.</Text>
              </View>
              <Field icon="business-outline" label="CS Registration *" value={csRegistrationNumber} onChangeText={setCsRegistrationNumber} placeholder="Registration number" />
              <Field icon="document-text-outline" label="FSSAI License *" value={fssaiNumber} onChangeText={setFssaiNumber} placeholder="14-digit FSSAI" maxLength={20} />
              <Field icon="briefcase-outline" label="Business Name" value={businessName} onChangeText={setBusinessName} placeholder="e.g. PK Cold Storage" />
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
              <Text style={st.kycSubTitle}>1. Verify Aadhaar via OTP</Text>
              {aadhaarVerified ? (
                <View style={st.kycVerified}><Ionicons name="checkmark-circle" size={18} color="#14532D" /><Text style={st.kycVerifiedText}>Aadhaar Verified</Text></View>
              ) : (
                <View style={{ gap: 8 }}>
                  {showAadhaarOtpInput ? (
                    <View style={{ gap: 8 }}>
                      <Field icon="key-outline" label="OTP *" value={aadhaarOtp} onChangeText={setAadhaarOtp} placeholder="6-digit OTP" keyboardType="number-pad" maxLength={6} />
                      <TouchableOpacity style={st.actionBtn} onPress={confirmAadhaarOtp}><Text style={st.actionBtnText}>Confirm OTP</Text></TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={st.actionBtn} onPress={sendAadhaarOtp} disabled={isVerifyingAadhaar}>
                      {isVerifyingAadhaar ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={st.actionBtnText}>Verify with OTP</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <View style={st.divider} />
              <Text style={st.kycSubTitle}>2. Upload Aadhaar Card Front *</Text>
              <PickerBox asset={aadhaarPhotoAsset} onCamera={() => handlePickImage('aadhaar', 'camera')} onGallery={() => handlePickImage('aadhaar', 'gallery')} placeholder="Take Aadhaar Photo" />
            </>
          ) : role === 'BUYER' ? (
            <>
              <View style={st.infoNotice}><Ionicons name="shield-checkmark" size={16} color="#14532D" /><Text style={st.infoNoticeText}>Upload clear GST Certificate for verification.</Text></View>
              <Text style={st.kycSubTitle}>GST Certificate *</Text>
              <PickerBox asset={gstPhotoAsset} onCamera={() => handlePickImage('gst', 'camera')} onGallery={() => handlePickImage('gst', 'gallery')} placeholder="Upload GST Certificate" />
              <View style={st.divider} />
              <Text style={st.kycSubTitle}>PAN Card (Optional)</Text>
              <PickerBox asset={panPhotoAsset} onCamera={() => handlePickImage('pan', 'camera')} onGallery={() => handlePickImage('pan', 'gallery')} placeholder="Upload PAN Card" />
            </>
          ) : (
            <>
              <View style={st.infoNotice}><Ionicons name="shield-checkmark" size={16} color="#14532D" /><Text style={st.infoNoticeText}>Upload identity and facility documents for verification.</Text></View>
              <Text style={st.kycSubTitle}>Aadhaar Card Front *</Text>
              <PickerBox asset={aadhaarPhotoAsset} onCamera={() => handlePickImage('aadhaar', 'camera')} onGallery={() => handlePickImage('aadhaar', 'gallery')} placeholder="Upload Aadhaar" />
              <View style={st.divider} />
              <Text style={st.kycSubTitle}>CS Registration *</Text>
              <PickerBox
                asset={csRegistrationPhotoAsset}
                onCamera={async () => {
                  const { status } = await ImagePicker.requestCameraPermissionsAsync();
                  if (status !== 'granted') { setError('Permission denied'); return; }
                  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
                  if (!r.canceled && r.assets?.[0]) setCsRegistrationPhotoAsset(r.assets[0]);
                }}
                onGallery={async () => {
                  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== 'granted') { setError('Permission denied'); return; }
                  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
                  if (!r.canceled && r.assets?.[0]) setCsRegistrationPhotoAsset(r.assets[0]);
                }}
                placeholder="Upload Registration"
              />
              <View style={st.divider} />
              <Text style={st.kycSubTitle}>FSSAI License *</Text>
              <PickerBox
                asset={fssaiPhotoAsset}
                onCamera={async () => {
                  const { status } = await ImagePicker.requestCameraPermissionsAsync();
                  if (status !== 'granted') { setError('Permission denied'); return; }
                  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
                  if (!r.canceled && r.assets?.[0]) setFssaiPhotoAsset(r.assets[0]);
                }}
                onGallery={async () => {
                  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== 'granted') { setError('Permission denied'); return; }
                  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
                  if (!r.canceled && r.assets?.[0]) setFssaiPhotoAsset(r.assets[0]);
                }}
                placeholder="Upload FSSAI"
              />
            </>
          )}
        </View>
      )}

      {/* Error */}
      {error ? (
        <View style={st.errorBox}>
          <Ionicons name="alert-circle" size={15} color="#DC2626" />
          <Text style={st.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={st.actions}>
        {step > 1 && (
          <TouchableOpacity style={st.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={16} color="#5F6B66" />
            <Text style={st.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        {step < totalSteps ? (
          <TouchableOpacity style={[st.nextBtn, step === 1 && { flex: 1 }]} onPress={handleNext} activeOpacity={0.88}>
            <Text style={st.nextBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[st.nextBtn, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.88}>
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <><Ionicons name={ROLE_META[role].icon} size={16} color="#FFF" /><Text style={st.nextBtnText}>Create Account</Text></>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      <TouchableOpacity onPress={() => { onSwitchToSignIn(); hapticLight(); }} style={st.loginLink}>
        <Text style={st.loginLinkText}>Already have an account? <Text style={st.loginLinkBold}>Sign In</Text></Text>
      </TouchableOpacity>
    </AuthModalShell>
  );
}

// ── Reusable Field ──
function Field({ label, icon, ...props }: { label: string; icon?: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={st.fieldLabel}>{label}</Text>
      <View style={st.inputRow}>
        {icon && <Ionicons name={icon as any} size={16} color="#9AA39E" style={{ marginRight: 6 }} />}
        <TextInput style={st.input} placeholderTextColor="#9AA39E" autoCapitalize="none" {...props} />
      </View>
    </View>
  );
}

// ── Reusable PickerBox ──
function PickerBox({ asset, onCamera, onGallery, placeholder }: {
  asset: ImagePicker.ImagePickerAsset | null;
  onCamera: () => void;
  onGallery: () => void;
  placeholder: string;
}) {
  return (
    <View style={st.pickerBox}>
      {asset ? (
        <View style={st.previewWrap}>
          <Image source={{ uri: asset.uri }} style={st.previewImg} />
          <View style={st.previewOver}><Ionicons name="checkmark-circle" size={22} color="#FFF" /><Text style={st.previewText}>Added</Text></View>
        </View>
      ) : (
        <Text style={st.pickerPlaceholder}>{placeholder}</Text>
      )}
      <View style={st.pickerBtns}>
        <TouchableOpacity style={st.pickerSubBtn} onPress={onCamera}>
          <Ionicons name="camera-outline" size={16} color="#5F6B66" /><Text style={st.pickerSubBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.pickerSubBtn} onPress={onGallery}>
          <Ionicons name="image-outline" size={16} color="#5F6B66" /><Text style={st.pickerSubBtnText}>Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────
const st = StyleSheet.create({
  // Header
  header: { marginBottom: 16, paddingRight: 32 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0B2520', letterSpacing: -0.3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  progressBar: { flex: 1, height: 4, backgroundColor: '#E2E8E4', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#14532D', borderRadius: 2 },
  stepText: { fontSize: 11, fontWeight: '700', color: '#9AA39E' },

  // Sections
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#0B2520', marginBottom: 12 },

  // Roles
  roleRow: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  roleCard: {
    flex: 1, borderWidth: 2, borderColor: '#E2E8E4', borderRadius: 14,
    padding: 10, alignItems: 'center', gap: 4, backgroundColor: '#F2F5F0',
    position: 'relative',
  },
  roleIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roleLabel: { fontSize: 12, fontWeight: '700', color: '#0B2520' },
  roleDesc: { fontSize: 9, color: '#9AA39E', textAlign: 'center', lineHeight: 12, fontWeight: '500' },
  roleCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },

  // Fields
  fieldRow: { flexDirection: 'row', gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#5F6B66', marginBottom: 5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F2F5F0', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    borderWidth: 1.5, borderColor: '#E2E8E4', minHeight: 46,
  },
  input: { flex: 1, fontSize: 14, color: '#0B2520', fontWeight: '600' },

  // Info notice
  infoNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#E8F5EE', borderRadius: 12, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: '#D4E8DC',
  },
  infoNoticeText: { flex: 1, fontSize: 11, color: '#0B2520', lineHeight: 16, fontWeight: '500' },

  // Type chips
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E2E8E4', backgroundColor: '#F2F5F0',
  },
  typeChipActive: { backgroundColor: '#14532D', borderColor: '#14532D' },
  typeChipText: { fontSize: 11, fontWeight: '700', color: '#5F6B66' },
  typeChipTextActive: { color: '#FFFFFF' },

  divider: { height: 1, backgroundColor: '#E2E8E4', marginVertical: 14 },

  // Phone verify
  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: '#E8F5EE', borderRadius: 10, borderWidth: 1, borderColor: '#14532D',
  },
  verifyBtnText: { color: '#14532D', fontWeight: '700', fontSize: 12 },
  otpMini: {
    flex: 1, borderWidth: 1.5, borderColor: '#E2E8E4', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
    letterSpacing: 4, textAlign: 'center', fontWeight: '700', backgroundColor: '#F2F5F0', color: '#0B2520',
  },
  otpVerifyBtn: { backgroundColor: '#14532D', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  otpVerifyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: -4, marginBottom: 12, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#E8F5EE', borderRadius: 8, alignSelf: 'flex-start',
  },
  verifiedBadgeText: { color: '#059669', fontWeight: '700', fontSize: 12 },

  // KYC
  kycSubTitle: { fontSize: 13, fontWeight: '700', color: '#0B2520', marginBottom: 8 },
  kycVerified: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5EE', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#D4E8DC',
  },
  kycVerifiedText: { fontSize: 13, fontWeight: '700', color: '#14532D' },
  actionBtn: { backgroundColor: '#14532D', padding: 12, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12,
    marginTop: 14, borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { color: '#991B1B', fontSize: 12, flex: 1, fontWeight: '500' },

  // Actions
  actions: { flexDirection: 'row', gap: 8, marginTop: 18 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8E4', backgroundColor: '#F2F5F0',
  },
  backBtnText: { fontSize: 13, fontWeight: '700', color: '#5F6B66' },
  nextBtn: {
    flex: 1, borderRadius: 12, backgroundColor: '#14532D',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, minHeight: 50,
  },
  nextBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Footer
  loginLink: { marginTop: 16, alignItems: 'center' },
  loginLinkText: { fontSize: 13, color: '#5F6B66', fontWeight: '500' },
  loginLinkBold: { color: '#14532D', fontWeight: '800' },

  // Picker
  pickerBox: {
    borderWidth: 1.5, borderColor: '#E2E8E4', borderRadius: 14,
    padding: 12, backgroundColor: '#F2F5F0', gap: 8,
  },
  pickerPlaceholder: { fontSize: 12, color: '#9AA39E', textAlign: 'center', marginVertical: 10, fontWeight: '500' },
  pickerBtns: { flexDirection: 'row', gap: 8 },
  pickerSubBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderWidth: 1.5, borderColor: '#E2E8E4', borderRadius: 10, backgroundColor: '#FFF',
  },
  pickerSubBtnText: { fontSize: 11, fontWeight: '700', color: '#5F6B66' },
  previewWrap: { height: 100, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  previewImg: { width: '100%', height: '100%' },
  previewOver: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  previewText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
});
