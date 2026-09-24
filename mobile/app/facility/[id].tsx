/**
 * SheetKosh — Facility Detail Screen (Unified UI)
 *
 * Uses the SAME shared components as booking/[id].tsx:
 * - DetailScreenHeader (gradient header)
 * - SectionCard, SectionHeader, DetailRow, DetailGrid, CardDivider (card system)
 *
 * Features:
 * - Green gradient header with facility name + rating
 * - Tab bar: Overview | Chambers | Reviews
 * - Capacity section, pricing, contact info
 * - Chamber cards with temp/humidity
 * - Review form + review cards
 * - Floating "Book Storage" CTA
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { hapticLight } from '@/lib/haptics';
import DetailScreenHeader from '@/components/DetailScreenHeader';
import {
  SectionCard, SectionHeader, DetailRow, DetailGrid, CardDivider, InfoPill, DetailUI,
} from '@/components/DetailScreenCard';

const COMMODITY_ICON: Record<string, string> = {
  POTATO: 'nutrition-outline', ONION: 'ellipse-outline',
  VEGETABLES: 'leaf-outline', FRUITS: 'nutrition',
  GRAINS: 'sunny-outline', DAIRY: 'water-outline',
  SPICES: 'flame-outline', OTHER: 'cube-outline',
};

export default function FacilityDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [facility, setFacility] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'chambers' | 'reviews'>('overview');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<any>(`/discover/facilities/${id}`);
        if (res.success) setFacility(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [id]);

  async function submitReview() {
    if (rating < 1) { Alert.alert('Rating Required', 'Please select a star rating'); return; }
    setSubmitting(true);
    try {
      await api.post(`/discover/facilities/${id}/reviews`, { rating, comment });
      Alert.alert('Thank you!', 'Your review has been submitted');
      const res = await api.get<any>(`/discover/facilities/${id}`);
      if (res.success) setFacility(res.data);
      setRating(0); setComment('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit review');
    } finally { setSubmitting(false); }
  }

  // ── Loading ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.center}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <ActivityIndicator size="large" color={DetailUI.primary} />
          <Text style={s.centerText}>Loading facility details...</Text>
        </View>
      </>
    );
  }

  // ── Not Found ──
  if (!facility) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Ionicons name="alert-circle-outline" size={36} color={DetailUI.subtle} />
          </View>
          <Text style={s.errorTitle}>Facility not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.goBackBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={16} color={DetailUI.primary} />
            <Text style={s.goBackText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const totalCapacity = Number(facility.totalCapacityMt || 0);
  const availableCapacity = Number(facility.availableCapacity || 0);
  const totalOccupied = totalCapacity - availableCapacity;
  const utilization = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
  const avgRating = Number(facility.avgRating || facility.averageRating || 0);
  const reviewCount = Number(facility._count?.reviews || facility.reviewCount || 0);

  const ratingText = avgRating > 0 ? `★ ${avgRating.toFixed(1)} (${reviewCount})` : 'No reviews';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* ─── Header (same as booking detail) ─── */}
        <DetailScreenHeader
          title={facility.name}
          subtitle={ratingText}
          statusColor={avgRating >= 4 ? '#10B981' : avgRating >= 3 ? '#F59E0B' : '#9DA6B4'}
          onBack={() => router.back()}
          rightAction={{
            icon: 'calendar-outline',
            onPress: () => { hapticLight(); router.push({ pathname: '/book-storage', params: { facilityId: id, facilityName: facility?.name } }); },
          }}
        />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ─── Tab Bar ─── */}
          <View style={s.tabBar}>
            {(['overview', 'chambers', 'reviews'] as const).map(tab => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity key={tab} style={[s.tab, active && s.tabActive]} activeOpacity={0.82} onPress={() => setActiveTab(tab)}>
                  <Text style={[s.tabText, active && s.tabTextActive]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ─── OVERVIEW ─── */}
          {activeTab === 'overview' && (
            <View style={s.tabContent}>
              {/* Capacity */}
              <SectionCard>
                <SectionHeader icon="server-outline" eyebrow="STORAGE" title="Capacity" />
                <DetailGrid>
                  <DetailRow icon="cube-outline" label="Total Capacity" value={`${totalCapacity} MT`} />
                  <DetailRow icon="checkmark-circle-outline" iconColor="#059669" label="Available" value={`${Math.round(availableCapacity)} MT`} valueColor="#059669" valueBold />
                  <DetailRow icon="pie-chart-outline" label="Occupied" value={`${Math.round(totalOccupied)} MT`} />
                </DetailGrid>
                <CardDivider />
                {/* Utilization bar */}
                <View style={s.utilizationRow}>
                  <Text style={s.utilizationLabel}>Utilization</Text>
                  <Text style={[s.utilizationPercent, { color: utilization > 85 ? DetailUI.danger : utilization > 60 ? '#D97706' : '#059669' }]}>{utilization}%</Text>
                </View>
                <View style={s.barOuter}>
                  <View style={[s.barFill, { width: `${Math.min(utilization, 100)}%`, backgroundColor: utilization > 85 ? DetailUI.danger : utilization > 60 ? '#D97706' : '#059669' }]} />
                </View>
              </SectionCard>

              {/* Facility Info */}
              <SectionCard>
                <SectionHeader icon="information-circle-outline" eyebrow="INFO" title="Facility Details" />
                <DetailGrid>
                  {facility.storageType && <DetailRow icon="snow-outline" label="Storage Type" value={facility.storageType} />}
                  {facility.verifiedAt && <DetailRow icon="shield-checkmark-outline" iconColor="#059669" label="Verification" value="Verified Facility" valueColor="#059669" />}
                  {facility.operatingSince && <DetailRow icon="calendar-outline" label="Operating Since" value={new Date(facility.operatingSince).getFullYear().toString()} />}
                  <DetailRow icon="star-outline" iconColor="#D8B24A" label="Rating" value={avgRating > 0 ? `${avgRating.toFixed(1)} / 5 (${reviewCount} reviews)` : 'No reviews yet'} />
                </DetailGrid>
              </SectionCard>

              {/* Pricing */}
              {facility.pricing?.length > 0 && (
                <SectionCard>
                  <SectionHeader icon="pricetag-outline" iconBg="#FFF7E5" iconColor="#D8B24A" eyebrow="PRICING" title="Storage Rates" />
                  <DetailGrid>
                    {facility.pricing.map((p: any, i: number) => (
                      <DetailRow
                        key={i}
                        icon={(COMMODITY_ICON[p.commodityCategory] || 'cube-outline')}
                        iconColor={DetailUI.primaryMid}
                        label={`${p.commodityCategory?.replace(/_/g, ' ')} • ${p.pricingModel === 'PER_DAY_PER_MT' ? 'Per day / MT' : 'Per month / MT'}`}
                        value={`₹${Number(p.rateAmount).toFixed(0)}`}
                        valueColor="#D8B24A"
                        valueBold
                      />
                    ))}
                  </DetailGrid>
                </SectionCard>
              )}

              {/* Contact & Location */}
              <SectionCard>
                <SectionHeader icon="business-outline" eyebrow="CONTACT" title="Location & Contact" />
                <DetailGrid>
                  <DetailRow icon="call-outline" iconColor="#059669" label="Phone" value={facility.contactPhone || 'N/A'} />
                  {facility.contactEmail && <DetailRow icon="mail-outline" iconColor="#2589AA" label="Email" value={facility.contactEmail} />}
                  <DetailRow
                    icon="location-outline"
                    iconColor="#D97706"
                    label="Address"
                    value={`${facility.addressLine1}, ${facility.city}, ${facility.state} - ${facility.pincode}`}
                  />
                  {facility.latitude && facility.longitude && (
                    <DetailRow icon="navigate-outline" iconColor="#7C3AED" label="Coordinates" value={`${Number(facility.latitude).toFixed(4)}, ${Number(facility.longitude).toFixed(4)}`} />
                  )}
                </DetailGrid>
              </SectionCard>
            </View>
          )}

          {/* ─── CHAMBERS ─── */}
          {activeTab === 'chambers' && (
            <View style={s.tabContent}>
              {facility.chambers?.length > 0 ? (
                facility.chambers.map((ch: any) => {
                  const chCap = Number(ch.capacityMt || 0);
                  const chOcc = Number(ch.occupiedMt || 0);
                  const chUtil = chCap > 0 ? Math.round((chOcc / chCap) * 100) : 0;
                  const isOperational = ch.status === 'OPERATIONAL';
                  return (
                    <SectionCard key={ch.id}>
                      <SectionHeader
                        icon="layers-outline"
                        iconBg={isOperational ? '#E8F7EF' : '#FFF3E7'}
                        iconColor={isOperational ? '#059669' : '#D97706'}
                        eyebrow={`CHAMBER ${ch.chamberNumber}`}
                        title={ch.name || `Chamber ${ch.chamberNumber}`}
                        rightElement={
                          <InfoPill
                            icon={isOperational ? 'checkmark-circle' : 'alert-circle'}
                            text={ch.status || 'Unknown'}
                            bg={isOperational ? '#E8F7EF' : '#FFF3E7'}
                            textColor={isOperational ? '#059669' : '#D97706'}
                          />
                        }
                      />
                      <DetailGrid>
                        <DetailRow icon="leaf-outline" iconColor={DetailUI.primaryMid} label="Commodity" value={ch.commodityCategory?.replace(/_/g, ' ') || '—'} />
                        <DetailRow icon="thermometer-outline" iconColor="#2589AA" label="Temperature" value={`${Number(ch.targetTempMin)}°C — ${Number(ch.targetTempMax)}°C`} />
                        <DetailRow icon="water-outline" iconColor="#7C3AED" label="Humidity" value={`${ch.targetHumidityMin}% — ${ch.targetHumidityMax}%`} />
                        <DetailRow icon="cube-outline" iconColor={DetailUI.primary} label="Capacity" value={`${chOcc} / ${chCap} MT (${chUtil}%)`} />
                      </DetailGrid>
                      <CardDivider />
                      <View style={s.utilizationRow}>
                        <Text style={s.utilizationLabel}>Filled</Text>
                        <Text style={[s.utilizationPercent, { color: chUtil > 85 ? DetailUI.danger : '#059669' }]}>{chUtil}%</Text>
                      </View>
                      <View style={s.barOuter}>
                        <View style={[s.barFill, { width: `${Math.min(chUtil, 100)}%`, backgroundColor: chUtil > 85 ? DetailUI.danger : DetailUI.primary }]} />
                      </View>
                    </SectionCard>
                  );
                })
              ) : (
                <View style={s.emptyState}>
                  <Ionicons name="cube-outline" size={40} color={DetailUI.subtle} />
                  <Text style={s.emptyText}>No chamber data available</Text>
                </View>
              )}
            </View>
          )}

          {/* ─── REVIEWS ─── */}
          {activeTab === 'reviews' && (
            <View style={s.tabContent}>
              {/* Write Review */}
              <SectionCard>
                <SectionHeader icon="create-outline" eyebrow="FEEDBACK" title="Write a Review" />
                <View style={s.starSelect}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <TouchableOpacity key={i} onPress={() => setRating(i)} style={s.starBtn} activeOpacity={0.8}>
                      <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={34} color={i <= rating ? '#F6C453' : '#D1D8D3'} />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={s.reviewInput}
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Share your experience with this facility..."
                  placeholderTextColor={DetailUI.subtle}
                  multiline numberOfLines={4} textAlignVertical="top"
                />
                <TouchableOpacity style={[s.submitBtn, { opacity: submitting ? 0.7 : 1 }]} onPress={submitReview} disabled={submitting} activeOpacity={0.85}>
                  <LinearGradient colors={[DetailUI.primaryMid, DetailUI.primary]} style={s.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={s.submitText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={s.detailedReviewBtn} activeOpacity={0.8} onPress={() => router.push({ pathname: '/facility/review', params: { facilityId: id, facilityName: facility?.name } })}>
                  <Text style={s.detailedReviewLink}>Write a detailed review instead</Text>
                </TouchableOpacity>
              </SectionCard>

              {/* Review Cards */}
              {facility.reviews?.length > 0 ? (
                facility.reviews.slice(0, 10).map((r: any) => (
                  <SectionCard key={r.id}>
                    <View style={s.reviewHeader}>
                      <View style={s.reviewAvatar}>
                        <Text style={s.reviewAvatarText}>{r.user?.fullName?.[0] || '?'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.reviewUserName}>{r.user?.fullName || 'Anonymous User'}</Text>
                        <View style={s.starsRow}>
                          {[1, 2, 3, 4, 5].map(i => (
                            <Ionicons key={i} name={i <= r.rating ? 'star' : 'star-outline'} size={12} color="#F6C453" />
                          ))}
                        </View>
                      </View>
                    </View>
                    {r.comment && <Text style={s.reviewComment}>{r.comment}</Text>}
                  </SectionCard>
                ))
              ) : (
                <View style={s.emptyState}>
                  <Ionicons name="chatbubble-outline" size={40} color={DetailUI.subtle} />
                  <Text style={s.emptyText}>No reviews yet — be the first</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* ─── Floating CTA ─── */}
        <View style={s.floatingCTA}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => { hapticLight(); router.push({ pathname: '/book-storage', params: { facilityId: id, facilityName: facility?.name } }); }}>
            <LinearGradient colors={[DetailUI.primaryMid, DetailUI.primary]} style={s.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
              <Text style={s.ctaText}>Book Storage</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DetailUI.canvas },
  scrollContent: { paddingBottom: Platform.OS === 'ios' ? 128 : 112, paddingHorizontal: 16 },

  // Center states
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DetailUI.canvas, gap: 12, paddingHorizontal: 24 },
  centerText: { fontSize: 14, color: DetailUI.subtle, fontWeight: '600' },
  emptyIcon: { width: 70, height: 70, borderRadius: 20, backgroundColor: '#ECF0EB', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: DetailUI.border },
  errorTitle: { fontSize: 17, fontWeight: '700', color: DetailUI.muted },
  goBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: DetailUI.surface, borderWidth: 1, borderColor: DetailUI.border },
  goBackText: { fontSize: 14, color: DetailUI.primary, fontWeight: '700' },

  // Tab Bar
  tabBar: { flexDirection: 'row', marginTop: 12, marginBottom: 4, padding: 4, borderRadius: 16, backgroundColor: DetailUI.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: DetailUI.border, shadowColor: '#182D20', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  tab: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: DetailUI.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: DetailUI.subtle },
  tabTextActive: { color: '#FFFFFF' },
  tabContent: { paddingTop: 8 },

  // Utilization bar (used in capacity + chambers)
  utilizationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  utilizationLabel: { fontSize: 11, fontWeight: '700', color: DetailUI.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  utilizationPercent: { fontSize: 14, fontWeight: '800' },
  barOuter: { height: 8, backgroundColor: '#ECF0EB', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },

  // Reviews
  starSelect: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 14 },
  starBtn: { padding: 4 },
  reviewInput: { borderWidth: 1, borderColor: DetailUI.border, borderRadius: 14, padding: 14, fontSize: 14, color: DetailUI.ink, minHeight: 96, marginBottom: 14, backgroundColor: '#FBFCFA' },
  submitBtn: { borderRadius: 14, overflow: 'hidden' },
  submitGradient: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  submitText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  detailedReviewBtn: { marginTop: 12, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  detailedReviewLink: { color: DetailUI.primary, fontSize: 13, fontWeight: '700' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8F3EE', alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 14, fontWeight: '800', color: DetailUI.primary },
  reviewUserName: { fontSize: 14, fontWeight: '700', color: DetailUI.ink },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 3 },
  reviewComment: { fontSize: 13, lineHeight: 20, color: DetailUI.muted, fontWeight: '500' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: DetailUI.subtle, fontWeight: '600' },

  // Floating CTA
  floatingCTA: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 16, backgroundColor: 'rgba(242,244,240,0.97)', borderTopWidth: 1, borderTopColor: DetailUI.borderSoft },
  ctaGradient: { minHeight: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
});