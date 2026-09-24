import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  useColorScheme,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { DetailUI } from '@/components/DetailScreenCard';

const ORDER_STEPS = [
  { status: 'PENDING_APPROVAL', label: 'Order Placed' },
  { status: 'APPROVED', label: 'Farmer Approved' },
  { status: 'DISPATCHED', label: 'Dispatched' },
  { status: 'COMPLETED', label: 'Completed' },
];

const UI = {
  light: {
    bg: DetailUI.canvas,
    surface: DetailUI.surface,
    surfaceSoft: '#FBFCFA',
    surfaceMuted: '#F3F5F1',
    border: DetailUI.border,
    text: DetailUI.ink,
    textMuted: DetailUI.muted,
    textSoft: DetailUI.subtle,
    forest: DetailUI.primaryDark,
    forest2: DetailUI.primaryMid,
    forestSoft: '#E8F3EE',
    gold: '#D8B24A',
    goldSoft: '#FFF7E5',
    warning: DetailUI.warning,
    warningSoft: DetailUI.warningSoft,
    danger: DetailUI.danger,
    dangerSoft: DetailUI.dangerSoft,
    success: DetailUI.success,
    successSoft: DetailUI.successSoft,
    blue: '#3E79C9',
    blueSoft: '#ECF3FD',
    cardShadow: '#182D20',
    white: '#FFFFFF',
  },
  dark: {
    bg: '#0F1713',
    surface: '#17211B',
    surfaceSoft: '#1B2720',
    surfaceMuted: '#223128',
    border: '#2C3A31',
    text: '#EDF5EF',
    textMuted: '#A8B7AE',
    textSoft: '#829188',
    forest: '#133926',
    forest2: '#245C41',
    forestSoft: '#1C3025',
    gold: '#D6A447',
    goldSoft: '#3C321B',
    warning: '#E1A138',
    warningSoft: '#392D17',
    danger: '#E07B74',
    dangerSoft: '#3B2321',
    success: '#3DB387',
    successSoft: '#173027',
    blue: '#6AA2F0',
    blueSoft: '#1D2C42',
    cardShadow: '#000000',
    white: '#FFFFFF',
  },
};

