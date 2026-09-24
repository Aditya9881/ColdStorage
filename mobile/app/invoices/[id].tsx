/**
 * SheetKosh — Invoice Detail Screen (Unified UI)
 *
 * Uses shared components: DetailScreenHeader, SectionCard, SectionHeader,
 * DetailRow, DetailGrid, DetailBottomBar, CardDivider
 *
 * Features:
 * - Invoice hero card (number, status, balance due)
 * - Facility + depositor info
 * - Linked lot (navigable)
 * - Line items with totals
 * - Notes
 * - Bottom bar: Share + Pay
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { api } from '@/lib/api-client';
import { hapticLight } from '@/lib/haptics';
import StatusChip from '@/components/ui/StatusChip';

import DetailScreenHeader from '@/components/DetailScreenHeader';
import DetailBottomBar from '@/components/DetailBottomBar';
import {
  SectionCard, SectionHeader, DetailRow, DetailGrid, CardDivider, DetailUI,
} from '@/components/DetailScreenCard';

// ─── Types ──────────────────────────────────────────────────

interface LineItem {
  id: string; description: string; commodity?: string;
  weightKg?: number; ratePerKgPerDay?: number; days?: number;
  quantity: number; rate: number; amount: number;
}

interface InvoiceDetail {
  id: string; invoiceNumber: string;
  facility?: { id: string; name: string; addressLine1?: string; city?: string };
  depositor?: { id: string; fullName: string; phone: string };
  lot?: { id: string; lotNumber: string; commodityName?: string };
  lineItems: LineItem[]; subtotal: number; taxRate: number;
  taxAmount: number; totalAmount: number; paidAmount: number;
  status: string; dueDate: string | null; createdAt: string;
  paidAt: string | null; notes?: string;
}

// ─── Component ──────────────────────────────────────────────

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<any>(`/invoices/${id}`);
      if (res.success && res.data) setInvoice(res.data);
      else setInvoice(null);
    } catch { setInvoice(null); } finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { fetchInvoice(); }, [fetchInvoice]));

  const fmt = (amount: number | undefined | null) =>
    `₹${(amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleShare = async () => {
    if (!invoice) return;
    try {
      setSharing(true);
      await Share.share({
        title: `Invoice ${invoice.invoiceNumber}`,
        message: `Invoice ${invoice.invoiceNumber}\nTotal: ${fmt(invoice.totalAmount)}\nPaid: ${fmt(invoice.paidAmount)}\nStatus: ${invoice.status}\nFacility: ${invoice.facility?.name || 'N/A'}\nDue: ${fmtDate(invoice.dueDate)}`,
      });
    } catch {} finally { setSharing(false); }
  };

  const handlePayment = () => {
    if (!invoice) return;
    const remaining = invoice.totalAmount - invoice.paidAmount;
    Alert.alert('Make Payment', `Pay ${fmt(remaining)} for invoice ${invoice.invoiceNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pay via Razorpay', onPress: () => Alert.alert('Payment Gateway', 'Razorpay flow will be initiated here.') },
    ]);
  };

  // ── Loading ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.center}>
          <StatusBar barStyle="dark-content" />
          <View style={s.loadingOrb}>
            <Ionicons name="document-text-outline" size={28} color={DetailUI.primary} />
          </View>
          <ActivityIndicator size="small" color={DetailUI.primary} />
          <Text style={s.centerTitle}>Loading invoice</Text>
          <Text style={s.centerSub}>Fetching invoice details</Text>
        </View>
      </>
    );
  }

  // ── Not Found ──
  if (!invoice) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.center}>
          <StatusBar barStyle="dark-content" />
          <View style={s.emptyIcon}>
            <Ionicons name="document-text-outline" size={36} color={DetailUI.subtle} />
          </View>
          <Text style={s.centerTitle}>Invoice not found</Text>
          <Text style={s.centerSub}>We could not load this invoice right now.</Text>
          <TouchableOpacity style={s.goBackBtn} onPress={() => router.back()} activeOpacity={0.84}>
            <Ionicons name="arrow-back" size={16} color={DetailUI.primary} />
            <Text style={s.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const remaining = invoice.totalAmount - invoice.paidAmount;
  const canPay = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && remaining > 0;
  const isOverdue = invoice.status === 'OVERDUE';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* ─── Header ─── */}
        <DetailScreenHeader
          title="Invoice"
          subtitle={invoice.invoiceNumber}
          onBack={() => router.back()}
          rightAction={{ icon: 'share-outline', onPress: handleShare }}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          {/* ─── Hero Card ─── */}
          <SectionCard>
            <View style={s.heroTop}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={s.heroEyebrow}>INVOICE NUMBER</Text>
                <Text style={s.heroNumber}>{invoice.invoiceNumber}</Text>
              </View>
              <StatusChip status={invoice.status} size="md" />
            </View>

            <CardDivider />

            {/* Balance Due */}
            <View style={s.balancePanel}>
              <Text style={s.balanceLabel}>Balance Due</Text>
              <Text style={[s.balanceValue, { color: isOverdue ? DetailUI.danger : DetailUI.primary }]}>
                {fmt(remaining)}
              </Text>
              <View style={s.balanceMeta}>
                <View style={s.metaPill}>
                  <Text style={s.metaPillLabel}>Issued</Text>
                  <Text style={s.metaPillValue}>{fmtDate(invoice.createdAt)}</Text>
                </View>
                <View style={[s.metaPill, isOverdue && { backgroundColor: DetailUI.dangerSoft }]}>
                  <Text style={s.metaPillLabel}>Due</Text>
                  <Text style={[s.metaPillValue, isOverdue && { color: DetailUI.danger }]}>{fmtDate(invoice.dueDate)}</Text>
                </View>
              </View>
            </View>

            <CardDivider />

            {/* Total / Paid stats */}
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Total</Text>
                <Text style={s.statValue}>{fmt(invoice.totalAmount)}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Paid</Text>
                <Text style={[s.statValue, { color: DetailUI.success }]}>{fmt(invoice.paidAmount)}</Text>
              </View>
            </View>
          </SectionCard>

          {/* ─── Facility ─── */}
          {invoice.facility && (
            <SectionCard>
              <SectionHeader icon="business-outline" title="Facility" eyebrow="BILLING FROM" />
              <DetailGrid>
                <DetailRow icon="business-outline" label="Name" value={invoice.facility.name} />
                <DetailRow icon="location-outline" label="Address" value={[invoice.facility.addressLine1, invoice.facility.city].filter(Boolean).join(', ') || '—'} />
              </DetailGrid>
            </SectionCard>
          )}

          {/* ─── Depositor ─── */}
          {invoice.depositor && (
            <SectionCard>
              <SectionHeader icon="person-outline" title="Depositor" eyebrow="BILLING TO" iconBg="#EFF6FF" iconColor="#3B82F6" />
              <DetailGrid>
                <DetailRow icon="person-outline" label="Name" value={invoice.depositor.fullName} />
                <DetailRow icon="call-outline" label="Phone" value={invoice.depositor.phone} />
              </DetailGrid>
            </SectionCard>
          )}

          {/* ─── Linked Lot ─── */}
          {invoice.lot && (
            <TouchableOpacity onPress={() => router.push(`/lots/${invoice.lot!.id}`)} activeOpacity={0.88}>
              <SectionCard accentColor={DetailUI.primaryMid}>
                <View style={s.linkedRow}>
                  <View style={s.linkedIcon}>
                    <Ionicons name="cube-outline" size={18} color={DetailUI.primaryMid} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.linkedTitle}>Linked Lot</Text>
                    <Text style={s.linkedSub}>{invoice.lot.lotNumber}</Text>
                    {invoice.lot.commodityName && <Text style={s.linkedSub}>{invoice.lot.commodityName}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={DetailUI.subtle} />
                </View>
              </SectionCard>
            </TouchableOpacity>
          )}

          {/* ─── Line Items ─── */}
          <SectionCard>
            <SectionHeader icon="list-outline" title="Line Items" eyebrow="CHARGES" iconBg="#FFF7ED" iconColor="#D97706" />
            {(invoice.lineItems || []).map((item, idx) => (
              <View key={item.id || idx} style={[s.lineItem, idx > 0 && s.lineItemBorder]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.lineDesc}>{item.description}</Text>
                  <Text style={s.lineMeta}>
                    {item.quantity} × {fmt(item.rate)}
                    {item.days ? ` · ${item.days} days` : ''}
                    {item.weightKg ? ` · ${item.weightKg} kg` : ''}
                  </Text>
                  {item.commodity && <Text style={s.lineSubMeta}>{item.commodity}</Text>}
                </View>
                <Text style={s.lineAmount}>{fmt(item.amount)}</Text>
              </View>
            ))}

            {/* Totals */}
            <View style={s.totalsCard}>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Subtotal</Text>
                <Text style={s.totalValue}>{fmt(invoice.subtotal)}</Text>
              </View>
              {invoice.taxAmount > 0 && (
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Tax ({(invoice.taxRate * 100).toFixed(0)}%)</Text>
                  <Text style={s.totalValue}>{fmt(invoice.taxAmount)}</Text>
                </View>
              )}
              <View style={[s.totalRow, s.totalBreak]}>
                <Text style={s.grandLabel}>Total</Text>
                <Text style={s.grandValue}>{fmt(invoice.totalAmount)}</Text>
              </View>
              {invoice.paidAmount > 0 && (
                <>
                  <View style={s.totalRow}>
                    <Text style={[s.totalLabel, { color: DetailUI.success }]}>Paid</Text>
                    <Text style={[s.totalValue, { color: DetailUI.success }]}>- {fmt(invoice.paidAmount)}</Text>
                  </View>
                  <View style={s.totalRow}>
                    <Text style={[s.totalLabel, { color: isOverdue ? DetailUI.danger : DetailUI.warning, fontWeight: '800' }]}>Balance Due</Text>
                    <Text style={[s.totalValue, { color: isOverdue ? DetailUI.danger : DetailUI.warning, fontWeight: '900' }]}>{fmt(remaining)}</Text>
                  </View>
                </>
              )}
            </View>
          </SectionCard>

          {/* ─── Notes ─── */}
          {invoice.notes && (
            <SectionCard>
              <SectionHeader icon="chatbubble-outline" title="Notes" />
              <View style={s.noteBox}>
                <Text style={s.noteText}>{invoice.notes}</Text>
              </View>
            </SectionCard>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* ─── Bottom Bar ─── */}
        <DetailBottomBar
          secondaryLabel="Share"
          secondaryIcon="share-outline"
          onSecondary={handleShare}
          primaryLabel={canPay ? `Pay ${fmt(remaining)}` : undefined}
          primaryIcon={canPay ? 'card-outline' : undefined}
          onPrimary={canPay ? handlePayment : undefined}
        />
      </View>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DetailUI.canvas },
  scrollContent: { padding: 16, paddingTop: 12 },

  // Center states
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DetailUI.canvas, padding: 28 },
  loadingOrb: { width: 70, height: 70, borderRadius: 22, backgroundColor: '#E8F3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyIcon: { width: 70, height: 70, borderRadius: 22, backgroundColor: '#ECF0EB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  centerTitle: { fontSize: 18, fontWeight: '800', color: DetailUI.ink, marginTop: 8 },
  centerSub: { fontSize: 13, color: DetailUI.muted, marginTop: 6, textAlign: 'center' },
  goBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  goBackText: { fontSize: 14, fontWeight: '700', color: DetailUI.primary },

  // Hero
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  heroEyebrow: { fontSize: 9, fontWeight: '700', color: DetailUI.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroNumber: { fontSize: 20, fontWeight: '900', color: DetailUI.ink, letterSpacing: -0.3, marginTop: 2 },

  // Balance
  balancePanel: { alignItems: 'center', paddingVertical: 8 },
  balanceLabel: { fontSize: 11, fontWeight: '600', color: DetailUI.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  balanceValue: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5, marginTop: 4 },
  balanceMeta: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metaPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F3F5F1' },
  metaPillLabel: { fontSize: 9, fontWeight: '700', color: DetailUI.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  metaPillValue: { fontSize: 12, fontWeight: '700', color: DetailUI.ink, marginTop: 2 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  statCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#F3F5F1' },
  statLabel: { fontSize: 10, fontWeight: '700', color: DetailUI.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: 16, fontWeight: '800', color: DetailUI.ink, marginTop: 4 },

  // Linked
  linkedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkedIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#E8F3EE', alignItems: 'center', justifyContent: 'center' },
  linkedTitle: { fontSize: 14, fontWeight: '700', color: DetailUI.ink },
  linkedSub: { fontSize: 12, color: DetailUI.muted, marginTop: 1 },

  // Line items
  lineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  lineItemBorder: { borderTopWidth: 1, borderTopColor: DetailUI.borderSoft },
  lineDesc: { fontSize: 14, fontWeight: '600', color: DetailUI.ink },
  lineMeta: { fontSize: 11, color: DetailUI.muted, marginTop: 3 },
  lineSubMeta: { fontSize: 10, color: DetailUI.subtle, marginTop: 2 },
  lineAmount: { fontSize: 14, fontWeight: '700', color: DetailUI.ink },

  // Totals
  totalsCard: { marginTop: 12, padding: 14, borderRadius: 14, backgroundColor: '#F3F5F1' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  totalLabel: { fontSize: 13, fontWeight: '500', color: DetailUI.muted },
  totalValue: { fontSize: 13, fontWeight: '600', color: DetailUI.ink },
  totalBreak: { borderTopWidth: 1, borderTopColor: DetailUI.border, marginTop: 6, paddingTop: 10 },
  grandLabel: { fontSize: 14, fontWeight: '800', color: DetailUI.ink },
  grandValue: { fontSize: 16, fontWeight: '900', color: DetailUI.ink },

  // Notes
  noteBox: { backgroundColor: '#F3F5F1', borderRadius: 10, padding: 12 },
  noteText: { fontSize: 13, color: DetailUI.muted, lineHeight: 18 },
});