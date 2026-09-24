/**
 * app/edit-profile.tsx
 *
 * Premium Edit Profile Screen for Farmer
 * - Edit name, email, address, city, state, pincode
 * - Profile photo with camera/gallery picker
 * - Real-time validation
 * - Animated success feedback
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth, ProfileUpdateData } from '@/contexts/AuthContext';
import { hapticLight, hapticSuccess } from '@/lib/haptics';

/* ─── Indian States ─── */
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

/* ─── Theme ─── */
import { DetailUI } from '@/components/DetailScreenCard';
const UI = {
  canvas: DetailUI.canvas,
  surface: DetailUI.surface,
  border: DetailUI.border,
  borderFocus: DetailUI.primary,
  text: DetailUI.ink,
  muted: DetailUI.muted,
  subtle: DetailUI.subtle,
  forest: DetailUI.primaryDark,
  forestMid: DetailUI.primaryMid,
  forestSoft: '#E8F3EE',
  gold: '#D8B24A',
  goldSoft: '#FFF7E5',
  danger: DetailUI.danger,
  dangerSoft: DetailUI.dangerSoft,
  success: DetailUI.success,
  successSoft: DetailUI.successSoft,
};

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateProfile, refreshProfile } = useAuth();

  /* ─── Form State ─── */
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [addressLine1, setAddressLine1] = useState(user?.addressLine1 || '');
  const [city, setCity] = useState(user?.city || '');
  const [state, setState] = useState(user?.state || '');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl || null);

  const [saving, setSaving] = useState(false);
  const [showStateList, setShowStateList] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const successAnim = useRef(new Animated.Value(0)).current;

  /* ─── Validation ─── */
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Name is required';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email format';
    if (pincode && !/^\d{6}$/.test(pincode)) errs.pincode = 'Pincode must be 6 digits';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ─── Check if anything changed ─── */
  const hasChanges =
    fullName !== (user?.fullName || '') ||
    email !== (user?.email || '') ||
    addressLine1 !== (user?.addressLine1 || '') ||
    city !== (user?.city || '') ||
    state !== (user?.state || '') ||
    pincode !== (user?.pincode || '');

  /* ─── Save ─── */
  async function handleSave() {
    if (!validate()) return;
    if (!hasChanges) {
      router.back();
      return;
    }

    setSaving(true);
    try {
      const data: ProfileUpdateData = {};
      if (fullName !== (user?.fullName || '')) data.fullName = fullName.trim();
      if (email !== (user?.email || '')) data.email = email.trim() || '';
      if (addressLine1 !== (user?.addressLine1 || '')) data.addressLine1 = addressLine1.trim() || '';
      if (city !== (user?.city || '')) data.city = city.trim() || '';
      if (state !== (user?.state || '')) data.state = state.trim() || '';
      if (pincode !== (user?.pincode || '')) data.pincode = pincode.trim() || '';

      await updateProfile(data);
      hapticSuccess();

      // Animate success
      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(800),
        Animated.timing(successAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        router.back();
      });
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  /* ─── Photo Picker ─── */
  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      exif: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      hapticLight();

      try {
        // Resize to 200x200 thumbnail and get base64
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 200, height: 200 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (manipulated.base64) {
          const dataUri = `data:image/jpeg;base64,${manipulated.base64}`;
          setAvatarUri(dataUri);

          // Upload to backend
          await updateProfile({ avatarUrl: dataUri });
          await refreshProfile();
          hapticSuccess();
        }
      } catch (err: any) {
        Alert.alert('Upload Failed', err.message || 'Could not upload photo.');
        setAvatarUri(user?.avatarUrl || null);
      }
    }
  }

  const filteredStates = stateSearch
    ? INDIAN_STATES.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()))
    : INDIAN_STATES;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* ─── Hero Header ─── */}
            <LinearGradient
              colors={[UI.forest, UI.forestMid, '#1A6B5A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.hero, { paddingTop: insets.top + 12 }]}
            >
              <View style={styles.heroGlowA} />
              <View style={styles.heroGlowB} />

              {/* Top bar */}
              <View style={styles.heroTopRow}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => { router.back(); hapticLight(); }}
                  activeOpacity={0.82}
                >
                  <Ionicons name="arrow-back" size={20} color="#FFF" />
                </TouchableOpacity>

                <Text style={styles.heroTitle}>Edit Profile</Text>

                <TouchableOpacity
                  style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  activeOpacity={0.82}
                  disabled={saving || !hasChanges}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Avatar */}
              <View style={styles.avatarSection}>
                <TouchableOpacity style={styles.avatarWrap} onPress={pickPhoto} activeOpacity={0.85}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  ) : (
                    <LinearGradient
                      colors={['#EAD68F', '#C7A037']}
                      style={styles.avatarGradient}
                    >
                      <Text style={styles.avatarLetter}>
                        {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </LinearGradient>
                  )}
                  <View style={styles.cameraIcon}>
                    <Ionicons name="camera" size={14} color="#FFF" />
                  </View>
                </TouchableOpacity>

                <Text style={styles.avatarHint}>Tap to change photo</Text>
              </View>

              {/* Role + Phone */}
              <View style={styles.heroMeta}>
                <View style={styles.rolePill}>
                  <Ionicons name="leaf-outline" size={11} color={UI.gold} />
                  <Text style={styles.rolePillText}>
                    {user?.role === 'FARMER' ? 'Farmer' : user?.role || 'Member'}
                  </Text>
                </View>
                <Text style={styles.phoneMeta}>📞 {user?.phone || '—'}</Text>
              </View>
            </LinearGradient>

            {/* ─── Form Fields ─── */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>

              <FormField
                icon="person-outline"
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                error={errors.fullName}
                autoCapitalize="words"
              />

              <FormField
                icon="mail-outline"
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <FormField
                icon="call-outline"
                label="Phone Number"
                value={user?.phone || ''}
                onChangeText={() => {}}
                placeholder=""
                disabled
                hint="Phone number cannot be changed"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>ADDRESS</Text>

              <FormField
                icon="home-outline"
                label="Address Line"
                value={addressLine1}
                onChangeText={setAddressLine1}
                placeholder="House/Building, Street"
              />

              <FormField
                icon="business-outline"
                label="City / Town"
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Lucknow"
              />

              {/* State Picker */}
              <View style={styles.fieldWrap}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="map-outline" size={15} color={UI.forestMid} />
                  <Text style={styles.fieldLabel}>State</Text>
                </View>
                <TouchableOpacity
                  style={[styles.fieldInput, styles.fieldInputRow]}
                  onPress={() => setShowStateList(!showStateList)}
                  activeOpacity={0.84}
                >
                  <Text style={[styles.fieldInputText, !state && styles.placeholderText]}>
                    {state || 'Select state'}
                  </Text>
                  <Ionicons
                    name={showStateList ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={UI.muted}
                  />
                </TouchableOpacity>

                {showStateList && (
                  <View style={styles.stateDropdown}>
                    <View style={styles.stateSearchBar}>
                      <Ionicons name="search-outline" size={14} color={UI.subtle} />
                      <TextInput
                        style={styles.stateSearchInput}
                        placeholder="Search state..."
                        placeholderTextColor={UI.subtle}
                        value={stateSearch}
                        onChangeText={setStateSearch}
                      />
                    </View>
                    <ScrollView style={styles.stateList} nestedScrollEnabled>
                      {filteredStates.map(s => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.stateItem, state === s && styles.stateItemActive]}
                          onPress={() => {
                            setState(s);
                            setShowStateList(false);
                            setStateSearch('');
                            hapticLight();
                          }}
                        >
                          <Text style={[styles.stateItemText, state === s && styles.stateItemTextActive]}>
                            {s}
                          </Text>
                          {state === s && <Ionicons name="checkmark" size={16} color={UI.forestMid} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <FormField
                icon="keypad-outline"
                label="Pincode"
                value={pincode}
                onChangeText={(t) => setPincode(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="e.g. 226001"
                error={errors.pincode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            {/* Unique ID display */}
            {user?.uniqueId && (
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>FARMER ID</Text>
                <View style={styles.idCard}>
                  <Ionicons name="finger-print-outline" size={20} color={UI.gold} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.idLabel}>Registration Number</Text>
                    <Text style={styles.idValue}>{user.uniqueId}</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* ─── Bottom Save Bar ─── */}
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { router.back(); hapticLight(); }}
              activeOpacity={0.84}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBarBtn, !hasChanges && styles.saveBarBtnDisabled]}
              onPress={handleSave}
              activeOpacity={0.82}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.saveBarBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* ─── Success overlay ─── */}
        <Animated.View
          style={[styles.successOverlay, { opacity: successAnim }]}
          pointerEvents="none"
        >
          <View style={styles.successContent}>
            <Ionicons name="checkmark-circle" size={48} color={UI.success} />
            <Text style={styles.successText}>Profile Updated!</Text>
          </View>
        </Animated.View>
      </View>
    </>
  );
}

/* ─── Form Field Component ─── */
function FormField({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  disabled,
  keyboardType,
  autoCapitalize,
  maxLength,
}: {
  icon: string;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  maxLength?: number;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldLabelRow}>
        <Ionicons name={icon as any} size={15} color={error ? UI.danger : UI.forestMid} />
        <Text style={[styles.fieldLabel, error && { color: UI.danger }]}>{label}</Text>
      </View>

      <TextInput
        style={[
          styles.fieldInput,
          focused && styles.fieldInputFocused,
          error && styles.fieldInputError,
          disabled && styles.fieldInputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={UI.subtle}
        editable={!disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
      />

      {error ? (
        <Text style={styles.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  /* Hero */
  hero: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroGlowA: {
    position: 'absolute', top: -80, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroGlowB: {
    position: 'absolute', bottom: -60, left: -80,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(251,191,36,0.06)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  heroTitle: {
    fontSize: 20, fontWeight: '800', color: '#FFF', letterSpacing: -0.3,
  },
  saveBtn: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontSize: 13, fontWeight: '700', color: '#FFF',
  },

  /* Avatar */
  avatarSection: {
    alignItems: 'center', marginTop: 20, marginBottom: 8,
  },
  avatarWrap: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%', height: '100%',
  },
  avatarGradient: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 32, fontWeight: '800', color: '#5C4A2D',
  },
  cameraIcon: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: UI.forestMid,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  avatarHint: {
    marginTop: 8,
    fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '500',
  },

  /* Meta */
  heroMeta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginTop: 8,
  },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  rolePillText: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)',
  },
  phoneMeta: {
    fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500',
  },

  /* Form */
  formSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: '900', letterSpacing: 1,
    color: UI.forestMid,
    marginBottom: 14,
  },

  /* Field */
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: UI.muted,
  },
  fieldInput: {
    backgroundColor: UI.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: UI.border,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
    fontWeight: '500',
    color: UI.text,
  },
  fieldInputFocused: {
    borderColor: UI.borderFocus,
    backgroundColor: '#FAFFF8',
    shadowColor: UI.forestMid,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldInputError: {
    borderColor: UI.danger,
    backgroundColor: UI.dangerSoft,
  },
  fieldInputDisabled: {
    backgroundColor: '#F0F2EF',
    color: UI.subtle,
  },
  fieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldInputText: {
    fontSize: 15, fontWeight: '500', color: UI.text,
  },
  placeholderText: {
    color: UI.subtle,
  },
  fieldError: {
    marginTop: 4,
    fontSize: 11, fontWeight: '600', color: UI.danger,
  },
  fieldHint: {
    marginTop: 4,
    fontSize: 11, fontWeight: '500', color: UI.subtle,
  },

  /* State dropdown */
  stateDropdown: {
    marginTop: 6,
    backgroundColor: UI.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    maxHeight: 220,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  stateSearchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F2EF',
  },
  stateSearchInput: {
    flex: 1, fontSize: 13, fontWeight: '500', color: UI.text,
  },
  stateList: {
    maxHeight: 170,
  },
  stateItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 0.5, borderBottomColor: '#F5F7F5',
  },
  stateItemActive: {
    backgroundColor: UI.forestSoft,
  },
  stateItemText: {
    fontSize: 13, fontWeight: '500', color: UI.text,
  },
  stateItemTextActive: {
    fontWeight: '700', color: UI.forestMid,
  },

  /* ID Card */
  idCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: UI.goldSoft,
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E8DFC8',
  },
  idLabel: {
    fontSize: 10, fontWeight: '700', color: UI.muted, letterSpacing: 0.3,
  },
  idValue: {
    fontSize: 16, fontWeight: '800', color: UI.text, marginTop: 2,
  },

  /* Bottom bar */
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 14,
    backgroundColor: UI.surface,
    borderTopWidth: 1, borderTopColor: '#EEF1EE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 8,
  },
  cancelBtn: {
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#F0F2EF',
    borderWidth: 1, borderColor: UI.border,
  },
  cancelBtnText: {
    fontSize: 14, fontWeight: '700', color: UI.muted,
  },
  saveBarBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    backgroundColor: UI.forest,
  },
  saveBarBtnDisabled: {
    opacity: 0.4,
  },
  saveBarBtnText: {
    fontSize: 14, fontWeight: '700', color: '#FFF',
  },

  /* Success overlay */
  successOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  successContent: {
    alignItems: 'center', gap: 12,
  },
  successText: {
    fontSize: 20, fontWeight: '800', color: UI.success,
  },
});
