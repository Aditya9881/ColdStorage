/**
 * Re-upload KYC Documents Screen — ColdStorage Mobile
 *
 * Allows users whose KYC was rejected or pending to clear
 * existing documents and upload fresh ones.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';
import { uploadKycDocument, DocType } from '@/lib/kyc-upload';
import * as ImagePicker from 'expo-image-picker';

export default function KycReuploadScreen() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Photos
  const [aadhaarPhoto, setAadhaarPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [gstPhoto, setGstPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [panPhoto, setPanPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const colors = user?.role === 'BUYER'
    ? { primary: '#0F766E', dark: '#134E4A', bg: '#F0FDFA' }
    : { primary: '#2D6A4F', dark: '#1B4332', bg: '#F0FFF4' };

  const handlePickImage = async (docType: 'aadhaar' | 'gst' | 'pan', source: 'camera' | 'gallery') => {
    setError('');
    try {
      const { status } = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        setError(`Permission to access the ${source} was denied`);
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
      };

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (docType === 'aadhaar') setAadhaarPhoto(asset);
        if (docType === 'gst') setGstPhoto(asset);
        if (docType === 'pan') setPanPhoto(asset);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to select image');
    }
  };

  const handleUploadAll = async () => {
    // Validation
    if (user?.role === 'FARMER' && !aadhaarPhoto) {
      setError('Please select an Aadhaar photo to upload');
      return;
    }
    if (user?.role === 'BUYER' && !gstPhoto) {
      setError('Please select a GST Certificate photo to upload');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Clear existing rejected documents
      await api.delete('/kyc/clear-rejected');

      // 2. Upload new documents
      if (user?.role === 'FARMER' && aadhaarPhoto) {
        const res = await uploadKycDocument(aadhaarPhoto, 'AADHAAR_FRONT', user.phone);
        if (!res.success) throw new Error(res.error?.message || 'Aadhaar upload failed');
      }

      if (user?.role === 'BUYER') {
        if (gstPhoto) {
          const res = await uploadKycDocument(gstPhoto, 'GST_CERTIFICATE');
          if (!res.success) throw new Error(res.error?.message || 'GST Certificate upload failed');
        }
        if (panPhoto) {
          const res = await uploadKycDocument(panPhoto, 'PAN_CARD');
          if (!res.success) throw new Error(res.error?.message || 'PAN Card upload failed');
        }
        if (aadhaarPhoto) {
          const res = await uploadKycDocument(aadhaarPhoto, 'AADHAAR_FRONT');
          if (!res.success) throw new Error(res.error?.message || 'Aadhaar upload failed');
        }
      }

      // 3. Mark user back to kycSubmitted state on backend
      // (Backend does this automatically in kycService.uploadDocument)
      await refreshProfile();

      Alert.alert(
        'Submission Success',
        'Your KYC documents have been uploaded successfully. The administrator will review them shortly.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to upload documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Submit KYC Documents</Text>
      <Text style={styles.subtitle}>
        Upload clear images of your physical documents for administrative review.
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {user?.role === 'FARMER' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aadhaar Card Photo (Front) *</Text>
          <ImagePickerBox
            asset={aadhaarPhoto}
            onPickCamera={() => handlePickImage('aadhaar', 'camera')}
            onPickGallery={() => handlePickImage('aadhaar', 'gallery')}
            placeholder="Aadhaar Front Image"
          />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GST Certificate Image *</Text>
          <ImagePickerBox
            asset={gstPhoto}
            onPickCamera={() => handlePickImage('gst', 'camera')}
            onPickGallery={() => handlePickImage('gst', 'gallery')}
            placeholder="GST Certificate original document image"
          />

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>PAN Card Image (Optional)</Text>
          <ImagePickerBox
            asset={panPhoto}
            onPickCamera={() => handlePickImage('pan', 'camera')}
            onPickGallery={() => handlePickImage('pan', 'gallery')}
            placeholder="PAN Card Front Image"
          />

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Aadhaar Card Image (Optional)</Text>
          <ImagePickerBox
            asset={aadhaarPhoto}
            onPickCamera={() => handlePickImage('aadhaar', 'camera')}
            onPickGallery={() => handlePickImage('aadhaar', 'gallery')}
            placeholder="Aadhaar Front Image"
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
        onPress={handleUploadAll}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
            <Text style={styles.submitBtnText}>Upload Documents</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// Helper Picker Component
function ImagePickerBox({
  asset,
  onPickCamera,
  onPickGallery,
  placeholder,
}: {
  asset: ImagePicker.ImagePickerAsset | null;
  onPickCamera: () => void;
  onPickGallery: () => void;
  placeholder: string;
}) {
  return (
    <View style={styles.pickerBox}>
      {asset ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: asset.uri }} style={styles.previewImage} />
          <View style={styles.previewOver}>
            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            <Text style={styles.previewText}>Photo Selected</Text>
          </View>
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
          <Text style={styles.placeholderText}>{placeholder}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.pickerBtn} onPress={onPickCamera}>
          <Ionicons name="camera-outline" size={16} color="#4B5563" />
          <Text style={styles.pickerBtnText}>Use Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickerBtn} onPress={onPickGallery}>
          <Ionicons name="image-outline" size={16} color="#4B5563" />
          <Text style={styles.pickerBtnText}>Browse Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scroll: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 18,
  },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 18 },

  // Picker
  pickerBox: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    padding: 12, backgroundColor: '#FAFAFA', gap: 10,
  },
  placeholderContainer: { alignItems: 'center', marginVertical: 12, gap: 4 },
  placeholderText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  buttonRow: { flexDirection: 'row', gap: 8 },
  pickerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, backgroundColor: '#FFF',
  },
  pickerBtnText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },

  previewContainer: { height: 140, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: '100%', objectFit: 'cover' },
  previewOver: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  previewText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 10,
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
