import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { api } from '@/lib/api-client';
import StatusChip from '@/components/ui/StatusChip';
import { DetailUI } from '@/components/DetailScreenCard';

interface ReceiptDetail {
  id: string;
  receiptNumber: string;
  lot?: {
    id: string;
    lotNumber: string;
    commodityCategory?: string;
    commodityName?: string;
    intakeWeightKg?: number;
    currentWeightKg?: number;
    bagCount?: number;
    qualityGrade?: string;
  };
  facility?: { id: string; name: string; city?: string; state?: string };
  depositor?: { id: string; fullName: string; phone?: string };
  isNegotiable: boolean;
  isPledged: boolean;
  pledgedTo?: string | null;
  pledgedAt?: string | null;
  redeemedAt?: string | null;
  status: string;
  createdAt: string;
  expiresAt?: string | null;
}

const UI = {
  bg: DetailUI.canvas,
  surface: DetailUI.surface,
  surfaceAlt: '#FBFCFA',
  surfaceSoft: '#F3F5F1',
  text: DetailUI.ink,
  textMuted: DetailUI.muted,
  textSoft: DetailUI.subtle,
  border: DetailUI.border,
  borderSoft: DetailUI.borderSoft,
  forest: DetailUI.primary,
  forestDeep: DetailUI.primaryDark,
  forestSoft: '#E8F3EE',
  success: DetailUI.success,
  successSoft: DetailUI.successSoft,
  warning: DetailUI.warning,
  warningSoft: DetailUI.warningSoft,
  violet: '#7C3AED',
  violetSoft: '#F5F3FF',
  danger: DetailUI.danger,
  dangerSoft: DetailUI.dangerSoft,
};

