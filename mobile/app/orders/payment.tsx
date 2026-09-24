/**
 * Payment Initiation Screen — Buyer pays into escrow via Razorpay
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
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';
import StatusChip from '@/components/ui/StatusChip';

interface OrderSummary {
  id: string;
  orderNumber?: string;
  listing?: {
    id: string;
    lot?: { commodityName?: string; lotNumber?: string };
    askingPricePerKg?: number;
  };
  seller?: { fullName: string };
  quantityKg: number;
  agreedPricePerKg: number;
  totalAmount: number;
  status: string;
}

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await api.get<any>(`/orders/${orderId}`);
      if (res.success && res.data) {
        setOrder(res.data);
      }
    } catch (err) {
      console.error('[Payment] Order fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      fetchOrder();
    }, [fetchOrder])
  );

  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handlePayment = async () => {
    if (!order) return;

    setProcessing(true);
    try {
      // Step 1: Initiate escrow payment on backend
      const res = await api.post<any>(`/escrow/${order.id}/pay`, {
        paymentMethod: 'RAZORPAY',
        amount: order.totalAmount,
      });

      if (res.success) {
        // In production, this would open Razorpay's native SDK
        // For now, we simulate a successful payment
        Alert.alert(
          '✅ Payment Successful',
          `${formatCurrency(order.totalAmount)} has been secured in escrow. The seller will be notified.`,
          [
            {
              text: 'View Order',
              onPress: () => {
                router.back();
                router.push(`/orders/${order.id}`);
              },
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Payment Failed', err?.message || 'Unable to process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="card-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Order not found</Text>
      </View>
    );
  }

  const platformFee = order.totalAmount * 0.02; // 2% platform fee
  const grandTotal = order.totalAmount + platformFee;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Escrow Banner */}
        <View style={[styles.escrowBanner, { backgroundColor: `${colors.info}10`, borderColor: `${colors.info}20` }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.info} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.escrowTitle, { color: colors.info }]}>Secure Escrow Payment</Text>
            <Text style={[styles.escrowSubtitle, { color: colors.textSecondary }]}>
              Your payment is held securely until you confirm receipt of goods.
            </Text>
          </View>
        </View>

        {/* Order Summary */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>ORDER SUMMARY</Text>

          {order.listing?.lot?.commodityName && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Commodity</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{order.listing.lot.commodityName}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Quantity</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{order.quantityKg.toLocaleString()} kg</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Price/kg</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(order.agreedPricePerKg)}</Text>
          </View>
          {order.seller && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Seller</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{order.seller.fullName}</Text>
            </View>
          )}
        </View>

        {/* Payment Breakdown */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>PAYMENT BREAKDOWN</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(order.totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Platform Fee (2%)</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(platformFee)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.grandLabel, { color: colors.text }]}>Total Payable</Text>
            <Text style={[styles.grandValue, { color: colors.primary }]}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>PAYMENT METHOD</Text>
          <TouchableOpacity style={[styles.paymentMethod, styles.paymentMethodActive, { borderColor: colors.primary }]} activeOpacity={0.7}>
            <View style={[styles.paymentMethodIcon, { backgroundColor: '#3395FF15' }]}>
              <Text style={styles.razorpayLogo}>R</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.paymentMethodName, { color: colors.text }]}>Razorpay</Text>
              <Text style={[styles.paymentMethodDesc, { color: colors.textTertiary }]}>UPI, Cards, Net Banking</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: processing ? colors.border : colors.primary }]}
          onPress={handlePayment}
          disabled={processing}
          activeOpacity={0.8}
        >
          {processing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color="#FFF" />
              <Text style={styles.payBtnText}>Pay {formatCurrency(grandTotal)}</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
          Payment is secured via Razorpay. Funds are held in escrow until delivery confirmation.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  errorText: { fontSize: FontSize.md },
  scrollContent: { paddingBottom: 160 },
  escrowBanner: {
    flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start',
    margin: Spacing.lg, padding: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  escrowTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  escrowSubtitle: { fontSize: FontSize.xs, marginTop: 2, lineHeight: 18 },
  section: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 1, marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  summaryLabel: { fontSize: FontSize.sm },
  summaryValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  divider: { height: 1, marginVertical: Spacing.md },
  grandLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  grandValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  paymentMethod: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5,
    borderColor: 'transparent',
  },
  paymentMethodActive: { borderColor: '#2D6A4F' },
  paymentMethodIcon: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  razorpayLogo: { fontSize: 22, fontWeight: '900' as any, color: '#3395FF' },
  paymentMethodName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  paymentMethodDesc: { fontSize: FontSize.xs, marginTop: 2 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, paddingBottom: Spacing.xxl, borderTopWidth: 1,
  },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 14, borderRadius: BorderRadius.md,
  },
  payBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#FFFFFF' },
  disclaimer: { fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 18 },
});
