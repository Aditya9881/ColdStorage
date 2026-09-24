import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { DetailUI } from '@/components/DetailScreenCard';

type WizardStep = 1 | 2 | 3;

const UI = {
  canvas: DetailUI.canvas,
  surface: DetailUI.surface,
  forest: DetailUI.primary,
  forestDeep: DetailUI.primaryDark,
  teal: DetailUI.primaryMid,
  tealSoft: '#E8F9F7',
  emerald: '#17A56D',
  emeraldSoft: '#E8F7EF',
  blue: '#2589AA',
  blueSoft: '#EAF8FC',
  gold: '#D8B24A',
  goldSoft: '#FFF7E5',
  ink: DetailUI.ink,
  muted: DetailUI.muted,
  subtle: DetailUI.subtle,
  border: DetailUI.border,
  lavender: '#F0EBFF',
  lavenderText: '#7457BE',
};

export default function CreateListingScreen() {
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>(1);
  const [lots, setLots] = useState<any[]>([]);
  const [selectedLot, setSelectedLot] = useState<any>(null);

  const [price, setPrice] = useState('');
  const [minQty, setMinQty] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mandiSuggestion, setMandiSuggestion] = useState<number | null>(null);

  async function loadLots() {
    setLoading(true);
    setLoadError('');

    try {
      const res = await api.get<any>('/inventory/my-lots?limit=50');

      if (res.success && res.data?.lots) {
        const eligibleLots = res.data.lots.filter(
          (lot: any) =>
            lot.status === 'STORED' ||
            lot.status === 'PARTIALLY_RELEASED'
        );

        setLots(eligibleLots);
      } else {
        setLots([]);
        setLoadError('Unable to load your lots. Please try again.');
      }
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();

      const isRateLimited =
        error?.status === 429 ||
        error?.code === 'RATE_LIMITED' ||
        message.includes('too many requests') ||
        message.includes('rate limit');

      if (isRateLimited) {
        setLoadError(
          'Too many requests. Wait for 30 seconds, then tap Try Again.'
        );
      } else {
        setLoadError(
          error?.message || 'Unable to load your stored lots. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLots();
  }, []);

  useEffect(() => {
    if (!selectedLot) {
      setMandiSuggestion(null);
      return;
    }

    let cancelled = false;

    async function fetchMandiPrice() {
      try {
        const res = await api.get<any>('/market-prices');

        if (cancelled || !res.success || !res.data) return;

        const matching = res.data.find(
          (item: any) =>
            item.commodity?.toLowerCase() ===
            selectedLot.commodityName?.toLowerCase()
        );

        if (!matching) return;

        const firstMandi = matching.mandis?.[0] || {};
        const modalPrice = Number(
          firstMandi.modalPrice || matching.modalPrice || 0
        );

        const perKgRate = Math.round(modalPrice / 100);

        if (perKgRate > 0 && !cancelled) {
          setMandiSuggestion(perKgRate);
        }
      } catch {
        if (!cancelled) {
          setMandiSuggestion(null);
        }
      }
    }

    fetchMandiPrice();

    return () => {
      cancelled = true;
    };
  }, [selectedLot]);

  async function handleSubmit() {
    if (!selectedLot) {
      Alert.alert('Select a lot', 'Please choose a lot to list.');
      return;
    }

    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert('Invalid price', 'Please enter a valid price per kg.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post<any>('/marketplace/listings', {
        lotId: selectedLot.id,
        askingPricePerKg: price,
        minQuantityKg: minQty || undefined,
        description: description.trim() || undefined,
      });

      if (res.success) {
        Alert.alert(
          'Listing published',
          `${selectedLot.commodityName} is now visible on the marketplace.`,
          [{ text: 'Done', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'Could not publish',
          'The listing could not be published. Please try again.'
        );
      }
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();

      const isRateLimited =
        error?.status === 429 ||
        error?.code === 'RATE_LIMITED' ||
        message.includes('too many requests') ||
        message.includes('rate limit');

      Alert.alert(
        isRateLimited ? 'Please wait' : 'Could not publish',
        isRateLimited
          ? 'Too many requests were made. Wait a moment before publishing again.'
          : error?.message || 'Please try again in a moment.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function nextStep() {
    if (step === 1 && !selectedLot) {
      Alert.alert('Selection required', 'Choose a lot before continuing.');
      return;
    }

    if (
      step === 2 &&
      (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0)
    ) {
      Alert.alert('Invalid price', 'Please enter a valid price per kg.');
      return;
    }

    setStep((current) => (current + 1) as WizardStep);
  }

  function previousStep() {
    if (step === 1) {
      router.back();
      return;
    }

    setStep((current) => (current - 1) as WizardStep);
  }

  const availableWeightKg = Number(selectedLot?.currentWeightKg || 0);
  const availableWeightMT = availableWeightKg / 1000;
  const totalValue = Number(price || 0) * availableWeightKg;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={[UI.forestDeep, UI.forest, '#087B73']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={27} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTitleBlock}>
              <Text style={styles.headerEyebrow}>MARKETPLACE</Text>
              <Text style={styles.headerTitle}>Create Listing</Text>
            </View>

            <View style={styles.headerSideSpacer} />
          </View>

          <View style={styles.stepProgressRow}>
            <PremiumStep
              number={1}
              label="Lot"
              active={step === 1}
              completed={step > 1}
            />

            <View
              style={[
                styles.progressLine,
                step > 1 && styles.progressLineActive,
              ]}
            />

            <PremiumStep
              number={2}
              label="Price"
              active={step === 2}
              completed={step > 2}
            />

            <View
              style={[
                styles.progressLine,
                step > 2 && styles.progressLineActive,
              ]}
            />

            <PremiumStep
              number={3}
              label="Review"
              active={step === 3}
              completed={false}
            />
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <>
              <View style={styles.introBlock}>
                <Text style={styles.introEyebrow}>STEP 1 OF 3</Text>
                <Text style={styles.introTitle}>Choose a lot to sell</Text>
                <Text style={styles.introDescription}>
                  Pick stored inventory that you want to make available to buyers.
                </Text>
              </View>

              {loading ? (
                <View style={styles.stateCard}>
                  <ActivityIndicator size="large" color={UI.teal} />
                  <Text style={styles.stateCardTitle}>Loading your lots</Text>
                  <Text style={styles.stateCardText}>
                    Fetching eligible stored inventory.
                  </Text>
                </View>
              ) : loadError ? (
                <View style={styles.stateCard}>
                  <View style={styles.stateErrorIcon}>
                    <Ionicons
                      name="cloud-offline-outline"
                      size={30}
                      color="#C26935"
                    />
                  </View>

                  <Text style={styles.stateCardTitle}>Could not load lots</Text>

                  <Text style={styles.stateCardText}>{loadError}</Text>

                  <TouchableOpacity
                    style={styles.retryButton}
                    activeOpacity={0.85}
                    onPress={loadLots}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={17}
                      color="#FFFFFF"
                    />
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : lots.length === 0 ? (
                <View style={styles.stateCard}>
                  <View style={styles.emptyCardIcon}>
                    <Ionicons name="cube-outline" size={30} color={UI.muted} />
                  </View>

                  <Text style={styles.stateCardTitle}>No lots available</Text>

                  <Text style={styles.stateCardText}>
                    Stored or partially released lots will appear here when they
                    are eligible for marketplace listing.
                  </Text>
                </View>
              ) : (
                <View style={styles.lotsList}>
                  {lots.map((lot) => {
                    const selected = selectedLot?.id === lot.id;
                    const weightMT = (
                      Number(lot.currentWeightKg || 0) / 1000
                    ).toFixed(2);

                    return (
                      <TouchableOpacity
                        key={lot.id}
                        style={[
                          styles.lotCard,
                          selected && styles.lotCardSelected,
                        ]}
                        onPress={() => setSelectedLot(lot)}
                        activeOpacity={0.82}
                      >
                        <View style={styles.lotCardTop}>
                          <View
                            style={[
                              styles.lotCommodityIcon,
                              selected && styles.lotCommodityIconSelected,
                            ]}
                          >
                            <Ionicons
                              name="cube-outline"
                              size={21}
                              color={selected ? '#FFFFFF' : UI.teal}
                            />
                          </View>

                          <View style={styles.lotMainInfo}>
                            <Text style={styles.lotNumber}>
                              {lot.lotNumber || 'LOT'}
                            </Text>

                            <Text style={styles.lotName}>
                              {lot.commodityName || 'Commodity'}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.selectIndicator,
                              selected && styles.selectIndicatorSelected,
                            ]}
                          >
                            {selected && (
                              <Ionicons
                                name="checkmark"
                                size={16}
                                color="#FFFFFF"
                              />
                            )}
                          </View>
                        </View>

                        <View style={styles.lotDataRow}>
                          <View style={styles.lotDataItem}>
                            <Text style={styles.lotDataLabel}>AVAILABLE</Text>
                            <Text style={styles.lotDataValue}>
                              {weightMT} MT
                            </Text>
                          </View>

                          <View style={styles.lotDataDivider} />

                          <View style={styles.lotDataItem}>
                            <Text style={styles.lotDataLabel}>GRADE</Text>
                            <Text style={styles.lotDataValue}>
                              {lot.qualityGrade || '—'}
                            </Text>
                          </View>

                          <View style={styles.lotDataDivider} />

                          <View style={styles.lotDataItem}>
                            <Text style={styles.lotDataLabel}>BAGS</Text>
                            <Text style={styles.lotDataValue}>
                              {lot.bagCount || '—'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.lotFacilityRow}>
                          <Ionicons
                            name="business-outline"
                            size={15}
                            color={UI.muted}
                          />
                          <Text style={styles.lotFacilityText} numberOfLines={1}>
                            {lot.facility?.name || 'Storage facility'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {step === 2 && selectedLot && (
            <>
              <View style={styles.introBlock}>
                <Text style={styles.introEyebrow}>STEP 2 OF 3</Text>
                <Text style={styles.introTitle}>Set your selling terms</Text>
                <Text style={styles.introDescription}>
                  Add the asking price and optional purchase conditions.
                </Text>
              </View>

              <View style={styles.selectedLotStrip}>
                <View style={styles.selectedLotIcon}>
                  <Ionicons name="cube-outline" size={20} color={UI.teal} />
                </View>

                <View style={styles.selectedLotText}>
                  <Text style={styles.selectedLotName}>
                    {selectedLot.commodityName}
                  </Text>
                  <Text style={styles.selectedLotMeta}>
                    {availableWeightMT.toFixed(2)} MT available · Grade{' '}
                    {selectedLot.qualityGrade || '—'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.changeLotButton}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.changeLotText}>Change</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formCard}>
                <View style={styles.formCardHeading}>
                  <View style={styles.formHeadingIcon}>
                    <Ionicons
                      name="pricetag-outline"
                      size={21}
                      color={UI.teal}
                    />
                  </View>

                  <View>
                    <Text style={styles.formTitle}>Pricing</Text>
                    <Text style={styles.formSubtitle}>
                      Tell buyers your expected selling price.
                    </Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Asking price per kg</Text>

                    {mandiSuggestion && (
                      <TouchableOpacity
                        style={styles.mandiPill}
                        activeOpacity={0.8}
                        onPress={() => setPrice(String(mandiSuggestion))}
                      >
                        <Ionicons
                          name="sparkles-outline"
                          size={13}
                          color={UI.emerald}
                        />
                        <Text style={styles.mandiPillText}>
                          Mandi ₹{mandiSuggestion}/kg
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.priceInputShell}>
                    <Text style={styles.currencySymbol}>₹</Text>

                    <TextInput
                      style={styles.priceInput}
                      value={price}
                      onChangeText={setPrice}
                      placeholder="0"
                      placeholderTextColor="#B4BDB7"
                      keyboardType="decimal-pad"
                    />

                    <Text style={styles.perKgText}>per kg</Text>
                  </View>

                  {price && !isNaN(Number(price)) && (
                    <View style={styles.estimatedValueRow}>
                      <Ionicons
                        name="calculator-outline"
                        size={15}
                        color={UI.muted}
                      />
                      <Text style={styles.estimatedValueText}>
                        Estimated lot value:{' '}
                        <Text style={styles.estimatedValueAmount}>
                          ₹
                          {totalValue.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </Text>
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Minimum order quantity
                    <Text style={styles.optionalText}> · Optional</Text>
                  </Text>

                  <View style={styles.standardInputShell}>
                    <Ionicons
                      name="layers-outline"
                      size={18}
                      color={UI.subtle}
                    />

                    <TextInput
                      style={styles.standardInput}
                      value={minQty}
                      onChangeText={setMinQty}
                      placeholder="e.g. 500"
                      placeholderTextColor="#B4BDB7"
                      keyboardType="numeric"
                    />

                    <Text style={styles.inputSuffix}>kg</Text>
                  </View>
                </View>

                <View style={styles.inputGroupLast}>
                  <Text style={styles.inputLabel}>
                    Description
                    <Text style={styles.optionalText}> · Optional</Text>
                  </Text>

                  <TextInput
                    style={styles.descriptionInput}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Mention freshness, variety, packaging, or any quality details..."
                    placeholderTextColor="#A7B0AA"
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </>
          )}

          {step === 3 && selectedLot && (
            <>
              <View style={styles.introBlock}>
                <Text style={styles.introEyebrow}>STEP 3 OF 3</Text>
                <Text style={styles.introTitle}>Review your listing</Text>
                <Text style={styles.introDescription}>
                  Confirm the details before publishing to the marketplace.
                </Text>
              </View>

              <LinearGradient
                colors={[UI.forestDeep, UI.forest, '#087B73']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.listingPreview}
              >
                <View style={styles.previewTopRow}>
                  <View style={styles.previewIconBox}>
                    <Ionicons name="cube-outline" size={25} color="#FFFFFF" />
                  </View>

                  <View style={styles.previewActivePill}>
                    <View style={styles.activeDot} />
                    <Text style={styles.previewActiveText}>READY TO LIST</Text>
                  </View>
                </View>

                <Text style={styles.previewCommodity}>
                  {selectedLot.commodityName}
                </Text>

                <Text style={styles.previewFacility} numberOfLines={1}>
                  {selectedLot.facility?.name || 'Verified Storage Facility'}
                </Text>

                <View style={styles.previewPriceRow}>
                  <View>
                    <Text style={styles.previewPriceLabel}>ASKING PRICE</Text>
                    <Text style={styles.previewPrice}>
                      ₹{Number(price).toFixed(0)}
                      <Text style={styles.previewPriceUnit}>/kg</Text>
                    </Text>
                  </View>

                  <View style={styles.previewPriceDivider} />

                  <View style={styles.previewValueBlock}>
                    <Text style={styles.previewPriceLabel}>TOTAL VALUE</Text>
                    <Text style={styles.previewTotalValue}>
                      ₹
                      {totalValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.reviewCard}>
                <ReviewRow
                  icon="cube-outline"
                  label="Available quantity"
                  value={`${availableWeightMT.toFixed(2)} MT`}
                  color={UI.teal}
                  background={UI.tealSoft}
                />

                <ReviewRow
                  icon="ribbon-outline"
                  label="Quality grade"
                  value={selectedLot.qualityGrade || '—'}
                  color={UI.blue}
                  background={UI.blueSoft}
                />

                <ReviewRow
                  icon="business-outline"
                  label="Storage facility"
                  value={selectedLot.facility?.name || '—'}
                  color={UI.emerald}
                  background={UI.emeraldSoft}
                />

                {minQty ? (
                  <ReviewRow
                    icon="layers-outline"
                    label="Minimum order"
                    value={`${Number(minQty).toLocaleString()} kg`}
                    color={UI.gold}
                    background={UI.goldSoft}
                  />
                ) : null}

                {description ? (
                  <View style={styles.reviewDescription}>
                    <View style={styles.reviewDescriptionHeader}>
                      <View style={styles.reviewDescriptionIcon}>
                        <Ionicons
                          name="document-text-outline"
                          size={18}
                          color={UI.lavenderText}
                        />
                      </View>

                      <Text style={styles.reviewDescriptionLabel}>
                        SELLER DESCRIPTION
                      </Text>
                    </View>

                    <Text style={styles.reviewDescriptionText}>
                      {description}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.publishNote}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={UI.blue}
                />
                <Text style={styles.publishNoteText}>
                  After publishing, buyers can discover this lot and place an
                  order according to your listed terms.
                </Text>
              </View>
            </>
          )}

          <View style={{ height: 132 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerBackButton}
            onPress={previousStep}
            activeOpacity={0.8}
          >
            <Ionicons
              name={step === 1 ? 'close' : 'arrow-back'}
              size={20}
              color={UI.forest}
            />
          </TouchableOpacity>

          {step < 3 ? (
            <TouchableOpacity
              style={[
                styles.footerPrimaryButton,
                (loading || !!loadError) && styles.footerPrimaryButtonDisabled,
              ]}
              onPress={nextStep}
              activeOpacity={0.85}
              disabled={loading || !!loadError}
            >
              <Text style={styles.footerPrimaryText}>
                {step === 1 ? 'Continue with lot' : 'Review listing'}
              </Text>
              <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.footerPrimaryButton,
                submitting && styles.footerPrimaryButtonDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.footerPrimaryText}>Publish Listing</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function PremiumStep({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <View style={styles.stepItem}>
      <View
        style={[
          styles.stepCircle,
          active && styles.stepCircleActive,
          completed && styles.stepCircleComplete,
        ]}
      >
        {completed ? (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        ) : (
          <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>
            {number}
          </Text>
        )}
      </View>

      <Text
        style={[
          styles.stepText,
          (active || completed) && styles.stepTextActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ReviewRow({
  icon,
  label,
  value,
  color,
  background,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  color: string;
  background: string;
}) {
  return (
    <View style={styles.reviewRow}>
      <View style={[styles.reviewRowIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>

      <View style={styles.reviewRowText}>
        <Text style={styles.reviewRowLabel}>{label}</Text>
        <Text style={styles.reviewRowValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  hero: {
    paddingTop: 67,
    paddingHorizontal: 20,
    paddingBottom: 23,
    borderBottomLeftRadius: 29,
    borderBottomRightRadius: 29,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  headerTitleBlock: {
    alignItems: 'center',
  },

  headerEyebrow: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 9,
    letterSpacing: 1.05,
    fontWeight: '800',
  },

  headerTitle: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },

  headerSideSpacer: {
    width: 44,
    height: 44,
  },

  stepProgressRow: {
    marginTop: 25,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  stepItem: {
    width: 56,
    alignItems: 'center',
  },

  stepCircle: {
    width: 29,
    height: 29,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  stepCircleActive: {
    borderColor: '#B9F5D5',
    backgroundColor: 'rgba(185,245,213,0.18)',
  },

  stepCircleComplete: {
    borderColor: UI.emerald,
    backgroundColor: UI.emerald,
  },

  stepNumber: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 12,
    fontWeight: '800',
  },

  stepNumberActive: {
    color: '#D6FBE6',
  },

  stepText: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.58)',
    fontSize: 10,
    fontWeight: '700',
  },

  stepTextActive: {
    color: '#D6FBE6',
  },

  progressLine: {
    flex: 1,
    height: 1,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  progressLineActive: {
    backgroundColor: UI.emerald,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 5,
  },

  introBlock: {
    paddingHorizontal: 21,
    paddingTop: 22,
    paddingBottom: 16,
  },

  introEyebrow: {
    color: UI.teal,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.85,
  },

  introTitle: {
    marginTop: 5,
    color: UI.ink,
    fontSize: 23,
    letterSpacing: -0.45,
    fontWeight: '800',
  },

  introDescription: {
    marginTop: 6,
    color: UI.muted,
    fontSize: 13,
    lineHeight: 19,
  },

  stateCard: {
    marginHorizontal: 16,
    paddingVertical: 34,
    paddingHorizontal: 24,
    borderRadius: 22,
    alignItems: 'center',
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },

  stateErrorIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF2E8',
  },

  emptyCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF0EB',
  },

  stateCardTitle: {
    marginTop: 15,
    color: UI.ink,
    fontSize: 17,
    fontWeight: '800',
  },

  stateCardText: {
    marginTop: 7,
    color: UI.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 19,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 13,
    backgroundColor: UI.forest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  lotsList: {
    paddingHorizontal: 16,
    gap: 12,
  },

  lotCard: {
    padding: 16,
    borderRadius: 21,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 10,
    elevation: 2,
  },

  lotCardSelected: {
    borderWidth: 1.5,
    borderColor: UI.teal,
    backgroundColor: '#F4FCFA',
    shadowColor: UI.teal,
    shadowOpacity: 0.12,
    elevation: 4,
  },

  lotCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  lotCommodityIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.tealSoft,
  },

  lotCommodityIconSelected: {
    backgroundColor: UI.teal,
  },

  lotMainInfo: {
    flex: 1,
    marginLeft: 11,
  },

  lotNumber: {
    color: UI.subtle,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.65,
  },

  lotName: {
    marginTop: 2,
    color: UI.ink,
    fontSize: 17,
    fontWeight: '800',
  },

  selectIndicator: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C9D4CC',
    backgroundColor: '#FFFFFF',
  },

  selectIndicatorSelected: {
    borderColor: UI.teal,
    backgroundColor: UI.teal,
  },

  lotDataRow: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    flexDirection: 'row',
    backgroundColor: '#F7F9F7',
  },

  lotDataItem: {
    flex: 1,
    alignItems: 'center',
  },

  lotDataLabel: {
    color: UI.subtle,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.55,
  },

  lotDataValue: {
    marginTop: 4,
    color: UI.ink,
    fontSize: 13,
    fontWeight: '800',
  },

  lotDataDivider: {
    width: 1,
    marginVertical: 2,
    backgroundColor: '#E1E8E2',
  },

  lotFacilityRow: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  lotFacilityText: {
    flex: 1,
    color: UI.muted,
    fontSize: 12,
  },

  selectedLotStrip: {
    marginHorizontal: 16,
    padding: 13,
    borderRadius: 18,
    backgroundColor: UI.tealSoft,
    borderWidth: 1,
    borderColor: '#D7F0EB',
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectedLotIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  selectedLotText: {
    flex: 1,
    marginLeft: 10,
  },

  selectedLotName: {
    color: UI.ink,
    fontSize: 14,
    fontWeight: '800',
  },

  selectedLotMeta: {
    marginTop: 3,
    color: UI.muted,
    fontSize: 11,
  },

  changeLotButton: {
    paddingVertical: 8,
    paddingLeft: 9,
  },

  changeLotText: {
    color: UI.teal,
    fontSize: 12,
    fontWeight: '800',
  },

  formCard: {
    marginHorizontal: 16,
    marginTop: 15,
    padding: 18,
    borderRadius: 22,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.045,
    shadowRadius: 12,
    elevation: 2,
  },

  formCardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 23,
  },

  formHeadingIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.tealSoft,
  },

  formTitle: {
    marginLeft: 11,
    color: UI.ink,
    fontSize: 17,
    fontWeight: '800',
  },

  formSubtitle: {
    marginTop: 3,
    marginLeft: 11,
    color: UI.muted,
    fontSize: 11,
  },

  inputGroup: {
    marginBottom: 21,
  },

  inputGroupLast: {
    marginBottom: 0,
  },

  labelRow: {
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  inputLabel: {
    color: UI.ink,
    fontSize: 13,
    fontWeight: '800',
  },

  optionalText: {
    color: UI.subtle,
    fontWeight: '600',
  },

  mandiPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: UI.emeraldSoft,
  },

  mandiPillText: {
    color: '#087D58',
    fontSize: 10,
    fontWeight: '800',
  },

  priceInputShell: {
    height: 65,
    paddingHorizontal: 15,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAF8',
    borderWidth: 1,
    borderColor: '#DDE7DF',
  },

  currencySymbol: {
    color: UI.teal,
    fontSize: 27,
    fontWeight: '800',
  },

  priceInput: {
    flex: 1,
    marginLeft: 5,
    paddingVertical: 0,
    color: UI.ink,
    fontSize: 27,
    fontWeight: '800',
  },

  perKgText: {
    color: UI.muted,
    fontSize: 12,
    fontWeight: '700',
  },

  estimatedValueRow: {
    marginTop: 9,
    marginLeft: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  estimatedValueText: {
    color: UI.muted,
    fontSize: 11,
  },

  estimatedValueAmount: {
    color: UI.forest,
    fontWeight: '800',
  },

  standardInputShell: {
    height: 53,
    marginTop: 9,
    paddingHorizontal: 14,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAFBFA',
    borderWidth: 1,
    borderColor: '#DDE7DF',
  },

  standardInput: {
    flex: 1,
    paddingVertical: 0,
    color: UI.ink,
    fontSize: 15,
    fontWeight: '700',
  },

  inputSuffix: {
    color: UI.muted,
    fontSize: 12,
    fontWeight: '700',
  },

  descriptionInput: {
    minHeight: 120,
    marginTop: 9,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 13,
    borderRadius: 15,
    color: UI.ink,
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: '#FAFBFA',
    borderWidth: 1,
    borderColor: '#DDE7DF',
  },

  listingPreview: {
    marginHorizontal: 16,
    padding: 19,
    borderRadius: 23,
    overflow: 'hidden',
  },

  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  previewIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  previewActivePill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(185,245,213,0.14)',
  },

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#9EF0C6',
  },

  previewActiveText: {
    color: '#B9F5D5',
    fontSize: 9,
    letterSpacing: 0.5,
    fontWeight: '900',
  },

  previewCommodity: {
    marginTop: 20,
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  previewFacility: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.69)',
    fontSize: 12,
  },

  previewPriceRow: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  previewPriceLabel: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  previewPrice: {
    marginTop: 5,
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
  },

  previewPriceUnit: {
    color: 'rgba(255,255,255,0.67)',
    fontSize: 13,
    fontWeight: '700',
  },

  previewPriceDivider: {
    width: 1,
    height: 42,
    marginHorizontal: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  previewValueBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },

  previewTotalValue: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  reviewCard: {
    marginHorizontal: 16,
    marginTop: 15,
    padding: 17,
    borderRadius: 22,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },

  reviewRow: {
    minHeight: 56,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1ED',
  },

  reviewRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reviewRowText: {
    flex: 1,
    marginLeft: 11,
  },

  reviewRowLabel: {
    color: UI.subtle,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.55,
  },

  reviewRowValue: {
    marginTop: 3,
    color: UI.ink,
    fontSize: 13,
    fontWeight: '800',
  },

  reviewDescription: {
    paddingTop: 15,
  },

  reviewDescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  reviewDescriptionIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.lavender,
  },

  reviewDescriptionLabel: {
    color: UI.subtle,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.55,
  },

  reviewDescriptionText: {
    marginTop: 10,
    color: UI.muted,
    fontSize: 13,
    lineHeight: 20,
  },

  publishNote: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 13,
    borderRadius: 16,
    backgroundColor: UI.blueSoft,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  publishNoteText: {
    flex: 1,
    color: UI.blue,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },

  footer: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderTopWidth: 1,
    borderTopColor: '#E0E7E0',
    backgroundColor: 'rgba(245,247,244,0.98)',
  },

  footerBackButton: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7EFE8',
  },

  footerPrimaryButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    backgroundColor: UI.forest,
    shadowColor: UI.forest,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },

  footerPrimaryButtonDisabled: {
    opacity: 0.58,
  },

  footerPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});