function formatMoney(value?: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function getStatusMeta(status: string, palette: Record<string, string>) {
  switch (status) {
    case 'PENDING_APPROVAL':
      return {
        label: 'Awaiting Farmer Approval',
        bg: palette.warningSoft,
        color: palette.warning,
        icon: 'time-outline',
      };
    case 'APPROVED':
      return {
        label: 'Approved',
        bg: palette.successSoft,
        color: palette.success,
        icon: 'checkmark-circle-outline',
      };
    case 'DISPATCHED':
      return {
        label: 'Dispatched',
        bg: palette.blueSoft,
        color: palette.blue,
        icon: 'car-outline',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        bg: palette.surfaceMuted,
        color: palette.text,
        icon: 'checkmark-done-outline',
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        bg: palette.dangerSoft,
        color: palette.danger,
        icon: 'close-circle-outline',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        bg: palette.surfaceMuted,
        color: palette.textMuted,
        icon: 'ban-outline',
      };
    default:
      return {
        label: status?.replace(/_/g, ' ') || 'Unknown',
        bg: palette.surfaceMuted,
        color: palette.textMuted,
        icon: 'ellipse-outline',
      };
  }
}

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = UI[scheme];

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await api.get<any>(`/orders/${id}`);
        if (res.success) setOrder(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [id]);

  const isSeller = order?.listing?.seller?.id === user?.id;
  const isPending = order?.status === 'PENDING_APPROVAL';
  const statusMeta = getStatusMeta(order?.status, colors);

  const currentStepIndex = useMemo(() => {
    return ORDER_STEPS.findIndex((step) => step.status === order?.status);
  }, [order?.status]);

  async function refreshOrder() {
    const refresh = await api.get<any>(`/orders/${id}`);
    if (refresh.success) setOrder(refresh.data);
  }

  async function handleApprove() {
    if (!otp || otp.length !== 6) {
      Alert.alert('OTP Required', 'Enter the 6-digit OTP to approve');
      return;
    }

    setProcessing(true);

    try {
      const res = await api.post<any>(`/orders/${id}/approve`, { otp });
      if (res.success) {
        Alert.alert('Approved!', 'Order has been approved');
        await refreshOrder();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve');
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    Alert.alert('Reject Order?', 'Are you sure you want to reject this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setProcessing(true);
          try {
            await api.post(`/orders/${id}/reject`, {
              reason: 'Rejected by farmer',
            });
            await refreshOrder();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to reject order');
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  }

  const handleNumpadPress = (val: string) => {
    if (otp.length < 6) {
      setOtp((prev) => prev + val);
    }
  };

  const handleNumpadDelete = () => {
    setOtp((prev) => prev.slice(0, -1));
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.center, { backgroundColor: colors.bg }]}>
          <View style={[styles.loadingOrb, { backgroundColor: colors.forestSoft }]}>
            <Ionicons name="receipt-outline" size={28} color={colors.forest2} />
          </View>
          <ActivityIndicator size="small" color={colors.forest2} style={{ marginBottom: 12 }} />
          <Text style={[styles.loadingTitle, { color: colors.text }]}>Loading order</Text>
          <Text style={[styles.loadingSub, { color: colors.textMuted }]}>
            Preparing full order details
          </Text>
        </View>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.center, { backgroundColor: colors.bg }]}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>Order not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={{ paddingBottom: 44 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={[colors.forest, colors.forest2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />

            <View style={styles.heroTopRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
                activeOpacity={0.86}
              >
                <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={[styles.heroStatusBadge, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                <Ionicons name={statusMeta.icon as any} size={13} color={colors.gold} />
                <Text style={styles.heroStatusText}>{statusMeta.label}</Text>
              </View>
            </View>

            <Text style={styles.heroEyebrow}>Order details</Text>

            <Text style={styles.heroTitle} numberOfLines={2}>
              {order.listing?.lot?.commodityName || 'Commodity Order'}
            </Text>

            <Text style={styles.heroSub}>
              Lot #{order.listing?.lot?.lotNumber || '—'}
            </Text>

            <View style={styles.heroMetricsRow}>
              <View style={styles.heroMetricPill}>
                <Text style={styles.heroMetricLabel}>Total</Text>
                <Text style={styles.heroMetricValue}>
                  {formatMoney(order.totalAmount)}
                </Text>
              </View>

              <View style={styles.heroMetricPill}>
                <Text style={styles.heroMetricLabel}>Quantity</Text>
                <Text style={styles.heroMetricValue}>
                  {Number(order.quantityKg || 0).toLocaleString('en-IN')} kg
                </Text>
              </View>

              <View style={styles.heroMetricPill}>
                <Text style={styles.heroMetricLabel}>Rate</Text>
                <Text style={styles.heroMetricValue}>
                  {formatMoney(order.agreedPricePerKg)}/kg
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Timeline */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: colors.gold }]}>
                ORDER FLOW
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Timeline
              </Text>
            </View>
          </View>

          <View style={styles.timelineWrap}>
            {ORDER_STEPS.map((step, idx) => {
              const completed =
                idx <= currentStepIndex &&
                order.status !== 'REJECTED' &&
                order.status !== 'CANCELLED';

              const current = idx === currentStepIndex;

              return (
                <View key={idx} style={styles.stepRow}>
                  <View style={styles.stepRail}>
                    <View
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor: completed ? colors.forest2 : colors.surfaceMuted,
                          borderColor: current ? colors.gold : 'transparent',
                        },
                      ]}
                    >
                      {completed ? (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      ) : (
                        <View
                          style={[
                            styles.stepDotInner,
                            { backgroundColor: colors.textSoft },
                          ]}
                        />
                      )}
                    </View>

                    {idx < ORDER_STEPS.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          {
                            backgroundColor:
                              idx < currentStepIndex
                                ? colors.forest2
                                : colors.border,
                          },
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.stepTextWrap}>
                    <Text
                      style={[
                        styles.stepTitle,
                        {
                          color: completed ? colors.text : colors.textSoft,
                          fontWeight: current ? '800' : '700',
                        },
                      ]}
                    >
                      {step.label}
                    </Text>

                    <Text style={[styles.stepSub, { color: colors.textMuted }]}>
                      {current
                        ? 'Current order stage'
                        : completed
                          ? 'Completed'
                          : 'Waiting'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Summary */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: colors.gold }]}>
                ORDER SUMMARY
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Purchase snapshot
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.summaryPanel,
              { backgroundColor: colors.surfaceSoft, borderColor: colors.border },
            ]}
          >
            <View style={styles.summaryAmountBlock}>
              <Text style={[styles.summaryLabel, { color: colors.textSoft }]}>
                Total Amount
              </Text>
              <Text style={[styles.summaryAmount, { color: colors.forest2 }]}>
                {formatMoney(order.totalAmount)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryMiniBlock}>
              <Text style={[styles.summaryLabel, { color: colors.textSoft }]}>
                Quantity
              </Text>
              <Text style={[styles.summaryMiniValue, { color: colors.text }]}>
                {Number(order.quantityKg || 0).toLocaleString('en-IN')} kg
              </Text>
            </View>

            <View style={styles.summaryMiniBlock}>
              <Text style={[styles.summaryLabel, { color: colors.textSoft }]}>
                Rate
              </Text>
              <Text style={[styles.summaryMiniValue, { color: colors.text }]}>
                {formatMoney(order.agreedPricePerKg)}/kg
              </Text>
            </View>
          </View>
        </View>

        {/* Parties */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: colors.gold }]}>
                PEOPLE
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Parties involved
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.partyCard,
              { backgroundColor: colors.surfaceSoft, borderColor: colors.border },
            ]}
          >
            <View style={[styles.partyIconBox, { backgroundColor: colors.blueSoft }]}>
              <Ionicons name="person-outline" size={18} color={colors.blue} />
            </View>

            <View style={styles.partyTextWrap}>
              <Text style={[styles.partyLabel, { color: colors.textSoft }]}>Buyer</Text>
              <Text style={[styles.partyName, { color: colors.text }]}>
                {order.buyer?.fullName || '—'}
              </Text>
              <Text style={[styles.partyMeta, { color: colors.textMuted }]}>
                {order.buyer?.phone ? `📱 ${order.buyer.phone}` : 'Phone unavailable'}
                {order.buyer?.city ? ` • ${order.buyer.city}` : ''}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.partyCard,
              {
                backgroundColor: colors.surfaceSoft,
                borderColor: colors.border,
                marginTop: 12,
              },
            ]}
          >
            <View style={[styles.partyIconBox, { backgroundColor: colors.forestSoft }]}>
              <Ionicons name="leaf-outline" size={18} color={colors.success} />
            </View>

            <View style={styles.partyTextWrap}>
              <Text style={[styles.partyLabel, { color: colors.textSoft }]}>
                Seller (Farmer)
              </Text>
              <Text style={[styles.partyName, { color: colors.text }]}>
                {order.listing?.seller?.fullName || '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* OTP Approval */}
        {isSeller && isPending && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.goldSoft,
                borderColor: colors.gold,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View style={styles.otpHeroRow}>
              <View style={styles.otpIconWrap}>
                <Ionicons name="key-outline" size={22} color="#8A5A00" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.otpEyebrow}>FARMER ACTION REQUIRED</Text>
                <Text style={styles.otpTitle}>OTP Release Approval</Text>
                <Text style={styles.otpSub}>
                  Approve this release using the 6-digit OTP.
                </Text>
              </View>
            </View>

            {order.otpCode && (
              <View style={styles.otpCodePanel}>
                <Text style={styles.otpCodeLabel}>Your OTP for confirmation</Text>
                <Text style={styles.otpCodeValue}>{order.otpCode}</Text>
              </View>
            )}

            <View style={styles.otpInputFields}>
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <View
                  key={idx}
                  style={[
                    styles.otpDigitBox,
                    {
                      borderColor: otp[idx] ? colors.forest2 : '#D7A54A',
                      backgroundColor: '#FFFFFF',
                    },
                  ]}
                >
                  <Text style={styles.otpDigitText}>{otp[idx] || ''}</Text>
                </View>
              ))}
            </View>

            <View style={styles.numpadContainer}>
              <View style={styles.numpadRow}>
                {['1', '2', '3'].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={styles.numpadKey}
                    onPress={() => handleNumpadPress(val)}
                    activeOpacity={0.84}
                  >
                    <Text style={styles.numpadText}>{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.numpadRow}>
                {['4', '5', '6'].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={styles.numpadKey}
                    onPress={() => handleNumpadPress(val)}
                    activeOpacity={0.84}
                  >
                    <Text style={styles.numpadText}>{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.numpadRow}>
                {['7', '8', '9'].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={styles.numpadKey}
                    onPress={() => handleNumpadPress(val)}
                    activeOpacity={0.84}
                  >
                    <Text style={styles.numpadText}>{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.numpadRow}>
                <View style={styles.numpadKeyEmpty} />
                <TouchableOpacity
                  style={styles.numpadKey}
                  onPress={() => handleNumpadPress('0')}
                  activeOpacity={0.84}
                >
                  <Text style={styles.numpadText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.numpadKey}
                  onPress={handleNumpadDelete}
                  activeOpacity={0.84}
                >
                  <Ionicons name="backspace-outline" size={22} color="#1A1A1A" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.otpActions}>
              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  { opacity: processing ? 0.6 : 1 },
                ]}
                onPress={handleApprove}
                disabled={processing}
                activeOpacity={0.88}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={styles.primaryActionText}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryDangerBtn,
                  { opacity: processing ? 0.6 : 1 },
                ]}
                onPress={handleReject}
                disabled={processing}
                activeOpacity={0.88}
              >
                <Ionicons name="close-circle" size={18} color="#C23E35" />
                <Text style={styles.secondaryDangerText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Status detail */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: colors.gold }]}>
                CURRENT STATUS
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Status detail
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusPanel,
              { backgroundColor: statusMeta.bg, borderColor: colors.border },
            ]}
          >
            <View style={[styles.statusIconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name={statusMeta.icon as any} size={20} color={statusMeta.color} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.statusMainText, { color: statusMeta.color }]}>
                {order.status?.replace(/_/g, ' ')}
              </Text>

              {order.approvedAt && (
                <Text style={[styles.statusDetailText, { color: colors.success }]}>
                  Approved on {new Date(order.approvedAt).toLocaleString()}
                </Text>
              )}

              {order.rejectedReason && (
                <Text style={[styles.statusDetailText, { color: colors.danger }]}>
                  Reason: {order.rejectedReason}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Escrow & payment */}
        {order.status !== 'REJECTED' && order.status !== 'CANCELLED' && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionEyebrow, { color: colors.gold }]}>
                  PAYMENT FLOW
                </Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Payment & escrow
                </Text>
              </View>
            </View>

            {!isSeller && order.status === 'APPROVED' && (
              <TouchableOpacity
                style={[styles.primaryActionBtn, { marginBottom: 10 }]}
                onPress={() =>
                  router.push({
                    pathname: '/orders/payment',
                    params: { orderId: order.id },
                  })
                }
                activeOpacity={0.88}
              >
                <Ionicons name="card-outline" size={18} color="#FFF" />
                <Text style={styles.primaryActionText}>Make Payment (Razorpay)</Text>
              </TouchableOpacity>
            )}

            {(order.status === 'APPROVED' ||
              order.status === 'DISPATCHED' ||
              order.status === 'COMPLETED') && (
              <TouchableOpacity
                style={[
                  styles.secondaryNeutralBtn,
                  {
                    borderColor: colors.forest2,
                    backgroundColor: colors.surfaceSoft,
                  },
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/orders/escrow-status',
                    params: { orderId: order.id },
                  })
                }
                activeOpacity={0.88}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={colors.forest2}
                />
                <Text style={[styles.secondaryNeutralText, { color: colors.forest2 }]}>
                  Track Escrow Status
                </Text>
              </TouchableOpacity>
            )}

            {order.status === 'PENDING_APPROVAL' && !isSeller && (
              <Text style={[styles.infoNote, { color: colors.textMuted }]}>
                Payment will be available after the seller approves your order.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  loadingOrb: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  loadingTitle: {
    fontSize: 22,
    fontWeight: '800',
  },

  loadingSub: {
    fontSize: 15,
    marginTop: 6,
    textAlign: 'center',
  },

  notFoundText: {
    fontSize: 17,
    fontWeight: '700',
  },

  heroWrap: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },

  heroCard: {
    borderRadius: 30,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#173526',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },

  heroGlowOne: {
    position: 'absolute',
    right: -28,
    top: -12,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(214,164,71,0.16)',
  },

  heroGlowTwo: {
    position: 'absolute',
    left: -24,
    bottom: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  heroStatusBadge: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  heroStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  heroEyebrow: {
    color: '#BBD2C1',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: -0.5,
  },

  heroSub: {
    color: '#D3E0D7',
    fontSize: 15,
    marginTop: 5,
    fontWeight: '600',
  },

  heroMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  heroMetricPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },

  heroMetricLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    textAlign: 'center',
  },

  heroMetricValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 5,
  },

  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },

  sectionHeaderRow: {
    marginBottom: 14,
  },

  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.3,
  },

  timelineWrap: {
    paddingLeft: 2,
  },

  stepRow: {
    flexDirection: 'row',
  },

  stepRail: {
    width: 24,
    alignItems: 'center',
  },

  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 2,
  },

  stepDotInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 34,
    marginTop: -2,
    marginBottom: -2,
  },

  stepTextWrap: {
    flex: 1,
    marginLeft: 14,
    paddingBottom: 16,
    justifyContent: 'center',
  },

  stepTitle: {
    fontSize: 15,
  },

  stepSub: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: '600',
  },

  summaryPanel: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },

  summaryAmountBlock: {
    marginBottom: 12,
  },

  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  summaryAmount: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: -0.4,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: '#E5ECE6',
    marginBottom: 12,
  },

  summaryMiniBlock: {
    marginTop: 2,
    marginBottom: 10,
  },

  summaryMiniValue: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },

  partyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  partyIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  partyTextWrap: {
    flex: 1,
  },

  partyLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  partyName: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 3,
  },

  partyMeta: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  otpHeroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },

  otpIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  otpEyebrow: {
    color: '#9A6A10',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  otpTitle: {
    color: '#7B4A00',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
    marginTop: 4,
  },

  otpSub: {
    color: '#8A6A2A',
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },

  otpCodePanel: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },

  otpCodeLabel: {
    fontSize: 12,
    color: '#8A6A2A',
    fontWeight: '700',
  },

  otpCodeValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#7B4A00',
    letterSpacing: 6,
    marginTop: 6,
  },

  otpInputFields: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },

  otpDigitBox: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  otpDigitText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1B1B1B',
  },

  numpadContainer: {
    gap: 10,
    marginBottom: 18,
  },

  numpadRow: {
    flexDirection: 'row',
    gap: 10,
  },

  numpadKey: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9E2D2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  numpadKeyEmpty: {
    flex: 1,
  },

  numpadText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
  },

  otpActions: {
    flexDirection: 'row',
    gap: 12,
  },

  primaryActionBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#0E7A57',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  secondaryDangerBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1C5C1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  secondaryDangerText: {
    color: '#C23E35',
    fontSize: 15,
    fontWeight: '800',
  },

  statusPanel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusMainText: {
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'capitalize',
  },

  statusDetailText: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
    fontWeight: '600',
  },

  secondaryNeutralBtn: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 2,
  },

  secondaryNeutralText: {
    fontSize: 15,
    fontWeight: '800',
  },

  infoNote: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
});


