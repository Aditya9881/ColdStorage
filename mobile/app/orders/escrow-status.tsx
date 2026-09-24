/**
 * Escrow Status Tracker — Visual timeline of escrow payment lifecycle
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, useColorScheme, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';
import StatusChip from '@/components/ui/StatusChip';

interface EscrowData {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  pgReferenceId?: string | null;
  buyerPaidAt?: string | null;
  sellerReleasedAt?: string | null;
  disputedAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  order?: {
    id: string;
    quantityKg: number;
    agreedPricePerKg: number;
    status: string;
    buyer?: { fullName: string };
    seller?: { fullName: string };
  };
}

interface TimelineStep {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  date?: string | null;
  done: boolean;
  active: boolean;
  color: string;
}

export default function EscrowStatusScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [escrow, setEscrow] = useState<EscrowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isBuyer = user?.role === 'BUYER';

  const fetchEscrow = useCallback(async () => {
    try {
      // Try to get escrow by order ID
      const res = await api.get<any>(`/escrow?orderId=${orderId}`);
      if (res.success && res.data) {
        const items = Array.isArray(res.data) ? res.data : res.data.escrows || [res.data];
        if (items.length > 0) setEscrow(items[0]);
      }
    } catch (err) {
      console.error('[Escrow] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      fetchEscrow();
    }, [fetchEscrow])
  );

  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleAction = async (action: 'release' | 'dispute' | 'refund') => {
    if (!escrow) return;

    const messages = {
      release: { title: 'Confirm Receipt', msg: 'Confirm you have received the goods? This will release payment to the seller.' },
      dispute: { title: 'Raise Dispute', msg: 'Are you sure you want to dispute this transaction? Our team will review.' },
      refund: { title: 'Request Refund', msg: 'Request a refund for this transaction?' },
    };

    Alert.alert(messages[action].title, messages[action].msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: action === 'dispute' ? 'destructive' : 'default',
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await api.post<any>(`/escrow/${escrow.id}/${action}`);
            if (res.success) {
              Alert.alert('Success', `Action completed successfully.`);
              fetchEscrow();
            }
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Action failed.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!escrow) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="shield-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>No escrow data found</Text>
        <Text style={[styles.errorSubtext, { color: colors.textTertiary }]}>Payment may not have been initiated yet</Text>
      </View>
    );
  }

  // Build timeline
  const timeline: TimelineStep[] = [
    {
      label: 'Escrow Created',
      subtitle: 'Payment escrow initiated',
      icon: 'create-outline',
      date: escrow.createdAt,
      done: true,
      active: escrow.status === 'PENDING',
      color: '#059669',
    },
    {
      label: 'Buyer Paid',
      subtitle: 'Funds secured in escrow',
      icon: 'card-outline',
      date: escrow.buyerPaidAt,
      done: !!escrow.buyerPaidAt,
      active: escrow.status === 'HELD',
      color: '#0891B2',
    },
    {
      label: 'Goods Dispatched',
      subtitle: 'Seller shipped the goods',
      icon: 'car-outline',
      date: null,
      done: escrow.order?.status === 'DISPATCHED' || escrow.order?.status === 'COMPLETED',
      active: escrow.order?.status === 'DISPATCHED',
      color: '#7C3AED',
    },
    {
      label: 'Payment Released',
      subtitle: 'Seller received payment',
      icon: 'checkmark-circle-outline',
      date: escrow.sellerReleasedAt,
      done: escrow.status === 'RELEASED',
      active: false,
      color: '#059669',
    },
  ];

  // If disputed or refunded, add those
  if (escrow.status === 'DISPUTED' || escrow.disputedAt) {
    timeline.push({
      label: 'Disputed',
      subtitle: 'Transaction under review',
      icon: 'warning-outline',
      date: escrow.disputedAt,
      done: true,
      active: escrow.status === 'DISPUTED',
      color: '#DC2626',
    });
  }
  if (escrow.status === 'REFUNDED' || escrow.refundedAt) {
    timeline.push({
      label: 'Refunded',
      subtitle: 'Funds returned to buyer',
      icon: 'arrow-undo-outline',
      date: escrow.refundedAt,
      done: true,
      active: false,
      color: '#D97706',
    });
  }

  // Determine available actions
  const canRelease = isBuyer && escrow.status === 'HELD' && escrow.order?.status === 'DISPATCHED';
  const canDispute = isBuyer && escrow.status === 'HELD';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Amount Card */}
        <View style={[styles.amountCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.amountLabel}>ESCROW AMOUNT</Text>
          <Text style={styles.amountValue}>{formatCurrency(escrow.amount)}</Text>
          <StatusChip status={escrow.status} size="md" />
          {escrow.pgReferenceId && (
            <Text style={styles.refId}>Ref: {escrow.pgReferenceId}</Text>
          )}
        </View>

        {/* Timeline */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>PAYMENT TIMELINE</Text>
          {timeline.map((step, idx) => (
            <View key={idx} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[
                  styles.timelineDot,
                  {
                    backgroundColor: step.done ? step.color : colors.border,
                    borderWidth: step.active ? 3 : 0,
                    borderColor: step.active ? `${step.color}40` : 'transparent',
                  },
                ]}>
                  <Ionicons
                    name={step.icon}
                    size={16}
                    color={step.done ? '#FFF' : colors.textTertiary}
                  />
                </View>
                {idx < timeline.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: step.done ? `${step.color}40` : colors.borderLight }]} />
                )}
              </View>
              <View style={styles.timelineRight}>
                <Text style={[
                  styles.timelineLabel,
                  { color: step.done ? colors.text : colors.textTertiary, fontWeight: step.active ? FontWeight.bold : FontWeight.semibold },
                ]}>
                  {step.label}
                  {step.active && ' ●'}
                </Text>
                <Text style={[styles.timelineSub, { color: colors.textTertiary }]}>{step.subtitle}</Text>
                {step.date && (
                  <Text style={[styles.timelineDate, { color: colors.textTertiary }]}>
                    {formatDate(step.date)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Parties */}
        {escrow.order && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>TRANSACTION PARTIES</Text>
            {escrow.order.buyer && (
              <View style={styles.partyRow}>
                <Ionicons name="person-outline" size={16} color={colors.info} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.partyRole, { color: colors.textTertiary }]}>Buyer</Text>
                  <Text style={[styles.partyName, { color: colors.text }]}>{escrow.order.buyer.fullName}</Text>
                </View>
              </View>
            )}
            {escrow.order.seller && (
              <View style={styles.partyRow}>
                <Ionicons name="storefront-outline" size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.partyRole, { color: colors.textTertiary }]}>Seller</Text>
                  <Text style={[styles.partyName, { color: colors.text }]}>{escrow.order.seller.fullName}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {(canRelease || canDispute) && (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {canRelease && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleAction('release')}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>Confirm Receipt & Release</Text>
            </TouchableOpacity>
          )}
          {canDispute && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.disputeBtn]}
              onPress={() => handleAction('dispute')}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="warning" size={18} color="#DC2626" />
              <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Raise Dispute</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  errorText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  errorSubtext: { fontSize: FontSize.sm },
  scrollContent: { paddingBottom: 120 },
  amountCard: {
    margin: Spacing.lg, padding: Spacing.xl, borderRadius: BorderRadius.xl,
    alignItems: 'center', gap: Spacing.sm,
  },
  amountLabel: { fontSize: FontSize.xs, color: '#FFFFFF70', fontWeight: FontWeight.semibold, letterSpacing: 1 },
  amountValue: { fontSize: 32, color: '#FFFFFF', fontWeight: FontWeight.extrabold },
  refId: { fontSize: FontSize.xs, color: '#FFFFFF50', marginTop: Spacing.xs },
  section: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 1, marginBottom: Spacing.md },
  timelineItem: { flexDirection: 'row', minHeight: 60 },
  timelineLeft: { alignItems: 'center', width: 36, marginRight: Spacing.md },
  timelineDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  timelineRight: { flex: 1, paddingBottom: Spacing.md },
  timelineLabel: { fontSize: FontSize.md },
  timelineSub: { fontSize: FontSize.xs, marginTop: 2 },
  timelineDate: { fontSize: FontSize.xs, marginTop: 4 },
  partyRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  partyRole: { fontSize: FontSize.xs },
  partyName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, paddingBottom: Spacing.xxl, borderTopWidth: 1, gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  actionBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#FFFFFF' },
  disputeBtn: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5',
  },
});
