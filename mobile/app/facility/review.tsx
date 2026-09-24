/**
 * Facility Review Screen — Write or edit a review for a facility
 *
 * Accessed from facility detail page. Uses query params for facilityId and optional existing review data.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, useColorScheme, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

export default function ReviewScreen() {
  const params = useLocalSearchParams<{
    facilityId: string;
    facilityName?: string;
    existingRating?: string;
    existingComment?: string;
  }>();
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [rating, setRating] = useState(
    params.existingRating ? parseInt(params.existingRating) : 0
  );
  const [comment, setComment] = useState(params.existingComment || '');
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!params.existingRating;
  const maxChars = 500;

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<any>(`/reviews/${params.facilityId}`, {
        rating,
        comment: comment.trim() || null,
      }, { offlineQueue: true });

      if (res.success) {
        Alert.alert(
          isEditing ? 'Review Updated' : 'Review Submitted',
          'Thank you for your feedback!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          activeOpacity={0.7}
          style={styles.starBtn}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={40}
            color={i <= rating ? '#F59E0B' : colors.border}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Facility Header */}
        <View style={[styles.facilityHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.facilityIcon, { backgroundColor: `${colors.primary}12` }]}>
            <Ionicons name="business" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.facilityName, { color: colors.text }]}>
            {params.facilityName || 'Cold Storage Facility'}
          </Text>
          <Text style={[styles.facilitySubtitle, { color: colors.textSecondary }]}>
            {isEditing ? 'Update your review' : 'Share your experience'}
          </Text>
        </View>

        {/* Star Rating */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>YOUR RATING</Text>
          <View style={styles.starsRow}>
            {renderStars()}
          </View>
          {rating > 0 && (
            <Text style={[styles.ratingLabel, { color: colors.accent }]}>
              {ratingLabels[rating]}
            </Text>
          )}
        </View>

        {/* Comment */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>YOUR REVIEW (OPTIONAL)</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Share details of your experience — storage quality, staff behavior, facilities..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={5}
            maxLength={maxChars}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: colors.textTertiary }]}>
            {comment.length}/{maxChars}
          </Text>
        </View>

        {/* Tips */}
        <View style={[styles.tipsBox, { backgroundColor: `${colors.info}10`, borderColor: `${colors.info}20` }]}>
          <Ionicons name="bulb-outline" size={16} color={colors.info} />
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            Honest reviews help other farmers make better storage decisions.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: rating > 0 ? colors.primary : colors.border },
          ]}
          onPress={handleSubmit}
          disabled={submitting || rating === 0}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>
                {isEditing ? 'Update Review' : 'Submit Review'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  facilityHeader: {
    margin: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  facilityIcon: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  facilityName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center' },
  facilitySubtitle: { fontSize: FontSize.sm, marginTop: Spacing.xs, textAlign: 'center' },
  section: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: FontWeight.semibold,
    letterSpacing: 1, marginBottom: Spacing.md,
  },
  starsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.md,
  },
  starBtn: { padding: Spacing.xs },
  ratingLabel: {
    fontSize: FontSize.md, fontWeight: FontWeight.bold,
    textAlign: 'center', marginTop: Spacing.md,
  },
  textInput: {
    borderWidth: 1, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: FontSize.md,
    minHeight: 120, lineHeight: 22,
  },
  charCount: {
    fontSize: FontSize.xs, textAlign: 'right', marginTop: Spacing.xs,
  },
  tipsBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, gap: Spacing.sm,
  },
  tipsText: { fontSize: FontSize.sm, flex: 1, lineHeight: 20 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, paddingBottom: Spacing.xxl, borderTopWidth: 1,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  submitBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#FFFFFF' },
});
