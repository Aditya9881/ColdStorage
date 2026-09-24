/**
 * SheetKosh — Lot Detail Screen (Unified UI)
 *
 * Uses shared components: DetailScreenHeader, SectionCard, SectionHeader,
 * DetailRow, DetailGrid, DetailBottomBar
 *
 * Features:
 * - Hero stats (weight, grade, days stored)
 * - Storage facility info
 * - Live chamber health (temp + humidity)
 * - Inventory details grid
 * - Rent ledger (gold accent card)
 * - eNWR financing card
 * - Bottom dock: Receipt QR + List for Sale
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, StatusBar, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { hapticLight } from '@/lib/haptics';

import DetailScreenHeader from '@/components/DetailScreenHeader';
import DetailBottomBar from '@/components/DetailBottomBar';
import {
  SectionCard, SectionHeader, DetailRow, DetailGrid, CardDivider, DetailUI,
} from '@/components/DetailScreenCard';

// ─── Status Map ─────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  STORED: { label: 'Stored', color: '#059669', bg: '#ECFDF5' },
  PARTIALLY_RELEASED: { label: 'Partially Released', color: '#D97706', bg: '#FFFBEB' },
  FULLY_RELEASED: { label: 'Fully Released', color: '#6B7280', bg: '#F3F4F6' },
  INTAKE_PENDING: { label: 'Intake Pending', color: '#0891B2', bg: '#ECFEFF' },
  EXPIRED: { label: 'Expired', color: '#DC2626', bg: '#FEF2F2' },
};

// ─── Component ──────────────────────────────────────────────

export default function LotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [lot, setLot] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function loadLotDetails(isRetry = false) {
    if (!id) { setLoadError('No lot selected.'); setLoading(false); return; }
    if (isRetry) setRefreshing(true); else setLoading(true);
    setLoadError('');

    try {
      const lotsRes = await api.get<any>('/inventory/my-lots?limit=100');
      if (!lotsRes.success || !lotsRes.data?.lots) {
        setLoadError('Unable to load this lot.'); return;
      }
      const foundLot = lotsRes.data.lots.find((item: any) => String(item.id) === String(id));
      if (!foundLot) { setLoadError('Lot no longer available.'); return; }
      setLot(foundLot);

      try {
        const healthRes = await api.get<any>(`/inventory/my-lots/${id}/health`);
        if (healthRes.success) setHealth(healthRes.data);
      } catch { setHealth(null); }
    } catch (error: any) {
      const msg = String(error?.message || '').toLowerCase();
      if (error?.status === 429 || msg.includes('rate limit')) {
        setLoadError('Too many requests. Please wait a moment.');
      } else {
        setLoadError(error?.message || 'Unable to load lot details.');
      }
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  useEffect(() => { loadLotDetails(); }, [id]);

  // ── Loading ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" />
        <View style={s.center}>
          <ActivityIndicator size="large" color={DetailUI.primary} />
          <Text style={s.centerText}>Loading lot details...</Text>
        </View>
      </>
    );
  }

  // ── Error / Not Found ──
  if (loadError || !lot) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={s.errorScreen} edges={['top', 'bottom']}>
          <View style={s.errorCard}>
            <View style={s.errorIcon}>
              <Ionicons name={loadError ? 'cloud-offline-outline' : 'alert-circle-outline'} size={35} color={loadError ? '#C26935' : DetailUI.muted} />
            </View>
            <Text style={s.errorTitle}>{loadError ? 'Could not load lot' : 'Lot not found'}</Text>
            <Text style={s.errorDesc}>{loadError || 'This lot may no longer be available.'}</Text>
            {loadError && (
              <TouchableOpacity style={s.retryBtn} onPress={() => loadLotDetails(true)} disabled={refreshing} activeOpacity={0.85}>
                {refreshing ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <><Ionicons name="refresh-outline" size={18} color="#FFF" /><Text style={s.retryText}>Try Again</Text></>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.goBackBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={16} color={DetailUI.primary} />
              <Text style={s.goBackText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const badge = STATUS_MAP[lot.status] || STATUS_MAP.STORED;
  const weight = Number(lot.currentWeightKg || 0);
  const intakeWeight = Number(lot.intakeWeightKg || 0);
  const daysSinceIntake = Number(lot.daysSinceIntake || 0);
  const rent = Number(lot.estimatedRent || 0);
  const estimatedMarketPrice = Number(lot.pricePerKg || lot.listingPrice || 0);
  const estimatedLotValue = estimatedMarketPrice > 0 ? weight * estimatedMarketPrice : 0;
  const loanEligibility = estimatedLotValue * 0.7;
  const canTakeAction = lot.status === 'STORED' || lot.status === 'PARTIALLY_RELEASED';
  const facilityLocation = [lot.facility?.city, lot.facility?.state, lot.chamber?.chamberNumber ? `Chamber ${lot.chamber.chamberNumber}` : null].filter(Boolean).join(' · ');
  const hasHealthData = Boolean(health?.current);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={s.screen}>
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLotDetails(true); }} tintColor={DetailUI.primary} />}
        >
          {/* ─── Hero Section ─── */}
          <LinearGradient colors={['#082B24', DetailUI.primary, '#087B73']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
            <SafeAreaView edges={['top']}>
              <View style={s.heroTopRow}>
                <TouchableOpacity onPress={() => { hapticLight(); router.back(); }} style={s.heroBtn} activeOpacity={0.8}>
                  <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={s.heroNavTitle}>Lot Details</Text>
                <TouchableOpacity style={s.heroBtn} activeOpacity={0.8} onPress={() => Alert.alert('Lot options', 'More actions coming soon.')}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            <View style={s.heroContent}>
              <View style={s.lotIdentityRow}>
                <View style={s.heroLotIcon}>
                  <Ionicons name="cube-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={s.lotIdentityText}>
                  <Text style={s.heroLotNumber}>{lot.lotNumber || 'WAREHOUSE LOT'}</Text>
                  <Text style={s.heroTitle} numberOfLines={1}>{lot.commodityName || 'Unnamed Lot'}</Text>
                  <Text style={s.heroSubtitle}>{(lot.commodityCategory || 'Agricultural Produce').replace(/_/g, ' ').toUpperCase()}</Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: badge.bg }]}>
                  <View style={[s.statusDot, { backgroundColor: badge.color }]} />
                  <Text style={[s.statusLabel, { color: badge.color }]}>{badge.label}</Text>
                </View>
              </View>

              <View style={s.heroStats}>
                <View style={s.heroStat}>
                  <Text style={s.heroStatValue}>{(weight / 1000).toFixed(2)}</Text>
                  <Text style={s.heroStatLabel}>MT AVAILABLE</Text>
                </View>
                <View style={s.heroStatDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroStatValue}>{lot.qualityGrade || '—'}</Text>
                  <Text style={s.heroStatLabel}>GRADE</Text>
                </View>
                <View style={s.heroStatDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroStatValue}>{daysSinceIntake}</Text>
                  <Text style={s.heroStatLabel}>DAYS STORED</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* ─── Cards ─── */}
          <View style={s.cardsArea}>
            {/* ─── Storage Facility ─── */}
            <SectionCard>
              <SectionHeader icon="business-outline" title={lot.facility?.name || 'Facility'} eyebrow="STORAGE FACILITY" />
              <CardDivider />
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={16} color={DetailUI.muted} />
                <Text style={s.locationText}>{facilityLocation || 'Location unavailable'}</Text>
              </View>
            </SectionCard>

            {/* ─── Chamber Health ─── */}
            {hasHealthData && (
              <SectionCard>
                <View style={s.healthHeaderRow}>
                  <View>
                    <Text style={s.eyebrow}>CHAMBER CONDITIONS</Text>
                    <Text style={s.sectionTitle}>Live Storage Health</Text>
                  </View>
                  <View style={[s.livePill, health.current.isAlert && s.livePillAlert]}>
                    <View style={[s.liveDot, health.current.isAlert && s.liveDotAlert]} />
                    <Text style={[s.liveText, health.current.isAlert && s.liveTextAlert]}>
                      {health.current.isAlert ? 'ALERT' : 'LIVE'}
                    </Text>
                  </View>
                </View>

                <View style={s.healthGrid}>
                  <View style={[s.healthTile, { backgroundColor: health.current.isAlert ? DetailUI.dangerSoft : '#E8F7EF' }]}>
                    <Ionicons name="thermometer-outline" size={22} color={health.current.isAlert ? DetailUI.danger : '#059669'} />
                    <Text style={[s.healthValue, { color: health.current.isAlert ? DetailUI.danger : '#059669' }]}>
                      {Number(health.current.temperature || 0).toFixed(1)}°C
                    </Text>
                    <Text style={s.healthLabel}>TEMPERATURE</Text>
                  </View>
                  <View style={[s.healthTile, { backgroundColor: '#EAF8FC' }]}>
                    <Ionicons name="water-outline" size={22} color="#2589AA" />
                    <Text style={[s.healthValue, { color: '#2589AA' }]}>
                      {health.current.humidity != null ? `${Number(health.current.humidity).toFixed(0)}%` : '—'}
                    </Text>
                    <Text style={s.healthLabel}>HUMIDITY</Text>
                  </View>
                </View>

                <CardDivider />
                <View style={s.healthFooterRow}>
                  <Ionicons name={health.current.isAlert ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={17} color={health.current.isAlert ? DetailUI.danger : '#059669'} />
                  <Text style={s.healthFooterText}>
                    {health.current.isAlert ? 'Attention required: chamber conditions outside ideal range.' : 'Conditions stable and monitored in real time.'}
                  </Text>
                </View>
              </SectionCard>
            )}

            {/* ─── Inventory Details ─── */}
            <SectionCard>
              <SectionHeader icon="cube-outline" title="Lot Information" eyebrow="INVENTORY DETAILS" iconBg="#F0EBFF" iconColor="#7457BE" />
              <View style={s.factGrid}>
                <FactTile icon="scale-outline" label="Current Weight" value={`${(weight / 1000).toFixed(2)} MT`} />
                <FactTile icon="download-outline" label="Intake Weight" value={`${(intakeWeight / 1000).toFixed(2)} MT`} />
                <FactTile icon="layers-outline" label="Total Bags" value={`${lot.bagCount || '—'}`} />
                <FactTile icon="water-outline" label="Moisture" value={lot.moistureContent != null ? `${Number(lot.moistureContent)}%` : '—'} />
              </View>
            </SectionCard>

            {/* ─── Rent Ledger ─── */}
            <View style={s.rentCard}>
              <SectionHeader icon="wallet-outline" title="Rent Ledger" eyebrow="ACCRUED STORAGE RENT" iconBg="#FFF0C7" iconColor="#D8B24A" />
              <Text style={s.rentAmount}>₹{rent.toLocaleString()}</Text>
              <View style={s.rentFormula}>
                <Text style={s.rentFormulaText}>{daysSinceIntake} days</Text>
                <Text style={s.rentFormulaOp}>×</Text>
                <Text style={s.rentFormulaText}>₹{Number(lot.appliedRate || 0).toFixed(0)}/MT/day</Text>
                <Text style={s.rentFormulaOp}>×</Text>
                <Text style={s.rentFormulaText}>{(weight / 1000).toFixed(2)} MT</Text>
              </View>
            </View>

            {/* ─── eNWR Financing ─── */}
            {canTakeAction && (
              <SectionCard style={s.financeCard}>
                <View style={s.financeTopRow}>
                  <View style={s.financeBadge}>
                    <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
                    <Text style={s.financeBadgeText}>eNWR SECURED</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={DetailUI.subtle} />
                </View>
                <Text style={s.financeTitle}>Unlock value from your stock</Text>
                <Text style={s.financeDesc}>Use your digital warehouse receipt to access financing without selling today.</Text>
                <View style={s.financeValues}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.financeLabel}>EST. LOT VALUE</Text>
                    <Text style={s.financeVal}>₹{estimatedLotValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                  </View>
                  <View style={s.financeDivider} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.financeLabel}>UP TO 70% LOAN</Text>
                    <Text style={[s.financeVal, { color: '#059669' }]}>₹{loanEligibility.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.financeBtn} activeOpacity={0.85} onPress={() => Alert.alert('eNWR Financing', 'Your request has been submitted. A representative will contact you shortly.')}>
                  <Text style={s.financeBtnText}>Explore Financing</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </TouchableOpacity>
              </SectionCard>
            )}

            <View style={{ height: canTakeAction ? 110 : 30 }} />
          </View>
        </ScrollView>

        {/* ─── Bottom Dock ─── */}
        {canTakeAction && (
          <View style={s.bottomDock}>
            <TouchableOpacity style={s.receiptBtn} activeOpacity={0.8} onPress={() => router.push('/receipts')}>
              <Ionicons name="qr-code-outline" size={22} color={DetailUI.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.listBtn} activeOpacity={0.85} onPress={() => router.push('/listing/create')}>
              <LinearGradient colors={[DetailUI.primaryMid, DetailUI.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.listBtnGradient}>
                <Ionicons name="pricetag-outline" size={18} color="#FFF" />
                <Text style={s.listBtnText}>List Lot for Sale</Text>
                <Ionicons name="arrow-forward" size={17} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

// ─── Fact Tile (2-column grid item) ─────────────────────────

function FactTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.factTile}>
      <View style={s.factIcon}>
        <Ionicons name={icon as any} size={16} color={DetailUI.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.factLabel}>{label}</Text>
        <Text style={s.factValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DetailUI.canvas },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  cardsArea: { paddingHorizontal: 16, paddingTop: 16 },

  // Center / Error states
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DetailUI.canvas, gap: 10 },
  centerText: { fontSize: 13, fontWeight: '600', color: DetailUI.muted },
  errorScreen: { flex: 1, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: DetailUI.canvas },
  errorCard: { padding: 27, borderRadius: 22, alignItems: 'center', backgroundColor: DetailUI.surface, borderWidth: 1, borderColor: DetailUI.border },
  errorIcon: { width: 70, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF2E8' },
  errorTitle: { marginTop: 16, color: DetailUI.ink, fontSize: 18, fontWeight: '800' },
  errorDesc: { marginTop: 8, color: DetailUI.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  retryBtn: { minHeight: 48, marginTop: 20, paddingHorizontal: 20, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: DetailUI.primary },
  retryText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  goBackBtn: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  goBackText: { color: DetailUI.primary, fontSize: 13, fontWeight: '700' },

  // Hero
  hero: { paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  heroTopRow: { minHeight: 56, paddingHorizontal: 16, paddingTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  heroNavTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  heroContent: { paddingHorizontal: 20, paddingTop: 16 },
  lotIdentityRow: { flexDirection: 'row', alignItems: 'center' },
  heroLotIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  lotIdentityText: { flex: 1, marginLeft: 12, marginRight: 8 },
  heroLotNumber: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  heroTitle: { marginTop: 3, color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  heroSubtitle: { marginTop: 4, color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, fontWeight: '800' },
  heroStats: { marginTop: 20, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.11)' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  heroStatLabel: { marginTop: 4, color: 'rgba(255,255,255,0.55)', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  heroStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.17)' },

  // Section helpers
  eyebrow: { fontSize: 9, fontWeight: '700', color: DetailUI.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: DetailUI.ink, letterSpacing: -0.2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  locationText: { flex: 1, color: DetailUI.muted, fontSize: 13, lineHeight: 19 },

  // Health
  healthHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  livePill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E8F7EF' },
  livePillAlert: { backgroundColor: DetailUI.dangerSoft },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#059669' },
  liveDotAlert: { backgroundColor: DetailUI.danger },
  liveText: { color: '#087D58', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  liveTextAlert: { color: DetailUI.danger },
  healthGrid: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  healthTile: { flex: 1, padding: 16, borderRadius: 16 },
  healthValue: { marginTop: 14, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  healthLabel: { marginTop: 4, color: DetailUI.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  healthFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  healthFooterText: { flex: 1, color: DetailUI.muted, fontSize: 12, lineHeight: 17 },

  // Fact grid
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  factTile: { width: '47%', minHeight: 58, padding: 10, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#F3F5F1' },
  factIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8EDE8' },
  factLabel: { color: DetailUI.muted, fontSize: 10, fontWeight: '600' },
  factValue: { marginTop: 2, color: DetailUI.ink, fontSize: 13, fontWeight: '800' },

  // Rent card
  rentCard: {
    padding: 18, borderRadius: 18, marginBottom: 12,
    backgroundColor: '#FFF7E5', borderWidth: 1, borderColor: '#F2DFB2',
  },
  rentAmount: { marginTop: 8, color: '#B77912', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  rentFormula: { marginTop: 6, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  rentFormulaText: { color: '#887553', fontSize: 12, fontWeight: '600' },
  rentFormulaOp: { color: '#C49C53', fontSize: 13, fontWeight: '800' },

  // Finance card
  financeCard: { borderColor: '#D8E7F8' },
  financeTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  financeBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EFF6FF' },
  financeBadgeText: { color: '#2563EB', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  financeTitle: { color: DetailUI.ink, fontSize: 19, fontWeight: '800' },
  financeDesc: { marginTop: 6, color: DetailUI.muted, fontSize: 13, lineHeight: 19 },
  financeValues: { marginTop: 16, padding: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F7FAFC' },
  financeLabel: { color: DetailUI.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  financeVal: { marginTop: 4, color: DetailUI.ink, fontSize: 15, fontWeight: '800' },
  financeDivider: { width: 1, marginHorizontal: 12, backgroundColor: DetailUI.border },
  financeBtn: { minHeight: 50, marginTop: 14, borderRadius: 14, backgroundColor: DetailUI.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  financeBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },

  // Bottom dock
  bottomDock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    flexDirection: 'row', gap: 10,
    borderTopWidth: 1, borderTopColor: DetailUI.borderSoft,
    backgroundColor: 'rgba(242,244,240,0.97)',
  },
  receiptBtn: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F3EE' },
  listBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  listBtnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 16, minHeight: 54 },
  listBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});