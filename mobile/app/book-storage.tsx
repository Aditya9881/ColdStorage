/**
 * SheetKosh — Book Storage Screen
 *
 * Premium booking form opened from Facility Detail → "Book Storage"
 * Receives facilityId + facilityName as route params.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { api } from '@/lib/api-client';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { DetailUI } from '@/components/DetailScreenCard';

const COMMODITY_CATEGORIES = [
  { key: 'POTATO', label: 'Potato', icon: 'leaf-outline', tint: '#D97706', soft: '#FFF7ED' },
  { key: 'ONION', label: 'Onion', icon: 'ellipse-outline', tint: '#DC2626', soft: '#FEF2F2' },
  { key: 'VEGETABLES', label: 'Vegetables', icon: 'nutrition-outline', tint: '#059669', soft: '#ECFDF5' },
  { key: 'FRUITS', label: 'Fruits', icon: 'flower-outline', tint: '#C026D3', soft: '#FDF4FF' },
  { key: 'DAIRY', label: 'Dairy', icon: 'water-outline', tint: '#0891B2', soft: '#F0F9FF' },
  { key: 'SEEDS', label: 'Seeds', icon: 'leaf-outline', tint: '#65A30D', soft: '#F7FEE7' },
  { key: 'OTHER', label: 'Other', icon: 'cube-outline', tint: '#6B7280', soft: '#F9FAFB' },
] as const;

const TIME_SLOTS = [
  { key: 'MORNING', label: 'Morning', sub: '6 AM – 12 PM', icon: 'sunny-outline' },
  { key: 'AFTERNOON', label: 'Afternoon', sub: '12 PM – 5 PM', icon: 'partly-sunny-outline' },
  { key: 'EVENING', label: 'Evening', sub: '5 PM – 9 PM', icon: 'moon-outline' },
] as const;

const DURATION_PRESETS = ['7', '15', '30', '60', '90'];

const UI = {
  bg: DetailUI.canvas,
  surface: DetailUI.surface,
  text: DetailUI.ink,
  textMuted: DetailUI.muted,
  textSoft: DetailUI.subtle,
  border: DetailUI.border,
  forest: DetailUI.primary,
  forestDeep: DetailUI.primaryDark,
  forestMid: DetailUI.primaryMid,
  success: DetailUI.success,
  error: DetailUI.danger,
  errorSoft: DetailUI.dangerSoft,
  gold: '#D8B24A',
};

export default function BookStorageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ facilityId: string; facilityName: string }>();
  const { facilityId, facilityName } = params;

  const [category, setCategory] = useState('');
  const [commodityName, setCommodityName] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [estimatedBags, setEstimatedBags] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [storageDuration, setStorageDuration] = useState('');
  const [farmerNote, setFarmerNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date();
  const quickDates = [
    { label: 'Tomorrow', date: new Date(today.getTime() + 86400000) },
    { label: 'In 2 days', date: new Date(today.getTime() + 2 * 86400000) },
    { label: 'In 3 days', date: new Date(today.getTime() + 3 * 86400000) },
    { label: 'In a week', date: new Date(today.getTime() + 7 * 86400000) },
  ];

  const formatDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  };

  const displayDate = (d: Date) => {
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      weekday: 'short',
    });
  };

  const selectedCategory = useMemo(
    () => COMMODITY_CATEGORIES.find(c => c.key === category),
    [category]
  );

  const validateDateString = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00`);
    return !isNaN(parsed.getTime());
  };

  const handleSubmit = useCallback(async () => {
    if (!facilityId) {
      setError('Facility information is missing. Please go back and try again.');
      hapticError();
      return;
    }

    if (!category) {
      setError('Select a commodity category');
      hapticError();
      return;
    }

    if (!commodityName.trim()) {
      setError('Enter commodity name');
      hapticError();
      return;
    }

    if (!estimatedWeight || Number(estimatedWeight) <= 0) {
      setError('Enter a valid estimated weight');
      hapticError();
      return;
    }

    if (!preferredDate) {
      setError('Select or enter a preferred date');
      hapticError();
      return;
    }

    if (!validateDateString(preferredDate)) {
      setError('Enter date in YYYY-MM-DD format');
      hapticError();
      return;
    }

    if (storageDuration && Number(storageDuration) <= 0) {
      setError('Storage duration must be greater than 0');
      hapticError();
      return;
    }

    setError('');
    setLoading(true);
    hapticLight();

    try {
      const payload: any = {
        facilityId,
        commodityCategory: category,
        commodityName: commodityName.trim(),
        estimatedWeightKg: Number(estimatedWeight),
        preferredDate,
      };

      if (estimatedBags) payload.estimatedBags = Number(estimatedBags);
      if (timeSlot) payload.preferredSlot = timeSlot;
      if (storageDuration) payload.storageDuration = Number(storageDuration);
      if (farmerNote.trim()) payload.farmerNote = farmerNote.trim();

      const res = await api.post<any>('/bookings', payload);

      if (res.success && res.data) {
        hapticSuccess();
        Alert.alert(
          'Booking Request Sent!',
          `Your booking request has been submitted to the cold storage. You'll be notified once the owner approves your booking.`,
          [
            {
              text: 'View Booking',
              onPress: () => router.replace(`/booking/${res.data.id}`),
            },
            {
              text: 'Back to Home',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        setError(res.error?.message || 'Failed to create booking');
        hapticError();
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [
    category,
    commodityName,
    estimatedWeight,
    estimatedBags,
    preferredDate,
    timeSlot,
    storageDuration,
    farmerNote,
    facilityId,
    router,
  ]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <LinearGradient colors={[UI.forestDeep, UI.forestMid, UI.forest]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.heroGlowA} />
          <View style={styles.heroGlowB} />

          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.82}
            >
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Book Storage</Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {facilityName || 'Cold Storage Facility'}
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Ionicons name="calendar-outline" size={22} color={UI.gold} />
            </View>
          </View>

          <View style={styles.headerBadgeRow}>
            <View style={styles.headerBadge}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#D1FAE5" />
              <Text style={styles.headerBadgeText}>Secure request</Text>
            </View>
            <View style={styles.headerBadge}>
              <Ionicons name="time-outline" size={14} color="#D1FAE5" />
              <Text style={styles.headerBadgeText}>Fast confirmation</Text>
            </View>
          </View>
        </LinearGradient>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="business-outline" size={20} color={UI.forest} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Booking for</Text>
                <Text style={styles.infoSubtitle} numberOfLines={2}>
                  {facilityName || 'Selected cold storage facility'}
                </Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={17} color={UI.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>What are you storing?</Text>
              <Text style={styles.sectionHint}>
                Choose the closest category and then enter the exact commodity name.
              </Text>

              <View style={styles.chipGrid}>
                {COMMODITY_CATEGORIES.map(c => {
                  const active = category === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[
                        styles.chip,
                        active && {
                          backgroundColor: c.tint,
                          borderColor: c.tint,
                        },
                      ]}
                      onPress={() => {
                        setCategory(c.key);
                        setError('');
                        hapticLight();
                      }}
                      activeOpacity={0.84}
                    >
                      <Ionicons
                        name={c.icon as any}
                        size={16}
                        color={active ? '#FFF' : c.tint}
                      />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Commodity Name *</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="pricetag-outline" size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    value={commodityName}
                    onChangeText={text => {
                      setCommodityName(text);
                      if (error) setError('');
                    }}
                    placeholder={
                      selectedCategory?.label
                        ? `Enter ${selectedCategory.label.toLowerCase()} variety`
                        : 'e.g. Aloo (Chandramukhi)'
                    }
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Estimated quantity</Text>
              <Text style={styles.sectionHint}>
                Share approximate weight and bag count for faster processing.
              </Text>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1.4 }]}>
                  <Text style={styles.label}>Estimated Weight (Kg) *</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="scale-outline" size={18} color="#9CA3AF" />
                    <TextInput
                      style={styles.input}
                      value={estimatedWeight}
                      onChangeText={text => {
                        setEstimatedWeight(text);
                        if (error) setError('');
                      }}
                      placeholder="e.g. 5000"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Bags</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="cube-outline" size={18} color="#9CA3AF" />
                    <TextInput
                      style={styles.input}
                      value={estimatedBags}
                      onChangeText={setEstimatedBags}
                      placeholder="e.g. 100"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Delivery preference</Text>
              <Text style={styles.sectionHint}>
                Pick a quick date or enter a custom date manually.
              </Text>

              <View style={styles.dateGrid}>
                {quickDates.map(qd => {
                  const ds = formatDate(qd.date);
                  const active = preferredDate === ds;

                  return (
                    <TouchableOpacity
                      key={ds}
                      style={[styles.dateChip, active && styles.dateChipActive]}
                      onPress={() => {
                        setPreferredDate(ds);
                        if (error) setError('');
                        hapticLight();
                      }}
                      activeOpacity={0.84}
                    >
                      <Text style={[styles.dateChipLabel, active && styles.dateChipLabelActive]}>
                        {qd.label}
                      </Text>
                      <Text style={[styles.dateChipSub, active && styles.dateChipSubActive]}>
                        {displayDate(qd.date)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Or enter date (YYYY-MM-DD) *</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    value={preferredDate}
                    onChangeText={text => {
                      setPreferredDate(text);
                      if (error) setError('');
                    }}
                    placeholder="2026-07-15"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <Text style={styles.label}>Preferred Time Slot</Text>
              <View style={styles.slotRow}>
                {TIME_SLOTS.map(s => {
                  const active = timeSlot === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.slotCard, active && styles.slotCardActive]}
                      onPress={() => {
                        setTimeSlot(s.key);
                        hapticLight();
                      }}
                      activeOpacity={0.84}
                    >
                      <Ionicons
                        name={s.icon as any}
                        size={22}
                        color={active ? '#2D6A4F' : '#9CA3AF'}
                      />
                      <Text style={[styles.slotLabel, active && styles.slotLabelActive]}>
                        {s.label}
                      </Text>
                      <Text style={styles.slotSub}>{s.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Additional details</Text>
              <Text style={styles.sectionHint}>
                These details are optional, but they help the facility prepare better.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Storage Duration (days)</Text>
                <View style={styles.durationRow}>
                  {DURATION_PRESETS.map(d => {
                    const active = storageDuration === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.durationChip, active && styles.durationChipActive]}
                        onPress={() => {
                          setStorageDuration(d);
                          hapticLight();
                        }}
                        activeOpacity={0.84}
                      >
                        <Text
                          style={[
                            styles.durationChipText,
                            active && styles.durationChipTextActive,
                          ]}
                        >
                          {d}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.inputRow}>
                  <Ionicons name="time-outline" size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    value={storageDuration}
                    onChangeText={setStorageDuration}
                    placeholder="e.g. 90"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.fieldGroupLast}>
                <Text style={styles.label}>Note for facility</Text>
                <View style={[styles.inputRow, styles.textareaRow]}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={18}
                    color="#9CA3AF"
                    style={{ marginTop: 4 }}
                  />
                  <TextInput
                    style={styles.textarea}
                    value={farmerNote}
                    onChangeText={setFarmerNote}
                    placeholder="Any special instructions, handling note, or arrival information..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                  />
                </View>
                <Text style={styles.noteCount}>{farmerNote.length}/500</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.75 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.86}
            >
              <LinearGradient
                colors={['#2D6A4F', '#40916C']}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.submitText}>Confirm Booking</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.footerHint}>
              By confirming, your booking request will be sent to the selected facility for review.
            </Text>

            <View style={{ height: 42 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    paddingTop: 12,
    paddingBottom: 22,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },

  heroGlowA: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  heroGlowB: {
    position: 'absolute',
    bottom: -65,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(52,211,153,0.10)',
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.3,
  },

  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 3,
    fontWeight: '500',
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerBadgeRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },

  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  scrollContent: {
    padding: 16,
    paddingTop: 18,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EEF1EA',
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  infoIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoTitle: {
    fontSize: 12,
    color: UI.textSoft,
    fontWeight: '600',
    marginBottom: 2,
  },

  infoSubtitle: {
    fontSize: 15,
    color: UI.text,
    fontWeight: '800',
    lineHeight: 20,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: UI.errorSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },

  errorText: {
    fontSize: 13,
    color: UI.error,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EEF1EA',
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: UI.text,
    marginBottom: 4,
    letterSpacing: -0.2,
  },

  sectionHint: {
    fontSize: 12,
    color: UI.textSoft,
    lineHeight: 18,
    marginBottom: 14,
  },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },

  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5F6B76',
  },

  chipTextActive: {
    color: '#FFFFFF',
  },

  fieldGroup: {
    marginBottom: 16,
  },

  fieldGroupLast: {
    marginBottom: 4,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 7,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: UI.text,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  dateChip: {
    flex: 1,
    minWidth: '47%',
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },

  dateChipActive: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
  },

  dateChipLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
  },

  dateChipLabelActive: {
    color: '#FFFFFF',
  },

  dateChipSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 3,
    fontWeight: '500',
  },

  dateChipSubActive: {
    color: '#D1FAE5',
  },

  slotRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },

  slotCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },

  slotCardActive: {
    borderColor: '#2D6A4F',
    backgroundColor: '#F0FFF4',
  },

  slotLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
    marginTop: 2,
  },

  slotLabelActive: {
    color: '#2D6A4F',
  },

  slotSub: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 14,
  },

  durationRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },

  durationChip: {
    minWidth: 48,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },

  durationChipActive: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
  },

  durationChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },

  durationChipTextActive: {
    color: '#FFFFFF',
  },

  textareaRow: {
    alignItems: 'flex-start',
  },

  textarea: {
    flex: 1,
    height: 92,
    fontSize: 15,
    color: UI.text,
    textAlignVertical: 'top',
  },

  noteCount: {
    fontSize: 11,
    color: UI.textSoft,
    textAlign: 'right',
    marginTop: 6,
    fontWeight: '500',
  },

  submitBtn: {
    marginTop: 6,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1C4E39',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },

  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
    borderRadius: 16,
  },

  submitText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
  },

  footerHint: {
    fontSize: 12,
    color: UI.textSoft,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 12,
    paddingHorizontal: 10,
  },
});