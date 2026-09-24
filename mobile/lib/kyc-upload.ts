/**
 * KYC Document Upload Helper — ColdStorage Mobile
 *
 * Handles image picking (camera/gallery) and multipart upload
 * to the backend /kyc/upload endpoint.
 */
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { storage } from './storage';

const API_BASE = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:4000/api/v1'
    : 'http://localhost:4000/api/v1'
  : 'https://api.coldstorage.in/api/v1';

const TOKEN_KEY = 'auth_access_token';

export type DocType =
  | 'AADHAAR_FRONT'
  | 'AADHAAR_BACK'
  | 'PAN_CARD'
  | 'GST_CERTIFICATE'
  | 'BUSINESS_LICENSE'
  | 'PHOTO_ID'
  | 'OTHER';

interface UploadResult {
  success: boolean;
  data: any;
  error?: { code: string; message: string };
}

/**
 * Pick an image from camera or gallery
 */
export async function pickImage(
  source: 'camera' | 'gallery' = 'gallery'
): Promise<ImagePicker.ImagePickerAsset | null> {
  // Request permissions
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission is required to take a photo');
    }
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Gallery permission is required to select a photo');
    }
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7, // Compress to ~70% quality
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return result.assets[0];
}

/**
 * Upload a KYC document to the backend
 */
export async function uploadKycDocument(
  asset: ImagePicker.ImagePickerAsset,
  documentType: DocType,
  documentNumber?: string
): Promise<UploadResult> {
  const token = await storage.getItem(TOKEN_KEY);

  // Build multipart form data
  const formData = new FormData();

  const uri = asset.uri;
  const filename = uri.split('/').pop() || `kyc_${Date.now()}.jpg`;
  const mimeType = asset.mimeType || 'image/jpeg';

  formData.append('document', {
    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
    name: filename,
    type: mimeType,
  } as any);

  formData.append('documentType', documentType);
  if (documentNumber) {
    formData.append('documentNumber', documentNumber);
  }

  try {
    const response = await fetch(`${API_BASE}/kyc/upload`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        // Don't set Content-Type — fetch sets it with boundary for FormData
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: data.error || { code: 'UPLOAD_FAILED', message: 'Upload failed' },
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: { code: 'NETWORK_ERROR', message: err.message || 'Network error during upload' },
    };
  }
}
