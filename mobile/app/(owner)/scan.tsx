/**
 * ColdStorage — QR Scanner Screen (Owner/Staff)
 *
 * Scans farmer's booking QR code on arrival.
 * Uses expo-camera for real QR scanning with a premium overlay.
 * Falls back to manual booking number entry.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView,
  Animated, Dimensions, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '@/lib/api-client';
import { hapticLight, hapticSuccess, hapticError, hapticMedium } from '@/lib/haptics';

const { width: SCREEN_W } = Dimensions.get('window');
const SCAN_AREA = SCREEN_W * 0.65;

// ── Colors ──
const C = {
  bg: '#F4F3F9',
  surface: '#FFFFFF',
  primary: '#6D28D9',
  primaryLight: '#8B5CF6',
  primarySoft: '#EDE9FE',
  success: '#059669',
  successSoft: '#D1FAE5',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  ink: '#0F172A',
  muted: '#64748B',
  subtle: '#94A3B8',
  border: '#E2E8F0',
};

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [bookingNumber, setBookingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Animations
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scan line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Pulse animation for corners
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  // Handle QR code scanned from camera
  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    hapticMedium();
    handleQRScanned(data);
  }, [scanned, loading]);

  const handleQRScanned = async (qrData: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await api.post<any>('/bookings/verify-qr', { qrPayload: qrData });
      if (res.success && res.data) {
        hapticSuccess();
        setResult(res.data);
      } else {
        hapticError();
        setError(res.error?.message || 'Invalid QR code');
        // Allow re-scan after 2 seconds
        setTimeout(() => setScanned(false), 2000);
      }
    } catch (err: any) {
      hapticError();
      setError(err.message || 'Scan failed');
      setTimeout(() => setScanned(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  // Manual booking number lookup
  const handleManualLookup = useCallback(async () => {
    if (!bookingNumber.trim()) {
      setError('Enter a booking number');
      hapticError();
      return;
    }

    setLoading(true);
    setError('');
    hapticLight();

    try {
      const res = await api.get<any>(`/bookings/number/${bookingNumber.trim().toUpperCase()}`);
      if (res.success && res.data) {
        setResult(res.data);
        hapticSuccess();
      } else {
        setError('Booking not found');
        hapticError();
      }
    } catch (err: any) {
      setError(err.message || 'Lookup failed');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [bookingNumber]);

  // Mark as arrived
  const handleMarkArrived = useCallback(async () => {
    if (!result) return;
    setLoading(true);

    try {
      const res = await api.patch<any>(`/bookings/${result.id}/status`, { status: 'ARRIVED' });
      if (res.success) {
        hapticSuccess();
        setResult(res.data);
        Alert.alert('✅ Arrival Confirmed', `Booking #${result.bookingNumber} — farmer has arrived.`);
      } else {
        hapticError();
        Alert.alert('Error', res.error?.message || 'Failed to mark arrival');
      }
    } catch (err: any) {
      hapticError();
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [result]);

  const resetScan = () => {
    setResult(null);
    setError('');
    setBookingNumber('');
    setScanned(false);
  };

  // ── Result View ──
  if (result) {
    const isArrived = result.status === 'ARRIVED';
    return (
      <View style={styles.screen}>
        <LinearGradient
          colors={['#4C1D95', '#6D28D9', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity onPress={resetScan} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Found</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
          {/* Success circle */}
          <View style={[styles.successCircle, { backgroundColor: isArrived ? C.successSoft : C.primarySoft }]}>
            <Ionicons
              name={isArrived ? 'checkmark-circle' : 'search-circle'}
              size={56}
              color={isArrived ? C.success : C.primary}
            />
          </View>

          <Text style={styles.resultTitle}>
            {isArrived ? 'Arrival Confirmed ✅' : 'Booking Details'}
          </Text>
          <Text style={styles.resultBookingNo}>#{result.bookingNumber}</Text>

          {/* Farmer Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Farmer Details</Text>
            <InfoRow icon="person" label="Name" value={result.farmer?.fullName || '-'} />
            <InfoRow icon="call" label="Phone" value={result.farmer?.phone || '-'} />
            <InfoRow icon="card" label="ID" value={result.farmer?.uniqueId || '-'} />
          </View>

          {/* Booking Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Booking Details</Text>
            <InfoRow icon="leaf" label="Commodity" value={result.commodityName || '-'} />
            <InfoRow icon="scale" label="Est. Weight" value={`${result.estimatedWeightKg || 0} Kg`} />
            <InfoRow
              icon="calendar"
              label="Date"
              value={result.preferredDate ? new Date(result.preferredDate).toLocaleDateString('en-IN') : '-'}
            />
            <View style={styles.infoStatusRow}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="flag" size={15} color={C.subtle} />
                <Text style={styles.infoLabel}>Status</Text>
              </View>
              <View style={[
                styles.statusPill,
                { backgroundColor: isArrived ? C.successSoft : C.primarySoft }
              ]}>
                <Text style={[
                  styles.statusPillText,
                  { color: isArrived ? C.success : C.primary }
                ]}>
                  {result.status?.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          {result.status === 'CONFIRMED' && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleMarkArrived} disabled={loading}>
              <LinearGradient
                colors={['#059669', '#34D399']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="location" size={20} color="#FFF" />
                    <Text style={styles.actionText}>Mark as Arrived</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isArrived && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                router.push({ pathname: '/owner-booking/weigh', params: { bookingId: result.id, bookingNumber: result.bookingNumber } });
                hapticLight();
              }}
            >
              <LinearGradient
                colors={['#6D28D9', '#A78BFA']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="scale" size={20} color="#FFF" />
                <Text style={styles.actionText}>Proceed to Weighing</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.scanAgainBtn} onPress={resetScan}>
            <Ionicons name="scan" size={18} color={C.primary} />
            <Text style={styles.scanAgainText}>Scan Another</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Main Scanner View ──
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#4C1D95', '#6D28D9', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerDecor1} />
        <Text style={styles.headerTitle}>QR Scanner</Text>
        <Text style={styles.headerSubtitle}>Scan farmer's booking QR code</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[styles.scanContent, { opacity: fadeAnim }]}>
          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'scan' && styles.modeBtnActive]}
              onPress={() => { setMode('scan'); setError(''); hapticLight(); }}
              activeOpacity={0.7}
            >
              {mode === 'scan' ? (
                <LinearGradient colors={['#6D28D9', '#8B5CF6']} style={styles.modeBtnGradient}>
                  <Ionicons name="camera" size={16} color="#FFF" />
                  <Text style={styles.modeBtnTextActive}>Camera Scan</Text>
                </LinearGradient>
              ) : (
                <>
                  <Ionicons name="camera-outline" size={16} color={C.muted} />
                  <Text style={styles.modeBtnText}>Camera Scan</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
              onPress={() => { setMode('manual'); setError(''); hapticLight(); }}
              activeOpacity={0.7}
            >
              {mode === 'manual' ? (
                <LinearGradient colors={['#6D28D9', '#8B5CF6']} style={styles.modeBtnGradient}>
                  <Ionicons name="keypad" size={16} color="#FFF" />
                  <Text style={styles.modeBtnTextActive}>Manual Entry</Text>
                </LinearGradient>
              ) : (
                <>
                  <Ionicons name="keypad-outline" size={16} color={C.muted} />
                  <Text style={styles.modeBtnText}>Manual Entry</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Error banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={C.danger} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError('')}>
                <Ionicons name="close" size={16} color={C.danger} />
              </TouchableOpacity>
            </View>
          ) : null}

          {mode === 'scan' ? (
            /* ── Camera Scanner ── */
            <View style={styles.cameraContainer}>
              {!permission?.granted ? (
                /* Permission needed */
                <View style={styles.permissionCard}>
                  <View style={styles.permIconWrap}>
                    <Ionicons name="camera" size={40} color={C.primary} />
                  </View>
                  <Text style={styles.permTitle}>Camera Access Needed</Text>
                  <Text style={styles.permSubtext}>
                    Allow camera access to scan QR codes from farmer booking confirmations
                  </Text>
                  <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.7}>
                    <LinearGradient colors={['#6D28D9', '#8B5CF6']} style={styles.permBtnGradient}>
                      <Ionicons name="shield-checkmark" size={18} color="#FFF" />
                      <Text style={styles.permBtnText}>Grant Permission</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.switchLink}
                    onPress={() => { setMode('manual'); hapticLight(); }}
                  >
                    <Text style={styles.switchLinkText}>Use manual entry instead →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Camera active */
                <View style={styles.cameraWrapper}>
                  <CameraView
                    style={styles.camera}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  />
                  {/* Overlay */}
                  <View style={styles.cameraOverlay}>
                    {/* Top mask */}
                    <View style={styles.maskRow} />
                    {/* Middle row with scan window */}
                    <View style={styles.maskMiddle}>
                      <View style={styles.maskSide} />
                      <Animated.View style={[styles.scanWindow, { transform: [{ scale: pulseAnim }] }]}>
                        {/* Corner brackets */}
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                        {/* Scan line */}
                        <Animated.View
                          style={[
                            styles.scanLine,
                            {
                              transform: [{
                                translateY: scanLineAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, SCAN_AREA - 4],
                                }),
                              }],
                            },
                          ]}
                        />
                      </Animated.View>
                      <View style={styles.maskSide} />
                    </View>
                    {/* Bottom mask */}
                    <View style={styles.maskRow}>
                      <Text style={styles.scanHint}>
                        {scanned ? 'Processing...' : 'Align QR code within the frame'}
                      </Text>
                    </View>
                  </View>
                  {/* Loading overlay */}
                  {loading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color="#FFF" />
                      <Text style={styles.loadingText}>Verifying...</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            /* ── Manual Entry ── */
            <ScrollView contentContainerStyle={styles.manualSection} showsVerticalScrollIndicator={false}>
              <View style={styles.manualIconWrap}>
                <LinearGradient colors={['#EDE9FE', '#F5F3FF']} style={styles.manualIconGradient}>
                  <Ionicons name="document-text" size={40} color={C.primary} />
                </LinearGradient>
              </View>
              <Text style={styles.manualTitle}>Enter Booking Number</Text>
              <Text style={styles.manualSub}>
                Ask the farmer for their booking confirmation number
              </Text>

              <View style={styles.inputCard}>
                <View style={styles.inputRow}>
                  <Ionicons name="search" size={18} color={C.subtle} />
                  <TextInput
                    style={styles.input}
                    value={bookingNumber}
                    onChangeText={(t) => { setBookingNumber(t); setError(''); }}
                    placeholder="e.g. CS-ABC-20260718-001"
                    placeholderTextColor={C.subtle}
                    autoCapitalize="characters"
                    returnKeyType="search"
                    onSubmitEditing={handleManualLookup}
                  />
                  {bookingNumber.length > 0 && (
                    <TouchableOpacity onPress={() => setBookingNumber('')}>
                      <Ionicons name="close-circle" size={18} color={C.subtle} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.lookupBtn, loading && { opacity: 0.7 }]}
                onPress={handleManualLookup}
                disabled={loading}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#6D28D9', '#8B5CF6']}
                  style={styles.lookupGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <Ionicons name="search" size={18} color="#FFF" />
                      <Text style={styles.lookupText}>Look Up Booking</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Tip card */}
              <View style={styles.tipCard}>
                <Ionicons name="information-circle" size={18} color={C.primary} />
                <Text style={styles.tipText}>
                  The booking number is on the farmer's confirmation screen and starts with "CS-"
                </Text>
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        <Ionicons name={icon as any} size={15} color={C.subtle} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // ── Header ──
  header: {
    paddingTop: 12, // overridden inline with insets.top
    paddingBottom: 20,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerDecor1: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24, fontWeight: '800', color: '#FFF', letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '500',
  },

  scanContent: { flex: 1, padding: 16, paddingTop: 12 },

  // ── Mode toggle ──
  modeToggle: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 0, borderRadius: 14, backgroundColor: C.surface,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    height: 46,
  },
  modeBtnActive: {
    backgroundColor: 'transparent',
  },
  modeBtnGradient: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: '100%', borderRadius: 14,
  },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: C.muted },
  modeBtnTextActive: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // ── Error ──
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.dangerSoft, borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { flex: 1, fontSize: 13, color: C.danger, fontWeight: '500' },

  // ── Camera ──
  cameraContainer: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  cameraWrapper: { flex: 1, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  camera: { flex: 1 },
  cameraOverlay: {
    ...StyleSheet.absoluteFill as any,
    justifyContent: 'center', alignItems: 'center',
  },
  maskRow: {
    flex: 1, width: '100%',
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  maskMiddle: {
    flexDirection: 'row', height: SCAN_AREA,
  },
  maskSide: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
  },
  scanWindow: {
    width: SCAN_AREA, height: SCAN_AREA,
    position: 'relative',
  },
  corner: {
    position: 'absolute', width: 28, height: 28,
    borderColor: '#A78BFA', borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanLine: {
    position: 'absolute', left: 8, right: 8, top: 0,
    height: 2, backgroundColor: '#A78BFA',
    shadowColor: '#A78BFA', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 8,
  },
  scanHint: {
    color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600',
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: {
    color: '#FFF', fontSize: 16, fontWeight: '600',
  },

  // ── Permission ──
  permissionCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30,
  },
  permIconWrap: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  permTitle: {
    fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 8, textAlign: 'center',
  },
  permSubtext: {
    fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21, marginBottom: 28,
  },
  permBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  permBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: 14,
  },
  permBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  switchLink: { marginTop: 20 },
  switchLinkText: { color: C.primary, fontWeight: '600', fontSize: 14 },

  // ── Manual Entry ──
  manualSection: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 4 },
  manualIconWrap: { marginBottom: 20 },
  manualIconGradient: {
    width: 88, height: 88, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  manualTitle: {
    fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 6,
  },
  manualSub: {
    fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 28, lineHeight: 20,
  },
  inputCard: {
    width: '100%', backgroundColor: C.surface, borderRadius: 16, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 8,
  },
  input: {
    flex: 1, fontSize: 16, color: C.ink, fontWeight: '600',
  },

  lookupBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  lookupGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: 14,
  },
  lookupText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  tipCard: {
    flexDirection: 'row', gap: 10, marginTop: 24, width: '100%',
    backgroundColor: C.primarySoft, borderRadius: 14, padding: 14,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1, fontSize: 13, color: C.primary, lineHeight: 19, fontWeight: '500',
  },

  // ── Result ──
  resultContent: {
    padding: 20, alignItems: 'center',
  },
  successCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  resultTitle: {
    fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 4,
  },
  resultBookingNo: {
    fontSize: 24, fontWeight: '800', color: C.primary, marginBottom: 24,
    letterSpacing: 0.5,
  },

  infoCard: {
    width: '100%', backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 12, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  infoCardTitle: {
    fontSize: 12, fontWeight: '700', color: C.subtle, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  infoRowLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  infoStatusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  infoLabel: { fontSize: 13, color: C.muted, fontWeight: '500' },
  infoValue: { fontSize: 14, color: C.ink, fontWeight: '600' },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3,
  },

  actionBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  actionGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: 14,
  },
  actionText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  scanAgainBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.primary,
  },
  scanAgainText: { color: C.primary, fontWeight: '600', fontSize: 14 },
});
