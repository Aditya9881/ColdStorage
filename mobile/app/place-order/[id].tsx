import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, Animated, Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

const BUYER_PRIMARY = '#0F766E';

const COMMODITY_ICON: Record<string, string> = {
  Potato: 'nutrition-outline', Onion: 'ellipse-outline', Tomato: 'ellipse',
  Apple: 'nutrition', Mango: 'leaf-outline', Garlic: 'flower-outline',
  Ginger: 'leaf', Wheat: 'sunny-outline', default: 'cube-outline',
};

type OrderStep = 'review' | 'payment' | 'success';

export default function PlaceOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantityKg, setQuantityKg] = useState('');
  const [step, setStep] = useState<OrderStep>('review');
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');
  const successAnim = useRef(new Animated.Value(0)).current;
  const escrowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchListing();
  }, [id]);

  async function fetchListing() {
    try {
      const res = await api.get<any>(`/marketplace/listings/${id}`);
      if (res.success && res.data) {
        setListing(res.data);
      } else {
        const listRes = await api.get<any>('/marketplace/listings?limit=100');
        if (listRes.success) {
          const found = listRes.data?.listings?.find((l: any) => l.id === id);
          setListing(found || null);
        }
      }
    } catch {
      try {
        const listRes = await api.get<any>('/marketplace/listings?limit=100');
        const found = listRes.data?.listings?.find((l: any) => l.id === id);
        setListing(found || null);
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  function handleQuantityChange(val: string) {
    const num = val.replace(/[^0-9.]/g, '');
    setQuantityKg(num);
  }

  const qty = parseFloat(quantityKg) || 0;
  const price = Number(listing?.askingPricePerKg) || 0;
  const total = qty * price;
  const maxQty = Number(listing?.lot?.currentWeightKg) || 0;
  const minQty = Number(listing?.minQuantityKg) || 1;

  function handleProceedToPayment() {
    if (!qty || qty < minQty) {
      Alert.alert('Invalid Quantity', `Minimum order is ${minQty} kg`);
      return;
    }
    if (qty > maxQty) {
      Alert.alert('Quantity Exceeds Stock', `Only ${maxQty} kg available`);
      return;
    }
    setStep('payment');
    Animated.timing(escrowAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }

  async function handleConfirmPayment() {
    setSubmitting(true);
    try {
      const res = await api.post<any>('/orders', {
        listingId: id,
        quantityKg: qty,
      });
      if (res.success && res.data) {
        setOrderId(res.data.id || res.data.order?.id || 'ORD-' + Date.now());
        setStep('success');
        Vibration.vibrate(200);
        Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }).start();
      } else {
        Alert.alert('Error', 'Failed to place order. Please try again.');
        setStep('review');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Order placement failed');
      setStep('review');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={BUYER_PRIMARY} /></View>;
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#6B7280' }}>Listing not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.lg }}>
          <Text style={{ color: BUYER_PRIMARY, fontWeight: FontWeight.semibold }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lot = listing.lot || {};
  const iconName = COMMODITY_ICON[lot.commodityName] || COMMODITY_ICON.default;

  // SUCCESS SCREEN
  if (step === 'success') {
    return (
      <View style={styles.successContainer}>
        <Animated.View style={[styles.successContent, { transform: [{ scale: successAnim }], opacity: successAnim }]}>
          <LinearGradient colors={['#134E4A', BUYER_PRIMARY]} style={styles.successCircle}>
            <Ionicons name="checkmark-circle" size={36} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.successSubtitle}>Your payment is secured in escrow</Text>

          <View style={styles.successCard}>
            <Ionicons name={iconName as any} size={36} color={BUYER_PRIMARY} style={{ marginBottom: 8 }} />
            <Text style={styles.successCommodity}>{lot.commodityName}</Text>
            <Text style={styles.successQty}>{qty} kg  •  ₹{total.toLocaleString()}</Text>
            <View style={styles.escrowBox}>
              <Ionicons name="lock-closed" size={16} color="#059669" />
              <Text style={styles.escrowText}>₹{total.toLocaleString()} held in escrow</Text>
            </View>
            <Text style={styles.successNote}>
              The farmer will receive an OTP approval request.{'\n'}Funds release upon dispatch confirmation.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => router.replace('/(buyer)/orders')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#134E4A', BUYER_PRIMARY]} style={styles.successBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.successBtnText}>Track My Order</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/(buyer)')} style={styles.browseMore}>
            <Text style={styles.browseMoreText}>Continue Shopping</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // PAYMENT STEP
  if (step === 'payment') {
    return (
      <View style={styles.paymentContainer}>
        <ScrollView contentContainerStyle={styles.paymentScroll}>
          {/* Escrow Banner */}
          <LinearGradient colors={['#1C1C2E', '#2D1B69']} style={styles.escrowHeader}>
            <Ionicons name="lock-closed" size={32} color="#14B8A6" />
            <Text style={styles.escrowTitle}>Secure Escrow Payment</Text>
            <Text style={styles.escrowSub}>Your funds are protected until produce is dispatched</Text>
          </LinearGradient>

          {/* Order Summary */}
          <View style={styles.payCard}>
            <Text style={styles.payCardTitle}>Order Summary</Text>
            <View style={styles.payRow}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}><Ionicons name={iconName as any} size={16} color={BUYER_PRIMARY} /><Text style={styles.payRowLabel}>{lot.commodityName}</Text></View>
              <Text style={styles.payRowValue}>{qty} kg</Text>
            </View>
            <View style={styles.payRow}>
              <Text style={styles.payRowLabel}>Price per kg</Text>
              <Text style={styles.payRowValue}>₹{price.toFixed(0)}</Text>
            </View>
            <View style={[styles.payRow, styles.payRowTotal]}>
              <Text style={styles.payRowTotalLabel}>Total</Text>
              <Text style={[styles.payRowTotalValue, { color: BUYER_PRIMARY }]}>₹{total.toLocaleString()}</Text>
            </View>
            <View style={styles.payRow}>
              <Text style={styles.payRowLabel}>Platform Fee</Text>
              <Text style={[styles.payRowValue, { color: '#059669' }]}>FREE</Text>
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.payCard}>
            <Text style={styles.payCardTitle}>Payment Method</Text>
            <View style={styles.payMethodRow}>
              <View style={[styles.payMethodIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="card" size={20} color={BUYER_PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.payMethodName}>Nodal Escrow Account</Text>
                <Text style={styles.payMethodSub}>Regulated by RBI · Funds held securely</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
            </View>
          </View>

          {/* Escrow explanation */}
          <View style={styles.escrowInfoCard}>
            <Text style={styles.escrowInfoTitle}>How Escrow Protects You 🛡️</Text>
            <View style={styles.escrowStep}><Text style={styles.escrowStepNum}>1</Text><Text style={styles.escrowStepText}>You pay into escrow — farmer can't access yet</Text></View>
            <View style={styles.escrowStep}><Text style={styles.escrowStepNum}>2</Text><Text style={styles.escrowStepText}>Farmer gets an OTP request to approve release</Text></View>
            <View style={styles.escrowStep}><Text style={styles.escrowStepNum}>3</Text><Text style={styles.escrowStepText}>Produce is dispatched after approval</Text></View>
            <View style={styles.escrowStep}><Text style={styles.escrowStepNum}>4</Text><Text style={styles.escrowStepText}>Funds auto-transfer to farmer on delivery</Text></View>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, { opacity: submitting ? 0.7 : 1 }]}
            onPress={handleConfirmPayment}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#134E4A', BUYER_PRIMARY]} style={styles.confirmGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={18} color="#FFF" />
                  <Text style={styles.confirmBtnText}>Pay ₹{total.toLocaleString()} via Escrow</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setStep('review')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Edit Order</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    );
  }

  // REVIEW STEP (default)
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Listing Summary */}
      <View style={styles.summaryHeader}>
        <View style={{width: 48, height: 48, borderRadius: 14, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center'}}>
          <Ionicons name={iconName as any} size={24} color={BUYER_PRIMARY} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryCommodity}>{lot.commodityName}</Text>
          <Text style={styles.summaryLocation}>{lot.facility?.city}, {lot.facility?.state}</Text>
        </View>
        {lot.qualityGrade && (
          <View style={styles.gradeBadge}>
            <Text style={styles.gradeText}>Grade {lot.qualityGrade}</Text>
          </View>
        )}
      </View>

      {/* Quantity Selector */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Select Quantity</Text>

        <View style={styles.qtyInputRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => { const n = Math.max(minQty, qty - 100); setQuantityKg(String(n)); }}
            activeOpacity={0.7}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.qtyInput}
            value={quantityKg}
            onChangeText={handleQuantityChange}
            keyboardType="numeric"
            placeholder="Enter kg"
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => { const n = Math.min(maxQty, qty + 100); setQuantityKg(String(n)); }}
            activeOpacity={0.7}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.qtyMeta}>
          <Text style={styles.qtyMetaText}>Min: {minQty} kg</Text>
          <Text style={styles.qtyMetaText}>Max: {maxQty.toLocaleString()} kg ({(maxQty / 1000).toFixed(1)} MT)</Text>
        </View>

        {/* Quick select */}
        <View style={styles.quickRow}>
          {[500, 1000, 2000, 5000].filter(q => q <= maxQty).map(q => (
            <TouchableOpacity key={q} style={[styles.quickBtn, qty === q && { backgroundColor: BUYER_PRIMARY }]} onPress={() => setQuantityKg(String(q))} activeOpacity={0.7}>
              <Text style={[styles.quickBtnText, qty === q && { color: '#FFF' }]}>{q >= 1000 ? `${q / 1000}MT` : `${q}kg`}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Price Summary */}
      {qty > 0 && (
        <View style={styles.priceSummaryCard}>
          <View style={styles.priceSumRow}>
            <Text style={styles.priceSumLabel}>{qty} kg × ₹{price.toFixed(0)}/kg</Text>
            <Text style={styles.priceSumValue}>₹{total.toLocaleString()}</Text>
          </View>
          <View style={styles.priceSumRow}>
            <Text style={styles.priceSumLabel}>Platform Fee</Text>
            <Text style={[styles.priceSumValue, { color: '#059669' }]}>FREE</Text>
          </View>
          <View style={[styles.priceSumRow, { borderTopWidth: 1, borderTopColor: '#EDE9FE', paddingTop: Spacing.md, marginTop: Spacing.sm }]}>
            <Text style={[styles.priceSumLabel, { fontWeight: FontWeight.bold }]}>Total to Pay</Text>
            <Text style={[styles.priceSumValue, { fontSize: FontSize.xl, color: BUYER_PRIMARY, fontWeight: FontWeight.extrabold }]}>₹{total.toLocaleString()}</Text>
          </View>
        </View>
      )}

      {/* Proceed Button */}
      <View style={styles.proceedContainer}>
        <TouchableOpacity
          style={[styles.proceedBtn, { opacity: qty >= minQty && qty <= maxQty ? 1 : 0.5 }]}
          onPress={handleProceedToPayment}
          disabled={qty < minQty || qty > maxQty}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#134E4A', BUYER_PRIMARY]} style={styles.proceedGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.proceedBtnText}>Review & Pay</Text>
            <Ionicons name="lock-closed" size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.secureNote}>🔒 Secured by ColdStorage Escrow</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: '#FFF', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: '#EDE9FE' },
  summaryEmoji: { fontSize: 36 },
  summaryCommodity: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#1A1A2E' },
  summaryLocation: { fontSize: FontSize.xs, color: '#9CA3AF', marginTop: 2 },
  gradeBadge: { backgroundColor: '#EDE9FE', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  gradeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: BUYER_PRIMARY },
  card: { margin: Spacing.lg, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#1A1A2E', marginBottom: Spacing.lg },
  qtyInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  qtyBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 24, color: BUYER_PRIMARY, fontWeight: FontWeight.bold, lineHeight: 28 },
  qtyInput: { flex: 1, borderWidth: 2, borderColor: BUYER_PRIMARY, borderRadius: BorderRadius.md, padding: Spacing.lg, fontSize: FontSize.xl, textAlign: 'center', fontWeight: FontWeight.bold, color: '#1A1A2E' },
  qtyMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  qtyMetaText: { fontSize: FontSize.xs, color: '#9CA3AF' },
  quickRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  quickBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: '#EDE9FE', borderWidth: 1, borderColor: '#EDE9FE' },
  quickBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: BUYER_PRIMARY },
  priceSummaryCard: { marginHorizontal: Spacing.lg, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  priceSumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceSumLabel: { fontSize: FontSize.md, color: '#6B7280' },
  priceSumValue: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#1A1A2E' },
  proceedContainer: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
  proceedBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  proceedGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  proceedBtnText: { color: '#FFF', fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  secureNote: { textAlign: 'center', fontSize: FontSize.xs, color: '#9CA3AF', marginTop: Spacing.md },
  // Payment styles
  paymentContainer: { flex: 1, backgroundColor: '#F0FDFA' },
  paymentScroll: { paddingBottom: 40 },
  escrowHeader: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  escrowTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#FFF' },
  escrowSub: { fontSize: FontSize.sm, color: '#C4B5FD', textAlign: 'center' },
  payCard: { margin: Spacing.lg, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.lg },
  payCardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#1A1A2E', marginBottom: Spacing.lg },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  payRowLabel: { fontSize: FontSize.md, color: '#6B7280' },
  payRowValue: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#1A1A2E' },
  payRowTotal: { borderBottomWidth: 0, paddingTop: Spacing.md, marginTop: Spacing.sm },
  payRowTotalLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#1A1A2E' },
  payRowTotalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  payMethodRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  payMethodIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  payMethodName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#1A1A2E' },
  payMethodSub: { fontSize: FontSize.xs, color: '#9CA3AF', marginTop: 2 },
  escrowInfoCard: { margin: Spacing.lg, backgroundColor: '#EDE9FE', borderRadius: BorderRadius.lg, padding: Spacing.lg },
  escrowInfoTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#134E4A', marginBottom: Spacing.lg },
  escrowStep: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  escrowStepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: BUYER_PRIMARY, color: '#FFF', textAlign: 'center', lineHeight: 24, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  escrowStepText: { flex: 1, fontSize: FontSize.sm, color: '#134E4A', lineHeight: 20 },
  confirmBtn: { marginHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  confirmGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  confirmBtnText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  backBtn: { alignItems: 'center', padding: Spacing.lg },
  backBtnText: { color: '#9CA3AF', fontSize: FontSize.sm },
  // Success styles
  successContainer: { flex: 1, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  successContent: { width: '100%', alignItems: 'center' },
  successCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  successEmoji: { fontSize: 36 },
  successTitle: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: '#1A1A2E' },
  successSubtitle: { fontSize: FontSize.md, color: '#6B7280', marginTop: Spacing.sm },
  successCard: { width: '100%', backgroundColor: '#FFF', borderRadius: BorderRadius.xl, padding: Spacing.xl, marginTop: Spacing.xl, alignItems: 'center', shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
  successEmoji2: { fontSize: 48, marginBottom: Spacing.md },
  successCommodity: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#1A1A2E' },
  successQty: { fontSize: FontSize.md, color: '#6B7280', marginTop: 4 },
  escrowBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#ECFDF5', padding: Spacing.md, borderRadius: BorderRadius.sm, marginTop: Spacing.lg },
  escrowText: { fontSize: FontSize.sm, color: '#059669', fontWeight: FontWeight.semibold },
  successNote: { fontSize: FontSize.sm, color: '#9CA3AF', marginTop: Spacing.md, textAlign: 'center', lineHeight: 20 },
  successBtn: { width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.xl },
  successBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  successBtnText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  browseMore: { marginTop: Spacing.lg },
  browseMoreText: { color: '#9CA3AF', fontSize: FontSize.sm },
});
