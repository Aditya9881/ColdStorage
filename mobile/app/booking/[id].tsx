/**
 * SheetKosh — Booking Detail Screen (Unified UI)
 *
 * Redesigned to use shared components:
 * - DetailScreenHeader (gradient header)
 * - SectionCard, SectionHeader, DetailRow (card system)
 * - DetailBottomBar (sticky action bar)
 *
 * Features:
 * - Status timeline (step progress)
 * - QR Code (scannable, shown after owner confirms)
 * - Facility info, commodity details, schedule, pricing
 * - Action buttons (Cancel, Request Dispatch)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform, ActivityIndicator, Alert, Share,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { api } from '@/lib/api-client';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import QRCode from 'react-native-qrcode-svg';

import DetailScreenHeader from '@/components/DetailScreenHeader';
import DetailBottomBar from '@/components/DetailBottomBar';
import {
  SectionCard, SectionHeader, DetailRow, DetailGrid, CardDivider, InfoPill, DetailUI,
} from '@/components/DetailScreenCard';

// ─── Status Config ──────────────────────────────────────────

const STATUS_STEPS = [
  { key: 'PENDING', label: 'Pending', icon: 'hourglass-outline', color: '#F59E0B' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: 'checkmark-circle-outline', color: '#0E6B5A' },
  { key: 'ARRIVED', label: 'Arrived', icon: 'location-outline', color: '#3B82F6' },
  { key: 'WEIGHING', label: 'Weighing', icon: 'scale-outline', color: '#8B5CF6' },
  { key: 'STORED', label: 'Stored', icon: 'cube-outline', color: '#059669' },
  { key: 'DISPATCH_REQUESTED', label: 'Dispatch', icon: 'arrow-up-circle-outline', color: '#F97316' },
  { key: 'DISPATCHED', label: 'Dispatched', icon: 'car-outline', color: '#06B6D4' },
  { key: 'COMPLETED', label: 'Complete', icon: 'trophy-outline', color: '#10B981' },
] as const;

const TERMINAL_STATUSES = ['CANCELLED', 'REJECTED', 'COMPLETED'];

const STATUS_DOT_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#0E6B5A',
  ARRIVED: '#3B82F6',
  WEIGHING: '#8B5CF6',
  STORED: '#059669',
  DISPATCH_REQUESTED: '#F97316',
  DISPATCHED: '#06B6D4',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
  REJECTED: '#EF4444',
};

// ─── Component ──────────────────────────────────────────────

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const res = await api.get<any>(`/bookings/${id}`);
      if (res.success && res.data) setBooking(res.data);
    } catch (err) {
      console.error('Failed to fetch booking', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  const handleAction = useCallback(async (action: string, body: any = {}) => {
    setActionLoading(true);
    try {
      const res = await api.patch<any>(`/bookings/${id}/status`, { status: action, ...body });
      if (res.success) {
        hapticSuccess();
        setBooking(res.data);
        Alert.alert('Success', `Booking ${action.toLowerCase().replace(/_/g, ' ')}`);
      } else {
        hapticError();
        Alert.alert('Error', res.error?.message || 'Action failed');
      }
    } catch (err: any) {
      hapticError();
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  }, [id]);

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => handleAction('CANCELLED', { cancelReason: 'Cancelled by farmer' }) },
    ]);
  };

  const handleDispatchRequest = () => {
    Alert.alert('Request Dispatch', 'Request dispatch of your stored commodity?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Request', onPress: () => handleAction('DISPATCH_REQUESTED') },
    ]);
  };

  const handleShare = async () => {
    if (!booking) return;
    try {
      await Share.share({
        message: `SheetKosh Booking #${booking.bookingNumber}\nFacility: ${booking.facility?.name}\nCommodity: ${booking.commodityName}\nStatus: ${booking.status}\nDate: ${booking.preferredDate}`,
      });
    } catch {}
  };

  const currentStepIndex = booking ? STATUS_STEPS.findIndex(s => s.key === booking.status) : 0;
  const isTerminal = booking && TERMINAL_STATUSES.includes(booking.status);

  // ── Loading State ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={DetailUI.primary} />
          <Text style={s.centerText}>Loading booking...</Text>
        </View>
      </>
    );
  }

  // ── Not Found ──
  if (!booking) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Ionicons name="alert-circle-outline" size={36} color={DetailUI.subtle} />
          </View>
          <Text style={s.emptyTitle}>Booking not found</Text>
          <TouchableOpacity style={s.linkBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={16} color={DetailUI.primary} />
            <Text style={s.linkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const statusLabel = booking.status.replace(/_/g, ' ');
  const dotColor = STATUS_DOT_COLORS[booking.status] || '#9DA6B4';

  // ── Bottom bar config ──
  const showCancel = ['PENDING', 'CONFIRMED'].includes(booking.status);
  const showDispatch = booking.status === 'STORED';
  const showRefresh = !isTerminal && !showCancel && !showDispatch;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.screen}>
        {/* ─── Header ─── */}
        <DetailScreenHeader
          title={`Booking #${booking.bookingNumber}`}
          subtitle={statusLabel}
          statusColor={dotColor}
          onBack={() => router.back()}
          rightAction={{ icon: 'share-outline', onPress: handleShare }}
        />

        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchBooking(); }}
              tintColor={DetailUI.primary}
            />
          }
        >
          {/* ─── Pending Approval Card ─── */}
          {booking.status === 'PENDING' && (
            <SectionCard style={s.pendingCard}>
              <View style={s.pendingIconWrap}>
                <Ionicons name="hourglass-outline" size={32} color="#F59E0B" />
              </View>
              <Text style={s.pendingTitle}>Awaiting Owner Approval</Text>
              <Text style={s.pendingDesc}>
                Your booking request has been sent to{' '}
                <Text style={{ fontWeight: '700' }}>{booking.facility?.name || 'the facility'}</Text>.
                {'\n\n'}Your booking QR code and confirmation will appear here once approved.
              </Text>
              <View style={s.pendingBadge}>
                <View style={[s.dotSmall, { backgroundColor: '#F59E0B' }]} />
                <Text style={s.pendingBadgeText}>PENDING APPROVAL</Text>
              </View>
            </SectionCard>
          )}

          {/* ─── QR Code ─── */}
          {booking.qrCodeData && booking.status !== 'PENDING' && !isTerminal && (
            <SectionCard style={s.qrCard}>
              <Text style={s.qrTitle}>Show this at the facility</Text>
              <View style={s.qrBox}>
                <QRCode
                  value={booking.qrCodeData}
                  size={180}
                  color="#0B2520"
                  backgroundColor="#FFFFFF"
                  ecl="M"
                />
              </View>
              <Text style={s.qrBookingNo}>{booking.bookingNumber}</Text>
              <Text style={s.qrHint}>Staff will scan this QR code when you arrive</Text>
            </SectionCard>
          )}

          {/* ─── Status Timeline ─── */}
          <SectionCard>
            <SectionHeader icon="git-branch-outline" title="Booking Progress" eyebrow="STATUS" />
            <View style={s.timeline}>
              {STATUS_STEPS.map((step, i) => {
                const isActive = i <= currentStepIndex;
                const isCurrent = step.key === booking.status;
                return (
                  <View key={step.key} style={s.timelineStep}>
                    {i > 0 && <View style={[s.timelineLine, isActive && s.timelineLineActive]} />}
                    <View style={[
                      s.timelineCircle,
                      isActive && { backgroundColor: step.color, borderColor: step.color },
                      isCurrent && s.timelineCircleCurrent,
                    ]}>
                      <Ionicons name={step.icon as any} size={13} color={isActive ? '#FFF' : '#D1D5DB'} />
                    </View>
                    <Text style={[s.timelineLabel, isActive && { color: DetailUI.ink, fontWeight: '600' }]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Terminal status badges */}
            {(booking.status === 'CANCELLED' || booking.status === 'REJECTED') && (
              <>
                <CardDivider />
                <View style={s.terminalBadge}>
                  <Ionicons name="close-circle" size={18} color={DetailUI.danger} />
                  <Text style={s.terminalText}>
                    {booking.status === 'CANCELLED' ? 'Cancelled' : 'Rejected'}
                    {booking.cancelReason ? `: ${booking.cancelReason}` : ''}
                  </Text>
                </View>
              </>
            )}
          </SectionCard>

          {/* ─── Facility Info ─── */}
          <SectionCard>
            <SectionHeader icon="business-outline" title="Facility" eyebrow="STORAGE" />
            <DetailGrid>
              <DetailRow icon="business-outline" label="Name" value={booking.facility?.name || '—'} />
              <DetailRow
                icon="location-outline"
                label="Location"
                value={[booking.facility?.addressLine1, booking.facility?.city, booking.facility?.state].filter(Boolean).join(', ') || '—'}
              />
              {booking.facility?.contactPhone && (
                <DetailRow icon="call-outline" label="Contact" value={booking.facility.contactPhone} />
              )}
            </DetailGrid>
          </SectionCard>

          {/* ─── Commodity ─── */}
          <SectionCard>
            <SectionHeader icon="leaf-outline" title="Commodity" eyebrow="DETAILS" iconBg="#F0FDF4" iconColor="#059669" />
            <DetailGrid>
              <DetailRow icon="pricetag-outline" label="Category" value={booking.commodityCategory || '—'} />
              <DetailRow icon="leaf-outline" label="Name" value={booking.commodityName || '—'} />
              <DetailRow icon="scale-outline" label="Est. Weight" value={`${booking.estimatedWeightKg || 0} Kg`} />
              {booking.estimatedBags ? <DetailRow icon="cube-outline" label="Est. Bags" value={`${booking.estimatedBags}`} /> : null}
              {booking.actualWeightKg ? <DetailRow icon="checkmark-done-outline" label="Actual Weight" value={`${booking.actualWeightKg} Kg`} valueColor={DetailUI.success} /> : null}
              {booking.actualBags ? <DetailRow icon="checkmark-done-outline" label="Actual Bags" value={`${booking.actualBags}`} /> : null}
            </DetailGrid>
          </SectionCard>

          {/* ─── Schedule ─── */}
          <SectionCard>
            <SectionHeader icon="calendar-outline" title="Schedule" eyebrow="TIMING" iconBg="#EFF6FF" iconColor="#3B82F6" />
            <DetailGrid>
              <DetailRow
                icon="calendar-outline"
                label="Preferred Date"
                value={new Date(booking.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              />
              {booking.preferredSlot && <DetailRow icon="time-outline" label="Time Slot" value={booking.preferredSlot} />}
              {booking.storageDuration && <DetailRow icon="hourglass-outline" label="Duration" value={`${booking.storageDuration} days`} />}
              {booking.arrivedAt && <DetailRow icon="log-in-outline" label="Arrived" value={new Date(booking.arrivedAt).toLocaleString('en-IN')} />}
            </DetailGrid>
          </SectionCard>

          {/* ─── Pricing ─── */}
          {(booking.ratePerUnit || booking.totalAmount) && (
            <SectionCard>
              <SectionHeader icon="cash-outline" title="Pricing" eyebrow="FINANCIALS" iconBg="#FFF7ED" iconColor="#D97706" />
              <DetailGrid>
                {booking.ratePerUnit && <DetailRow icon="cash-outline" label="Rate" value={`₹${booking.ratePerUnit}`} valueColor="#D8B24A" valueBold />}
                {booking.totalAmount && <DetailRow icon="receipt-outline" label="Total" value={`₹${booking.totalAmount}`} valueColor="#D8B24A" valueBold />}
                {booking.advancePaid && <DetailRow icon="wallet-outline" label="Advance Paid" value={`₹${booking.advancePaid}`} />}
              </DetailGrid>
            </SectionCard>
          )}

          {/* ─── Notes ─── */}
          {(booking.farmerNote || booking.ownerNote) && (
            <SectionCard>
              <SectionHeader icon="chatbubble-outline" title="Notes" />
              {booking.farmerNote && (
                <View style={s.noteBox}>
                  <Ionicons name="person-outline" size={14} color={DetailUI.muted} />
                  <Text style={s.noteText}>{booking.farmerNote}</Text>
                </View>
              )}
              {booking.ownerNote && (
                <View style={[s.noteBox, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="business-outline" size={14} color={DetailUI.primary} />
                  <Text style={[s.noteText, { color: DetailUI.primary }]}>{booking.ownerNote}</Text>
                </View>
              )}
            </SectionCard>
          )}

          {/* ─── Linked Lot ─── */}
          {booking.lot && (
            <TouchableOpacity onPress={() => router.push(`/lots/${booking.lot.id}`)} activeOpacity={0.88}>
              <SectionCard accentColor={DetailUI.primaryMid}>
                <View style={s.linkedRow}>
                  <View style={s.linkedIcon}>
                    <Ionicons name="file-tray-outline" size={18} color={DetailUI.primaryMid} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.linkedTitle}>Inventory Lot</Text>
                    <Text style={s.linkedSub}>Lot #{booking.lot.lotNumber} • Receipt #{booking.lot.receiptNumber}</Text>
                    <Text style={s.linkedSub}>Weight: {booking.lot.currentWeightKg} Kg • {booking.lot.status}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={DetailUI.subtle} />
                </View>
              </SectionCard>
            </TouchableOpacity>
          )}

          {/* Spacer for bottom bar */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ─── Bottom Action Bar ─── */}
        {!isTerminal && (
          <DetailBottomBar
            primaryLabel={showDispatch ? 'Request Dispatch' : showRefresh ? 'Refresh Status' : undefined}
            primaryIcon={showDispatch ? 'arrow-up-circle-outline' : showRefresh ? 'refresh-outline' : undefined}
            onPrimary={showDispatch ? handleDispatchRequest : showRefresh ? () => { setRefreshing(true); fetchBooking(); hapticLight(); } : undefined}
            primaryLoading={actionLoading}
            secondaryLabel={showCancel ? 'Cancel' : undefined}
            secondaryIcon={showCancel ? 'close-circle-outline' : undefined}
            onSecondary={showCancel ? handleCancel : undefined}
            secondaryDanger={showCancel}
          />
        )}
      </View>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DetailUI.canvas },
  scrollContent: { padding: 16, paddingTop: 12 },

  // Center states
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DetailUI.canvas, gap: 12, padding: 30 },
  centerText: { fontSize: 14, color: DetailUI.muted, fontWeight: '500' },
  emptyIcon: {
    width: 70, height: 70, borderRadius: 20,
    backgroundColor: '#ECF0EB', alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: DetailUI.border,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: DetailUI.ink, letterSpacing: -0.2 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  linkText: { fontSize: 14, fontWeight: '600', color: DetailUI.primary },

  // Pending card
  pendingCard: {
    backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1.5,
    alignItems: 'center',
  },
  pendingIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  pendingTitle: { fontSize: 16, fontWeight: '700', color: '#92400E', marginBottom: 8, textAlign: 'center' },
  pendingDesc: { fontSize: 13, color: '#78716C', lineHeight: 20, textAlign: 'center', paddingHorizontal: 8 },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14,
    paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: '#FEF3C7', borderRadius: 20, borderWidth: 1, borderColor: '#FDE68A',
  },
  pendingBadgeText: { fontSize: 10, fontWeight: '700', color: '#B45309', letterSpacing: 0.8 },
  dotSmall: { width: 7, height: 7, borderRadius: 3.5 },

  // QR card
  qrCard: { alignItems: 'center' },
  qrTitle: { fontSize: 13, fontWeight: '600', color: DetailUI.muted, marginBottom: 16 },
  qrBox: {
    width: 200, height: 200, backgroundColor: '#FFF',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: DetailUI.border,
  },
  qrBookingNo: { fontSize: 18, fontWeight: '800', color: DetailUI.ink, marginTop: 16, letterSpacing: 1 },
  qrHint: { fontSize: 12, color: DetailUI.subtle, marginTop: 4, textAlign: 'center' },

  // Timeline
  timeline: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  timelineStep: { alignItems: 'center', width: '12%', position: 'relative' },
  timelineLine: {
    position: 'absolute', top: 13, left: -12, right: 12,
    height: 2, backgroundColor: DetailUI.border, zIndex: -1,
  },
  timelineLineActive: { backgroundColor: DetailUI.primaryMid },
  timelineCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F3F5F1', borderWidth: 2, borderColor: DetailUI.border,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineCircleCurrent: {
    shadowColor: DetailUI.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  timelineLabel: { fontSize: 8, color: DetailUI.subtle, marginTop: 4, textAlign: 'center' },

  terminalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 10,
    backgroundColor: DetailUI.dangerSoft, borderWidth: 1, borderColor: '#FECACA',
  },
  terminalText: { color: DetailUI.danger, fontWeight: '600', fontSize: 13, flex: 1 },

  // Notes
  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F3F5F1', borderRadius: 10, padding: 12, marginBottom: 8,
  },
  noteText: { fontSize: 13, color: DetailUI.muted, flex: 1, lineHeight: 18 },

  // Linked lot
  linkedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkedIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#E8F3EE', alignItems: 'center', justifyContent: 'center',
  },
  linkedTitle: { fontSize: 14, fontWeight: '700', color: DetailUI.ink },
  linkedSub: { fontSize: 12, color: DetailUI.muted, marginTop: 2 },
});