export default function ReceiptDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const fetchReceipt = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<any>(`/warehouse-receipts/${id}`);
      if (res.success && res.data) {
        setReceipt(res.data);
      } else {
        setReceipt(null);
      }
    } catch (err) {
      console.error('[Receipt Detail] Error:', err);
      setReceipt(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchReceipt();
    }, [fetchReceipt])
  );

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatWeight = (kg?: number | null) => {
    if (kg === undefined || kg === null) return '—';
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)} MT`;
    return `${kg.toFixed(1)} kg`;
  };

  const getPledgeLabel = () => {
    if (!receipt) return 'Not pledged';
    if (receipt.redeemedAt) return 'Redeemed';
    if (receipt.isPledged) return 'Pledged';
    return 'Not pledged';
  };

  const handleShare = async () => {
    if (!receipt) return;

    try {
      setSharing(true);
      await Share.share({
        title: `eNWR — ${receipt.receiptNumber}`,
        message: [
          `Electronic Warehouse Receipt`,
          `Receipt: ${receipt.receiptNumber}`,
          `Status: ${receipt.status}`,
          `Commodity: ${receipt.lot?.commodityName || 'N/A'}`,
          `Weight: ${
            receipt.lot?.currentWeightKg
              ? formatWeight(receipt.lot.currentWeightKg)
              : 'N/A'
          }`,
          `Facility: ${receipt.facility?.name || 'N/A'}`,
          `Issued: ${formatDate(receipt.createdAt)}`,
          receipt.isPledged ? `Pledged to: ${receipt.pledgedTo || 'N/A'}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (err) {
      console.error('[Receipt Share] Error:', err);
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingWrap}>
          <StatusBar barStyle="dark-content" backgroundColor={UI.bg} />
          <View style={styles.loadingOrb}>
            <Ionicons name="document-text-outline" size={28} color={UI.forest} />
          </View>
          <ActivityIndicator size="small" color={UI.forest} />
          <Text style={styles.loadingTitle}>Loading receipt</Text>
          <Text style={styles.loadingSub}>Fetching latest eNWR details</Text>
        </View>
      </>
    );
  }

  if (!receipt) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyScreen}>
          <StatusBar barStyle="dark-content" backgroundColor={UI.bg} />
          <Ionicons name="document-outline" size={52} color="#C4CBD3" />
          <Text style={styles.emptyTitle}>Receipt not found</Text>
          <Text style={styles.emptyText}>
            We could not load this warehouse receipt.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.back()}
            activeOpacity={0.84}
          >
            <Text style={styles.emptyBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const timelineSteps = [
    {
      label: 'Receipt Issued',
      date: receipt.createdAt,
      done: true,
      icon: 'document-text-outline' as const,
      meta: null,
      tone: UI.forest,
      bg: UI.forestSoft,
    },
    {
      label: 'Pledged',
      date: receipt.pledgedAt,
      done: receipt.isPledged,
      icon: 'lock-closed-outline' as const,
      meta: receipt.pledgedTo ? `To: ${receipt.pledgedTo}` : null,
      tone: UI.violet,
      bg: UI.violetSoft,
    },
    {
      label: 'Redeemed',
      date: receipt.redeemedAt,
      done: !!receipt.redeemedAt,
      icon: 'lock-open-outline' as const,
      meta: null,
      tone: UI.success,
      bg: UI.successSoft,
    },
    ...(receipt.expiresAt
      ? [
          {
            label: 'Expires',
            date: receipt.expiresAt,
            done: new Date(receipt.expiresAt) < new Date(),
            icon: 'time-outline' as const,
            meta: null,
            tone: UI.warning,
            bg: UI.warningSoft,
          },
        ]
      : []),
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={UI.bg} />

        <View style={styles.headerWrap}>
          <View style={{ height: insets.top + 8 }} />

          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconBtn}
              activeOpacity={0.84}
            >
              <Ionicons name="chevron-back" size={20} color={UI.text} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerKicker}>eNWR</Text>
              <Text style={styles.headerTitle}>Warehouse Receipt</Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {receipt.receiptNumber}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={handleShare}
              activeOpacity={0.84}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator size="small" color={UI.forest} />
              ) : (
                <Ionicons name="share-social-outline" size={18} color={UI.text} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.certificateCard}>
            <View style={styles.certificateTopRow}>
              <View>
                <Text style={styles.certificateEyebrow}>Electronic Warehouse Receipt</Text>
                <Text style={styles.certificateNumber}>{receipt.receiptNumber}</Text>
              </View>

              <View style={styles.certificateStamp}>
                <Ionicons name="shield-checkmark-outline" size={18} color={UI.forest} />
              </View>
            </View>

            <View style={styles.qrWrap}>
              <View style={styles.qrFrame}>
                <QRCode
                  value={receipt.receiptNumber}
                  size={176}
                  backgroundColor="#FFFFFF"
                  color="#15202B"
                />
              </View>
            </View>

            <View style={styles.statusRow}>
              <StatusChip status={receipt.status} size="md" />
              {receipt.isNegotiable && (
                <View style={[styles.inlineStatus, { backgroundColor: UI.successSoft }]}>
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={13}
                    color={UI.forest}
                  />
                  <Text style={[styles.inlineStatusText, { color: UI.forest }]}>
                    Negotiable
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.certificateMetaStrip}>
              <View style={styles.metaPill}>
                <Ionicons name="calendar-outline" size={13} color={UI.textSoft} />
                <Text style={styles.metaPillText}>
                  Issued {formatDate(receipt.createdAt)}
                </Text>
              </View>

              <View style={styles.metaPill}>
                <Ionicons
                  name={
                    receipt.isPledged
                      ? 'lock-closed-outline'
                      : 'shield-checkmark-outline'
                  }
                  size={13}
                  color={UI.textSoft}
                />
                <Text style={styles.metaPillText}>{getPledgeLabel()}</Text>
              </View>
            </View>

            <Text style={styles.qrHint}>
              Scan this QR code to verify receipt identity and warehouse receipt number.
            </Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryLabel}>Status</Text>
              <Text style={styles.summaryValue}>{receipt.status}</Text>
            </View>

            <View style={styles.summaryTile}>
              <Text style={styles.summaryLabel}>Pledge</Text>
              <Text
                style={[
                  styles.summaryValue,
                  {
                    color: receipt.isPledged ? UI.warning : UI.success,
                  },
                ]}
              >
                {getPledgeLabel()}
              </Text>
            </View>
          </View>

          {receipt.lot && (
            <TouchableOpacity
              style={styles.section}
              onPress={() => router.push(`/lots/${receipt.lot!.id}`)}
              activeOpacity={0.84}
            >
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Lot Details</Text>
                <View style={styles.linkPill}>
                  <Text style={styles.linkHint}>View lot</Text>
                  <Ionicons name="chevron-forward" size={13} color={UI.forest} />
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Lot Number</Text>
                <Text style={[styles.detailValue, styles.detailValueStrong]}>
                  {receipt.lot.lotNumber}
                </Text>
              </View>

              {receipt.lot.commodityName && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Commodity</Text>
                  <Text style={styles.detailValue}>{receipt.lot.commodityName}</Text>
                </View>
              )}

              {receipt.lot.intakeWeightKg !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Intake Weight</Text>
                  <Text style={styles.detailValue}>
                    {formatWeight(receipt.lot.intakeWeightKg)}
                  </Text>
                </View>
              )}

              {receipt.lot.currentWeightKg !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Current Weight</Text>
                  <Text style={styles.detailValue}>
                    {formatWeight(receipt.lot.currentWeightKg)}
                  </Text>
                </View>
              )}

              {receipt.lot.bagCount !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bags</Text>
                  <Text style={styles.detailValue}>{receipt.lot.bagCount}</Text>
                </View>
              )}

              {receipt.lot.qualityGrade && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Grade</Text>
                  <Text style={styles.detailValue}>{receipt.lot.qualityGrade}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {receipt.facility && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Facility</Text>
              <Text style={styles.facilityName}>{receipt.facility.name}</Text>
              <Text style={styles.facilityMeta}>
                {[receipt.facility.city, receipt.facility.state]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </Text>
            </View>
          )}

          {receipt.depositor && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Depositor</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{receipt.depositor.fullName}</Text>
              </View>

              {receipt.depositor.phone ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{receipt.depositor.phone}</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>

            {timelineSteps.map((step, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor: step.done ? step.bg : UI.surfaceSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={step.icon}
                      size={14}
                      color={step.done ? step.tone : '#97A2AE'}
                    />
                  </View>

                  {idx < timelineSteps.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>

                <View style={styles.timelineRight}>
                  <Text
                    style={[
                      styles.timelineLabel,
                      { color: step.done ? UI.text : UI.textSoft },
                    ]}
                  >
                    {step.label}
                  </Text>

                  {step.date ? (
                    <Text style={styles.timelineDate}>{formatDate(step.date)}</Text>
                  ) : (
                    <Text style={styles.timelinePending}>Not available yet</Text>
                  )}

                  {step.meta ? (
                    <Text style={styles.timelineMeta}>{step.meta}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 92 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.84}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                <Text style={styles.shareBtnText}>Share Receipt</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  loadingWrap: {
    flex: 1,
    backgroundColor: UI.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  loadingOrb: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: UI.forestSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: UI.text,
    marginTop: 16,
  },

  loadingSub: {
    fontSize: 13,
    color: UI.textMuted,
    marginTop: 6,
  },

  emptyScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: UI.bg,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: UI.text,
    marginTop: 14,
  },

  emptyText: {
    fontSize: 13,
    color: UI.textSoft,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },

  emptyBtn: {
    marginTop: 18,
    backgroundColor: UI.forest,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },

  emptyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  headerWrap: {
    backgroundColor: UI.bg,
    paddingBottom: 8,
  },

  topBar: {
    paddingHorizontal: 16,
    paddingTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  headerKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: UI.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  headerTitle: {
    marginTop: 3,
    fontSize: 22,
    fontWeight: '800',
    color: UI.text,
    letterSpacing: -0.3,
    textAlign: 'center',
  },

  headerSub: {
    marginTop: 3,
    fontSize: 12,
    color: UI.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 104,
  },

  certificateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.borderSoft,
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 14,
  },

  certificateTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  certificateEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: UI.textSoft,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },

  certificateNumber: {
    fontSize: 21,
    fontWeight: '800',
    color: UI.forest,
    marginTop: 6,
    letterSpacing: 0.25,
  },

  certificateStamp: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: UI.forestSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  qrWrap: {
    alignItems: 'center',
    marginTop: 18,
  },

  qrFrame: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F3EF',
  },

  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  inlineStatus: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  inlineStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  certificateMetaStrip: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },

  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: UI.borderSoft,
  },

  metaPillText: {
    fontSize: 12,
    color: UI.textMuted,
    fontWeight: '700',
  },

  qrHint: {
    fontSize: 12,
    color: UI.textSoft,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 14,
  },

  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },

  summaryTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: UI.borderSoft,
  },

  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: UI.textSoft,
    letterSpacing: 0.7,
    marginBottom: 6,
    textTransform: 'uppercase',
  },

  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.text,
  },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: UI.borderSoft,
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 12,
    elevation: 2,
  },

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.text,
    letterSpacing: -0.1,
  },

  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: UI.forestSoft,
  },

  linkHint: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.forest,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F4F6F2',
  },

  detailLabel: {
    fontSize: 13,
    color: UI.textMuted,
    flex: 1,
  },

  detailValue: {
    fontSize: 13,
    color: UI.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  detailValueStrong: {
    color: UI.forest,
    fontWeight: '800',
  },

  facilityName: {
    fontSize: 16,
    fontWeight: '800',
    color: UI.text,
  },

  facilityMeta: {
    fontSize: 13,
    color: UI.textMuted,
    marginTop: 4,
  },

  timelineItem: {
    flexDirection: 'row',
    minHeight: 54,
  },

  timelineLeft: {
    alignItems: 'center',
    width: 34,
    marginRight: 12,
  },

  timelineDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    backgroundColor: '#E8ECE5',
  },

  timelineRight: {
    flex: 1,
    paddingBottom: 12,
  },

  timelineLabel: {
    fontSize: 14,
    fontWeight: '700',
  },

  timelineDate: {
    fontSize: 12,
    color: UI.textSoft,
    marginTop: 3,
  },

  timelinePending: {
    fontSize: 12,
    color: UI.textSoft,
    marginTop: 3,
  },

  timelineMeta: {
    fontSize: 12,
    color: UI.violet,
    marginTop: 4,
    fontWeight: '700',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: 'rgba(246,247,243,0.96)',
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },

  shareBtn: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: UI.forest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: UI.forest,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },

  shareBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});